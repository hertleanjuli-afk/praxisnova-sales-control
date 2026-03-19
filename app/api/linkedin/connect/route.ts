import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leadId } = await request.json();

  if (!leadId) {
    return NextResponse.json({ error: 'Lead-ID erforderlich' }, { status: 400 });
  }

  try {
    await sql`
      INSERT INTO linkedin_connections (lead_id, connected_at)
      VALUES (${leadId}, NOW())
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LinkedIn connect error:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern der Verbindung' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leadId } = await request.json();

  if (!leadId) {
    return NextResponse.json({ error: 'Lead-ID erforderlich' }, { status: 400 });
  }

  try {
    await sql`
      DELETE FROM linkedin_connections WHERE lead_id = ${leadId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LinkedIn disconnect error:', error);
    return NextResponse.json({ error: 'Fehler beim Entfernen der Verbindung' }, { status: 500 });
  }
}
