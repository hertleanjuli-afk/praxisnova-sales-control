import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const entries = await sql`
      SELECT * FROM change_log
      ORDER BY change_date DESC
    `;

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Change log fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { change_date, change_type, change_description, expected_impact } = body;

    if (!change_date || !change_type || !change_description) {
      return NextResponse.json(
        { error: 'change_date, change_type und change_description sind erforderlich' },
        { status: 400 }
      );
    }

    const changed_by = session.user?.name || session.user?.email || 'Unbekannt';

    const rows = await sql`
      INSERT INTO change_log (change_date, change_type, change_description, changed_by, expected_impact)
      VALUES (${change_date}, ${change_type}, ${change_description}, ${changed_by}, ${expected_impact || null})
      RETURNING *
    `;

    return NextResponse.json({ entry: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Change log create error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
