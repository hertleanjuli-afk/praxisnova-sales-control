import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/reports/hot-leads?week=current&min_score=9
 *
 * Woechentliche Hot Leads Liste (Issue #12)
 * Kriterien:
 * - Score >= 9
 * - signal_email_reply = true ODER signal_linkedin_interest = true
 * - Nicht geblockt oder unqualifiziert
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minScore = parseInt(searchParams.get('min_score') || '9', 10);
    const week = searchParams.get('week') || 'current';

    // Zeitraum bestimmen
    let dateFilter = '';
    if (week === 'current') {
      dateFilter = "AND l.created_at >= NOW() - INTERVAL '7 days'";
    }

    const hotLeads = await sql`
      SELECT
        l.id,
        l.first_name,
        l.last_name,
        l.email,
        l.phone,
        l.company,
        l.title,
        l.industry,
        l.employee_count,
        l.agent_score,
        l.pipeline_stage,
        l.signal_email_reply,
        l.signal_linkedin_interest,
        l.linkedin_url,
        l.website_url,
        l.pipeline_notes,
        l.created_at,
        CASE
          WHEN l.signal_email_reply = TRUE THEN 'Email-Antwort'
          WHEN l.signal_linkedin_interest = TRUE THEN 'LinkedIn-Interesse'
          ELSE 'Hoher Score'
        END as hot_reason
      FROM leads l
      WHERE l.agent_score >= ${minScore}
        AND (l.signal_email_reply = TRUE OR l.signal_linkedin_interest = TRUE OR l.agent_score >= 9)
        AND l.pipeline_stage NOT IN ('Blocked', 'Nicht qualifiziert')
        AND (l.permanently_blocked IS NULL OR l.permanently_blocked = FALSE)
      ORDER BY
        CASE WHEN l.signal_email_reply = TRUE THEN 0 ELSE 1 END,
        CASE WHEN l.signal_linkedin_interest = TRUE THEN 0 ELSE 1 END,
        l.agent_score DESC,
        l.created_at DESC
      LIMIT 25
    `;

    // Zusammenfassung
    const summary = {
      total: hotLeads.length,
      with_email_reply: hotLeads.filter((l: { signal_email_reply: boolean }) => l.signal_email_reply).length,
      with_linkedin_interest: hotLeads.filter((l: { signal_linkedin_interest: boolean }) => l.signal_linkedin_interest).length,
      with_phone: hotLeads.filter((l: { phone: string | null }) => l.phone).length,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      summary,
      hot_leads: hotLeads,
    });
  } catch (error) {
    console.error('Hot leads report error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Hot Leads Reports' },
      { status: 500 }
    );
  }
}
