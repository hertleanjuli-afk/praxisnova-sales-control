import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * One-time admin endpoint to run DB migrations.
 * Call: POST /api/admin/migrate?secret=<ADMIN_SECRET>
 *
 * Adds sentiment columns to email_events and leads tables.
 */

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Add sentiment column to email_events if not exists
    await sql`
      ALTER TABLE email_events
      ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20) DEFAULT NULL
    `;
    results.push('email_events.sentiment added');

    await sql`
      ALTER TABLE email_events
      ADD COLUMN IF NOT EXISTS sentiment_confidence REAL DEFAULT NULL
    `;
    results.push('email_events.sentiment_confidence added');

    // Add reply_sentiment column to leads if not exists
    await sql`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS reply_sentiment VARCHAR(20) DEFAULT NULL
    `;
    results.push('leads.reply_sentiment added');

    return NextResponse.json({ ok: true, migrations: results });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: String(error), completed: results },
      { status: 500 }
    );
  }
}
