import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getBlockDuration, OUTREACH_CONFIG } from '@/lib/config/outreach-rules';

/**
 * POST /api/leads/[id]/block
 *
 * Body: {
 *   reason: 'no_interest' | 'wrong_timing' | 'manual_stop' | 'replied' | 'company_block',
 *   duration_months?: number,  // optional, ueberschreibt Standard
 *   notes?: string,
 *   block_company?: boolean    // default: true
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
    const {
      reason,
      duration_months,
      notes = '',
      block_company = true,
    } = body;

    // Validierung
    const validReasons = Object.values(OUTREACH_CONFIG.blockReasons);
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Ungueltiger Grund. Erlaubt: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    // Block-Dauer berechnen
    const effectiveDuration = duration_months || getBlockDuration(reason);

    // 1. Lead blockieren
    const newStage = reason === 'replied' ? 'Replied' : 'Blocked';
    await sql`
      UPDATE leads SET
        pipeline_stage = ${newStage},
        block_reason = ${reason},
        blocked_until = NOW() + INTERVAL '1 month' * ${effectiveDuration},
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Blocked: ', ${reason},
          ' (', ${effectiveDuration}::text, ' Monate)',
          ' am ', NOW()::text,
          CASE WHEN ${notes} != '' THEN CONCAT(' - ', ${notes}) ELSE '' END
        )
      WHERE id = ${leadId}
    `;

    let companyBlockCount = 0;

    // 2. Firmenweite Blockierung (Issue #7)
    if (block_company) {
      const leadRow = await sql`SELECT company FROM leads WHERE id = ${leadId}`;

      if (leadRow.length > 0 && leadRow[0].company) {
        const companyName = leadRow[0].company;

        const result = await sql`
          UPDATE leads SET
            pipeline_stage = 'Blocked',
            block_reason = 'company_block',
            blocked_until = NOW() + INTERVAL '1 month' * ${effectiveDuration},
            pipeline_notes = CONCAT(
              COALESCE(pipeline_notes, ''),
              ' | Firmen-Block: Anderer Kontakt ',
              ${reason},
              ' am ', NOW()::text
            )
          WHERE LOWER(company) = LOWER(${companyName})
            AND id != ${leadId}
            AND pipeline_stage NOT IN ('Replied', 'Booked', 'Customer')
        `;
        companyBlockCount = result.count || 0;

        // Auch aus aktiven Sequences entfernen
        await sql`
          UPDATE sequence_entries SET
            status = 'blocked',
            stopped_at = NOW()
          WHERE lead_id IN (
            SELECT id FROM leads
            WHERE LOWER(company) = LOWER(${companyName})
          )
          AND status IN ('active', 'pending', 'paused')
        `;
      }
    }

    return NextResponse.json({
      ok: true,
      lead_id: leadId,
      reason,
      duration_months: effectiveDuration,
      new_stage: newStage,
      company_leads_blocked: companyBlockCount,
    });
  } catch (error) {
    console.error('Block lead error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler beim Blockieren' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id]/block
 * Blockierung aufheben
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

    await sql`
      UPDATE leads SET
        pipeline_stage = 'Neu',
        block_reason = NULL,
        blocked_until = NULL,
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Block aufgehoben am ', NOW()::text
        )
      WHERE id = ${leadId}
    `;

    return NextResponse.json({ ok: true, lead_id: leadId });
  } catch (error) {
    console.error('Unblock lead error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler beim Entsperren' },
      { status: 500 }
    );
  }
}
