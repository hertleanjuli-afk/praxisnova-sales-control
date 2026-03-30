import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get('period') || 'week';
  const daysMap: Record<string, number> = { today: 1, week: 7, month: 30, all: 3650 };
  const days = daysMap[period] || 7;

  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86400000).toISOString();
  const prevStart = new Date(now.getTime() - days * 2 * 86400000).toISOString();

  try {
    // ── KPIs (current period) ──────────────────────────────────────────────
    const [kpiCurrent] = await sql`
      SELECT
        (SELECT COUNT(*) FROM leads WHERE created_at >= ${periodStart}::timestamptz) AS new_leads,
        (SELECT COUNT(*) FROM email_events WHERE event_type = 'sent' AND created_at >= ${periodStart}::timestamptz) AS emails_sent,
        (SELECT COUNT(*) FROM email_events WHERE event_type = 'opened' AND created_at >= ${periodStart}::timestamptz) AS emails_opened,
        (SELECT COUNT(*) FROM email_events WHERE event_type = 'replied' AND created_at >= ${periodStart}::timestamptz) AS emails_replied,
        (SELECT COUNT(*) FROM leads WHERE sequence_status = 'booked' AND exited_at >= ${periodStart}::timestamptz) AS meetings_booked
    `;

    // ── KPIs (previous period for trend) ────────────────────────────────────
    const [kpiPrev] = await sql`
      SELECT
        (SELECT COUNT(*) FROM leads WHERE created_at >= ${prevStart}::timestamptz AND created_at < ${periodStart}::timestamptz) AS new_leads,
        (SELECT COUNT(*) FROM email_events WHERE event_type = 'sent' AND created_at >= ${prevStart}::timestamptz AND created_at < ${periodStart}::timestamptz) AS emails_sent,
        (SELECT COUNT(*) FROM email_events WHERE event_type = 'opened' AND created_at >= ${prevStart}::timestamptz AND created_at < ${periodStart}::timestamptz) AS emails_opened,
        (SELECT COUNT(*) FROM email_events WHERE event_type = 'replied' AND created_at >= ${prevStart}::timestamptz AND created_at < ${periodStart}::timestamptz) AS emails_replied,
        (SELECT COUNT(*) FROM leads WHERE sequence_status = 'booked' AND exited_at >= ${prevStart}::timestamptz AND exited_at < ${periodStart}::timestamptz) AS meetings_booked
    `;

    // ── KPI Sparklines (last 7 days) ────────────────────────────────────────
    const emailSparkline = await sql`
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM email_events WHERE event_type = 'sent' AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at) ORDER BY day
    `;

    // ── Hot Leads: Recently opened emails ────────────────────────────────────
    const hotLeads = await sql`
      SELECT DISTINCT ON (e.lead_id)
        e.lead_id, e.step_number, e.created_at AS opened_at, e.sequence_type AS event_sequence,
        l.first_name, l.last_name, l.email, l.company, l.sequence_type, l.lead_score, l.linkedin_url
      FROM email_events e
      JOIN leads l ON l.id = e.lead_id
      WHERE e.event_type = 'opened'
        AND e.created_at >= NOW() - INTERVAL '7 days'
        AND l.sequence_status NOT IN ('unsubscribed', 'bounced', 'booked')
      ORDER BY e.lead_id, e.created_at DESC
      LIMIT 15
    `;

    // ── Recent identified website clicks ─────────────────────────────────────
    const recentClicks = await sql`
      SELECT DISTINCT ON (wc.visitor_id)
        wc.id, wc.visitor_id, wc.lead_id, wc.page, wc.button_id, wc.button_text, wc.clicked_at,
        l.first_name, l.last_name, l.email, l.company
      FROM website_clicks wc
      LEFT JOIN leads l ON l.id = wc.lead_id
      WHERE wc.clicked_at >= NOW() - INTERVAL '3 days'
        AND wc.button_id != 'pageview'
      ORDER BY wc.visitor_id, wc.clicked_at DESC
      LIMIT 10
    `;

    // ── Inbound leads (new submissions) ──────────────────────────────────────
    const inboundLeads = await sql`
      SELECT id, first_name, last_name, email, company, sequence_type, source, created_at
      FROM leads
      WHERE source = 'inbound' OR sequence_type = 'inbound'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // ── Meetings this week ───────────────────────────────────────────────────
    const meetings = await sql`
      SELECT l.id, l.first_name, l.last_name, l.company, l.sequence_type, l.exited_at,
        c.call_date, c.result, c.notes
      FROM leads l
      LEFT JOIN call_logs c ON c.lead_id = l.id AND c.result = 'appointment'
      WHERE l.sequence_status = 'booked'
      ORDER BY COALESCE(c.call_date, l.exited_at) DESC
      LIMIT 10
    `;

    // ── Sequence progress (leads per step) ───────────────────────────────────
    const sequenceProgress = await sql`
      SELECT sequence_type, sequence_step, COUNT(*) AS count
      FROM leads
      WHERE sequence_status = 'active'
        AND sequence_type IS NOT NULL
      GROUP BY sequence_type, sequence_step
      ORDER BY sequence_type, sequence_step
    `;

    // ── LinkedIn tasks (pending linkedin steps) ──────────────────────────────
    const linkedinTasks = await sql`
      SELECT l.id, l.first_name, l.last_name, l.company, l.linkedin_url, l.sequence_type, l.sequence_step
      FROM leads l
      WHERE l.sequence_status = 'active'
        AND l.linkedin_status IS NULL
        AND l.linkedin_url IS NOT NULL
        AND l.linkedin_url != ''
      ORDER BY l.enrolled_at ASC
      LIMIT 10
    `;

    // ── Activity feed (last 20 actions) ──────────────────────────────────────
    const activity = await sql`
      (
        SELECT 'email_opened' AS type, l.first_name, l.last_name, l.company, l.email,
          e.sequence_type AS detail, e.step_number::TEXT AS detail2, e.created_at
        FROM email_events e JOIN leads l ON l.id = e.lead_id
        WHERE e.event_type = 'opened' AND e.created_at >= NOW() - INTERVAL '3 days'
        ORDER BY e.created_at DESC LIMIT 10
      )
      UNION ALL
      (
        SELECT 'email_replied' AS type, l.first_name, l.last_name, l.company, l.email,
          e.sequence_type AS detail, e.step_number::TEXT AS detail2, e.created_at
        FROM email_events e JOIN leads l ON l.id = e.lead_id
        WHERE e.event_type = 'replied' AND e.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY e.created_at DESC LIMIT 5
      )
      UNION ALL
      (
        SELECT 'website_click' AS type, COALESCE(l.first_name, 'Besucher') AS first_name,
          COALESCE(l.last_name, wc.visitor_id) AS last_name, l.company, l.email,
          wc.page AS detail, wc.button_text AS detail2, wc.clicked_at AS created_at
        FROM website_clicks wc LEFT JOIN leads l ON l.id = wc.lead_id
        WHERE wc.clicked_at >= NOW() - INTERVAL '3 days' AND wc.button_id != 'pageview'
        ORDER BY wc.clicked_at DESC LIMIT 5
      )
      UNION ALL
      (
        SELECT 'new_lead' AS type, l.first_name, l.last_name, l.company, l.email,
          l.source AS detail, l.sequence_type AS detail2, l.created_at
        FROM leads l
        WHERE l.created_at >= NOW() - INTERVAL '3 days'
        ORDER BY l.created_at DESC LIMIT 5
      )
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // ── Conversion funnel ────────────────────────────────────────────────────
    const [funnel] = await sql`
      SELECT
        (SELECT COUNT(*) FROM leads) AS total_leads,
        (SELECT COUNT(DISTINCT lead_id) FROM email_events WHERE event_type = 'sent') AS contacted,
        (SELECT COUNT(DISTINCT lead_id) FROM email_events WHERE event_type = 'opened') AS opened,
        (SELECT COUNT(DISTINCT lead_id) FROM email_events WHERE event_type = 'replied') AS replied,
        (SELECT COUNT(*) FROM leads WHERE sequence_status = 'booked') AS meetings,
        (SELECT COUNT(*) FROM call_logs WHERE result = 'appointment') AS appointments
    `;

    // ── Email performance (last 12 weeks for chart) ──────────────────────────
    const emailPerformance = await sql`
      SELECT
        DATE_TRUNC('week', created_at)::DATE AS week,
        COUNT(*) FILTER (WHERE event_type = 'sent') AS sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') AS opened,
        COUNT(*) FILTER (WHERE event_type = 'replied') AS replied
      FROM email_events
      WHERE created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week
    `;

    // ── Leads by sector ──────────────────────────────────────────────────────
    const sectorBreakdown = await sql`
      SELECT
        COALESCE(sequence_type, 'allgemein') AS sector,
        COUNT(*) AS count
      FROM leads
      WHERE sequence_type IS NOT NULL
      GROUP BY sequence_type
      ORDER BY count DESC
    `;

    // ── Build response ───────────────────────────────────────────────────────
    const sent = Number(kpiCurrent.emails_sent || 0);
    const opened = Number(kpiCurrent.emails_opened || 0);
    const replied = Number(kpiCurrent.emails_replied || 0);
    const openRate = sent > 0 ? Math.round((opened / sent) * 100 * 10) / 10 : 0;
    const replyRate = sent > 0 ? Math.round((replied / sent) * 100 * 10) / 10 : 0;

    const prevSent = Number(kpiPrev.emails_sent || 0);
    const prevOpened = Number(kpiPrev.emails_opened || 0);
    const prevReplied = Number(kpiPrev.emails_replied || 0);
    const prevOpenRate = prevSent > 0 ? Math.round((prevOpened / prevSent) * 100 * 10) / 10 : 0;
    const prevReplyRate = prevSent > 0 ? Math.round((prevReplied / prevSent) * 100 * 10) / 10 : 0;

    const trend = (current: number, previous: number): { delta: number; direction: 'up' | 'down' | 'flat' } => {
      if (previous === 0) return { delta: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' };
      const d = Math.round(((current - previous) / previous) * 100);
      return { delta: Math.abs(d), direction: d > 0 ? 'up' : d < 0 ? 'down' : 'flat' };
    };

    return NextResponse.json({
      kpis: {
        newLeads: { value: Number(kpiCurrent.new_leads || 0), trend: trend(Number(kpiCurrent.new_leads || 0), Number(kpiPrev.new_leads || 0)) },
        emailsSent: { value: sent, trend: trend(sent, prevSent) },
        openRate: { value: openRate, trend: trend(openRate, prevOpenRate) },
        replyRate: { value: replyRate, trend: trend(replyRate, prevReplyRate) },
        meetingsBooked: { value: Number(kpiCurrent.meetings_booked || 0), trend: trend(Number(kpiCurrent.meetings_booked || 0), Number(kpiPrev.meetings_booked || 0)) },
      },
      sparkline: emailSparkline,
      hotLeads,
      recentClicks,
      inboundLeads,
      meetings,
      sequenceProgress,
      linkedinTasks,
      activity,
      funnel: {
        totalLeads: Number(funnel.total_leads || 0),
        contacted: Number(funnel.contacted || 0),
        opened: Number(funnel.opened || 0),
        replied: Number(funnel.replied || 0),
        meetings: Number(funnel.meetings || 0),
        appointments: Number(funnel.appointments || 0),
      },
      emailPerformance,
      sectorBreakdown,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
