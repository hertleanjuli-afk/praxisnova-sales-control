import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * POST /api/leads/[id]/book
 * Markiert einen Lead als "Termin gebucht" (Issue #8)
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

    await sql`
      UPDATE leads SET
        pipeline_stage = 'Booked',
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Termin gebucht am ', NOW()::text
        )
      WHERE id = ${leadId}
    `;

    // Aktive Sequences stoppen (Termin gebucht = kein weiterer Outreach noetig)
    await sql`
      UPDATE sequence_entries SET
        status = 'completed',
        stopped_at = NOW()
      WHERE lead_id = ${leadId}
        AND status IN ('active', 'pending', 'paused')
    `;

    return NextResponse.json({ ok: true, lead_id: leadId, new_stage: 'Booked' });
  } catch (error) {
    console.error('Book lead error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler beim Buchen' },
      { status: 500 }
    );
  }
}
