import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * POST /api/leads/[id]/pause
 * OOO Handling - Sequence pausieren (Issue #9)
 *
 * Body: {
 *   resume_date: '2026-04-15', // Datum der Rueckkehr
 *   reason?: 'ooo' | 'manual_pause'
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = parseInt(params.id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Ungueltige Lead-ID' }, { status: 400 });
    }

    const body = await req.json();
    const { resume_date, reason = 'ooo' } = body;

    if (!resume_date) {
      return NextResponse.json(
        { error: 'resume_date ist erforderlich (Format: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Lead pausieren - direkt in leads-Tabelle
    await sql`
      UPDATE leads SET
        sequence_status = 'paused',
        paused_at = NOW(),
        resume_at = ${resume_date}::timestamp,
        pause_reason = ${reason},
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Pausiert (', ${reason}, ') bis ', ${resume_date}, ' am ', NOW()::text
        )
      WHERE id = ${leadId}
    `;

    return NextResponse.json({
      ok: true,
      lead_id: leadId,
      resume_date,
      reason,
    });
  } catch (error) {
    console.error('Pause lead error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler beim Pausieren' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id]/pause
 * Pause aufheben (fruehzeitige Rueckkehr)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = parseInt(params.id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Ungueltige Lead-ID' }, { status: 400 });
    }

    // Pause aufheben - Lead wieder aktivieren
    await sql`
      UPDATE leads SET
        sequence_status = 'active',
        paused_at = NULL,
        resume_at = NULL,
        pause_reason = NULL,
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Pause aufgehoben am ', NOW()::text
        )
      WHERE id = ${leadId}
    `;

    return NextResponse.json({
      ok: true,
      lead_id: leadId,
    });
  } catch (error) {
    console.error('Resume lead error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler beim Fortsetzen' },
      { status: 500 }
    );
  }
}
