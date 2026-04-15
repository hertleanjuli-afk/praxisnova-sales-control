import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'pending_review';
  const rows = await sql`
    SELECT id, platform, content_type, headline, body, hashtags,
           source_news_ids, status, approved_by, approved_at, created_at
    FROM content_drafts
    WHERE status = ${status}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return NextResponse.json({ drafts: rows });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: number; action: 'approve' | 'reject'; approvedBy?: string };
    if (!body.id || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }
    const newStatus = body.action === 'approve' ? 'approved' : 'rejected';
    const rows = await sql`
      UPDATE content_drafts
      SET status = ${newStatus},
          approved_by = ${body.approvedBy ?? 'dashboard'},
          approved_at = NOW()
      WHERE id = ${body.id}
      RETURNING id, status
    `;
    return NextResponse.json({ ok: true, updated: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
