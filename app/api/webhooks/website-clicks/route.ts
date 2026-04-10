import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { visitorId, page, buttonId, buttonText, referrer, timestamp, secret, utm_source, utm_medium, utm_campaign, utm_content, event_type, section, device_type } = body;

  if (secret !== process.env.INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (!visitorId) {
    return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
  }

  try {
    const clickedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    // Insert the click
    const inserted = await sql`
      INSERT INTO website_clicks (visitor_id, page, button_id, button_text, referrer, clicked_at, utm_source, utm_medium, utm_campaign, utm_content, event_type, section, device_type)
      VALUES (${visitorId}, ${page || '/'}, ${buttonId || 'unknown'}, ${buttonText || null}, ${referrer || null}, ${clickedAt}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${event_type || 'pageview'}, ${section || null}, ${device_type || null})
      RETURNING id
    `;

    const clickId = inserted[0].id;

    // Check if this visitor has been linked to a lead in previous clicks
    const linked = await sql`
      SELECT lead_id FROM website_clicks
      WHERE visitor_id = ${visitorId} AND lead_id IS NOT NULL
      LIMIT 1
    `;

    if (linked.length > 0 && linked[0].lead_id) {
      await sql`
        UPDATE website_clicks SET lead_id = ${linked[0].lead_id} WHERE id = ${clickId}
      `;
    }

    return NextResponse.json({ ok: true, clickId });
  } catch (error) {
    const isTimeout = error instanceof Error && (error.message.includes('timeout') || error.message.includes('abort'));
    console.error('Website click webhook error:', isTimeout ? 'DB timeout after retries' : error);
    return NextResponse.json(
      { error: isTimeout ? 'Database timeout' : 'Internal error', retryable: isTimeout },
      { status: isTimeout ? 504 : 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clicks = await sql`
      SELECT
        wc.id, wc.visitor_id, wc.lead_id, wc.page, wc.button_id, wc.button_text,
        wc.referrer, wc.clicked_at, wc.utm_source, wc.utm_medium, wc.utm_campaign, wc.utm_content,
        wc.event_type, wc.section, wc.device_type,
        l.email as lead_email,
        CONCAT(l.first_name, ' ', l.last_name) as lead_name,
        l.company as lead_company
      FROM website_clicks wc
      LEFT JOIN leads l ON l.id = wc.lead_id
      ORDER BY wc.clicked_at DESC
      LIMIT 100
    `;

    const stats = await sql`
      SELECT
        COUNT(*) as total_clicks,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(DISTINCT CASE WHEN lead_id IS NOT NULL THEN visitor_id END) as identified_visitors
      FROM website_clicks
      WHERE clicked_at >= NOW() - INTERVAL '7 days'
    `;

    return NextResponse.json({
      clicks,
      stats: {
        total_clicks: Number(stats[0]?.total_clicks || 0),
        unique_visitors: Number(stats[0]?.unique_visitors || 0),
        identified_visitors: Number(stats[0]?.identified_visitors || 0),
      },
    });
  } catch (error) {
    console.error('Website clicks fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
