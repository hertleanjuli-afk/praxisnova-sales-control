import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

interface CallbackLead {
  id: number;
  lead_id: number;
  callback_requested: boolean;
  callback_date: string;
  callback_time: string | null;
  callback_notes: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  mobile_phone: string | null;
  company: string;
  title: string | null;
  lead_category: string | null;
  agent_score: number | null;
  total_call_attempts: number;
  [key: string]: unknown;
}

interface CallbacksResponse {
  ok: boolean;
  callbacks: CallbackLead[];
  stats: {
    due_today: number;
    due_this_week: number;
    due_next_week: number;
    total: number;
  };
}

// GET /api/anrufliste/callbacks?range=7
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rangeStr = searchParams.get('range') || '7';
    const range = Math.max(1, Math.min(365, parseInt(rangeStr, 10)));

    // Fetch callbacks with lead details
    const callbacks = await sql`
      SELECT
        cd.id,
        cd.lead_id,
        cd.callback_requested,
        cd.callback_date,
        cd.callback_time,
        cd.callback_notes,
        cd.outcome,
        cd.created_at,
        cd.call_notes,
        l.first_name,
        l.last_name,
        l.email,
        l.phone,
        l.mobile_phone,
        l.company,
        l.title,
        l.lead_category,
        l.agent_score,
        l.total_call_attempts,
        l.pipeline_stage
      FROM call_dispositions cd
      JOIN call_queue cq ON cd.call_queue_id = cq.id
      JOIN leads l ON cd.lead_id = l.id
      WHERE cd.callback_requested = true
        AND cd.callback_date >= CURRENT_DATE
        AND cd.callback_date <= CURRENT_DATE + (${range}::TEXT || ' days')::INTERVAL
        AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
      ORDER BY cd.callback_date ASC, cd.callback_time ASC NULLS LAST
    `;

    // Calculate stats
    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE cd.callback_date = CURRENT_DATE) as due_today,
        COUNT(*) FILTER (WHERE cd.callback_date <= CURRENT_DATE + 7) as due_this_week,
        COUNT(*) FILTER (WHERE cd.callback_date BETWEEN CURRENT_DATE + 7 AND CURRENT_DATE + 14) as due_next_week,
        COUNT(*) as total
      FROM call_dispositions cd
      JOIN call_queue cq ON cd.call_queue_id = cq.id
      JOIN leads l ON cd.lead_id = l.id
      WHERE cd.callback_requested = true
        AND cd.callback_date >= CURRENT_DATE
        AND cd.callback_date <= CURRENT_DATE + (${range}::TEXT || ' days')::INTERVAL
        AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
    `;

    return NextResponse.json({
      ok: true,
      callbacks: callbacks as CallbackLead[],
      stats: {
        due_today: stats.due_today || 0,
        due_this_week: stats.due_this_week || 0,
        due_next_week: stats.due_next_week || 0,
        total: stats.total || 0,
      },
    } as CallbacksResponse);
  } catch (error) {
    console.error('[anrufliste/callbacks] GET error:', error);
    return NextResponse.json(
      { ok: false, error: 'Interner Fehler beim Abrufen der Callbacks' },
      { status: 500 }
    );
  }
}

// PATCH /api/anrufliste/callbacks?id=[dispositionId]
// Update callback_date, callback_time, callback_notes
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dispositionIdStr = searchParams.get('id');

    if (!dispositionIdStr) {
      return NextResponse.json(
        { ok: false, error: 'Query-Parameter "id" ist erforderlich' },
        { status: 400 }
      );
    }

    const dispositionId = parseInt(dispositionIdStr, 10);
    if (isNaN(dispositionId)) {
      return NextResponse.json(
        { ok: false, error: 'Ungueltige Disposition-ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { callback_date, callback_time, callback_notes } = body;

    // Validate that at least one field is being updated
    if (
      callback_date === undefined &&
      callback_time === undefined &&
      callback_notes === undefined
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Mindestens ein Feld (callback_date, callback_time oder callback_notes) ist erforderlich',
        },
        { status: 400 }
      );
    }

    // Validate callback_date format if provided
    if (callback_date !== undefined && callback_date !== null) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(callback_date)) {
        return NextResponse.json(
          { ok: false, error: 'callback_date muss im Format YYYY-MM-DD sein' },
          { status: 400 }
        );
      }
    }

    // Validate callback_time format if provided
    if (callback_time !== undefined && callback_time !== null) {
      const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
      if (!timeRegex.test(callback_time)) {
        return NextResponse.json(
          { ok: false, error: 'callback_time muss im Format HH:MM oder HH:MM:SS sein' },
          { status: 400 }
        );
      }
    }

    // Check if disposition exists
    const [existing] = await sql`
      SELECT id FROM call_dispositions WHERE id = ${dispositionId}
    `;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Disposition nicht gefunden' },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates: { [key: string]: unknown } = {};
    if (callback_date !== undefined) {
      updates.callback_date = callback_date;
    }
    if (callback_time !== undefined) {
      updates.callback_time = callback_time;
    }
    if (callback_notes !== undefined) {
      updates.callback_notes = callback_notes;
    }

    // Execute update
    const [updated] = await sql`
      UPDATE call_dispositions
      SET ${sql(updates)}
      WHERE id = ${dispositionId}
      RETURNING id, callback_date, callback_time, callback_notes, callback_requested
    `;

    return NextResponse.json({
      ok: true,
      updated: updated || null,
    });
  } catch (error) {
    console.error('[anrufliste/callbacks] PATCH error:', error);
    return NextResponse.json(
      { ok: false, error: 'Interner Fehler beim Aktualisieren der Callback' },
      { status: 500 }
    );
  }
}
