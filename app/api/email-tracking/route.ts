import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = request.nextUrl.searchParams.get('period') || '7';
  const sequence = request.nextUrl.searchParams.get('sequence') || 'all';
  const eventType = request.nextUrl.searchParams.get('eventType') || 'all';

  const days = parseInt(period) || 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    // Main query: email events with lead data (filtering done in JS for safety)
    const events = await sql`
      SELECT
        e.id, e.lead_id, e.sequence_type, e.step_number, e.event_type,
        e.brevo_message_id, e.sender_used, e.created_at,
        e.sentiment, e.sentiment_confidence,
        l.first_name, l.last_name, l.email, l.company, l.title,
        l.linkedin_url, l.lead_score, l.sequence_status, l.industry,
        l.linkedin_status
      FROM email_events e
      JOIN leads l ON l.id = e.lead_id
      WHERE e.event_type IN ('opened', 'clicked', 'replied', 'bounced')
        AND e.created_at >= ${since}::timestamptz
      ORDER BY e.created_at DESC
      LIMIT 200
    `;

    // Filter in JS (safe from SQL injection)
    let filtered = events;
    if (sequence !== 'all') {
      filtered = filtered.filter((e: any) => e.sequence_type === sequence);
    }
    if (eventType !== 'all') {
      filtered = filtered.filter((e: any) => e.event_type === eventType);
    }

    // Count opens per lead for "multiple opens" detection
    const openCounts: Record<number, number> = {};
    for (const e of events) {
      if (e.event_type === 'opened') {
        openCounts[e.lead_id] = (openCounts[e.lead_id] || 0) + 1;
      }
    }

    // Stats
    const stats = {
      total: filtered.length,
      opened: filtered.filter((e: any) => e.event_type === 'opened').length,
      clicked: filtered.filter((e: any) => e.event_type === 'clicked').length,
      replied: filtered.filter((e: any) => e.event_type === 'replied').length,
      bounced: filtered.filter((e: any) => e.event_type === 'bounced').length,
    };

    return NextResponse.json({
      events: filtered.map((e: any) => ({
        ...e,
        multipleOpens: (openCounts[e.lead_id] || 0) > 1,
        openCount: openCounts[e.lead_id] || 0,
      })),
      stats,
    });
  } catch (error) {
    console.error('Email tracking error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

// Detail endpoint: all events for a specific lead
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { leadId } = await request.json();
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

    const [events, calls, lead] = await Promise.all([
      sql`SELECT id, sequence_type, step_number, event_type, sender_used, created_at, sentiment, sentiment_confidence
        FROM email_events WHERE lead_id = ${leadId} ORDER BY created_at DESC`,
      sql`SELECT id, call_date, result, notes, created_at
        FROM call_logs WHERE lead_id = ${leadId} ORDER BY call_date DESC`,
      sql`SELECT * FROM leads WHERE id = ${leadId} LIMIT 1`,
    ]);

    return NextResponse.json({ events, calls, lead: lead[0] || null });
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
