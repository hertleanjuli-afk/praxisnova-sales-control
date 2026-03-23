import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'week';

  let interval: string;
  switch (range) {
    case 'month':
      interval = '30 days';
      break;
    case 'quarter':
      interval = '90 days';
      break;
    case 'all':
      interval = '10 years';
      break;
    default:
      interval = '7 days';
  }

  try {
    // a) Weekly emails sent (last 12 weeks)
    const weekly_emails = await sql`
      SELECT date_trunc('week', created_at)::date as week, COUNT(*) as count
      FROM email_events WHERE event_type = 'sent'
      AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY week ORDER BY week
    `;

    // b) Open rate by sector
    const open_rate_by_sector = await sql`
      SELECT sequence_type as sector,
        COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opened
      FROM email_events
      WHERE created_at >= NOW() - ${interval}::interval
      GROUP BY sequence_type
    `;

    // c) Funnel: Lead -> Sent -> Opened -> Replied -> Meeting
    const totalLeads = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE created_at >= NOW() - ${interval}::interval
    `;
    const funnelSent = await sql`
      SELECT COUNT(DISTINCT lead_id) as count FROM email_events
      WHERE event_type = 'sent' AND created_at >= NOW() - ${interval}::interval
    `;
    const funnelOpened = await sql`
      SELECT COUNT(DISTINCT lead_id) as count FROM email_events
      WHERE event_type = 'opened' AND created_at >= NOW() - ${interval}::interval
    `;
    const funnelReplied = await sql`
      SELECT COUNT(DISTINCT lead_id) as count FROM email_events
      WHERE event_type = 'replied' AND created_at >= NOW() - ${interval}::interval
    `;
    const funnelBooked = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE sequence_status = 'booked' AND exited_at >= NOW() - ${interval}::interval
    `;

    const funnel = [
      { stage: 'Lead', count: Number(totalLeads[0]?.count || 0) },
      { stage: 'Gesendet', count: Number(funnelSent[0]?.count || 0) },
      { stage: 'Geöffnet', count: Number(funnelOpened[0]?.count || 0) },
      { stage: 'Geantwortet', count: Number(funnelReplied[0]?.count || 0) },
      { stage: 'Meeting', count: Number(funnelBooked[0]?.count || 0) },
    ];

    // d) LinkedIn weekly activity (last 12 weeks)
    const linkedin_weekly = await sql`
      SELECT date_trunc('week', linkedin_request_date)::date as week,
        COUNT(*) as requests
      FROM leads WHERE linkedin_request_date IS NOT NULL
      AND linkedin_request_date >= NOW() - INTERVAL '12 weeks'
      GROUP BY week ORDER BY week
    `;

    // e) Leads by sector (pie chart)
    const leads_by_sector = await sql`
      SELECT sequence_type as sector, COUNT(*) as count
      FROM leads
      WHERE sequence_type IS NOT NULL
      GROUP BY sequence_type
    `;

    // f) Meetings booked per week (last 12 weeks)
    const meetings_weekly = await sql`
      SELECT date_trunc('week', exited_at)::date as week, COUNT(*) as count
      FROM leads
      WHERE sequence_status = 'booked'
      AND exited_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY week ORDER BY week
    `;

    // g) Open rate by day of week
    const open_rate_by_day = await sql`
      SELECT EXTRACT(DOW FROM created_at) as day_of_week,
        COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opened
      FROM email_events GROUP BY day_of_week
    `;

    // h) Comparison: this week vs last week vs average
    const thisWeekStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opened,
        COUNT(*) FILTER (WHERE event_type = 'replied') as replied
      FROM email_events
      WHERE created_at >= date_trunc('week', NOW())
    `;
    const lastWeekStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opened,
        COUNT(*) FILTER (WHERE event_type = 'replied') as replied
      FROM email_events
      WHERE created_at >= date_trunc('week', NOW()) - INTERVAL '1 week'
        AND created_at < date_trunc('week', NOW())
    `;
    const avgStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opened,
        COUNT(*) FILTER (WHERE event_type = 'replied') as replied,
        GREATEST(EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 604800, 1) as weeks
      FROM email_events
    `;
    const thisWeekMeetings = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE sequence_status = 'booked' AND exited_at >= date_trunc('week', NOW())
    `;
    const lastWeekMeetings = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE sequence_status = 'booked'
        AND exited_at >= date_trunc('week', NOW()) - INTERVAL '1 week'
        AND exited_at < date_trunc('week', NOW())
    `;
    const avgMeetings = await sql`
      SELECT COUNT(*) as count,
        GREATEST(EXTRACT(EPOCH FROM (NOW() - MIN(exited_at))) / 604800, 1) as weeks
      FROM leads WHERE sequence_status = 'booked'
    `;

    const totalWeeks = Number(avgStats[0]?.weeks || 1);
    const meetingWeeks = Number(avgMeetings[0]?.weeks || 1);

    const comparison = {
      this_week: {
        sent: Number(thisWeekStats[0]?.sent || 0),
        opened: Number(thisWeekStats[0]?.opened || 0),
        replied: Number(thisWeekStats[0]?.replied || 0),
        meetings: Number(thisWeekMeetings[0]?.count || 0),
      },
      last_week: {
        sent: Number(lastWeekStats[0]?.sent || 0),
        opened: Number(lastWeekStats[0]?.opened || 0),
        replied: Number(lastWeekStats[0]?.replied || 0),
        meetings: Number(lastWeekMeetings[0]?.count || 0),
      },
      average: {
        sent: Math.round(Number(avgStats[0]?.sent || 0) / totalWeeks),
        opened: Math.round(Number(avgStats[0]?.opened || 0) / totalWeeks),
        replied: Math.round(Number(avgStats[0]?.replied || 0) / totalWeeks),
        meetings: Math.round(Number(avgMeetings[0]?.count || 0) / meetingWeeks),
      },
    };

    return NextResponse.json({
      weekly_emails: weekly_emails.map(r => ({ week: r.week, count: Number(r.count) })),
      open_rate_by_sector: open_rate_by_sector.map(r => ({
        sector: r.sector || 'unbekannt',
        sent: Number(r.sent),
        opened: Number(r.opened),
        rate: Number(r.sent) > 0 ? Math.round((Number(r.opened) / Number(r.sent)) * 100) : 0,
      })),
      funnel,
      linkedin_weekly: linkedin_weekly.map(r => ({ week: r.week, requests: Number(r.requests) })),
      leads_by_sector: leads_by_sector.map(r => ({ sector: r.sector || 'unbekannt', count: Number(r.count) })),
      meetings_weekly: meetings_weekly.map(r => ({ week: r.week, count: Number(r.count) })),
      open_rate_by_day: open_rate_by_day.map(r => ({
        day_of_week: Number(r.day_of_week),
        sent: Number(r.sent),
        opened: Number(r.opened),
        rate: Number(r.sent) > 0 ? Math.round((Number(r.opened) / Number(r.sent)) * 100) : 0,
      })),
      comparison,
      range,
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Performance-Daten' }, { status: 500 });
  }
}
