import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // All unsubscribed leads with full details
    const unsubscribedLeads = await sql`
      SELECT
        l.id, l.first_name, l.last_name, l.email, l.company, l.title,
        l.industry, l.sequence_type, l.sequence_step,
        l.enrolled_at, l.exited_at, l.unsubscribed_at,
        l.permanently_blocked, l.hubspot_id, l.linkedin_url
      FROM leads l
      WHERE l.sequence_status = 'unsubscribed'
         OR l.permanently_blocked = TRUE
      ORDER BY COALESCE(l.unsubscribed_at, l.exited_at) DESC
    `;

    // Unsubscribe timeline (last 90 days, by week)
    const timeline = await sql`
      SELECT
        date_trunc('week', COALESCE(unsubscribed_at, exited_at))::date as week_start,
        COUNT(*) as count
      FROM leads
      WHERE (sequence_status = 'unsubscribed' OR permanently_blocked = TRUE)
        AND COALESCE(unsubscribed_at, exited_at) >= NOW() - INTERVAL '90 days'
      GROUP BY date_trunc('week', COALESCE(unsubscribed_at, exited_at))
      ORDER BY week_start
    `;

    // By sector breakdown
    const bySector = await sql`
      SELECT
        COALESCE(sequence_type, 'unbekannt') as sector,
        COUNT(*) as count
      FROM leads
      WHERE sequence_status = 'unsubscribed' OR permanently_blocked = TRUE
      GROUP BY sequence_type
      ORDER BY count DESC
    `;

    // By sequence step (at which step did they unsubscribe?)
    const byStep = await sql`
      SELECT
        sequence_step as step,
        COUNT(*) as count
      FROM leads
      WHERE sequence_status = 'unsubscribed' OR permanently_blocked = TRUE
      GROUP BY sequence_step
      ORDER BY sequence_step
    `;

    // Total counts
    const totalUnsubscribed = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE sequence_status = 'unsubscribed' OR permanently_blocked = TRUE
    `;

    const totalPermanentlyBlocked = await sql`
      SELECT COUNT(*) as count FROM leads WHERE permanently_blocked = TRUE
    `;

    // Recent unsubscribes (last 7 days)
    const recentCount = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE (sequence_status = 'unsubscribed' OR permanently_blocked = TRUE)
        AND COALESCE(unsubscribed_at, exited_at) >= NOW() - INTERVAL '7 days'
    `;

    // Unsubscribe rate
    const totalContacted = await sql`
      SELECT COUNT(DISTINCT lead_id) as count FROM email_events WHERE event_type = 'sent'
    `;

    const unsubscribeRate = Number(totalContacted[0]?.count || 0) > 0
      ? Number(totalUnsubscribed[0]?.count || 0) / Number(totalContacted[0]?.count || 0)
      : 0;

    // By company domain
    const byDomain = await sql`
      SELECT
        CASE
          WHEN email LIKE '%@%' THEN split_part(email, '@', 2)
          ELSE 'unknown'
        END as domain,
        COUNT(*) as count,
        array_agg(company ORDER BY company) as companies
      FROM leads
      WHERE sequence_status = 'unsubscribed' OR permanently_blocked = TRUE
      GROUP BY domain
      HAVING COUNT(*) > 0
      ORDER BY count DESC
      LIMIT 20
    `;

    return NextResponse.json({
      leads: unsubscribedLeads.map((l) => ({
        id: l.id,
        first_name: l.first_name,
        last_name: l.last_name,
        email: l.email,
        company: l.company,
        title: l.title,
        industry: l.industry,
        sequence_type: l.sequence_type,
        sequence_step: l.sequence_step,
        enrolled_at: l.enrolled_at,
        exited_at: l.exited_at,
        unsubscribed_at: l.unsubscribed_at,
        permanently_blocked: l.permanently_blocked,
        hubspot_id: l.hubspot_id,
        linkedin_url: l.linkedin_url,
      })),
      stats: {
        total: Number(totalUnsubscribed[0]?.count || 0),
        permanently_blocked: Number(totalPermanentlyBlocked[0]?.count || 0),
        last_7_days: Number(recentCount[0]?.count || 0),
        unsubscribe_rate: unsubscribeRate,
      },
      timeline: timeline.map((r) => ({
        week_start: r.week_start,
        count: Number(r.count),
      })),
      by_sector: bySector.map((r) => ({
        sector: r.sector,
        count: Number(r.count),
      })),
      by_step: byStep.map((r) => ({
        step: Number(r.step),
        count: Number(r.count),
      })),
      by_domain: byDomain.map((r) => ({
        domain: r.domain,
        count: Number(r.count),
        companies: r.companies,
      })),
    });
  } catch (error) {
    console.error('Unsubscribes API error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}
