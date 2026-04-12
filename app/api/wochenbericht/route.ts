import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

/**
 * Wochenbericht API - Detaillierte Lead-Timeline der aktuellen Woche
 *
 * Antwortet Angies Frage: "Wie viele Leads wurden diese Woche hinzugefuegt,
 * wie viele wurden per Email kontaktiert, wann wurden sie in die Sequenz
 * aufgenommen?"
 *
 * Query Params:
 *   ?period=week (default) | last7 | today
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    // Zeit-Window berechnen (Berlin-Zeit, Montag als Wochenstart)
    let periodStart: Date;
    const now = new Date();
    if (period === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'last7') {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      // Aktuelle Woche (Montag 00:00 Berlin-Zeit)
      const day = now.getDay(); // 0 = Sonntag, 1 = Montag
      const daysSinceMonday = day === 0 ? 6 : day - 1;
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
    }
    const periodStartIso = periodStart.toISOString();

    // KPIs: Neue Leads, Kontaktierte Leads, Sequenz-Aufnahmen
    const [kpis] = await sql`
      SELECT
        (SELECT COUNT(*) FROM leads WHERE created_at >= ${periodStartIso}::timestamptz) AS new_leads,
        (SELECT COUNT(DISTINCT lead_id) FROM email_events
          WHERE event_type = 'sent' AND created_at >= ${periodStartIso}::timestamptz) AS contacted_leads,
        (SELECT COUNT(*) FROM leads
          WHERE enrolled_at IS NOT NULL AND enrolled_at >= ${periodStartIso}::timestamptz) AS enrolled_leads,
        (SELECT COUNT(*) FROM email_events
          WHERE event_type = 'sent' AND created_at >= ${periodStartIso}::timestamptz) AS total_emails_sent,
        (SELECT COUNT(*) FROM email_events
          WHERE event_type = 'opened' AND created_at >= ${periodStartIso}::timestamptz) AS total_emails_opened,
        (SELECT COUNT(*) FROM email_events
          WHERE event_type = 'replied' AND created_at >= ${periodStartIso}::timestamptz) AS total_emails_replied,
        (SELECT COUNT(*) FROM leads
          WHERE sequence_status = 'booked' AND exited_at >= ${periodStartIso}::timestamptz) AS meetings_booked
    `;

    // Detailliertes Board: Jeder neue Lead mit Timeline
    // Zeigt: wann hinzugefuegt, wann in Sequenz aufgenommen, wann erste Email,
    // wie viele Emails insgesamt, letzter Event-Typ
    const leadsBoard = await sql`
      SELECT
        l.id,
        l.first_name,
        l.last_name,
        l.email,
        l.company,
        l.title,
        l.sequence_type,
        l.sequence_status,
        l.sequence_step,
        l.source,
        l.created_at,
        l.enrolled_at,
        (SELECT MIN(created_at) FROM email_events
          WHERE lead_id = l.id AND event_type = 'sent') AS first_email_sent_at,
        (SELECT MAX(created_at) FROM email_events
          WHERE lead_id = l.id AND event_type = 'sent') AS last_email_sent_at,
        (SELECT COUNT(*) FROM email_events
          WHERE lead_id = l.id AND event_type = 'sent') AS emails_sent_count,
        (SELECT COUNT(*) FROM email_events
          WHERE lead_id = l.id AND event_type = 'opened') AS emails_opened_count,
        (SELECT COUNT(*) FROM email_events
          WHERE lead_id = l.id AND event_type = 'replied') AS emails_replied_count
      FROM leads l
      WHERE l.created_at >= ${periodStartIso}::timestamptz
      ORDER BY l.created_at DESC
      LIMIT 500
    `;

    // Sektor-Breakdown fuer die Woche
    const sectorBreakdown = await sql`
      SELECT
        COALESCE(sequence_type, 'allgemein') AS sector,
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE enrolled_at IS NOT NULL) AS enrolled_count
      FROM leads
      WHERE created_at >= ${periodStartIso}::timestamptz
      GROUP BY sequence_type
      ORDER BY count DESC
    `;

    // Tages-Timeline: wie viele Leads pro Tag in der Woche
    const dailyTimeline = await sql`
      SELECT
        DATE(created_at AT TIME ZONE 'Europe/Berlin') AS day,
        COUNT(*) AS new_leads,
        COUNT(*) FILTER (WHERE enrolled_at IS NOT NULL) AS enrolled,
        COUNT(*) FILTER (WHERE source = 'inbound' OR sequence_type = 'inbound') AS inbound
      FROM leads
      WHERE created_at >= ${periodStartIso}::timestamptz
      GROUP BY day
      ORDER BY day
    `;

    // Email-Events pro Tag
    const emailTimeline = await sql`
      SELECT
        DATE(created_at AT TIME ZONE 'Europe/Berlin') AS day,
        COUNT(*) FILTER (WHERE event_type = 'sent') AS sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') AS opened,
        COUNT(*) FILTER (WHERE event_type = 'replied') AS replied
      FROM email_events
      WHERE created_at >= ${periodStartIso}::timestamptz
      GROUP BY day
      ORDER BY day
    `;

    return NextResponse.json({
      period,
      periodStart: periodStartIso,
      generatedAt: new Date().toISOString(),
      kpis: {
        newLeads: Number(kpis.new_leads) || 0,
        contactedLeads: Number(kpis.contacted_leads) || 0,
        enrolledLeads: Number(kpis.enrolled_leads) || 0,
        totalEmailsSent: Number(kpis.total_emails_sent) || 0,
        totalEmailsOpened: Number(kpis.total_emails_opened) || 0,
        totalEmailsReplied: Number(kpis.total_emails_replied) || 0,
        meetingsBooked: Number(kpis.meetings_booked) || 0,
      },
      leadsBoard: leadsBoard.map((l: any) => ({
        id: l.id,
        firstName: l.first_name,
        lastName: l.last_name,
        email: l.email,
        company: l.company,
        title: l.title,
        sector: l.sequence_type || 'allgemein',
        sequenceStatus: l.sequence_status,
        sequenceStep: Number(l.sequence_step) || 0,
        source: l.source,
        createdAt: l.created_at,
        enrolledAt: l.enrolled_at,
        firstEmailSentAt: l.first_email_sent_at,
        lastEmailSentAt: l.last_email_sent_at,
        emailsSent: Number(l.emails_sent_count) || 0,
        emailsOpened: Number(l.emails_opened_count) || 0,
        emailsReplied: Number(l.emails_replied_count) || 0,
      })),
      sectorBreakdown: sectorBreakdown.map((s: any) => ({
        sector: s.sector,
        count: Number(s.count),
        enrolledCount: Number(s.enrolled_count),
      })),
      dailyTimeline: dailyTimeline.map((d: any) => ({
        day: d.day,
        newLeads: Number(d.new_leads),
        enrolled: Number(d.enrolled),
        inbound: Number(d.inbound),
      })),
      emailTimeline: emailTimeline.map((d: any) => ({
        day: d.day,
        sent: Number(d.sent),
        opened: Number(d.opened),
        replied: Number(d.replied),
      })),
    });
  } catch (error) {
    console.error('[wochenbericht] Error:', error);
    return NextResponse.json(
      { error: 'Wochenbericht konnte nicht geladen werden', detail: String(error) },
      { status: 500 },
    );
  }
}
