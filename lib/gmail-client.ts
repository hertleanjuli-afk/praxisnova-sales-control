/**
 * Gmail API Client (Paket A, 2026-04-11)
 *
 * Dünner Wrapper über die Gmail REST API. Wir verwenden bewusst `fetch`
 * statt der `googleapis` npm-Dependency, weil der Rest des Projekts auch
 * direkt gegen REST-Endpoints geht (Apollo, HubSpot, Brevo, Gemini).
 *
 * Authentifizierung über OAuth2 Refresh Token. Der Refresh Token wird
 * einmalig von Angie per OAuth-Flow erzeugt (siehe
 * `Agent build/code-changes/SETUP-gmail-reply-sync.md`) und als Vercel
 * ENV gesetzt. Bei jedem Cron-Lauf tauschen wir den Refresh Token gegen
 * einen frischen Access Token (Lebensdauer ~1h).
 *
 * Scope: `gmail.modify`. Erlaubt Lesen UND Labels setzen UND Read-Status
 * ändern. Wir brauchen das weil wir verarbeitete Mails mit einem Label
 * `praxisnova-processed` markieren, damit Angie in ihrer Gmail-Oberfläche
 * sieht welche Replies bereits im Tool angekommen sind.
 */

// ─── OAuth2: Refresh Token → Access Token ────────────────────────────────

export type GmailCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

/**
 * Liest die Credentials aus den ENV-Variablen. Gibt null zurück wenn
 * auch nur eine fehlt - dann weiß der Caller dass der Cron im
 * `not_configured` Modus laufen soll ohne zu crashen.
 */
export function readCredentialsFromEnv(): GmailCredentials | null {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

/**
 * Tauscht den langlebigen Refresh Token gegen einen kurzlebigen Access
 * Token. Wirft bei ungültigen Credentials, weil der Caller das explizit
 * als Error-Log behandeln soll.
 */
export async function getAccessToken(creds: GmailCredentials): Promise<string> {
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
      `Gmail OAuth token refresh failed: ${res.status} ${errText.substring(0, 300)}`,
    );
  }

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`Gmail OAuth response missing access_token: ${data.error || 'unknown'}`);
  }
  return data.access_token;
}

// ─── Gmail API Types ─────────────────────────────────────────────────────

export type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

export type GmailHeader = { name: string; value: string };

export type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
  headers?: GmailHeader[];
};

export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePart;
  internalDate?: string;
};

export type GmailLabel = {
  id: string;
  name: string;
  type?: string;
  messagesTotal?: number;
  messagesUnread?: number;
};

// ─── Gmail API: List + Get ───────────────────────────────────────────────

/**
 * Listet Inbox-Messages die einem Gmail-Suchstring entsprechen.
 * Typisch: `in:inbox newer_than:1d -from:me -label:praxisnova-processed`.
 */
export async function listInboxMessages(
  accessToken: string,
  query: string,
  maxResults = 100,
): Promise<Array<{ id: string; threadId: string }>> {
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
    `?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gmail list messages failed: ${res.status} ${errText.substring(0, 300)}`);
  }

  const data = (await res.json()) as GmailListResponse;
  return data.messages || [];
}

/**
 * Lädt nur die Header einer Nachricht (From, Subject, In-Reply-To etc).
 * Billig und schnell - ausreichend wenn man nur den Absender braucht
 * um gegen die leads-Tabelle zu matchen.
 */
export async function getMessageMetadata(
  accessToken: string,
  messageId: string,
): Promise<GmailMessage> {
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}` +
    `?format=metadata` +
    `&metadataHeaders=From` +
    `&metadataHeaders=To` +
    `&metadataHeaders=Subject` +
    `&metadataHeaders=Date` +
    `&metadataHeaders=In-Reply-To` +
    `&metadataHeaders=References` +
    `&metadataHeaders=Auto-Submitted` +
    `&metadataHeaders=X-Autoreply` +
    `&metadataHeaders=X-Autoresponse` +
    `&metadataHeaders=Precedence`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail get metadata ${messageId} failed: ${res.status}`);
  }

  return (await res.json()) as GmailMessage;
}

/**
 * Lädt die vollständige Nachricht inklusive Body. Benötigt für
 * OOO-Detection per Regex auf dem Mail-Text.
 */
export async function getMessageFull(
  accessToken: string,
  messageId: string,
): Promise<GmailMessage> {
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail get full ${messageId} failed: ${res.status}`);
  }

  return (await res.json()) as GmailMessage;
}

// ─── Header + Body Parsing Helper ────────────────────────────────────────

/**
 * Holt den Wert eines Headers case-insensitive aus einer Gmail-Nachricht.
 */
export function getHeader(msg: GmailMessage, name: string): string | null {
  const headers = msg.payload?.headers || [];
  const h = headers.find(x => x.name.toLowerCase() === name.toLowerCase());
  return h?.value || null;
}

/**
 * Extrahiert die reine Email-Adresse aus einem `From:` Header.
 * Beispiele:
 *   "Max Mustermann <max@firma.de>" -> "max@firma.de"
 *   "max@firma.de" -> "max@firma.de"
 *   "'Max' <max@firma.de>" -> "max@firma.de"
 */
export function parseEmailAddress(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const bracketed = headerValue.match(/<([^>]+)>/);
  if (bracketed) return bracketed[1].trim().toLowerCase();
  const raw = headerValue.trim();
  if (raw.includes('@')) return raw.toLowerCase();
  return null;
}

/**
 * Extrahiert den inneren Message-ID Wert aus einem Header wie
 * `<abc123@mail.example.com>` -> `abc123@mail.example.com`.
 * Wird zur Korrelation mit email_events.brevo_message_id verwendet.
 */
export function parseMessageId(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const m = headerValue.match(/<([^>]+)>/);
  return m ? m[1].trim() : headerValue.trim();
}

/**
 * Dekodiert einen base64url-kodierten Body-Teil in einen UTF-8 String.
 * Gmail liefert alle Body-Daten in diesem Format.
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Zieht rekursiv den gesamten Text/Plain und Text/HTML Body aus einer
 * Gmail-Nachricht. Liefert beides in einem einzigen String zurück
 * (getrennt durch Newlines), damit der OOO-Detector auf beidem arbeiten kann.
 *
 * Multipart-Mails können beliebig verschachtelt sein (alternative,
 * mixed, related, etc). Wir laufen rekursiv durch alle Teile und
 * sammeln alles ein was `mimeType` `text/*` hat.
 */
export function extractBodyText(msg: GmailMessage): string {
  const parts: string[] = [];

  function walk(part: GmailMessagePart | undefined) {
    if (!part) return;
    const mime = part.mimeType || '';
    if (mime.startsWith('text/') && part.body?.data) {
      parts.push(decodeBase64Url(part.body.data));
    }
    if (part.parts) {
      for (const sub of part.parts) walk(sub);
    }
  }

  walk(msg.payload);
  return parts.join('\n\n');
}

// ─── Gmail API: Modify (Labels, Read Status) ─────────────────────────────

/**
 * Nimmt den Label-ID einer Gmail-Nachricht und setzt oder entfernt Labels.
 * Benötigt den `gmail.modify` Scope (nicht `gmail.readonly`).
 *
 * Beispiel:
 *   await modifyMessageLabels(token, msgId, [labelId], []);  // Label hinzufügen
 *   await modifyMessageLabels(token, msgId, [], ['UNREAD']); // Als gelesen markieren
 */
export async function modifyMessageLabels(
  accessToken: string,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[],
): Promise<void> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
  const body = {
    addLabelIds: addLabelIds.length > 0 ? addLabelIds : undefined,
    removeLabelIds: removeLabelIds.length > 0 ? removeLabelIds : undefined,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Gmail modify ${messageId} failed: ${res.status} ${errText.substring(0, 200)}`,
    );
  }
}

/**
 * Sucht ein Label per Name. Liefert den Label-ID zurück.
 * Gibt null zurück wenn das Label nicht existiert.
 */
export async function findLabelId(
  accessToken: string,
  labelName: string,
): Promise<string | null> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail list labels failed: ${res.status}`);
  }

  const data = (await res.json()) as { labels?: GmailLabel[] };
  const labels = data.labels || [];
  const match = labels.find(l => l.name === labelName);
  return match?.id || null;
}

/**
 * Erstellt ein neues User-Label. Wird einmal pro Projekt gebraucht um
 * das `praxisnova-processed` Label zu initialisieren. Idempotent:
 * gibt den existierenden Label-ID zurück falls schon vorhanden.
 */
export async function getOrCreateLabel(
  accessToken: string,
  labelName: string,
): Promise<string> {
  const existing = await findLabelId(accessToken, labelName);
  if (existing) return existing;

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gmail create label failed: ${res.status} ${errText.substring(0, 200)}`);
  }

  const data = (await res.json()) as GmailLabel;
  return data.id;
}
