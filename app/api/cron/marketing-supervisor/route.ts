import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/helpers/brevo-client';
import { buildEmail } from '@/lib/helpers/html-email-template';
import { logger } from '@/lib/helpers/logger';

const AGENT = 'marketing-supervisor';
const RECIPIENT = process.env.PLANNER_RECIPIENT ?? 'hertle.anjuli@praxisnovaai.com';

interface AgentStatus {
  name: string;
  lastRun: string | null;
  recentItems: number;
  status: 'ok' | 'warning' | 'error';
}

async function collectStatus(): Promise<{ statuses: AgentStatus[]; alerts: string[] }> {
  const [newsCount, draftsPending, inboxItems, prDrafts, newsletterDrafts] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM news_items WHERE created_at >= NOW() - INTERVAL '24 hours'`,
    sql`SELECT COUNT(*) as count FROM content_drafts WHERE status = 'pending_review'`,
    sql`SELECT COUNT(*) as count FROM email_inbox WHERE processed_at >= NOW() - INTERVAL '24 hours'`,
    sql`SELECT COUNT(*) as count FROM pr_campaigns WHERE status = 'pending_review' AND created_at >= NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(*) as count FROM newsletters WHERE status = 'draft' AND created_at >= NOW() - INTERVAL '31 days'`,
  ]);

  const newsToday = Number(newsCount[0]?.count ?? 0);
  const pendingDrafts = Number(draftsPending[0]?.count ?? 0);
  const inboxToday = Number(inboxItems[0]?.count ?? 0);
  const prToday = Number(prDrafts[0]?.count ?? 0);
  const newsletterMonth = Number(newsletterDrafts[0]?.count ?? 0);

  const alerts: string[] = [];
  if (newsToday === 0) alerts.push('News Scout: keine Items in den letzten 24h');
  if (pendingDrafts > 20) alerts.push(`Content-Approval-Queue hat ${pendingDrafts} Drafts (>20)`);
  if (inboxToday === 0) alerts.push('Email-Inbox: 0 Items in 24h (OAuth pruefen?)');

  return {
    statuses: [
      {
        name: 'news-scout',
        lastRun: null,
        recentItems: newsToday,
        status: newsToday === 0 ? 'warning' : 'ok',
      },
      {
        name: 'content-creator',
        lastRun: null,
        recentItems: pendingDrafts,
        status: pendingDrafts > 20 ? 'warning' : 'ok',
      },
      {
        name: 'email-inbox',
        lastRun: null,
        recentItems: inboxToday,
        status: inboxToday === 0 ? 'warning' : 'ok',
      },
      {
        name: 'pr-outreach',
        lastRun: null,
        recentItems: prToday,
        status: 'ok',
      },
      {
        name: 'newsletter',
        lastRun: null,
        recentItems: newsletterMonth,
        status: 'ok',
      },
    ],
    alerts,
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { statuses, alerts } = await collectStatus();
    const overall = alerts.length === 0 ? 'ok' : 'warning';

    await sql`
      INSERT INTO supervisor_reports (supervisor_name, metrics_json, alerts_json, status)
      VALUES (
        ${AGENT},
        ${JSON.stringify({ statuses })},
        ${JSON.stringify(alerts)},
        ${overall}
      )
    `;

    if (alerts.length > 0) {
      const html = buildEmail({
        title: 'Marketing Supervisor Alert',
        sections: [
          {
            heading: 'Alerts',
            body: '',
            bullets: alerts,
          },
          {
            heading: 'Agent-Status',
            body: '',
            bullets: statuses.map((s) => `${s.name}: ${s.status} (${s.recentItems} items)`),
          },
        ],
      });
      await sendEmail({
        to: RECIPIENT,
        subject: `Marketing Alert (${alerts.length})`,
        htmlBody: html,
        tags: ['marketing-supervisor'],
      });
    }

    logger.info('marketing supervisor done', { alerts: alerts.length, overall });
    return NextResponse.json({ ok: true, statuses, alerts, overall });
  } catch (err) {
    logger.error('marketing-supervisor failed', { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
