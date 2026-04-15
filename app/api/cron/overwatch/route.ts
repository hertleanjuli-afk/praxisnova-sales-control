import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/helpers/brevo-client';
import { buildEmail } from '@/lib/helpers/html-email-template';
import { logger } from '@/lib/helpers/logger';

const AGENT = 'overwatch';
const RECIPIENT = process.env.OVERWATCH_RECIPIENT ?? 'hertle.anjuli@praxisnovaai.com';

interface ApiCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
}

async function checkGemini(): Promise<ApiCheck> {
  if (!process.env.GEMINI_API_KEY) return { name: 'gemini', status: 'down' };
  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
      { signal: AbortSignal.timeout(8000) },
    );
    return {
      name: 'gemini',
      status: res.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch {
    return { name: 'gemini', status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkBrevo(): Promise<ApiCheck> {
  if (!process.env.BREVO_API_KEY) return { name: 'brevo', status: 'down' };
  const start = Date.now();
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': process.env.BREVO_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    return {
      name: 'brevo',
      status: res.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch {
    return { name: 'brevo', status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkDb(): Promise<ApiCheck> {
  const start = Date.now();
  try {
    await sql`SELECT 1`;
    return { name: 'db', status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { name: 'db', status: 'down', latencyMs: Date.now() - start };
  }
}

async function checkAgentActivity(): Promise<Record<string, 'ok' | 'warning' | 'error' | 'missing'>> {
  const result: Record<string, 'ok' | 'warning' | 'error' | 'missing'> = {};
  const statusFromCount = (c: number): 'ok' | 'warning' => (c > 0 ? 'ok' : 'warning');

  try {
    const rows = await sql`SELECT COUNT(*) as count FROM daily_plans WHERE created_at >= NOW() - INTERVAL '30 hours'`;
    result['daily-plans'] = statusFromCount(Number(rows[0]?.count ?? 0));
  } catch {
    result['daily-plans'] = 'error';
  }
  try {
    const rows = await sql`SELECT COUNT(*) as count FROM news_items WHERE created_at >= NOW() - INTERVAL '30 hours'`;
    result['news-scout'] = statusFromCount(Number(rows[0]?.count ?? 0));
  } catch {
    result['news-scout'] = 'error';
  }
  try {
    const rows = await sql`SELECT COUNT(*) as count FROM content_drafts WHERE created_at >= NOW() - INTERVAL '30 hours'`;
    result['content-creator'] = statusFromCount(Number(rows[0]?.count ?? 0));
  } catch {
    result['content-creator'] = 'error';
  }
  try {
    const rows = await sql`SELECT COUNT(*) as count FROM email_inbox WHERE processed_at >= NOW() - INTERVAL '16 hours'`;
    result['email-inbox'] = statusFromCount(Number(rows[0]?.count ?? 0));
  } catch {
    result['email-inbox'] = 'error';
  }
  return result;
}

async function getDbStats() {
  try {
    const [leadsRow, blockedRow] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM leads`,
      sql`SELECT COUNT(*) as count FROM blocked_tasks WHERE resolved = FALSE`,
    ]);
    return {
      leads: Number(leadsRow[0]?.count ?? 0),
      unresolvedBlocked: Number(blockedRow[0]?.count ?? 0),
    };
  } catch {
    return { leads: -1, unresolvedBlocked: -1 };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [gemini, brevo, db, agentActivity, dbStats] = await Promise.all([
      checkGemini(),
      checkBrevo(),
      checkDb(),
      checkAgentActivity(),
      getDbStats(),
    ]);

    const apiStatuses = { gemini, brevo, db };
    const alerts: string[] = [];

    if (gemini.status !== 'ok') alerts.push(`Gemini: ${gemini.status}`);
    if (brevo.status !== 'ok') alerts.push(`Brevo: ${brevo.status}`);
    if (db.status !== 'ok') alerts.push(`DB: ${db.status}`);
    for (const [name, status] of Object.entries(agentActivity)) {
      if (status === 'error') alerts.push(`Agent ${name}: DB-Error beim Check`);
    }
    if (dbStats.unresolvedBlocked > 10) {
      alerts.push(`${dbStats.unresolvedBlocked} blocked_tasks ungeloest`);
    }

    const overall: 'ok' | 'warning' | 'critical' =
      alerts.some((a) => a.includes('down') || a.includes('critical'))
        ? 'critical'
        : alerts.length > 0
        ? 'warning'
        : 'ok';

    await sql`
      INSERT INTO health_reports (agent_statuses, api_statuses, db_stats, overall_status, alerts)
      VALUES (
        ${JSON.stringify(agentActivity)},
        ${JSON.stringify(apiStatuses)},
        ${JSON.stringify(dbStats)},
        ${overall},
        ${alerts}
      )
    `;

    if (overall === 'critical' || (overall === 'warning' && alerts.length >= 2)) {
      const html = buildEmail({
        title: `Overwatch Alert: ${overall}`,
        sections: [
          { heading: 'Alerts', body: '', bullets: alerts },
          {
            heading: 'API Status',
            body: '',
            bullets: [
              `Gemini ${gemini.status} (${gemini.latencyMs ?? '-'}ms)`,
              `Brevo ${brevo.status} (${brevo.latencyMs ?? '-'}ms)`,
              `DB ${db.status} (${db.latencyMs ?? '-'}ms)`,
            ],
          },
        ],
      });
      await sendEmail({
        to: RECIPIENT,
        subject: `[${overall.toUpperCase()}] Overwatch Alert`,
        htmlBody: html,
        tags: ['overwatch', overall],
      });
    }

    logger.info('overwatch done', { overall, alertCount: alerts.length });
    return NextResponse.json({ ok: true, overall, alerts, apiStatuses, agentActivity, dbStats });
  } catch (err) {
    logger.error('overwatch failed', { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
