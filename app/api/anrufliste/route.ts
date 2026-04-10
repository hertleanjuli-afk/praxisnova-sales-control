import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * GET /api/anrufliste?date=2026-04-06 OR ?week=15&year=2026
 * Taegliche oder woechentliche Anrufliste abrufen - zeigt call_queue mit Lead-Details
 *
 * Gibt die Ergebnisse sowohl als "items" (vom Frontend erwartet) als auch als
 * "entries" (Legacy) zurueck.
 */

const CALL_SELECT = `
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
    l.mobile_phone,
    l.title,
    l.industry,
    l.lead_score,
    l.lead_category,
    l.agent_score,
    l.sequence_step,
    l.sequence_type,
    l.sequence_status,
    l.pipeline_stage,
    l.outreach_step,
    l.source,
    l.total_call_attempts,
    l.signal_email_reply,
    l.signal_linkedin_interest,
    l.linkedin_url,
    l.linkedin_status,
    l.pipeline_notes,
    COALESCE(lt.message_sent, false) AS linkedin_message_sent,
    COALESCE(lt.reply_received, false) AS linkedin_reply_received,
    (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'opened') AS email_opens,
    (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'clicked') AS email_clicks
  FROM call_queue cq
  JOIN leads l ON cq.lead_id = l.id
  LEFT JOIN linkedin_tracking lt ON lt.lead_id = l.id
`;

function mapRow(r: any) {
  return {
    ...r,
    email_opens: Number(r.email_opens) || 0,
    email_clicks: Number(r.email_clicks) || 0,
    total_call_attempts: Number(r.total_call_attempts) || 0,
    signal_email_reply: !!r.signal_email_reply,
    signal_linkedin_interest: !!r.signal_linkedin_interest,
    linkedin_message_sent: !!r.linkedin_message_sent,
    linkedin_reply_received: !!r.linkedin_reply_received,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const week = searchParams.get('week');
    const year = searchParams.get('year');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let rows: any[] = [];

    if (week && year) {
      // Query by week number - convert week/year to date range (ISO-week, Mo-So)
      const weekYear = parseInt(year);
      const weekNum = parseInt(week);

      const jan4 = new Date(weekYear, 0, 4);
      const weekStart = new Date(jan4);
      weekStart.setDate(jan4.getDate() - jan4.getDay() + 1); // Get Monday
      weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      rows = await sql`
        SELECT
          cq.id, cq.lead_id, cq.queue_date, cq.rank, cq.priority_score,
          cq.reason_to_call, cq.talking_points, cq.conversation_guide,
          cq.best_time_to_call, cq.follow_up_action, cq.status, cq.called_at,
          cq.call_result, cq.call_notes, cq.created_at,
          l.first_name, l.last_name, l.company, l.email, l.phone, l.mobile_phone,
          l.title, l.industry, l.lead_score, l.lead_category, l.agent_score,
          l.sequence_step, l.sequence_type, l.sequence_status, l.pipeline_stage,
          l.outreach_step, l.source, l.total_call_attempts,
          l.signal_email_reply, l.signal_linkedin_interest,
          l.linkedin_url, l.linkedin_status, l.pipeline_notes,
          COALESCE(lt.message_sent, false) AS linkedin_message_sent,
          COALESCE(lt.reply_received, false) AS linkedin_reply_received,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'opened') AS email_opens,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'clicked') AS email_clicks
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        LEFT JOIN linkedin_tracking lt ON lt.lead_id = l.id
        WHERE cq.queue_date >= ${startDate}::date AND cq.queue_date <= ${endDate}::date
        ORDER BY cq.rank ASC
      `;
    } else if (status === 'called') {
      rows = await sql`
        SELECT
          cq.id, cq.lead_id, cq.queue_date, cq.rank, cq.priority_score,
          cq.reason_to_call, cq.talking_points, cq.conversation_guide,
          cq.best_time_to_call, cq.follow_up_action, cq.status, cq.called_at,
          cq.call_result, cq.call_notes, cq.created_at,
          l.first_name, l.last_name, l.company, l.email, l.phone, l.mobile_phone,
          l.title, l.industry, l.lead_score, l.lead_category, l.agent_score,
          l.sequence_step, l.sequence_type, l.sequence_status, l.pipeline_stage,
          l.outreach_step, l.source, l.total_call_attempts,
          l.signal_email_reply, l.signal_linkedin_interest,
          l.linkedin_url, l.linkedin_status, l.pipeline_notes,
          COALESCE(lt.message_sent, false) AS linkedin_message_sent,
          COALESCE(lt.reply_received, false) AS linkedin_reply_received,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'opened') AS email_opens,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'clicked') AS email_clicks
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        LEFT JOIN linkedin_tracking lt ON lt.lead_id = l.id
        WHERE cq.status = 'called' AND cq.called_at IS NOT NULL
        ORDER BY cq.called_at DESC
        LIMIT 100
      `;
    } else {
      const queryDate = date || new Date().toISOString().split('T')[0];
      rows = await sql`
        SELECT
          cq.id, cq.lead_id, cq.queue_date, cq.rank, cq.priority_score,
          cq.reason_to_call, cq.talking_points, cq.conversation_guide,
          cq.best_time_to_call, cq.follow_up_action, cq.status, cq.called_at,
          cq.call_result, cq.call_notes, cq.created_at,
          l.first_name, l.last_name, l.company, l.email, l.phone, l.mobile_phone,
          l.title, l.industry, l.lead_score, l.lead_category, l.agent_score,
          l.sequence_step, l.sequence_type, l.sequence_status, l.pipeline_stage,
          l.outreach_step, l.source, l.total_call_attempts,
          l.signal_email_reply, l.signal_linkedin_interest,
          l.linkedin_url, l.linkedin_status, l.pipeline_notes,
          COALESCE(lt.message_sent, false) AS linkedin_message_sent,
          COALESCE(lt.reply_received, false) AS linkedin_reply_received,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'opened') AS email_opens,
          (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'clicked') AS email_clicks
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        LEFT JOIN linkedin_tracking lt ON lt.lead_id = l.id
        WHERE cq.queue_date = ${queryDate}::date
        ORDER BY cq.rank ASC
      `;
    }

    const mapped = rows.map(mapRow);

    const stats = {
      total: mapped.length,
      ready: mapped.filter((r: any) => r.status === 'ready').length,
      called: mapped.filter((r: any) => r.status === 'called').length,
      reached: mapped.filter((r: any) => r.call_result === 'reached').length,
      not_reached: mapped.filter((r: any) => r.call_result === 'not_reached').length,
      voicemail: mapped.filter((r: any) => r.call_result === 'voicemail').length,
      booked: mapped.filter((r: any) => r.call_result === 'appointment').length,
    };

    // Return both "items" (vom Frontend erwartet) und "entries" (Legacy)
    return NextResponse.json({
      ok: true,
      date,
      items: mapped,
      entries: mapped,
      stats,
    });
  } catch (error) {
    console.error('Anrufliste GET error:', error);
    return NextResponse.json(
      { ok: false, error: 'Fehler beim Laden der Anrufliste', detail: String(error), items: [], entries: [] },
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
