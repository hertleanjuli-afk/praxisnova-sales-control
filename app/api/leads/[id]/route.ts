import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

/**
 * PATCH /api/leads/[id]
 *
 * Update lead fields from the lead detail page (saveEdit).
 * Accepts optional fields: lead_category, mobile_phone, pipeline_stage,
 * pipeline_notes, exclude_from_sequences.
 *
 * Pipeline-stage side effects:
 *  - Booked -> sequence_status = 'completed'
 *  - Lost / Blocked -> sequence_status = 'stopped_manual'
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const leadId = parseInt(params.id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Ungueltige Lead-ID' }, { status: 400 });
    }

    const body = await req.json();
    const {
      lead_category,
      mobile_phone,
      pipeline_stage,
      pipeline_notes,
      exclude_from_sequences,
    } = body as {
      lead_category?: string;
      mobile_phone?: string;
      pipeline_stage?: string;
      pipeline_notes?: string;
      exclude_from_sequences?: boolean;
    };

    // At least one field must be provided
    if (
      lead_category === undefined &&
      mobile_phone === undefined &&
      pipeline_stage === undefined &&
      pipeline_notes === undefined &&
      exclude_from_sequences === undefined
    ) {
      return NextResponse.json(
        { error: 'Mindestens ein Feld ist erforderlich' },
        { status: 400 }
      );
    }

    // Determine sequence_status side-effect based on pipeline_stage
    let sequenceStatus: string | undefined;
    if (pipeline_stage !== undefined) {
      const stageLower = pipeline_stage.toLowerCase();
      if (stageLower === 'booked') {
        sequenceStatus = 'completed';
      } else if (stageLower === 'lost' || stageLower === 'blocked') {
        sequenceStatus = 'stopped_manual';
      }
    }

    // Build SET clause fragments and values
    const setClauses: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (lead_category !== undefined) {
      setClauses.push(`lead_category = $${idx}`);
      vals.push(lead_category);
      idx++;
    }
    if (mobile_phone !== undefined) {
      setClauses.push(`mobile_phone = $${idx}`);
      vals.push(mobile_phone);
      idx++;
    }
    if (pipeline_stage !== undefined) {
      setClauses.push(`pipeline_stage = $${idx}`);
      vals.push(pipeline_stage);
      idx++;
      setClauses.push(`pipeline_stage_updated_at = NOW()`);
    }
    if (pipeline_notes !== undefined) {
      setClauses.push(`pipeline_notes = $${idx}`);
      vals.push(pipeline_notes);
      idx++;
    }
    if (exclude_from_sequences !== undefined) {
      setClauses.push(`exclude_from_sequences = $${idx}`);
      vals.push(exclude_from_sequences);
      idx++;
    }
    if (sequenceStatus !== undefined) {
      setClauses.push(`sequence_status = $${idx}`);
      vals.push(sequenceStatus);
      idx++;
    }

    // Use tagged template for each supported field combination.
    // Neon's tagged-template driver does not support dynamic column lists,
    // so we update every target column using COALESCE to keep unchanged
    // values intact.
    const result = await sql`
      UPDATE leads SET
        lead_category        = COALESCE(${lead_category ?? null},        lead_category),
        mobile_phone         = COALESCE(${mobile_phone ?? null},         mobile_phone),
        pipeline_stage       = COALESCE(${pipeline_stage ?? null},       pipeline_stage),
        pipeline_notes       = COALESCE(${pipeline_notes ?? null},       pipeline_notes),
        exclude_from_sequences = COALESCE(${exclude_from_sequences ?? null}, exclude_from_sequences),
        sequence_status      = COALESCE(${sequenceStatus ?? null},       sequence_status),
        pipeline_stage_updated_at = CASE
          WHEN ${pipeline_stage ?? null} IS NOT NULL THEN NOW()
          ELSE pipeline_stage_updated_at
        END
      WHERE id = ${leadId}
      RETURNING id
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Lead nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: result[0].id });
  } catch (error) {
    console.error('PATCH /api/leads/[id] error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
