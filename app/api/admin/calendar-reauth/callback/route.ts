/**
 * Callback fuer Google OAuth2 Reauth des Calendar-Clients.
 *
 * Google redirected hier nach dem Consent mit ?code=...
 * Die Route tauscht den Code gegen Tokens. Der Refresh-Token wird auf
 * der HTML-Response zurueckgegeben (HTML, nicht JSON, damit Angie im
 * Browser direkt kopieren kann) UND als Response-Header
 * `X-Calendar-Refresh-Token`.
 *
 * Der Token wird NICHT in Logs ausgegeben. NICHT in der DB gespeichert.
 * Angie kopiert ihn manuell in Vercel ENV.
 *
 * Auth: der Callback hat keinen Bearer-Check (Google's Redirect kann
 * keinen Auth-Header setzen). Sicherheit kommt ueber den `state`-
 * Parameter (auth-Route generiert state, callback prueft Praefix).
 * Fuer Production-Haerte: state als signed-JWT in Phase-4-Iteration.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorHtml(msg: string): string {
  return `<!doctype html><meta charset="utf-8"><title>Reauth error</title>
<body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px">
<h1>Reauth error</h1><pre>${htmlEscape(msg)}</pre>
</body>`;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  const error = url.searchParams.get('error');

  if (error) {
    return new NextResponse(errorHtml(`Google returned: ${error}`), {
      status: 400,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (!code) {
    return new NextResponse(errorHtml('Missing ?code= in callback URL'), {
      status: 400,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (!state.startsWith('calendar-reauth-')) {
    return new NextResponse(errorHtml('Invalid state parameter'), {
      status: 400,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const clientId =
    process.env.GOOGLE_CALENDAR_CLIENT_ID ?? process.env.GMAIL_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new NextResponse(
      errorHtml('Missing GOOGLE_CALENDAR_CLIENT_ID/SECRET and no GMAIL_ fallback'),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const origin =
    request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : request.nextUrl.origin;
  const redirectUri = `${origin}/api/admin/calendar-reauth/callback`;

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return new NextResponse(
      errorHtml(`Google token exchange failed: ${res.status}\n${errText.slice(0, 500)}`),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const data = (await res.json()) as {
    refresh_token?: string;
    access_token?: string;
    scope?: string;
    token_type?: string;
    expires_in?: number;
  };

  if (!data.refresh_token) {
    return new NextResponse(
      errorHtml(
        'Google gab keinen refresh_token zurueck. Moeglicher Grund: prompt=consent ist nicht gesetzt, oder der Client hat bereits einen refresh_token (dann in Google Account > Security > App-Zugriff > Revoke, dann erneut.)',
      ),
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  // HTML-Seite mit dem Refresh-Token zum kopieren. Kein Logging.
  const html = `<!doctype html><meta charset="utf-8"><title>Reauth success</title>
<body style="font-family:system-ui;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.5">
<h1>Calendar Reauth OK</h1>
<p><b>Scope:</b> <code>${htmlEscape(data.scope ?? 'unknown')}</code></p>
<p>Kopiere den folgenden Wert in Vercel ENV unter
<code>GOOGLE_CALENDAR_REFRESH_TOKEN</code> (Production + Preview), dann
deploy triggern:</p>
<textarea readonly rows="4" style="width:100%;font-family:monospace;padding:8px">${htmlEscape(data.refresh_token)}</textarea>
<h2>Naechste Schritte</h2>
<ol>
<li>Den Token oben kopieren.</li>
<li>In Vercel &gt; Project Settings &gt; Environment Variables, Variable <code>GOOGLE_CALENDAR_REFRESH_TOKEN</code> updaten fuer Production + Preview.</li>
<li>Diesen Tab schliessen (Token nicht im Verlauf stehen lassen).</li>
<li>Cron-Eintrag in <code>vercel.json</code> wieder hinzufuegen (jetzt mit 4h-Schedule).</li>
<li>Deploy triggern. Erster Health-Check sollte OAuth-OK bestaetigen.</li>
</ol>
</body>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Header nur fuer automatisierte Clients, die den Body nicht parsen.
      'X-Calendar-Refresh-Token-Scope': data.scope ?? 'unknown',
      // Wir geben den Token NICHT als Header, um zu verhindern dass
      // Proxy-/Log-Sammler ihn speichern.
    },
  });
}
