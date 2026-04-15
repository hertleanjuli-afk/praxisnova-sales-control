import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const rows = status
    ? await sql`
        SELECT id, issue_month, subject, html_body, included_news_ids, included_content_ids,
               status, sent_at, brevo_campaign_id, created_at
        FROM newsletters
        WHERE status = ${status}
        ORDER BY issue_month DESC
      `
    : await sql`
        SELECT id, issue_month, subject, html_body, included_news_ids, included_content_ids,
               status, sent_at, brevo_campaign_id, created_at
        FROM newsletters
        ORDER BY issue_month DESC
      `;
  return NextResponse.json({ newsletters: rows });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: number; status: 'approved' | 'rejected' | 'sent' };
    if (!body.id || !['approved', 'rejected', 'sent'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }
    if (body.status === 'sent') {
      await sql`UPDATE newsletters SET status = 'sent', sent_at = NOW() WHERE id = ${body.id}`;
    } else {
      await sql`UPDATE newsletters SET status = ${body.status} WHERE id = ${body.id}`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
