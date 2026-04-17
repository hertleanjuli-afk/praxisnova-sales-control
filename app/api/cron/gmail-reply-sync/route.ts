/**
 * Gmail Reply Sync Cron (Paket A, 2026-04-11)
 *
 * Das Tool wartet auf einen Brevo Inbound Webhook, der nie kommt weil
 * Angies Reply-To Adresse ihre Google-Workspace-Gmail ist und nicht
 * Brevo. Resultat bisher: Reply-Count = 0 obwohl echte Antworten kommen.
 *
 * Dieser Cron laeuft alle 10 Minuten, pollt die Gmail API mit einem
 * OAuth2 Refresh Token, matcht eingehende Mails gegen `leads.email`
 * und verarbeitet jedes Match wie folgt:
 *
 * 1) Ist es eine Abwesenheitsnotiz (OOO)?
 *    - Ja: setze `leads.oof_until` auf das erkannte Rueckkehrdatum,
 *      pausiere die Sequenz (sequence_status = 'paused',
 *      resume_at = oof_until). Schreibe einen ooo-Event in email_events.
 *      Kein Firmen-Block, keine Angie-Notification. Label setzen.
 *
 *    - Nein: volle Reply-Verarbeitung wie der Brevo-Webhook-Reply-Handler
 *      es machen wuerde. Lead auf pipeline_stage = 'Antwort erhalten',
 *      leads.signal_email_reply = true, leads.last_reply_at = now,
 *      9-Monats-Firmenblockade, aktive Sequenzen stoppen, HubSpot-Aktivitaet
 *      loggen, Brevo-Notification an Angie schicken.
 *
 * 2) In beiden Faellen: Label `praxisnova-processed` auf die Mail
 *    setzen (via gmail.modify Scope) damit Angie in Gmail visuell sieht
 *    welche Replies bereits im Tool gelandet sind.
 *
 * 3) Eintrag in `processed_gmail_messages` schreiben damit derselbe
 *    Message-ID nie zweimal verarbeitet wird (auch nicht wenn der Cron
 *    6x pro Stunde laeuft).
 *
 * Graceful Fail: ohne GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET /
 * GMAIL_REFRESH_TOKEN liefert der Cron `status: 'not_configured'` ohne
 * zu crashen. Das Deployment ist damit sicher bevor Angie den einmaligen
 * OAuth-Bootstrap macht.
 *
 * Schedule: siehe vercel.json - alle 10 Minuten zwischen 06:00 und 22:00
 * UTC, jeden Tag inkl. Wochenenden. Replies kommen auch am Wochenende.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { writeStartLog, writeEndLog } from '@/lib/agent-runtime';
import { logActivityToHubSpot } from '@/lib/hubspot';
import { sendTransactionalEmail } from '@/lib/brevo';
import {
  readCredentialsFromEnv,
  getAccessToken,
  listInboxMessages,
  getMessageFull,
  getHeader,
  parseEmailAddress,
  parseMessageId,
  extractBodyText,
  modifyMessageLabels,
  getOrCreateLabel,
} from '@/lib/gmail-client';
import { detectOOO } from '@/lib/ooo-detector';
import { observe } from '@/lib/observability/logger';
import { verifyMemoryFacts, getStaleFacts } from '@/lib/memory/hygiene';
import { replyDetectorFacts } from '@/lib/memory/agent-facts';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Wie weit zurueckblicken. Breiter als das Cron-Intervall, damit ein
// uebersprungener Run aufholen kann.
const GMAIL_LOOKBACK_WINDOW = '1d';

// Wie viele Mails pro Lauf maximal abrufen.
const MAX_MESSAGES_PER_RUN = 100;

// Name des Labels das auf verarbeitete Mails gesetzt wird.
// Erscheint in Angies Gmail-Oberflaeche als Tag.
const PROCESSED_LABEL_NAME = 'praxisnova-processed';

// Free-Mail-Domains die beim Domain-Matching uebersprungen werden.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'web.de', 'gmx.de', 'gmx.net', 'yahoo.com',
  'hotmail.com', 'outlook.com', 't-online.de', 'freenet.de',
  'posteo.de', 'icloud.com', 'live.de', 'live.com', 'aol.com',
  'mail.de', 'protonmail.com',
]);

// ─── Reply-Verarbeitung (echter Reply, kein OOO) ─────────────────────────

type Lead = {
  id: number;
  company: string | null;
  hubspot_contact_id: string | null;
  signal_email_reply: boolean;
  first_name: string | null;
  last_name: string | null;
};

async function handleRealReply(
  lead: Lead,
  fromEmail: string,
  subject: string | null,
  inReplyTo: string | null,
  gmailMessageId: string,
): Promise<{ companyBlockCount: number; firstTime: boolean }> {
  const alreadyReplied = lead.signal_email_reply === true;
  const firstTime = !alreadyReplied;

  // 1. email_events Row (auch bei wiederholter Antwort, damit die Timeline
  // lueckenlos ist)
  await sql`
    INSERT INTO email_events (
      lead_id, event_type, brevo_message_id, sender_used, sequence_type, created_at
    ) VALUES (
      ${lead.id}, 'replied', ${inReplyTo || gmailMessageId}, 'gmail-detected', 'gmail-reply-sync', NOW()
    )
  `;

  // 2. leads.last_reply_at aktualisieren (unabhaengig davon ob es die
  // erste Antwort ist)
  await sql`
    UPDATE leads SET last_reply_at = NOW() WHERE id = ${lead.id}
  `;

  // Downstream-Effekte nur beim ersten Mal ausloesen
  if (!firstTime) {
    return { companyBlockCount: 0, firstTime: false };
  }

  // 3. Lead als "Antwort erhalten" markieren
  await sql`
    UPDATE leads SET
      signal_email_reply = true,
      pipeline_stage = 'Antwort erhalten',
      pipeline_stage_updated_at = NOW(),
      pipeline_notes = CONCAT(
        COALESCE(pipeline_notes, ''),
        ' | Email-Antwort erkannt via Gmail am ', NOW()::text
      )
    WHERE id = ${lead.id}
  `;

  // 4. Firmenweite 9-Monats-Blockade
  let companyBlockCount = 0;
  if (lead.company) {
    const result = await sql`
      UPDATE leads SET
        pipeline_stage = 'Blocked',
        block_reason = 'company_block',
        blocked_until = NOW() + INTERVAL '9 months',
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Firmen-Block: Kontakt ', ${fromEmail}, ' hat via Gmail geantwortet am ', NOW()::text
        )
      WHERE LOWER(company) = LOWER(${lead.company})
        AND id != ${lead.id}
        AND pipeline_stage NOT IN ('Antwort erhalten', 'Booked', 'Customer', 'Replied')
    `;
    companyBlockCount = (result as unknown as { count?: number }).count || 0;
  }

  // 5. Aktive Sequenzen stoppen
  await sql`
    UPDATE sequence_entries SET
      status = 'replied',
      stopped_at = NOW()
    WHERE lead_id = ${lead.id}
      AND status IN ('active', 'pending', 'paused')
  `.catch(() => { /* Tabelle existiert evtl. noch nicht */ });

  // 6. HubSpot-Aktivitaet loggen (non-blocking)
  if (lead.hubspot_contact_id) {
    logActivityToHubSpot(
      lead.hubspot_contact_id,
      'email',
      `Email-Antwort erkannt via Gmail${subject ? ` - Betreff: ${subject}` : ''}`,
    ).catch(err =>
      console.warn('[gmail-reply-sync] HubSpot sync failed (non-critical):', err),
    );
  }

  return { companyBlockCount, firstTime: true };
}

// ─── OOO-Verarbeitung ────────────────────────────────────────────────────

async function handleOOO(
  lead: Lead,
  fromEmail: string,
  returnDate: Date | null,
  gmailMessageId: string,
  reason: string | null,
): Promise<void> {
  // 1. email_events Row mit Spezial-Typ 'ooo'
  await sql`
    INSERT INTO email_events (
      lead_id, event_type, brevo_message_id, sender_used, sequence_type, created_at
    ) VALUES (
      ${lead.id}, 'ooo', ${gmailMessageId}, 'gmail-detected', 'gmail-reply-sync', NOW()
    )
  `;

  // 2. leads.oof_until setzen (optional, nur wenn Rueckkehrdatum parsebar war)
  if (returnDate) {
    const isoDate = returnDate.toISOString();
    await sql`
      UPDATE leads SET
        oof_until = ${isoDate},
        sequence_status = 'paused',
        paused_at = NOW(),
        resume_at = ${isoDate},
        pause_reason = 'ooo',
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | OOO erkannt via Gmail am ', NOW()::text, ', Wiederaufnahme: ', ${isoDate},
          ${reason ? `, Pattern: ${reason}` : ''}
        )
      WHERE id = ${lead.id}
    `;
  } else {
    // Kein Datum parsebar - pausiere unbefristet mit Fallback 7 Tage
    await sql`
      UPDATE leads SET
        sequence_status = 'paused',
        paused_at = NOW(),
        resume_at = NOW() + INTERVAL '7 days',
        pause_reason = 'ooo',
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | OOO erkannt via Gmail am ', NOW()::text, ', Rueckkehrdatum unbekannt, Fallback 7 Tage',
          ${reason ? `, Pattern: ${reason}` : ''}
        )
      WHERE id = ${lead.id}
    `;
  }
}

// ─── Angie-Benachrichtigung ──────────────────────────────────────────────

async function notifyAngie(
  lead: Lead,
  fromEmail: string,
  subject: string | null,
  snippet: string,
  companyBlockCount: number,
  domainMatchContext?: { originalLeadName: string; isDomainMatch: boolean },
): Promise<void> {
  const angieEmail = process.env.USER_1_EMAIL || 'hertle.anjuli@praxisnovaai.com';
  const leadName =
    [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || fromEmail;
  const leadUrl = `https://praxisnova-sales-control.vercel.app/lead/${lead.id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #F0F0F5; padding: 24px; max-width: 640px;">
      <h2 style="color: #E8472A; margin: 0 0 8px;">Neue Antwort erhalten</h2>
      <p style="color: #ccc; margin: 0 0 20px; font-size: 14px;">
        ${domainMatchContext?.isDomainMatch
          ? `Antwort von einem Kollegen: ${fromEmail} hat auf eine Outreach-Mail an ${domainMatchContext.originalLeadName} geantwortet.`
          : `${leadName}${lead.company ? ` (${lead.company})` : ''} hat auf eine Ihrer Sequenz-Mails geantwortet.`}
      </p>

      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Absender</div>
        <div style="color: #F0F0F5; font-size: 14px; margin-bottom: 12px;">${fromEmail}</div>
        <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Betreff</div>
        <div style="color: #F0F0F5; font-size: 14px; margin-bottom: 12px;">${subject || '(kein Betreff)'}</div>
        <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Ausschnitt</div>
        <div style="color: #ccc; font-size: 13px; line-height: 1.5; font-style: italic; white-space: pre-wrap;">${snippet}</div>
      </div>

      ${companyBlockCount > 0 ? `
        <div style="background: #2a1a00; border: 1px solid #5a3a00; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; color: #fbbf24; font-size: 13px;">
          Firmenblockade aktiviert: ${companyBlockCount} weitere Kontakte bei ${lead.company} wurden fuer 9 Monate gesperrt.
        </div>
      ` : ''}

      <a href="${leadUrl}" style="display: inline-block; background: #E8472A; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Lead im Sales-Tool oeffnen
      </a>

      <p style="color: #555; margin: 20px 0 0; font-size: 11px;">
        Automatisch erkannt durch gmail-reply-sync um ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} Berlin-Zeit.
      </p>
    </div>
  `;

  await sendTransactionalEmail({
    to: angieEmail,
    subject: `Antwort von ${leadName}${lead.company ? ' (' + lead.company + ')' : ''}`,
    htmlContent: html,
    wrapAsInternal: true,
  }).catch(err =>
    console.warn('[gmail-reply-sync] Brevo notification to Angie failed (non-critical):', err),
  );
}

// ─── Haupt-Handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();
  await writeStartLog(runId, 'gmail_reply_sync');
  observe.info({
    agent: 'reply_detector',
    skill: 'customer-support.ticket-triage',
    message: 'gmail-reply-sync started',
    context: { run_id: runId },
  });

  // Memory-Hygiene: verify the 3 wichtigsten Facts bevor der Loop startet.
  // Stale-Facts blocken den Run NICHT, aber sie werden als Warnungen geloggt
  // und (falls kritisch) triggert observe.warn/error ihre Push-Kanaele.
  try {
    const factResults = await verifyMemoryFacts(
      replyDetectorFacts,
      { agent: 'reply_detector', run_id: runId },
      { topN: 3, timeoutMs: 2000 },
    );
    const stale = getStaleFacts(factResults);
    if (stale.length > 0) {
      observe.warn({
        agent: 'reply_detector',
        message: 'memory hygiene: stale facts detected, run continues',
        context: {
          run_id: runId,
          stale_facts: stale.map((f) => f.fact_id),
        },
      });
    }
  } catch (hygErr) {
    // Hygiene selbst sollte nie werfen (verifyMemoryFacts never-throws),
    // aber Defense-in-Depth.
    console.warn('[gmail-reply-sync] memory hygiene threw (non-fatal):', hygErr);
  }

  try {
    // 1) Credentials lesen - graceful fail wenn unkonfiguriert
    const creds = readCredentialsFromEnv();
    if (!creds) {
      console.warn('[gmail-reply-sync] GMAIL_* env vars not configured - skipping');
      await observe.error({
        agent: 'reply_detector',
        skill: 'customer-support.ticket-triage',
        message: 'gmail oauth not configured, safe-noop',
        context: {
          run_id: runId,
          reason: 'env_missing',
          critical: true,
        },
        duration_ms: Date.now() - startTime,
      });
      await writeEndLog(runId, 'gmail_reply_sync', 'partial', {
        status: 'not_configured',
        summary: 'Gmail OAuth nicht eingerichtet - siehe SETUP-gmail-reply-sync.md',
      });
      return NextResponse.json({ ok: true, status: 'not_configured', fallback: 'safe-noop' });
    }

    // 2) Dedupe-Tabelle sicherstellen (idempotent)
    await sql`
      CREATE TABLE IF NOT EXISTS processed_gmail_messages (
        gmail_message_id TEXT PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id),
        from_email TEXT,
        was_ooo BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 3) Access Token holen
    const accessToken = await getAccessToken(creds);

    // 4) Label-ID holen (einmal erzeugen, dann cachen fuer die Dauer des Laufs)
    let processedLabelId: string | null = null;
    try {
      processedLabelId = await getOrCreateLabel(accessToken, PROCESSED_LABEL_NAME);
    } catch (labelErr) {
      console.warn('[gmail-reply-sync] Could not get/create label (non-critical):', labelErr);
    }

    // 5) Inbox-Messages listen
    // Filter: Inbox, juenger als X, nicht von mir selbst, noch ohne unser Label
    const query = `in:inbox newer_than:${GMAIL_LOOKBACK_WINDOW} -from:me -label:${PROCESSED_LABEL_NAME}`;
    const messages = await listInboxMessages(accessToken, query, MAX_MESSAGES_PER_RUN);

    // Counter fuer Summary
    let newReplies = 0;
    let repliesAlreadyMarked = 0;
    let oooDetected = 0;
    let notALead = 0;
    let domainMatches = 0;
    let totalCompanyBlocks = 0;
    const errors: string[] = [];

    // 6) Jede Message einzeln verarbeiten
    for (const msg of messages) {
      try {
        // Dedupe-Check
        const existing = await sql`
          SELECT gmail_message_id FROM processed_gmail_messages WHERE gmail_message_id = ${msg.id}
        `;
        if (existing.length > 0) continue;

        // Volle Message laden (inkl. Body fuer OOO-Detection)
        const full = await getMessageFull(accessToken, msg.id);
        const fromHeader = getHeader(full, 'From');
        const subject = getHeader(full, 'Subject');
        const inReplyTo = parseMessageId(getHeader(full, 'In-Reply-To'));
        const autoSubmitted = getHeader(full, 'Auto-Submitted');
        const xAutoreply = getHeader(full, 'X-Autoreply');
        const xAutoresponse = getHeader(full, 'X-Autoresponse');
        const precedence = getHeader(full, 'Precedence');
        const fromEmail = parseEmailAddress(fromHeader);
        const body = extractBodyText(full);

        if (!fromEmail) {
          await sql`
            INSERT INTO processed_gmail_messages (gmail_message_id, lead_id, from_email, was_ooo)
            VALUES (${msg.id}, NULL, NULL, FALSE)
            ON CONFLICT DO NOTHING
          `;
          continue;
        }

        // Lead-Lookup
        const leads = await sql`
          SELECT id, company, hubspot_contact_id, signal_email_reply, first_name, last_name
          FROM leads
          WHERE LOWER(email) = LOWER(${fromEmail})
        `;

        if (leads.length === 0) {
          // --- Domain-based matching: check if a colleague from the same company replied ---
          const emailParts = fromEmail.split('@');
          const domain = emailParts.length === 2 ? emailParts[1].toLowerCase() : null;

          if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
            const domainLeads = await sql`
              SELECT id, company, hubspot_contact_id, signal_email_reply, first_name, last_name
              FROM leads
              WHERE email LIKE ${'%@' + domain}
                AND pipeline_stage NOT IN ('Blocked', 'Lost')
              LIMIT 1
            `;

            if (domainLeads.length > 0) {
              const originalLead = domainLeads[0] as unknown as Lead;
              domainMatches++;

              // Parse first/last name from the From header display name
              let parsedFirst: string | null = null;
              let parsedLast: string | null = null;
              if (fromHeader) {
                const displayName = fromHeader.replace(/<[^>]+>/, '').replace(/"/g, '').trim();
                if (displayName && displayName !== fromEmail) {
                  const nameParts = displayName.split(/\s+/);
                  parsedFirst = nameParts[0] || null;
                  parsedLast = nameParts.slice(1).join(' ') || null;
                }
              }

              const originalLeadName = [originalLead.first_name, originalLead.last_name]
                .filter(Boolean).join(' ').trim() || 'unbekannt';

              // Auto-create the new lead for the replier
              const newLeadResult = await sql`
                INSERT INTO leads (
                  email, first_name, last_name, company,
                  pipeline_stage, source, manual_entry, sequence_status,
                  signal_email_reply, pipeline_notes, created_at
                ) VALUES (
                  ${fromEmail},
                  ${parsedFirst},
                  ${parsedLast},
                  ${originalLead.company},
                  'Antwort erhalten',
                  'email_reply_domain_match',
                  false,
                  'completed',
                  true,
                  ${'Auto-erstellt durch Domain-Match: Antwort von ' + fromEmail + ' erkannt, verknuepft mit ' + (originalLead.company || 'unbekannt')},
                  NOW()
                )
                RETURNING id
              `;

              const newLeadId = newLeadResult[0]?.id;

              // Trigger handleRealReply on the ORIGINAL lead found by domain
              const { companyBlockCount, firstTime } = await handleRealReply(
                originalLead,
                fromEmail,
                subject,
                inReplyTo,
                msg.id,
              );

              if (firstTime) {
                newReplies++;
                totalCompanyBlocks += companyBlockCount;
              } else {
                repliesAlreadyMarked++;
              }

              // Notify Angie with domain match context
              const snippet = (full.snippet || body.substring(0, 500)).substring(0, 500);
              await notifyAngie(originalLead, fromEmail, subject, snippet, companyBlockCount, {
                originalLeadName,
                isDomainMatch: true,
              });

              // Label and dedupe
              if (processedLabelId) {
                await modifyMessageLabels(accessToken, msg.id, [processedLabelId], []).catch(() => {});
              }
              await sql`
                INSERT INTO processed_gmail_messages (gmail_message_id, lead_id, from_email, was_ooo)
                VALUES (${msg.id}, ${newLeadId || originalLead.id}, ${fromEmail}, FALSE)
                ON CONFLICT DO NOTHING
              `;
              continue;
            }
          }

          // No exact match and no domain match - truly not a lead
          notALead++;
          await sql`
            INSERT INTO processed_gmail_messages (gmail_message_id, lead_id, from_email, was_ooo)
            VALUES (${msg.id}, NULL, ${fromEmail}, FALSE)
            ON CONFLICT DO NOTHING
          `;
          // Label auch auf Nicht-Leads setzen damit der Query sie beim naechsten
          // Lauf nicht nochmal zurueckliefert
          if (processedLabelId) {
            await modifyMessageLabels(accessToken, msg.id, [processedLabelId], []).catch(() => {});
          }
          continue;
        }

        const lead = leads[0] as unknown as Lead;

        // OOO-Detection zuerst
        const ooo = detectOOO({
          subject,
          body,
          autoSubmitted,
          xAutoreply,
          xAutoresponse,
          precedence,
        });

        if (ooo.isOOO) {
          oooDetected++;
          await handleOOO(lead, fromEmail, ooo.returnDate, msg.id, ooo.reason);
          console.log(
            `[gmail-reply-sync] OOO detected for ${fromEmail} (lead ${lead.id}), ` +
            `confidence=${ooo.confidence}, returnDate=${ooo.returnDate?.toISOString() || 'unknown'}, pattern=${ooo.matchedPattern}`,
          );
        } else {
          // Echter Reply
          const { companyBlockCount, firstTime } = await handleRealReply(
            lead,
            fromEmail,
            subject,
            inReplyTo,
            msg.id,
          );

          if (firstTime) {
            newReplies++;
            totalCompanyBlocks += companyBlockCount;

            // Benachrichtigung an Angie
            const snippet = (full.snippet || body.substring(0, 500)).substring(0, 500);
            await notifyAngie(lead, fromEmail, subject, snippet, companyBlockCount);
          } else {
            repliesAlreadyMarked++;
          }
        }

        // Label setzen (in allen Faellen)
        if (processedLabelId) {
          await modifyMessageLabels(accessToken, msg.id, [processedLabelId], []).catch(err =>
            console.warn(`[gmail-reply-sync] Label set failed for ${msg.id} (non-critical):`, err),
          );
        }

        // In Dedupe-Tabelle eintragen
        await sql`
          INSERT INTO processed_gmail_messages (gmail_message_id, lead_id, from_email, was_ooo)
          VALUES (${msg.id}, ${lead.id}, ${fromEmail}, ${ooo.isOOO})
          ON CONFLICT DO NOTHING
        `;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`msg ${msg.id}: ${errMsg.substring(0, 150)}`);
        console.error(`[gmail-reply-sync] Error processing ${msg.id}:`, err);
      }
    }

    const summary =
      `${newReplies} neue Antworten, ${oooDetected} OOO, ${repliesAlreadyMarked} bereits markiert, ` +
      `${domainMatches} Domain-Matches, ${notALead} von Nicht-Leads, ${totalCompanyBlocks} Firmen-Blocks, ` +
      `${messages.length} Mails geprueft${errors.length ? `, ${errors.length} Fehler` : ''}`;

    await writeEndLog(
      runId,
      'gmail_reply_sync',
      errors.length > 0 ? 'partial' : 'completed',
      {
        messages_checked: messages.length,
        new_replies: newReplies,
        ooo_detected: oooDetected,
        already_marked: repliesAlreadyMarked,
        domain_matches: domainMatches,
        not_a_lead: notALead,
        company_blocks: totalCompanyBlocks,
        errors: errors.length,
        summary,
      },
    );

    observe.info({
      agent: 'reply_detector',
      skill: 'customer-support.ticket-triage',
      message: 'gmail-reply-sync completed',
      context: {
        run_id: runId,
        messages_checked: messages.length,
        new_replies: newReplies,
        ooo_detected: oooDetected,
        errors: errors.length,
      },
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: true,
      messages_checked: messages.length,
      new_replies: newReplies,
      ooo_detected: oooDetected,
      already_marked: repliesAlreadyMarked,
      domain_matches: domainMatches,
      not_a_lead: notALead,
      company_blocks: totalCompanyBlocks,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[gmail-reply-sync] Fatal error:', err);
    // observe.error triggert ntfy-Push auf Angies iPhone fuer gmail-Fatal-Error.
    // context.critical=true -> Priority=high (Sound/Banner). Kritisch weil
    // Reply-Detection fuer Real Estate Pilot Antworten unersetzlich ist.
    await observe.error({
      agent: 'reply_detector',
      skill: 'customer-support.ticket-triage',
      message: 'gmail-reply-sync fatal error',
      context: {
        run_id: runId,
        err: err instanceof Error ? err.message : String(err),
        critical: true,
      },
      duration_ms: Date.now() - startTime,
    });
    await writeEndLog(runId, 'gmail_reply_sync', 'error', {
      error: String(err),
      summary: `Fataler Fehler: ${String(err).substring(0, 200)}`,
    });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
