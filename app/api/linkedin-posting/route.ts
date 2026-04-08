// ============================================================
// GET/POST/DELETE /api/linkedin-posting
// LinkedIn Post Tracker - 2 Posts pro Tag
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================
// GET: Posting-Status laden
// Query: ?month=2026-04 oder ?week=current oder ?date=2026-04-08
// ============================================================
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const date = searchParams.get('date');

  try {
    let posts;

    if (date) {
      posts = await sql`
        SELECT * FROM linkedin_posts
        WHERE post_date = ${date}::DATE
        ORDER BY post_number
      `;
    } else if (month) {
      // Ganzen Monat laden
      const [year, mon] = month.split('-');
      posts = await sql`
        SELECT * FROM linkedin_posts
        WHERE EXTRACT(YEAR FROM post_date) = ${Number(year)}
        AND EXTRACT(MONTH FROM post_date) = ${Number(mon)}
        ORDER BY post_date, post_number
      `;
    } else {
      // Letzte 30 Tage
      posts = await sql`
        SELECT * FROM linkedin_posts
        WHERE post_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY post_date DESC, post_number
      `;
    }

    // Wochen-Stats berechnen
    const [weekStats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE posted = true) as posted_count,
        COUNT(*) as total_slots,
        EXTRACT(WEEK FROM CURRENT_DATE) as current_week
      FROM linkedin_posts
      WHERE post_date >= DATE_TRUNC('week', CURRENT_DATE)
      AND post_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
    `;

    // Monats-Stats
    const [monthStats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE posted = true) as posted_count,
        COUNT(DISTINCT post_date) FILTER (WHERE posted = true) as days_posted,
        COUNT(DISTINCT post_date) as total_days
      FROM linkedin_posts
      WHERE EXTRACT(YEAR FROM post_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM post_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    `;

    // Heute Status
    const todayPosts = await sql`
      SELECT * FROM linkedin_posts
      WHERE post_date = CURRENT_DATE
      ORDER BY post_number
    `;

    return NextResponse.json({
      ok: true,
      posts,
      today: {
        post1: todayPosts.find((p: { post_number: number }) => p.post_number === 1) || null,
        post2: todayPosts.find((p: { post_number: number }) => p.post_number === 2) || null,
        complete: todayPosts.filter((p: { posted: boolean }) => p.posted).length === 2,
      },
      week_stats: weekStats,
      month_stats: monthStats,
    });

  } catch (error) {
    console.error('[linkedin-posting] GET Fehler:', error);
    return NextResponse.json({ ok: false, error: 'Interner Fehler' }, { status: 500 });
  }
}

// ============================================================
// POST: Post als erledigt markieren oder erstellen
// ============================================================
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      post_date,
      post_number,
      posted = true,
      post_url,
      post_topic,
      post_type,
      posted_by,
      notes,
      // Engagement (optional, kann spaeter aktualisiert werden)
      likes,
      comments,
      shares,
      impressions,
    } = body;

    if (!post_date || !post_number || ![1, 2].includes(post_number)) {
      return NextResponse.json(
        { ok: false, error: 'post_date und post_number (1 oder 2) sind Pflichtfelder' },
        { status: 400 }
      );
    }

    // Upsert (erstellen oder aktualisieren)
    const [entry] = await sql`
      INSERT INTO linkedin_posts (
        post_date, post_number, posted, posted_at, posted_by,
        post_url, post_topic, post_type, notes,
        likes, comments, shares, impressions
      ) VALUES (
        ${post_date}::DATE, ${post_number}, ${posted},
        ${posted ? new Date().toISOString() : null},
        ${posted_by || null}, ${post_url || null},
        ${post_topic || null}, ${post_type || null},
        ${notes || null},
        ${likes || 0}, ${comments || 0}, ${shares || 0}, ${impressions || 0}
      )
      ON CONFLICT (post_date, post_number)
      DO UPDATE SET
        posted = ${posted},
        posted_at = ${posted ? new Date().toISOString() : null},
        posted_by = COALESCE(${posted_by}, linkedin_posts.posted_by),
        post_url = COALESCE(${post_url}, linkedin_posts.post_url),
        post_topic = COALESCE(${post_topic}, linkedin_posts.post_topic),
        post_type = COALESCE(${post_type}, linkedin_posts.post_type),
        notes = COALESCE(${notes}, linkedin_posts.notes),
        likes = COALESCE(${likes}, linkedin_posts.likes),
        comments = COALESCE(${comments}, linkedin_posts.comments),
        shares = COALESCE(${shares}, linkedin_posts.shares),
        impressions = COALESCE(${impressions}, linkedin_posts.impressions)
      RETURNING *
    `;

    return NextResponse.json({ ok: true, post: entry });

  } catch (error) {
    console.error('[linkedin-posting] POST Fehler:', error);
    return NextResponse.json({ ok: false, error: 'Interner Fehler' }, { status: 500 });
  }
}
