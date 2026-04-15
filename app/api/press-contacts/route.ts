import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const rows = status
    ? await sql`
        SELECT id, outlet_name, outlet_type, contact_name, contact_email, contact_role,
               industries, website, last_contacted, status, notes, created_at
        FROM press_contacts
        WHERE status = ${status}
        ORDER BY outlet_name ASC
      `
    : await sql`
        SELECT id, outlet_name, outlet_type, contact_name, contact_email, contact_role,
               industries, website, last_contacted, status, notes, created_at
        FROM press_contacts
        ORDER BY outlet_name ASC
      `;
  return NextResponse.json({ contacts: rows });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: number; status?: string; notes?: string };
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (body.status) {
      await sql`UPDATE press_contacts SET status = ${body.status} WHERE id = ${body.id}`;
    }
    if (body.notes !== undefined) {
      await sql`UPDATE press_contacts SET notes = ${body.notes} WHERE id = ${body.id}`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
