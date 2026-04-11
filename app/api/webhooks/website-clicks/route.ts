import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

// Erlaubte Origins fuer browser-basierte POSTs (Paket B Teil 1).
// Das Tracking-Script im <head> von praxisnovaai.com postet direkt hierher.
// Weil ein Secret in public JS kein Secret waere, nutzen wir stattdessen
// einen Origin-Check: wenn der Request-Header Origin auf eine der unten
// gelisteten Domains zeigt, darf der POST ohne Secret durch. Der alte
// secret-basierte Pfad bleibt rueckwaerts-kompatibel.
const ALLOWED_BROWSER_ORIGINS = new Set<string>([
  'https://praxisnovaai.com',
  'https://www.praxisnovaai.com',
]);

// In-Memory Rate Limiter. Vercel Functions sind serverless, also reset bei
// jedem Cold Start. Mehrere parallele Instanzen koennten das Limit je
// einzeln durchlassen, aber fuer Anti-Missbrauch der publicen Origin-POSTs
// reicht das - ein Angreifer muesste durch alle Instanzen gleichzeitig
// browsen. Fuer saubereres Rate-Limiting spaeter Upstash Redis einsetzen.
const rateLimitState = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_POSTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitState.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitState.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_POSTS) return false;
  entry.count++;
  return true;
}

function corsHeadersForOrigin(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_BROWSER_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// CORS Preflight fuer browser-basierte POSTs
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersForOrigin(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const body = await request.json();
  const {
    visitorId,
    page,
    buttonId,
    buttonText,
    referrer,
    timestamp,
    secret,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    event_type,
    section,
    device_type,
    scroll_depth,
    dwell_time,
  } = body;

  // Auth-Pfad 1: Secret-basiert (fuer interne Aufrufe + Backend-to-Backend)
  // Auth-Pfad 2: Origin-basiert (fuer Browser-POSTs von praxisnovaai.com)
  // Einer der beiden muss gelten, sonst 401.
  const secretMatches = secret === process.env.INBOUND_WEBHOOK_SECRET;
  const originMatches = origin !== null && ALLOWED_BROWSER_ORIGINS.has(origin);

  if (!secretMatches && !originMatches) {
    return NextResponse.json(
      { error: 'Invalid secret or disallowed origin' },
      { status: 401, headers: corsHeadersForOrigin(origin) },
    );
  }

  // Rate-Limit nur fuer Origin-basierte Browser-POSTs. Secret-basierte
  // interne Aufrufe sind vertraut und duerfen schneller sein.
  if (originMatches && !secretMatches) {
    const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
    const ip = forwardedFor.split(',')[0].trim();
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: corsHeadersForOrigin(origin) },
      );
    }
  }

  if (!visitorId) {
    return NextResponse.json(
      { error: 'visitorId is required' },
      { status: 400, headers: corsHeadersForOrigin(origin) },
    );
  }

  try {
    const clickedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
    const scrollDepthInt = Number.isFinite(Number(scroll_depth)) ? Number(scroll_depth) : null;
    const dwellTimeInt = Number.isFinite(Number(dwell_time)) ? Number(dwell_time) : null;

    // Try insert with new scroll_depth + dwell_time columns. Falls back gracefully
    // if a fresh database hasn't been through the v8 migration yet.
    let inserted;
    try {
      inserted = await sql`
        INSERT INTO website_clicks (visitor_id, page, button_id, button_text, referrer, clicked_at, utm_source, utm_medium, utm_campaign, utm_content, event_type, section, device_type, scroll_depth, dwell_time)
        VALUES (${visitorId}, ${page || '/'}, ${buttonId || 'unknown'}, ${buttonText || null}, ${referrer || null}, ${clickedAt}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${event_type || 'pageview'}, ${section || null}, ${device_type || null}, ${scrollDepthInt}, ${dwellTimeInt})
        RETURNING id
      `;
    } catch (err) {
      if (err instanceof Error && err.message.includes('column')) {
        // scroll_depth / dwell_time column missing - fall back to the v7 column set
        console.warn('[website-clicks] scroll_depth/dwell_time columns missing, run initializeDatabase() to add them');
        inserted = await sql`
          INSERT INTO website_clicks (visitor_id, page, button_id, button_text, referrer, clicked_at, utm_source, utm_medium, utm_campaign, utm_content, event_type, section, device_type)
          VALUES (${visitorId}, ${page || '/'}, ${buttonId || 'unknown'}, ${buttonText || null}, ${referrer || null}, ${clickedAt}, ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${event_type || 'pageview'}, ${section || null}, ${device_type || null})
          RETURNING id
        `;
      } else {
        throw err;
      }
    }

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

    return NextResponse.json({ ok: true, clickId }, { headers: corsHeadersForOrigin(origin) });
  } catch (error) {
    const isTimeout = error instanceof Error && (error.message.includes('timeout') || error.message.includes('abort'));
    console.error('Website click webhook error:', isTimeout ? 'DB timeout after retries' : error);
    return NextResponse.json(
      { error: isTimeout ? 'Database timeout' : 'Internal error', retryable: isTimeout },
      { status: isTimeout ? 504 : 500, headers: corsHeadersForOrigin(origin) }
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
