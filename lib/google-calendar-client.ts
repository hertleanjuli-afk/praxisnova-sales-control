/**
 * Google Calendar API Client (Paket B Teil 2, 2026-04-12)
 *
 * Duenner Wrapper ueber die Google Calendar REST API, analog zu
 * lib/gmail-client.ts. Wir nutzen bewusst fetch statt der googleapis
 * npm-Dependency, weil der Rest des Projekts auch direkt gegen REST geht.
 *
 * Authentifizierung: OAuth2 Refresh Token. Derselbe OAuth-Client der
 * fuer Gmail (Paket A) genutzt wird - Angie hat bestaetigt dass derselbe
 * Client-ID + Client-Secret auch fuer Calendar gilt. Nur der
 * Refresh-Token ist ein separater Wert (aus dem Scope-separaten Bootstrap).
 *
 * Benoetigte ENV:
 *   - GMAIL_CLIENT_ID      (geteilt mit Gmail)
 *   - GMAIL_CLIENT_SECRET  (geteilt mit Gmail)
 *   - GOOGLE_CALENDAR_REFRESH_TOKEN  (spezifisch fuer Calendar-Scope)
 *   - GOOGLE_CALENDAR_ID   (z.B. "hertle.anjuli@praxisnovaai.com")
 *
 * Scope: https://www.googleapis.com/auth/calendar.readonly
 * Wir lesen nur Events, schreiben nichts. Der Cron soll keine Events
 * anlegen oder modifizieren - das wuerde die Inbox von Angies Kalender
 * verschmutzen.
 */

// ─── Credentials + Auth ──────────────────────────────────────────────────

export type CalendarCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

export function readCalendarCredentialsFromEnv(): CalendarCredentials | null {
  // Calendar kann einen eigenen OAuth-Client haben (GOOGLE_CALENDAR_CLIENT_ID
  // + GOOGLE_CALENDAR_CLIENT_SECRET) oder den geteilten Gmail-Client nutzen.
  // Bevorzuge die Calendar-spezifischen Werte, Fallback auf Gmail.
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!clientId || !clientSecret || !refreshToken || !calendarId) return null;
  // Log welche Credentials verwendet werden (nur Key-Praefix, kein Secret leaken)
  console.log(`[google-calendar] Using clientId=${clientId.substring(0, 12)}..., secretSource=${process.env.GOOGLE_CALENDAR_CLIENT_SECRET ? 'GOOGLE_CALENDAR' : 'GMAIL'}, idSource=${process.env.GOOGLE_CALENDAR_CLIENT_ID ? 'GOOGLE_CALENDAR' : 'GMAIL'}`);
  return { clientId, clientSecret, refreshToken, calendarId };
}

export async function getCalendarAccessToken(creds: CalendarCredentials): Promise<string> {
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Google Calendar OAuth token refresh failed: ${res.status} ${errText.substring(0, 300)}`,
    );
  }

  const data = (await res.json()) as { access_token?: string; error?: string; scope?: string; token_type?: string };
  if (!data.access_token) {
    throw new Error(`Google Calendar OAuth response missing access_token: ${data.error || 'unknown'}`);
  }
  // Log scope to diagnose 401 on events.list (scope mismatch?)
  console.log(`[google-calendar] Token refreshed OK. scope=${data.scope || 'not-returned'}, token_type=${data.token_type || 'unknown'}`);
  return data.access_token;
}

// ─── Calendar API Types ──────────────────────────────────────────────────

export type CalendarEventDateTime = {
  dateTime?: string; // ISO 8601 mit Timezone, z.B. "2026-04-15T10:00:00+02:00"
  date?: string;     // nur bei All-Day-Events: YYYY-MM-DD
  timeZone?: string;
};

export type CalendarAttendee = {
  email: string;
  displayName?: string;
  organizer?: boolean;
  self?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
};

export type CalendarEvent = {
  id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  created?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  creator?: { email?: string; displayName?: string; self?: boolean };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  start?: CalendarEventDateTime;
  end?: CalendarEventDateTime;
  attendees?: CalendarAttendee[];
  hangoutLink?: string;
  eventType?: string;
};

type CalendarEventsListResponse = {
  items?: CalendarEvent[];
  nextPageToken?: string;
};

// ─── Calendar API: Events listen ─────────────────────────────────────────

/**
 * Listet Events aus dem angegebenen Kalender die nach `timeMin` erstellt
 * oder zuletzt aktualisiert wurden. Wir nutzen `updatedMin` statt `timeMin`
 * damit auch Events die in der Vergangenheit liegen (z.B. Heute-Morgen-
 * Buchung fuer Gestern-Nachmittag-Slot) erfasst werden.
 *
 * Weitere Details zur API:
 *   https://developers.google.com/calendar/api/v3/reference/events/list
 */
export async function listRecentEvents(
  accessToken: string,
  calendarId: string,
  sinceMinutes: number,
  maxResults = 50,
): Promise<CalendarEvent[]> {
  // updatedMin akzeptiert RFC 3339 Timestamp
  const updatedMin = new Date(Date.now() - sinceMinutes * 60_000).toISOString();

  const params = new URLSearchParams({
    updatedMin,
    singleEvents: 'true',
    orderBy: 'updated',
    maxResults: String(maxResults),
    showDeleted: 'false',
  });

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/` +
    `${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Google Calendar events.list failed: ${res.status} ${errText.substring(0, 300)}`,
    );
  }

  const data = (await res.json()) as CalendarEventsListResponse;
  return data.items || [];
}

// ─── Attendee-Helper ─────────────────────────────────────────────────────

/**
 * Aus der Attendee-Liste den ersten Gast finden der NICHT Angie ist.
 * Angies Kalender-Owner ist der `calendarId` Wert (ihre Email). Alle
 * Events die Angie selbst via Google Calendar Web-UI anlegt haben sie als
 * organizer/creator - dort ist `self: true` oder die Email matcht
 * calendarId. Der Cron soll nur Events verarbeiten bei denen jemand
 * ANDERES gebucht hat.
 *
 * Returns `null` wenn kein externer Attendee vorhanden ist.
 */
export function findExternalAttendee(
  event: CalendarEvent,
  ownerEmail: string,
): CalendarAttendee | null {
  const attendees = event.attendees || [];
  const ownerLower = ownerEmail.toLowerCase();
  for (const a of attendees) {
    if (!a.email) continue;
    if (a.self === true) continue;
    if (a.email.toLowerCase() === ownerLower) continue;
    if (a.organizer === true) continue;
    return a;
  }
  return null;
}

/**
 * Prueft ob ein Event durch den Calendar-Owner selbst angelegt wurde.
 * Wird gefiltert damit der Cron nicht jedes manuell angelegte Event in
 * Angies Kalender als Lead-Eintrag interpretiert.
 */
export function isOwnerCreated(event: CalendarEvent, ownerEmail: string): boolean {
  const ownerLower = ownerEmail.toLowerCase();
  if (event.creator?.self === true) return true;
  if (event.creator?.email?.toLowerCase() === ownerLower) return true;
  if (event.organizer?.self === true && !event.attendees?.some(a => a.email && a.email.toLowerCase() !== ownerLower)) {
    return true;
  }
  return false;
}
