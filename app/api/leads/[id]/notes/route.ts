import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

/**
 * POST /api/leads/[id]/notes
 *
 * Append a manual note to pipeline_notes for a lead.
 * Called by the lead detail page's saveNote() function.
 *
 * Body: { note: string }
 */
export async function POST(
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
    const { note } = body as { note?: string };

    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'Notiz darf nicht leer sein' }, { status: 400 });
    }

    const noteText = note.trim();

    const result = await sql`
      UPDATE leads
      SET pipeline_notes = CONCAT(
        COALESCE(pipeline_notes, ''),
        ' | [Manual note] ',
        ${noteText},
        ' (',
        NOW()::text,
        ')'
      )
      WHERE id = ${leadId}
      RETURNING id
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Lead nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/leads/[id]/notes error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
