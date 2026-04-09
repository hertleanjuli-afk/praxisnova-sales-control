import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * GET /api/anrufliste?date=2026-04-06 OR ?week=15&year=2026
 * Taegliche oder woechentliche Anrufliste abrufen - zeigt call_queue mit Lead-Details
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const week = searchParams.get('week');
    const year = searchParams.get('year');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let rows: any[] = [];

    if (week && year) {
      // Query by week number - convert week/year to date range
      // ISO week starts on Monday, we need to find Monday of that week in that year
      const weekYear = parseInt(year);
      const weekNum = parseInt(week);

      // Calculate the Monday of the given ISO week
      const jan4 = new Date(weekYear, 0, 4);
      const weekStart = new Date(jan4);
      weekStart.setDate(jan4.getDate() - jan4.getDay() + 1); // Get Monday
      weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      rows = await sql`
        SELECT
          cq.id,
          cq.lead_id,
          cq.queue_date,
          cq.rank,
          cq.priority_score,
          cq.reason_to_call,
          cq.talking_points,
          cq.conversation_guide,
          cq.best_time_to_call,
          cq.follow_up_action,
          cq.status,
          cq.called_at,
          cq.call_result,
          cq.call_notes,
          cq.created_at,
          l.first_name,
          l.last_name,
          l.company,
          l.email,
          l.phone,
          l.title,
          l.industry,
          l.lead_score,
          l.agent_score,
          l.sequence_step,
          l.sequence_type,
          l.sequence_status,
          l.pipeline_stage,
          l.signal_email_reply,
          l.signal_linkedin_interest,
          l.linkedin_url,
          l.pipeline_notes
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        WHERE cq.queue_date >= ${startDate}::date AND cq.queue_date <= ${endDate}::date
        ORDER BY cq.rank ASC
      `;
    } else if (status === 'called') {
      // Query for called history
      rows = await sql`
        SELECT
          cq.id,
          cq.lead_id,
          cq.queue_date,
          cq.rank,
          cq.priority_score,
          cq.reason_to_call,
          cq.talking_points,
          cq.conversation_guide,
          cq.best_time_to_call,
          cq.follow_up_action,
          cq.status,
          cq.called_at,
          cq.call_result,
          cq.call_notes,
          cq.created_at,
          l.first_name,
          l.last_name,
          l.company,
          l.email,
          l.phone,
          l.title,
          l.industry,
          l.lead_score,
          l.agent_score,
          l.sequence_step,
          l.sequence_type,
          l.sequence_status,
          l.pipeline_stage,
          l.signal_email_reply,
          l.signal_linkedin_interest,
          l.linkedin_url,
          l.pipeline_notes
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        WHERE cq.status = 'called' AND cq.called_at IS NOT NULL
        ORDER BY cq.called_at DESC
        LIMIT 100
      `;
    } else {
      // Query by specific date or default to today
      const queryDate = date || new Date().toISOString().split('T')[0];
      rows = await sql`
        SELECT
          cq.id,
          cq.lead_id,
          cq.queue_date,
          cq.rank,
          cq.priority_score,
          cq.reason_to_call,
          cq.talking_points,
          cq.conversation_guide,
          cq.best_time_to_call,
          cq.follow_up_action,
          cq.status,
          cq.called_at,
          cq.call_result,
          cq.call_notes,
          cq.created_at,
          l.first_name,
          l.last_name,
          l.company,
          l.email,
          l.phone,
          l.title,
          l.industry,
          l.lead_score,
          l.agent_score,
          l.sequence_step,
          l.sequence_type,
          l.sequence_status,
          l.pipeline_stage,
          l.signal_email_reply,
          l.signal_linkedin_interest,
          l.linkedin_url,
          l.pipeline_notes
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        WHERE cq.queue_date = ${queryDate}::date
        ORDER BY cq.rank ASC
      `;
    }

    // Statistiken fuer den Tag
    const stats = {
      total: rows.length,
      ready: rows.filter((r: Record<string, unknown>) => r.status === 'ready').length,
      called: rows.filter((r: Record<string, unknown>) => r.status === 'called').length,
      reached: rows.filter((r: Record<string, unknown>) => r.call_result === 'reached').length,
      not_reached: rows.filter((r: Record<string, unknown>) => r.call_result === 'not_reached').length,
      voicemail: rows.filter((r: Record<string, unknown>) => r.call_result === 'voicemail').length,
      booked: rows.filter((r: Record<string, unknown>) => r.call_result === 'appointment').length,
    };

    return NextResponse.json({ ok: true, date, entries: rows, stats });
  } catch (error) {
    console.error('Anrufliste GET error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Anrufliste' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/anrufliste
 * Manuell einen Lead zur Anrufliste hinzufuegen
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead_id, reason_to_call, talking_points, conversation_guide } = body;

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id ist erforderlich' }, { status: 400 });
    }

    // Pruefen ob Lead existiert und Telefon hat
    const leadRows = await sql`
      SELECT id, phone, first_name, last_name, company, industry
      FROM leads WHERE id = ${lead_id}
    `;
    if (leadRows.length === 0) {
      return NextResponse.json({ error: 'Lead nicht gefunden' }, { status: 404 });
    }
    if (!leadRows[0].phone) {
      return NextResponse.json({ error: 'Lead hat keine Telefonnummer' }, { status: 400 });
    }

    // Naechsten Rang ermitteln
    const rankRows = await sql`
      SELECT COALESCE(MAX(rank), 0) + 1 as next_rank
      FROM call_queue
      WHERE queue_date = CURRENT_DATE
    `;
    const nextRank = rankRows[0].next_rank;

    await sql`
      INSERT INTO call_queue (lead_id, queue_date, rank, reason_to_call, talking_points, conversation_guide, generated_by)
      VALUES (${lead_id}, CURRENT_DATE, ${nextRank}, ${reason_to_call || ''}, ${talking_points || ''}, ${conversation_guide || ''}, 'manual')
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ ok: true, lead_id, rank: nextRank });
  } catch (error) {
    console.error('Anrufliste POST error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hinzufuegen zur Anrufliste' },
      { status: 500 }
    );
  }
}
