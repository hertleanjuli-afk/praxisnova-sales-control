import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { button, page, visitor_id, email, timestamp, utm_source, utm_medium, utm_campaign, utm_content, event_type, section, device_type } = body;

  if (!visitor_id) {
    return NextResponse.json({ error: 'visitor_id required' }, { status: 400 });
  }

  try {
    const clickedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    // Find linked lead (by visitor_id from previous clicks, or by email)
    let leadId: number | null = null;

    if (email) {
      const leadByEmail = await sql`SELECT id FROM leads WHERE email = ${email} LIMIT 1`;
      if (leadByEmail.length > 0) {
        leadId = leadByEmail[0].id;
        // Link all previous anonymous clicks from this visitor
        await sql`
          UPDATE website_clicks SET lead_id = ${leadId}
          WHERE visitor_id = ${visitor_id} AND lead_id IS NULL
        `;
      }
    }

    if (!leadId) {
      const linked = await sql`
        SELECT lead_id FROM website_clicks
        WHERE visitor_id = ${visitor_id} AND lead_id IS NOT NULL
        LIMIT 1
      `;
      if (linked.length > 0) leadId = linked[0].lead_id;
    }

    await sql`
      INSERT INTO website_clicks (visitor_id, lead_id, page, button_id, button_text, clicked_at, utm_source, utm_medium, utm_campaign, utm_content, event_type, section, device_type)
      VALUES (${visitor_id}, ${leadId}, ${page || '/'}, ${button || 'pageview'}, ${button || null}, ${clickedAt}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${event_type || 'pageview'}, ${section || null}, ${device_type || null})
    `;

    const res = NextResponse.json({ ok: true });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (error) {
    const isTimeout = error instanceof Error && (error.message.includes('timeout') || error.message.includes('abort'));
    console.error('Track click error:', isTimeout ? 'DB timeout after retries' : error);
    const status = isTimeout ? 504 : 500;
    const res = NextResponse.json(
      { error: isTimeout ? 'Database timeout' : 'Internal error', retryable: isTimeout },
      { status }
    );
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
