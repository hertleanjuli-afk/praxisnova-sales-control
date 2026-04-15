import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);
  const minScore = Number(searchParams.get('minScore') ?? '0');
  const industry = searchParams.get('industry');

  try {
    const rows = industry
      ? await sql`
          SELECT id, url, title, source, published_at, summary, industries,
                 relevance_score, used_in_content, shared_with_sales, created_at
          FROM news_items
          WHERE relevance_score >= ${minScore} AND ${industry} = ANY(industries)
          ORDER BY relevance_score DESC, created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, url, title, source, published_at, summary, industries,
                 relevance_score, used_in_content, shared_with_sales, created_at
          FROM news_items
          WHERE relevance_score >= ${minScore}
          ORDER BY relevance_score DESC, created_at DESC
          LIMIT ${limit}
        `;
    return NextResponse.json({ items: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
