/**
 * Google Calendar OAuth Reauth (Admin)
 *
 * Problem: der gespeicherte GOOGLE_CALENDAR_REFRESH_TOKEN ist kaputt
 * (Scope-Mismatch oder Client-ID/Secret-Mismatch, siehe LECK-17 in
 * Agent build/ERROR-CATALOGUE.md). Die einzige Loesung ist ein neuer
 * OAuth2-Flow mit sauberen Parametern.
 *
 * Flow:
 *
 * Schritt 1: Angie ruft /api/admin/calendar-reauth auf
 *   -> wird auf Google's Consent-Screen weitergeleitet
 *   -> access_type=offline + prompt=consent erzwingen einen frischen
 *      Refresh-Token (sonst gibt Google nur Access-Token zurueck, weil
 *      "bereits consent vorhanden")
 *
 * Schritt 2: Google redirected zurueck auf
 *   /api/admin/calendar-reauth/callback (nicht hier, separate Route)
 *   mit ?code=...
 *
 * Schritt 3: Callback tauscht den Code gegen Access + Refresh Token.
 *   Angie sieht den Refresh-Token auf der Seite (nicht in Logs),
 *   kopiert ihn manuell in Vercel ENV GOOGLE_CALENDAR_REFRESH_TOKEN.
 *
 * Schritt 4: Angie merged Re-Add des Cron-Eintrags und Cron laeuft ab
 *   dem naechsten Deploy wieder normal.
 *
 * Auth: Bearer CRON_SECRET (gleiches Pattern wie andere Admin-Routes).
 * Admin kann es im Browser durch Setzen des Authorization-Headers via
 * z.B. modheader-Extension triggern.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const clientId =
    process.env.GOOGLE_CALENDAR_CLIENT_ID ?? process.env.GMAIL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error: 'missing_client_id',
        hint:
          'Vercel ENV muss entweder GOOGLE_CALENDAR_CLIENT_ID oder GMAIL_CLIENT_ID haben. Beides war leer.',
      },
      { status: 500 },
    );
  }

  // Vercel production origin.
  const origin =
    request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : request.nextUrl.origin;
  const redirectUri = `${origin}/api/admin/calendar-reauth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: 'calendar-reauth-' + Date.now(),
  });

  const authUrl = `${GOOGLE_AUTH_BASE}?${params.toString()}`;

  // Redirect direkt auf Google Consent-Screen. Angie klickt zu, landet
  // auf der Callback-Route.
  return NextResponse.redirect(authUrl, { status: 302 });
}
