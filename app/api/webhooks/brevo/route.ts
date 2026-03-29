import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { updateContact } from '@/lib/hubspot';
import { classifyReply } from '@/lib/sentiment';
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (!signature || !process.env.BREVO_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', process.env.BREVO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-brevo-signature');

  // Verify webhook authenticity if secret is configured
  if (process.env.BREVO_WEBHOOK_SECRET && signature) {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, email, 'message-id': messageId, sender: senderEmail } = body;

  if (!event) {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 });
  }

  // For inbound/reply events, the lead email may be in the "sender" field instead of "email"
  const isInboundReply = event === 'inbound_email_processed' || event === 'inbound';
  const leadEmail = isInboundReply ? (senderEmail || email) : email;

  if (!leadEmail) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  try {
    const leads = await sql`SELECT * FROM leads WHERE email = ${leadEmail}`;

    if (leads.length === 0) {
      console.log(`[Brevo Webhook] Lead not found for email=${leadEmail}, event=${event}`);
      return NextResponse.json({ ok: true, message: 'Lead not found, skipping' });
    }

    const lead = leads[0];

    // Map Brevo events to our event types
    const eventMap: Record<string, string> = {
      delivered: 'sent',
      opened: 'opened',
      click: 'clicked',
      unsubscribed: 'unsubscribed',
      complaint: 'unsubscribed',
      hard_bounce: 'bounced',
      soft_bounce: 'bounced',
      hardBounce: 'bounced',
      softBounce: 'bounced',
      reply: 'replied',
      inbound_email_processed: 'replied',
      inbound: 'replied',
    };

    const eventType = eventMap[event] || event;
    console.log(`[Brevo Webhook] event=${event}, mapped=${eventType}, lead=${lead.id}, email=${leadEmail}`);

    // ── Reply Sentiment Tracking ──────────────────────────────────
    let sentiment: string | null = null;
    let sentimentConfidence: number | null = null;
    let sentimentMatch: string | null = null;

    if (eventType === 'replied') {
      // Brevo inbound webhook provides the reply text in body.text or body.items[0].text_content
      const replyText =
        body.text ||
        body.textContent ||
        body.items?.[0]?.text_content ||
        body.items?.[0]?.subject ||
        body.subject ||
        '';

      const classification = classifyReply(replyText);
      sentiment = classification.sentiment;
      sentimentConfidence = classification.confidence;
      sentimentMatch = classification.matchedPattern;

      console.log(
        `[Brevo Webhook] Reply sentiment: ${sentiment} (confidence=${sentimentConfidence}, match="${sentimentMatch}") for lead=${lead.id}`
      );
    }

    // Log the event (with optional sentiment data)
    await sql`
      INSERT INTO email_events (lead_id, sequence_type, step_number, event_type, brevo_message_id, sentiment, sentiment_confidence)
      VALUES (
        ${lead.id},
        ${lead.sequence_type},
        ${lead.sequence_step},
        ${eventType},
        ${messageId || null},
        ${sentiment},
        ${sentimentConfidence}
      )
    `;

    // Auto-stop rules – also update if lead already completed (reply can come after sequence ends)
    if (eventType === 'unsubscribed' || eventType === 'replied' || eventType === 'bounced') {
      const newStatus =
        eventType === 'bounced'
          ? 'bounced'
          : eventType === 'replied'
            ? 'replied'
            : 'unsubscribed';

      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 90);

      // Unsubscribes are PERMANENT – no cooldown, permanently blocked (DSGVO)
      if (eventType === 'unsubscribed') {
        await sql`
          UPDATE leads
          SET sequence_status = 'unsubscribed',
              exited_at = COALESCE(exited_at, NOW()),
              unsubscribed_at = COALESCE(unsubscribed_at, NOW()),
              permanently_blocked = TRUE,
              cooldown_until = NULL
          WHERE id = ${lead.id}
        `;
      } else if (eventType === 'replied' && sentiment) {
        await sql`
          UPDATE leads
          SET sequence_status = ${newStatus},
              exited_at = COALESCE(exited_at, NOW()),
              cooldown_until = ${cooldownUntil.toISOString()},
              reply_sentiment = ${sentiment}
          WHERE id = ${lead.id}
            AND sequence_status NOT IN ('unsubscribed', 'bounced')
        `;
      } else {
        await sql`
          UPDATE leads
          SET sequence_status = ${newStatus},
              exited_at = COALESCE(exited_at, NOW()),
              cooldown_until = ${cooldownUntil.toISOString()}
          WHERE id = ${lead.id}
            AND sequence_status NOT IN ('unsubscribed', 'bounced')
        `;
      }

      console.log(`[Brevo Webhook] Updated lead ${lead.id} status to ${newStatus}${sentiment ? `, sentiment=${sentiment}` : ''}`);

      // Sync to HubSpot
      if (lead.hubspot_id) {
        try {
          const hubspotProps: Record<string, string> = {
            sequence_status: newStatus,
            cooldown_until: cooldownUntil.toISOString().split('T')[0],
          };
          if (sentiment) {
            hubspotProps.reply_sentiment = sentiment;
          }
          await updateContact(lead.hubspot_id, hubspotProps);
        } catch (hubspotError) {
          console.error('HubSpot webhook sync error:', hubspotError);
        }
      }
    }

    return NextResponse.json({ ok: true, eventType, sentiment });
  } catch (error) {
    console.error('Brevo webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
