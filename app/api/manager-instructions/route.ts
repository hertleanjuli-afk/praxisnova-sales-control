import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await sql`
      SELECT * FROM manager_instructions
      ORDER BY created_at DESC
      LIMIT 10
    `;
    return NextResponse.json({ instructions: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }
    const rows = await sql`
      INSERT INTO manager_instructions (from_human, message)
      VALUES (TRUE, ${message})
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
