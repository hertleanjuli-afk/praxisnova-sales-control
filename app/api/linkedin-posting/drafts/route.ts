import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD, defaults to today
    const rangeParam = searchParams.get('range'); // 'week', 'month', default 'today'

    let rows: Record<string, any>[];

    if (rangeParam === 'week') {
      rows = await sql`
        SELECT * FROM linkedin_post_drafts
        WHERE draft_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY draft_date DESC, post_number ASC
      `;
    } else if (rangeParam === 'month') {
      rows = await sql`
        SELECT * FROM linkedin_post_drafts
        WHERE draft_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY draft_date DESC, post_number ASC
      `;
    } else {
      const targetDate = dateParam || new Date().toISOString().split('T')[0];
      rows = await sql`
        SELECT * FROM linkedin_post_drafts
        WHERE draft_date = ${targetDate}
        ORDER BY post_number ASC
      `;
    }

    return NextResponse.json({ drafts: rows, count: rows.length });
  } catch (error) {
    console.error('[drafts] GET error:', error);
    return NextResponse.json({ error: 'Failed to load drafts' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, hook, content, cta } = body as {
      id?: number | string;
      status?: string;
      hook?: string;
      content?: string;
      cta?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const draftId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (Number.isNaN(draftId)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }

    // Branch 1: status-only update (used by approve / mark posted / discard buttons)
    if (status && hook === undefined && content === undefined && cta === undefined) {
      let result: Record<string, any>[];
      if (status === 'posted') {
        result = await sql`
          UPDATE linkedin_post_drafts
          SET status = ${status}, posted_at = NOW()
          WHERE id = ${draftId}
          RETURNING *
        `;
      } else {
        result = await sql`
          UPDATE linkedin_post_drafts
          SET status = ${status}
          WHERE id = ${draftId}
          RETURNING *
        `;
      }
      return NextResponse.json({ draft: result[0] });
    }

    // Branch 2: content edit (hook / content / cta together, used by save-edit)
    if (hook !== undefined || content !== undefined || cta !== undefined) {
      // Load current values to fill in any missing fields
      const current = await sql`
        SELECT hook, content, cta FROM linkedin_post_drafts WHERE id = ${draftId}
      `;
      if (current.length === 0) {
        return NextResponse.json({ error: 'draft not found' }, { status: 404 });
      }

      const newHook = hook !== undefined ? hook : current[0].hook;
      const newContent = content !== undefined ? content : current[0].content;
      const newCta = cta !== undefined ? cta : current[0].cta;

      const result = await sql`
        UPDATE linkedin_post_drafts
        SET hook = ${newHook}, content = ${newContent}, cta = ${newCta}
        WHERE id = ${draftId}
        RETURNING *
      `;
      return NextResponse.json({ draft: result[0] });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch (error) {
    console.error('[drafts] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}
