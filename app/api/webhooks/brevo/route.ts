import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * POST /api/webhooks/brevo
 *
 * Brevo Webhook fuer Email-Events.
 * Einrichten in Brevo Dashboard unter Settings > Webhooks:
 * - URL: https://praxisnova-sales-control.vercel.app/api/webhooks/brevo
 * - Events: opened, clicked, reply, hardBounce, softBounce, unsubscribed, complaint
 */

// Helper: Event in email_events Tabelle speichern
async function insertEmailEvent(
  leadId: number,
  eventType: string,
  messageId: string | null,
  senderUsed: string | null,
  sequenceType: string | null = null,
) {
  try {
    await sql`
      INSERT INTO email_events (
        lead_id,
        event_type,
        brevo_message_id,
        sender_used,
        sequence_type,
        created_at
      ) VALUES (
        ${leadId},
        ${eventType},
        ${messageId},
        ${senderUsed},
        ${sequenceType},
        NOW()
      )
    `;
  } catch (err) {
    // Fehler beim Einfuegen nicht den gesamten Webhook abbrechen lassen
    console.error('[Brevo Webhook] email_events INSERT Fehler:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify Brevo webhook signature
    const signature = req.headers.get('X-Brevo-Signature');
    const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;

    let payload;
    if (webhookSecret && signature) {
      const { createHmac } = await import('crypto');
      const bodyText = await req.text();
      const expectedSignature = createHmac('sha256', webhookSecret).update(bodyText).digest('hex');
      if (signature !== expectedSignature) {
        console.warn('[brevo-webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      // Re-parse body since we consumed it
      payload = JSON.parse(bodyText);
    } else {
      payload = await req.json();
    }

    const body = payload;
    const event = body.event;
    const messageId = body['message-id'] || body.messageId || null;
    const senderEmail = body.sender || 'hertle.anjuli@praxisnovaai.com';
    // Brevo sendet Tags als Array oder String
    const tag = Array.isArray(body.tags) ? body.tags[0] : (body.tag || null);

    console.log(`[Brevo Webhook] Event: ${event}`, JSON.stringify(body).substring(0, 500));

    switch (event) {
      // ----------------------------------------------------------------
      // OPENED - Lead hat die Email geoeffnet
      // ----------------------------------------------------------------
      case 'opened': {
        const email = body.email || body['email-id'];
        if (!email) return NextResponse.json({ ok: true, action: 'no_email' });

        const leads = await sql`
          SELECT id FROM leads WHERE LOWER(email) = LOWER(${email})
        `;
        if (leads.length === 0) return NextResponse.json({ ok: true, action: 'lead_not_found' });

        const lead = leads[0];
        await insertEmailEvent(lead.id, 'opened', messageId, senderEmail, tag);

        console.log(`[Brevo Webhook] Opened: Lead ${lead.id}`);
        return NextResponse.json({ ok: true, action: 'open_tracked', lead_id: lead.id });
      }

      // ----------------------------------------------------------------
      // CLICKED - Lead hat einen Link in der Email angeklickt
      // ----------------------------------------------------------------
      case 'clicked': {
        const email = body.email || body['email-id'];
        if (!email) return NextResponse.json({ ok: true, action: 'no_email' });

        const leads = await sql`
          SELECT id FROM leads WHERE LOWER(email) = LOWER(${email})
        `;
        if (leads.length === 0) return NextResponse.json({ ok: true, action: 'lead_not_found' });

        const lead = leads[0];
        await insertEmailEvent(lead.id, 'clicked', messageId, senderEmail, tag);

        console.log(`[Brevo Webhook] Clicked: Lead ${lead.id}`);
        return NextResponse.json({ ok: true, action: 'click_tracked', lead_id: lead.id });
      }

      // ----------------------------------------------------------------
      // REPLY - Lead hat geantwortet
      // ----------------------------------------------------------------
      case 'reply': {
        const email = body.email || body['email-id'];
        if (!email) {
          return NextResponse.json({ error: 'Keine Email-Adresse im Event' }, { status: 400 });
        }

        // 1. Lead finden
        const leads = await sql`
          SELECT id, company FROM leads WHERE LOWER(email) = LOWER(${email})
        `;

        if (leads.length === 0) {
          console.log(`[Brevo Webhook] Lead nicht gefunden: ${email}`);
          return NextResponse.json({ ok: true, action: 'lead_not_found' });
        }

        const lead = leads[0];

        // 2. Event in email_events speichern
        await insertEmailEvent(lead.id, 'replied', messageId, senderEmail, tag);

        // 3. Lead als "replied" markieren
        await sql`
          UPDATE leads SET
            signal_email_reply = true,
            pipeline_stage = 'Replied',
            pipeline_notes = CONCAT(
              COALESCE(pipeline_notes, ''),
              ' | Email-Antwort erhalten am ', NOW()::text
            )
          WHERE id = ${lead.id}
        `;

        // 4. Firmenweite Blockierung
        let companyBlockCount = 0;
        if (lead.company) {
          const result = await sql`
            UPDATE leads SET
              pipeline_stage = 'Blocked',
              block_reason = 'company_block',
              blocked_until = NOW() + INTERVAL '9 months',
              pipeline_notes = CONCAT(
                COALESCE(pipeline_notes, ''),
                ' | Firmen-Block: Kontakt ', ${email}, ' hat geantwortet am ', NOW()::text
              )
            WHERE LOWER(company) = LOWER(${lead.company})
              AND id != ${lead.id}
              AND pipeline_stage NOT IN ('Replied', 'Booked', 'Customer')
          `;
          companyBlockCount = result.count || 0;
        }

        // 5. Aktive Sequences stoppen
        await sql`
          UPDATE sequence_entries SET
            status = 'replied',
            stopped_at = NOW()
          WHERE lead_id = ${lead.id}
            AND status IN ('active', 'pending', 'paused')
        `;

        console.log(`[Brevo Webhook] Reply verarbeitet: Lead ${lead.id}, Firma-Blocks: ${companyBlockCount}`);
        return NextResponse.json({
          ok: true,
          action: 'reply_processed',
          lead_id: lead.id,
          company_leads_blocked: companyBlockCount,
        });
      }

      // ----------------------------------------------------------------
      // BOUNCES
      // ----------------------------------------------------------------
      case 'hardBounce':
      case 'softBounce': {
        const email = body.email || body['email-id'];
        if (email) {
          const leads = await sql`
            SELECT id FROM leads WHERE LOWER(email) = LOWER(${email})
          `;
          if (leads.length > 0) {
            const lead = leads[0];
            await insertEmailEvent(lead.id, 'bounced', messageId, senderEmail, tag);
            await sql`
              UPDATE leads SET
                sequence_status = 'bounced',
                pipeline_notes = CONCAT(
                  COALESCE(pipeline_notes, ''),
                  ' | Email Bounce (', ${event}, ') am ', NOW()::text
                )
              WHERE id = ${lead.id}
            `;
          }
        }
        return NextResponse.json({ ok: true, action: 'bounce_processed' });
      }

      // ----------------------------------------------------------------
      // UNSUBSCRIBED
      // ----------------------------------------------------------------
      case 'unsubscribed': {
        const email = body.email || body['email-id'];
        if (email) {
          await sql`
            UPDATE leads SET
              sequence_status = 'unsubscribed',
              permanently_blocked = true,
              pipeline_stage = 'Blocked',
              block_reason = 'unsubscribed',
              pipeline_notes = CONCAT(
                COALESCE(pipeline_notes, ''),
                ' | Abmeldung am ', NOW()::text
              )
            WHERE LOWER(email) = LOWER(${email})
          `;
        }
        return NextResponse.json({ ok: true, action: 'unsubscribe_processed' });
      }

      // ----------------------------------------------------------------
      // SPAM COMPLAINT
      // ----------------------------------------------------------------
      case 'complaint': {
        const email = body.email || body['email-id'];
        if (email) {
          await sql`
            UPDATE leads SET
              permanently_blocked = true,
              pipeline_stage = 'Blocked',
              block_reason = 'complaint',
              pipeline_notes = CONCAT(
                COALESCE(pipeline_notes, ''),
                ' | Spam-Beschwerde am ', NOW()::text
              )
            WHERE LOWER(email) = LOWER(${email})
          `;
        }
        return NextResponse.json({ ok: true, action: 'complaint_processed' });
      }

      default:
        return NextResponse.json({ ok: true, action: 'event_ignored', event });
    }
  } catch (error) {
    console.error('[Brevo Webhook] Fehler:', error);
    return NextResponse.json({ error: 'Webhook-Verarbeitungsfehler' }, { status: 500 });
  }
}
