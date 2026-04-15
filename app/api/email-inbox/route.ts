import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const requiresAction = searchParams.get('requiresAction');

  const rows = category
    ? await sql`
        SELECT id, gmail_id, thread_id, from_email, subject, received_at,
               category, priority, summary, draft_reply, requires_action, processed_at
        FROM email_inbox
        WHERE category = ${category}
        ORDER BY received_at DESC
        LIMIT 100
      `
    : requiresAction === 'true'
    ? await sql`
        SELECT id, gmail_id, thread_id, from_email, subject, received_at,
               category, priority, summary, draft_reply, requires_action, processed_at
        FROM email_inbox
        WHERE requires_action = TRUE
        ORDER BY received_at DESC
        LIMIT 100
      `
    : await sql`
        SELECT id, gmail_id, thread_id, from_email, subject, received_at,
               category, priority, summary, draft_reply, requires_action, processed_at
        FROM email_inbox
        ORDER BY received_at DESC
        LIMIT 100
      `;
  return NextResponse.json({ items: rows });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: number; requiresAction?: boolean };
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await sql`
      UPDATE email_inbox
      SET requires_action = ${body.requiresAction ?? false}
      WHERE id = ${body.id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
