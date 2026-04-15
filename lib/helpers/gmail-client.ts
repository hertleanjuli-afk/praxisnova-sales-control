import { logger } from './logger';
import { recordBlockedTask } from './blocked-tasks';

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
  labels: string[];
}

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(agent: string): Promise<string | null> {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    logger.warn('gmail oauth env missing', { agent });
    await recordBlockedTask({
      agent,
      task: 'gmail-oauth',
      reason: 'GMAIL_OAUTH_* env vars not set (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)',
    });
    return null;
  }

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    logger.error('gmail token refresh failed', { status: res.status });
    await recordBlockedTask({
      agent,
      task: 'gmail-token-refresh',
      reason: `token endpoint returned ${res.status}`,
    });
    return null;
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function encodeBase64Url(data: string): string {
  return Buffer.from(data, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function extractHeader(
  headers: Array<{ name: string; value: string }>,
  name: string,
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export async function listInboxMessages(
  maxResults = 20,
  agent = 'gmail-client',
): Promise<GmailMessage[]> {
  const token = await getAccessToken(agent);
  if (!token) return [];

  const url = `${GMAIL_API}/messages?maxResults=${maxResults}&q=in%3Ainbox`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    logger.error('gmail list failed', { status: res.status });
    return [];
  }
  const json = (await res.json()) as { messages?: GmailMessage[] };
  return json.messages ?? [];
}

export async function getMessage(
  id: string,
  agent = 'gmail-client',
): Promise<GmailMessageDetail | null> {
  const token = await getAccessToken(agent);
  if (!token) return null;

  const url = `${GMAIL_API}/messages/${id}?format=full`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    id: string;
    threadId: string;
    snippet: string;
    internalDate: string;
    labelIds?: string[];
    payload: {
      headers: Array<{ name: string; value: string }>;
      body?: { data?: string };
      parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: unknown }>;
    };
  };

  const headers = json.payload.headers;
  let body = '';
  if (json.payload.body?.data) body = decodeBase64Url(json.payload.body.data);
  else if (json.payload.parts) {
    const textPart = json.payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) body = decodeBase64Url(textPart.body.data);
  }

  return {
    id: json.id,
    threadId: json.threadId,
    from: extractHeader(headers, 'From'),
    subject: extractHeader(headers, 'Subject'),
    snippet: json.snippet,
    body,
    receivedAt: new Date(parseInt(json.internalDate, 10)).toISOString(),
    labels: json.labelIds ?? [],
  };
}

export async function createDraft(
  threadId: string,
  to: string,
  subject: string,
  body: string,
  agent = 'gmail-client',
): Promise<string | null> {
  const token = await getAccessToken(agent);
  if (!token) return null;

  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  const res = await fetch(`${GMAIL_API}/drafts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: { threadId, raw: encodeBase64Url(raw) },
    }),
  });
  if (!res.ok) {
    logger.error('gmail draft create failed', { status: res.status });
    return null;
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function setLabel(
  messageId: string,
  label: string,
  agent = 'gmail-client',
): Promise<void> {
  const token = await getAccessToken(agent);
  if (!token) return;

  await fetch(`${GMAIL_API}/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ addLabelIds: [label] }),
  });
}
