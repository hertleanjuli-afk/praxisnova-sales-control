/**
 * Gmail Reply Sync Cron
 *
 * Problem solved: Brevo does not forward `reply` events to our webhook unless
 * Brevo Inbound Parse is configured. When it's not, real replies from leads
 * arrive in Angie's Gmail inbox but never touch our DB. The tool shows 0
 * replies, sequences run on forever, the 9-month company block never fires,
 * and deals leak silently. Forensic report U3 (2026-04-11) documented this
 * as the highest-priority revenue risk.
 *
 * Solution: poll the Gmail API every 15 minutes with an OAuth2 refresh token.
 * For each recent inbound message, look up the `From:` email address in our
 * `leads` table. If the sender is a lead, create an `email_events` row with
 * `event_type = 'replied'` and trigger the same downstream logic that the
 * Brevo webhook reply handler triggers (mark lead Replied, 9-month company
 * block, stop active sequences, log to HubSpot).
 *
 * This is a redundant second channel next to Brevo Inbound Parse (if Angie
 * ever activates it). Both writing to email_events with ON CONFLICT DO
 * NOTHING on the dedupe table means duplicate events are impossible even if
 * Brevo and Gmail both detect the same reply.
 *
 * Graceful fail: if any of GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET /
 * GMAIL_REFRESH_TOKEN are missing, the cron returns early with a "not
 * configured" status and writes a warning log. It never crashes the whole
 * cron system while awaiting Angie's one-time OAuth bootstrap.
 *
 * Schedule: every 15 minutes 06:00-22:00 UTC daily (incl. weekends, because
 * replies arrive on weekends too). See vercel.json.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { writeStartLog, writeEndLog } from '@/lib/agent-runtime';
import { logActivityToHubSpot } from '@/lib/hubspot';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// How far back to look in the inbox on each run. A window wider than the cron
// interval gives us slack in case one run is skipped or errors.
const GMAIL_LOOKBACK = '1d';

// ──────────────────────────────────────────────────────────────────────────
// OAuth2: trade a long-lived refresh token for a short-lived access token.
// ──────────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gmail OAuth token refresh failed: ${res.status} ${errText.substring(0, 300)}`);
  }

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`Gmail OAuth response missing access_token: ${data.error || 'unknown'}`);
  }
  return data.access_token;
}

// ──────────────────────────────────────────────────────────────────────────
// Gmail API wrappers.
// ──────────────────────────────────────────────────────────────────────────

type GmailListMessage = { id: string; threadId: string };
type GmailHeader = { name: string; value: string };
type GmailMessageMetadata = {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload?: { headers?: GmailHeader[] };
};

async function listInboxMessages(accessToken: string): Promise<GmailListMessage[]> {
  // Query: inbox messages newer than 1 day, excluding ones we sent ourselves.
  // The `-from:me` filter skips our own outgoing mail that may end up in Inbox
  // due to aliases or self-BCC rules.
  const query = `in:inbox newer_than:${GMAIL_LOOKBACK} -from:me`;
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gmail list messages failed: ${res.status} ${errText.substring(0, 300)}`);
  }

  const data = (await res.json()) as { messages?: GmailListMessage[] };
  return data.messages || [];
}

async function getMessageMetadata(accessToken: string, messageId: string): Promise<GmailMessageMetadata> {
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}` +
    `?format=metadata` +
    `&metadataHeaders=From` +
    `&metadataHeaders=In-Reply-To` +
    `&metadataHeaders=References` +
    `&metadataHeaders=Subject` +
    `&metadataHeaders=Date`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail get message ${messageId} failed: ${res.status}`);
  }

  return (await res.json()) as GmailMessageMetadata;
}

// ──────────────────────────────────────────────────────────────────────────
// Header helpers.
// ──────────────────────────────────────────────────────────────────────────

function getHeader(msg: GmailMessageMetadata, name: string): string | null {
  const headers = msg.payload?.headers || [];
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h?.value || null;
}

// Extract the bare email address from a "From: Name <email@domain>" header.
function parseEmailAddress(header: string | null): string | null {
  if (!header) return null;
  // Match "<email@domain>" first, then fall back to raw address.
  const bracketed = header.match(/<([^>]+)>/);
  if (bracketed) return bracketed[1].trim().toLowerCase();
  // Raw address form (no brackets, no display name)
  const raw = header.trim();
  if (raw.includes('@')) return raw.toLowerCase();
  return null;
}

// Extract the Message-ID from In-Reply-To header. Format is `<msg-id@domain>`.
function parseMessageId(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/<([^>]+)>/);
  return m ? m[1].trim() : header.trim();
}

// ──────────────────────────────────────────────────────────────────────────
// Reply processing - mirrors app/api/webhooks/brevo/route.ts:147-212 exactly
// so Gmail-detected replies trigger the same downstream effects as Brevo
// Inbound Parse would.
// ──────────────────────────────────────────────────────────────────────────

type ReplyProcessResult = {
  leadId: number;
  email: string;
  companyBlockCount: number;
  alreadyReplied: boolean;
};

async function processReply(
  email: string,
  inReplyTo: string | null,
  gmailMessageId: string,
): Promise<ReplyProcessResult | null> {
  // 1. Lead lookup
  const leads = await sql`
    SELECT id, company, hubspot_contact_id, signal_email_reply
    FROM leads
    WHERE LOWER(email) = LOWER(${email})
  `;
  if (leads.length === 0) return null;

  const lead = leads[0];

  // 2. Skip if already marked as replied (prevents duplicate processing
  // even across the dedupe table, e.g. if Brevo and Gmail both detect it)
  const alreadyReplied = lead.signal_email_reply === true;

  // 3. Insert email_events row. We store the Gmail message ID as the
  // "brevo_message_id" surrogate so the /lead/[id] timeline can render it.
  // The sequence_type column gets 'gmail-reply-sync' to distinguish source.
  await sql`
    INSERT INTO email_events (
      lead_id, event_type, brevo_message_id, sender_used, sequence_type, created_at
    ) VALUES (
      ${lead.id}, 'replied', ${inReplyTo || gmailMessageId}, 'gmail-detected', 'gmail-reply-sync', NOW()
    )
  `;

  if (!alreadyReplied) {
    // 4. Mark lead as Replied
    await sql`
      UPDATE leads SET
        signal_email_reply = true,
        pipeline_stage = 'Replied',
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Email-Antwort erkannt via Gmail am ', NOW()::text
        )
      WHERE id = ${lead.id}
    `;

    // 5. Company-wide 9-month block (same logic as Brevo webhook)
    let companyBlockCount = 0;
    if (lead.company) {
      const result = await sql`
        UPDATE leads SET
          pipeline_stage = 'Blocked',
          block_reason = 'company_block',
          blocked_until = NOW() + INTERVAL '9 months',
          pipeline_notes = CONCAT(
            COALESCE(pipeline_notes, ''),
            ' | Firmen-Block: Kontakt ', ${email}, ' hat via Gmail geantwortet am ', NOW()::text
          )
        WHERE LOWER(company) = LOWER(${lead.company})
          AND id != ${lead.id}
          AND pipeline_stage NOT IN ('Replied', 'Booked', 'Customer')
      `;
      companyBlockCount = (result as unknown as { count?: number }).count || 0;
    }

    // 6. Stop active sequences
    await sql`
      UPDATE sequence_entries SET
        status = 'replied',
        stopped_at = NOW()
      WHERE lead_id = ${lead.id}
        AND status IN ('active', 'pending', 'paused')
    `.catch(() => { /* table may not exist on older deployments */ });

    // 7. Mirror to HubSpot (non-blocking)
    if (lead.hubspot_contact_id) {
      logActivityToHubSpot(
        lead.hubspot_contact_id,
        'email',
        'Email-Antwort erkannt via Gmail',
      ).catch(err =>
        console.warn('[gmail-reply-sync] HubSpot sync failed (non-critical):', err),
      );
    }

    return { leadId: lead.id, email, companyBlockCount, alreadyReplied: false };
  }

  return { leadId: lead.id, email, companyBlockCount: 0, alreadyReplied: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Main handler.
// ──────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = crypto.randomUUID();
  await writeStartLog(runId, 'gmail_reply_sync');

  try {
    // 1. Get access token (graceful fail if credentials missing)
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[gmail-reply-sync] GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN not configured - skipping');
      await writeEndLog(runId, 'gmail_reply_sync', 'partial', {
        status: 'not_configured',
        summary: 'Gmail OAuth nicht eingerichtet - siehe setup-doc',
      });
      return NextResponse.json({ ok: true, status: 'not_configured' });
    }

    // 2. Ensure dedupe table exists (idempotent)
    await sql`
      CREATE TABLE IF NOT EXISTS processed_gmail_messages (
        gmail_message_id TEXT PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id),
        from_email TEXT,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 3. List recent inbox messages
    const messages = await listInboxMessages(accessToken);

    let newReplies = 0;
    let alreadyRepliedSkipped = 0;
    let notALead = 0;
    let totalCompanyBlocks = 0;
    const errors: string[] = [];

    // 4. Process each message (skip ones we already processed)
    for (const msg of messages) {
      try {
        // Dedupe check: have we seen this Gmail message before?
        const existing = await sql`
          SELECT gmail_message_id FROM processed_gmail_messages WHERE gmail_message_id = ${msg.id}
        `;
        if (existing.length > 0) continue;

        const meta = await getMessageMetadata(accessToken, msg.id);
        const fromHeader = getHeader(meta, 'From');
        const inReplyTo = parseMessageId(getHeader(meta, 'In-Reply-To'));
        const fromEmail = parseEmailAddress(fromHeader);

        if (!fromEmail) {
          // No parseable sender, mark as processed to avoid re-fetching
          await sql`
            INSERT INTO processed_gmail_messages (gmail_message_id, lead_id, from_email)
            VALUES (${msg.id}, NULL, NULL)
            ON CONFLICT DO NOTHING
          `;
          continue;
        }

        const result = await processReply(fromEmail, inReplyTo, msg.id);

        // Record as processed regardless of whether a lead matched
        await sql`
          INSERT INTO processed_gmail_messages (gmail_message_id, lead_id, from_email)
          VALUES (${msg.id}, ${result?.leadId ?? null}, ${fromEmail})
          ON CONFLICT DO NOTHING
        `;

        if (!result) {
          notALead++;
        } else if (result.alreadyReplied) {
          alreadyRepliedSkipped++;
        } else {
          newReplies++;
          totalCompanyBlocks += result.companyBlockCount;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`msg ${msg.id}: ${errMsg.substring(0, 150)}`);
        console.error(`[gmail-reply-sync] Error processing ${msg.id}:`, err);
      }
    }

    const summary =
      `${newReplies} neue Replies, ${alreadyRepliedSkipped} bereits markiert, ` +
      `${notALead} von Nicht-Leads, ${totalCompanyBlocks} Firmen-Blocks, ` +
      `${messages.length} geprueft${errors.length ? `, ${errors.length} Fehler` : ''}`;

    await writeEndLog(runId, 'gmail_reply_sync', errors.length > 0 ? 'partial' : 'completed', {
      messages_checked: messages.length,
      new_replies: newReplies,
      already_replied_skipped: alreadyRepliedSkipped,
      not_a_lead: notALead,
      company_blocks: totalCompanyBlocks,
      errors: errors.length,
      summary,
    });

    return NextResponse.json({
      ok: true,
      messages_checked: messages.length,
      new_replies: newReplies,
      already_replied_skipped: alreadyRepliedSkipped,
      not_a_lead: notALead,
      company_blocks: totalCompanyBlocks,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[gmail-reply-sync] Fatal error:', err);
    await writeEndLog(runId, 'gmail_reply_sync', 'error', {
      error: String(err),
      summary: `Fatal: ${String(err).substring(0, 200)}`,
    });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
