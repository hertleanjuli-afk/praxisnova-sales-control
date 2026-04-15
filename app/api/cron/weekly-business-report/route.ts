import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/helpers/brevo-client';
import { buildEmail } from '@/lib/helpers/html-email-template';
import { logger } from '@/lib/helpers/logger';
import type { PlanBlock } from '@/types/agents';

const RECIPIENT = process.env.PLANNER_RECIPIENT ?? 'hertle.anjuli@praxisnovaai.com';

interface WeeklyMetrics {
  weekStart: string;
  weekEnd: string;
  newLeads: number;
  emailsSent: number;
  replies: number;
  leadsPerIndustry: Record<string, number>;
  timeByCategory: Record<string, number>;
  planCoverage: number;
}

function lastNDaysRange(n: number): { start: string; end: string } {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - n);
  start.setUTCHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

async function collectWeeklyMetrics(): Promise<WeeklyMetrics> {
  const { start, end } = lastNDaysRange(7);

  const newLeadsRow = await sql`
    SELECT COUNT(*) as count FROM leads
    WHERE created_at >= ${start} AND created_at <= ${end}
  `;
  const emailsRow = await sql`
    SELECT COUNT(*) as count FROM email_events
    WHERE event_type = 'sent' AND created_at >= ${start} AND created_at <= ${end}
  `;
  const repliesRow = await sql`
    SELECT COUNT(*) as count FROM email_events
    WHERE event_type = 'replied' AND created_at >= ${start} AND created_at <= ${end}
  `;
  const industryRows = await sql`
    SELECT industry, COUNT(*) as count FROM leads
    WHERE created_at >= ${start} AND created_at <= ${end}
    GROUP BY industry
  `;

  const leadsPerIndustry: Record<string, number> = {};
  for (const row of industryRows) {
    const industry = (row.industry as string) ?? 'unknown';
    leadsPerIndustry[industry] = Number(row.count);
  }

  const planRows = await sql`
    SELECT blocks_json FROM daily_plans
    WHERE plan_date >= ${start.slice(0, 10)} AND plan_date <= ${end.slice(0, 10)}
  `;
  const timeByCategory: Record<string, number> = {};
  let totalBlocks = 0;
  for (const row of planRows) {
    const blocks = (row.blocks_json as PlanBlock[] | undefined) ?? [];
    for (const b of blocks) {
      const mins = minutesBetween(b.start, b.end);
      timeByCategory[b.category] = (timeByCategory[b.category] ?? 0) + mins;
      totalBlocks++;
    }
  }

  return {
    weekStart: start.slice(0, 10),
    weekEnd: end.slice(0, 10),
    newLeads: Number(newLeadsRow[0]?.count ?? 0),
    emailsSent: Number(emailsRow[0]?.count ?? 0),
    replies: Number(repliesRow[0]?.count ?? 0),
    leadsPerIndustry,
    timeByCategory,
    planCoverage: planRows.length,
  };
}

async function forecastNewLeads4Weeks(): Promise<number[]> {
  const rows = await sql`
    SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as count
    FROM leads
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY week
    ORDER BY week ASC
  `;
  const series = rows.map((r) => Number(r.count));
  if (series.length < 2) return [series[0] ?? 0, series[0] ?? 0, series[0] ?? 0, series[0] ?? 0];

  const n = series.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = series.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((acc, x, i) => acc + (x - meanX) * (series[i] - meanY), 0);
  const den = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0) || 1;
  const slope = num / den;
  const intercept = meanY - slope * meanX;

  return [1, 2, 3, 4].map((k) => Math.max(0, Math.round(intercept + slope * (n - 1 + k))));
}

function formatTimeMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metrics = await collectWeeklyMetrics();
    const forecast = await forecastNewLeads4Weeks();
    const openRate = metrics.emailsSent > 0
      ? ((metrics.replies / metrics.emailsSent) * 100).toFixed(1)
      : '0.0';

    await sql`
      INSERT INTO weekly_reports (week_start, week_end, metrics_json, forecast_json)
      VALUES (
        ${metrics.weekStart},
        ${metrics.weekEnd},
        ${JSON.stringify(metrics)},
        ${JSON.stringify({ newLeadsNext4Weeks: forecast })}
      )
    `;

    const industryBullets = Object.entries(metrics.leadsPerIndustry).map(
      ([ind, count]) => `${ind}: ${count}`,
    );
    const timeBullets = Object.entries(metrics.timeByCategory).map(
      ([cat, mins]) => `${cat}: ${formatTimeMinutes(mins)}`,
    );

    const html = buildEmail({
      title: `Weekly Business Report ${metrics.weekStart} bis ${metrics.weekEnd}`,
      sections: [
        {
          heading: 'Kern-KPIs',
          body: '',
          bullets: [
            `Neue Leads: ${metrics.newLeads}`,
            `Emails gesendet: ${metrics.emailsSent}`,
            `Antworten: ${metrics.replies} (Reply-Rate ${openRate}%)`,
            `Tage mit Plan: ${metrics.planCoverage}/7`,
          ],
        },
        {
          heading: 'Leads nach Branche',
          body: industryBullets.length === 0 ? 'keine Daten' : '',
          bullets: industryBullets,
        },
        {
          heading: 'Zeit-Investment (aus daily_plans)',
          body: timeBullets.length === 0 ? 'keine Plan-Daten' : '',
          bullets: timeBullets,
        },
        {
          heading: 'Forecast neue Leads (4 Wochen)',
          body: `KW+1: ${forecast[0]} &middot; KW+2: ${forecast[1]} &middot; KW+3: ${forecast[2]} &middot; KW+4: ${forecast[3]} (lineare Regression, 8w Historie)`,
        },
      ],
    });

    await sendEmail({
      to: RECIPIENT,
      subject: `Business Report Woche ${metrics.weekStart}`,
      htmlBody: html,
      tags: ['weekly-business-report'],
    });

    logger.info('weekly business report sent', {
      weekStart: metrics.weekStart,
      newLeads: metrics.newLeads,
    });

    return NextResponse.json({ ok: true, ...metrics, forecast });
  } catch (err) {
    logger.error('weekly-business-report failed', {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
