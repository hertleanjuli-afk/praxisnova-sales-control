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
  const period = searchParams.get('period') || 'week';

  let interval: string;
  switch (period) {
    case 'month':
      interval = '30 days';
      break;
    case 'all':
      interval = '10 years';
      break;
    default:
      interval = '7 days';
  }

  try {
    // KPI cards
    const leadsContacted = await sql`
      SELECT COUNT(DISTINCT lead_id) as count FROM email_events
      WHERE event_type = 'sent' AND created_at >= NOW() - ${interval}::interval
    `;

    const emailsSent = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'sent' AND created_at >= NOW() - ${interval}::interval
    `;

    const emailsFailed = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'failed' AND created_at >= NOW() - ${interval}::interval
    `;

    const unsubscribes = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'unsubscribed' AND created_at >= NOW() - ${interval}::interval
    `;

    const replies = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'replied' AND created_at >= NOW() - ${interval}::interval
    `;

    // Per-sector breakdown
    const sectorStats = await sql`
      SELECT
        e.sequence_type as sector,
        COUNT(*) FILTER (WHERE e.event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE e.event_type = 'failed') as failed,
        COUNT(*) FILTER (WHERE e.event_type = 'unsubscribed') as unsubscribes,
        COUNT(*) FILTER (WHERE e.event_type = 'replied') as replies,
        COUNT(DISTINCT e.lead_id) FILTER (WHERE e.event_type = 'sent') as leads
      FROM email_events e
      WHERE e.created_at >= NOW() - ${interval}::interval
      GROUP BY e.sequence_type
    `;

    const bySector: Record<string, { leads: number; sent: number; failed: number; unsubscribes: number; replies: number }> = {
      immobilien: { leads: 0, sent: 0, failed: 0, unsubscribes: 0, replies: 0 },
      handwerk: { leads: 0, sent: 0, failed: 0, unsubscribes: 0, replies: 0 },
      bauunternehmen: { leads: 0, sent: 0, failed: 0, unsubscribes: 0, replies: 0 },
    };

    for (const row of sectorStats) {
      if (bySector[row.sector]) {
        bySector[row.sector] = {
          leads: Number(row.leads),
          sent: Number(row.sent),
          failed: Number(row.failed),
          unsubscribes: Number(row.unsubscribes),
          replies: Number(row.replies),
        };
      }
    }

    // Call logs stats
    const callStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE result = 'reached') as reached,
        COUNT(*) FILTER (WHERE result = 'not_reached') as not_reached,
        COUNT(*) FILTER (WHERE result = 'voicemail') as voicemail,
        COUNT(*) FILTER (WHERE result = 'appointment') as appointment
      FROM call_logs
      WHERE call_date >= NOW() - ${interval}::interval
    `;

    // Manual stops
    const manualStops = await sql`
      SELECT COUNT(*) as count FROM stop_reasons
      WHERE created_at >= NOW() - ${interval}::interval
    `;

    // Stop reasons breakdown
    const stopReasonRows = await sql`
      SELECT reason, COUNT(*) as count FROM stop_reasons
      WHERE created_at >= NOW() - ${interval}::interval
      GROUP BY reason
      ORDER BY count DESC
    `;

    // LinkedIn connections
    const linkedinConns = await sql`
      SELECT COUNT(*) as count FROM linkedin_connections
      WHERE connected_at >= NOW() - ${interval}::interval
    `;

    const leadsContactedCount = Number(leadsContacted[0]?.count || 0);
    const appointmentsCount = Number(callStats[0]?.appointment || 0);
    const conversionRate = leadsContactedCount > 0
      ? Math.round((appointmentsCount / leadsContactedCount) * 10000) / 100
      : 0;

    return NextResponse.json({
      leads_contacted: leadsContactedCount,
      emails_sent: Number(emailsSent[0]?.count || 0),
      emails_failed: Number(emailsFailed[0]?.count || 0),
      unsubscribes: Number(unsubscribes[0]?.count || 0),
      replies: Number(replies[0]?.count || 0),
      by_sector: bySector,
      calls_total: Number(callStats[0]?.total || 0),
      calls_reached: Number(callStats[0]?.reached || 0),
      calls_not_reached: Number(callStats[0]?.not_reached || 0),
      calls_voicemail: Number(callStats[0]?.voicemail || 0),
      calls_appointment: appointmentsCount,
      manual_stops: Number(manualStops[0]?.count || 0),
      stop_reasons: stopReasonRows.map(r => ({ reason: r.reason, count: Number(r.count) })),
      linkedin_connections: Number(linkedinConns[0]?.count || 0),
      conversion_rate: conversionRate,
      period,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Analysen' }, { status: 500 });
  }
}
