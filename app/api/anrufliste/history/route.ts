// ============================================================
// GET /api/anrufliste/history
// Erledigte und gestoppte Anrufe - historische Ansicht
// Query: ?week=15&year=2026 oder ?range=30 (Tage)
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const week = searchParams.get('week');
  const year = searchParams.get('year');
  const range = searchParams.get('range') || '30';

  try {
    let calls;

    if (week && year) {
      // Bestimmte Kalenderwoche laden
      calls = await sql`
        SELECT
          cq.id,
          cq.lead_id,
          cq.queue_date,
          cq.rank,
          cq.reason_to_call,
          cq.status,
          cq.called_at,
          cq.call_result,
          cq.call_notes,
          cq.source,
          cq.linkedin_trigger,
          cq.call_attempt_number,
          cq.week_number,
          cq.week_year,
          l.first_name,
          l.last_name,
          l.email,
          l.phone,
          l.mobile_phone,
          l.company,
          l.title,
          l.industry,
          l.lead_category,
          l.agent_score,
          l.pipeline_stage,
          l.outreach_step,
          cd.answered_by,
          cd.outcome,
          cd.call_duration_seconds,
          cd.close_contact,
          cd.close_until_date,
          cd.callback_requested,
          cd.callback_date,
          cd.referred_to_name,
          cd.referred_to_phone,
          cd.referred_to_role,
          cd.notes as disposition_notes,
          cd.created_at as disposition_date
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        LEFT JOIN call_dispositions cd ON cd.call_queue_id = cq.id
        WHERE cq.week_number = ${Number(week)}
        AND cq.week_year = ${Number(year)}
        AND cq.status IN ('called', 'skipped')
        ORDER BY cq.called_at DESC NULLS LAST, cq.rank ASC
      `;
    } else {
      // Letzte N Tage
      const days = Math.max(1, Math.min(365, Number(range)));
      calls = await sql`
        SELECT
          cq.id,
          cq.lead_id,
          cq.queue_date,
          cq.rank,
          cq.reason_to_call,
          cq.status,
          cq.called_at,
          cq.call_result,
          cq.call_notes,
          cq.source,
          cq.linkedin_trigger,
          cq.call_attempt_number,
          cq.week_number,
          cq.week_year,
          l.first_name,
          l.last_name,
          l.email,
          l.phone,
          l.mobile_phone,
          l.company,
          l.title,
          l.industry,
          l.lead_category,
          l.agent_score,
          l.pipeline_stage,
          l.outreach_step,
          cd.answered_by,
          cd.outcome,
          cd.call_duration_seconds,
          cd.close_contact,
          cd.close_until_date,
          cd.callback_requested,
          cd.callback_date,
          cd.referred_to_name,
          cd.referred_to_phone,
          cd.referred_to_role,
          cd.notes as disposition_notes,
          cd.created_at as disposition_date
        FROM call_queue cq
        JOIN leads l ON cq.lead_id = l.id
        LEFT JOIN call_dispositions cd ON cd.call_queue_id = cq.id
        WHERE cq.queue_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND cq.status IN ('called', 'skipped')
        ORDER BY cq.called_at DESC NULLS LAST
      `;
    }

    // Gruppierung nach KW
    const groupedByWeek: Record<string, typeof calls> = {};
    for (const call of calls) {
      const key = `KW${call.week_number}-${call.week_year}`;
      if (!groupedByWeek[key]) groupedByWeek[key] = [];
      groupedByWeek[key].push(call);
    }

    // Statistiken berechnen
    const totalCalls = calls.length;
    const connected = calls.filter((c: { outcome?: string }) =>
      c.outcome && !['nicht_erreicht', 'mailbox', 'besetzt', 'falsche_nummer'].includes(c.outcome)
    ).length;
    const booked = calls.filter((c: { outcome?: string }) => c.outcome === 'termin_gebucht').length;
    const noAnswer = calls.filter((c: { outcome?: string }) =>
      ['nicht_erreicht', 'mailbox', 'besetzt'].includes(c.outcome || '')
    ).length;

    // Weeks-Liste fuer Navigation
    const weeksInData = [...new Set(calls.map((c: { week_number: number; week_year: number }) =>
      `${c.week_year}-${String(c.week_number).padStart(2, '0')}`
    ))].sort().reverse();

    return NextResponse.json({
      ok: true,
      calls,
      grouped_by_week: groupedByWeek,
      weeks_available: weeksInData,
      stats: {
        total: totalCalls,
        connected,
        booked,
        no_answer: noAnswer,
        connection_rate: totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0,
        booking_rate: connected > 0 ? Math.round((booked / connected) * 100) : 0,
      },
    });

  } catch (error) {
    console.error('[anrufliste/history] Fehler:', error);
    return NextResponse.json({ ok: false, error: 'Interner Fehler' }, { status: 500 });
  }
}
