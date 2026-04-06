import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Ensure required columns exist (runs once per cold start)
let columnsReady = false;
async function ensurePauseColumns() {
  if (columnsReady) return;
  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pause_reason TEXT`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_notes TEXT`;
    columnsReady = true;
  } catch (e) {
    console.error('ensurePauseColumns error:', e);
  }
}

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
    await ensurePauseColumns();

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
      { error: 'Interner Fehler beim Pausieren: ' + (error instanceof Error ? error.message : String(error)) },
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
    await ensurePauseColumns();

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
      { error: 'Interner Fehler beim Fortsetzen: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
