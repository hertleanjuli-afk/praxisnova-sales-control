import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { updateContact } from '@/lib/hubspot';
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

  const { event, email, 'message-id': messageId } = body;

  if (!event || !email) {
    return NextResponse.json({ error: 'Missing event or email' }, { status: 400 });
  }

  try {
    const leads = await sql`SELECT * FROM leads WHERE email = ${email}`;
    if (leads.length === 0) {
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
      reply: 'replied',
    };

    const eventType = eventMap[event] || event;

    // Log the event
    await sql`
      INSERT INTO email_events (lead_id, sequence_type, step_number, event_type, brevo_message_id)
      VALUES (${lead.id}, ${lead.sequence_type}, ${lead.sequence_step}, ${eventType}, ${messageId || null})
    `;

    // Auto-stop rules
    if (eventType === 'unsubscribed' || eventType === 'replied' || eventType === 'bounced') {
      const newStatus = eventType === 'bounced' ? 'bounced' : eventType === 'replied' ? 'replied' : 'unsubscribed';
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 90);

      await sql`
        UPDATE leads SET
          sequence_status = ${newStatus},
          exited_at = NOW(),
          cooldown_until = ${cooldownUntil.toISOString()}
        WHERE id = ${lead.id}
      `;

      // Sync to HubSpot
      if (lead.hubspot_id) {
        try {
          await updateContact(lead.hubspot_id, {
            sequence_status: newStatus,
            cooldown_until: cooldownUntil.toISOString().split('T')[0],
          });
        } catch (hubspotError) {
          console.error('HubSpot webhook sync error:', hubspotError);
        }
      }
    }

    return NextResponse.json({ ok: true, eventType });
  } catch (error) {
    console.error('Brevo webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
