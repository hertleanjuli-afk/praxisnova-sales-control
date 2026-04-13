/**
 * Website Leads Webhook - DEPRECATED (2026-04-13)
 *
 * This endpoint has been replaced by /api/webhooks/inbound which includes
 * Double-Opt-In, HubSpot sync, and Angie notification.
 *
 * This route forwards requests to /api/webhooks/inbound for backwards
 * compatibility. New integrations should call /api/webhooks/inbound directly.
 */

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = new Set<string>([
  'https://praxisnovaai.com',
  'https://www.praxisnovaai.com',
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Origin check for direct browser calls
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json(
      { error: 'Disallowed origin' },
      { status: 401, headers: corsHeaders(origin) },
    );
  }

  try {
    const body = await request.json();

    // Forward to the official inbound endpoint with source preserved
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://praxisnova-sales-control.vercel.app';
    const response = await fetch(`${appUrl}/api/webhooks/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
      },
      body: JSON.stringify({
        name: body.name || body.company || '',
        email: body.email,
        source: body.source || 'website_popup',
        visitorId: body.visitorId || null,
      }),
    });

    const data = await response.json();
    console.log('[website-leads] Forwarded to /webhooks/inbound (DEPRECATED endpoint)');
    return NextResponse.json(data, { status: response.status, headers: corsHeaders(origin) });
  } catch (err) {
    console.error('[website-leads] Forward error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}
