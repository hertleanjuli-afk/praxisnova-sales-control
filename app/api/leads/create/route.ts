import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    first_name,
    last_name,
    email,
    company,
    phone,
    title,
    website_url,
    source,
    pipeline_stage,
    notes,
  } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Gueltige Email-Adresse ist erforderlich' }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    // Check for duplicates
    const existing = await sql`
      SELECT id, pipeline_stage FROM leads WHERE LOWER(email) = ${normalizedEmail} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: `Lead mit dieser Email existiert bereits (ID: ${existing[0].id}, Stage: ${existing[0].pipeline_stage})`,
          existingLeadId: existing[0].id,
        },
        { status: 409 },
      );
    }

    // Determine sequence_status based on pipeline_stage
    let sequenceStatus = 'active';
    if (pipeline_stage === 'Booked' || pipeline_stage === 'Customer') {
      sequenceStatus = 'completed';
    } else if (pipeline_stage === 'Blocked') {
      sequenceStatus = 'stopped_manual';
    } else if (pipeline_stage === 'Nicht qualifiziert' || pipeline_stage === 'Wieder aufnehmen') {
      sequenceStatus = 'completed';
    }

    const inserted = await sql`
      INSERT INTO leads (
        email, first_name, last_name, company, phone, title, website_url,
        source, pipeline_stage, pipeline_notes, manual_entry,
        sequence_status, exclude_from_sequences, created_at, updated_at
      ) VALUES (
        ${normalizedEmail},
        ${first_name?.trim() || null},
        ${last_name?.trim() || null},
        ${company?.trim() || null},
        ${phone?.trim() || null},
        ${title?.trim() || null},
        ${website_url?.trim() || null},
        ${source || 'manual'},
        ${pipeline_stage || 'Neu'},
        ${notes ? `Manuell angelegt: ${notes}` : 'Manuell angelegt via Dashboard'},
        true,
        ${sequenceStatus},
        ${pipeline_stage === 'Booked' || pipeline_stage === 'Customer'},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({ ok: true, leadId: inserted[0].id });
  } catch (error) {
    console.error('[leads/create] Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Leads' },
      { status: 500 },
    );
  }
}
