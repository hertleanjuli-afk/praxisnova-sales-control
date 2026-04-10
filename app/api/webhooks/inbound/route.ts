import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createContact, searchContactByEmail } from '@/lib/hubspot';
import { sendTransactionalEmail, generateConfirmLink } from '@/lib/brevo';
import { inboundSequence } from '@/lib/sequences/inbound';
import { formatSalutation } from '@/lib/gender';
import { sendErrorNotification } from '@/lib/agent-runtime';

// Sendet Angie eine sofortige Benachrichtigung wenn ein neuer Inbound-Lead ankommt
async function sendInboundAlert(
  email: string,
  firstName: string,
  lastName: string,
  visitorId: string | null,
): Promise<void> {
  if (!process.env.BREVO_API_KEY) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'PraxisNova AI System', email: 'hertle.anjuli@praxisnovaai.com' },
        to: [{ email: 'hertle.anjuli@praxisnovaai.com', name: 'Anjuli Hertle' }],
        subject: `[NEUER INBOUND LEAD] ${firstName} ${lastName}`.trim(),
        htmlContent: `
          <h2>Neuer Inbound-Lead von der Website</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Visitor ID:</strong> ${visitorId || 'keine'}</p>
          <p><strong>Zeit:</strong> ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
          <hr>
          <p>Double-Opt-In Email wurde automatisch gesendet. Der Inbound-Response Agent wird in den naechsten 3 Stunden antworten.</p>
          <p><a href="https://praxisnova-sales-control.vercel.app/dashboard/leads">Im Dashboard ansehen</a></p>
        `,
      }),
    });
  } catch (e) {
    console.error('[inbound-webhook] Inbound-Alert konnte nicht gesendet werden:', e);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, secret, visitorId } = body;

  // Verify webhook secret
  if (secret !== process.env.INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 });
  }

  try {
    // Check if lead already exists
    const existing = await sql`SELECT * FROM leads WHERE email = ${email}`;

    if (existing.length > 0) {
      const ex = existing[0];
      if (ex.sequence_status === 'active' || ex.sequence_status === 'pending_optin') {
        return NextResponse.json({ ok: true, message: 'Lead already exists' });
      }
      if (ex.sequence_status === 'unsubscribed') {
        return NextResponse.json({ ok: true, message: 'Lead is unsubscribed' });
      }
      if (ex.cooldown_until && new Date(ex.cooldown_until) > new Date()) {
        return NextResponse.json({ ok: true, message: 'Lead is in cooldown' });
      }
    }

    const firstName = name?.split(' ')[0] || '';
    const lastName = name?.split(' ').slice(1).join(' ') || '';

    // Insert or update lead as pending (awaiting double opt-in)
    const result = await sql`
      INSERT INTO leads (email, first_name, last_name, industry, sequence_status, sequence_type, sequence_step)
      VALUES (${email}, ${firstName}, ${lastName}, 'inbound', 'pending_optin', 'inbound', 0)
      ON CONFLICT (email) DO UPDATE SET
        first_name = COALESCE(${firstName}, leads.first_name),
        last_name = COALESCE(${lastName}, leads.last_name),
        sequence_status = 'pending_optin',
        sequence_type = 'inbound',
        sequence_step = 0
      RETURNING id
    `;

    // Link anonymous click history to this new lead
    if (visitorId) {
      await sql`
        UPDATE website_clicks SET lead_id = ${result[0].id}
        WHERE visitor_id = ${visitorId} AND lead_id IS NULL
      `;
    }

    // Send double opt-in confirmation email (Step 0)
    const confirmLink = generateConfirmLink(email);
    const step0 = inboundSequence[0];
    const salutation = formatSalutation(firstName, lastName);
    const emailBody = step0.bodyTemplate
      .replace(/\{\{SALUTATION\}\}/g, salutation)
      .replace(/\{\{first_name\}\}/g, firstName || '')
      .replace(/\{\{last_name\}\}/g, lastName || '')
      .replace(/\{\{CONFIRM_LINK\}\}/g, confirmLink);

    await sendTransactionalEmail({
      to: email,
      subject: step0.subject!,
      htmlContent: emailBody,
      tags: ['inbound', 'double-optin'],
    });

    // Log the event
    await sql`
      INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
      VALUES (${result[0].id}, 'inbound', 0, 'sent')
    `;

    // SOFORT-BENACHRICHTIGUNG an Angie dass ein neuer Inbound-Lead angekommen ist
    // Nicht awaiten damit der Webhook-Response nicht blockiert wird
    sendInboundAlert(email, firstName, lastName, visitorId || null).catch(e =>
      console.error('[inbound-webhook] sendInboundAlert Fehler:', e),
    );

    // Sync to HubSpot
    try {
      const hubspotContact = await searchContactByEmail(email);
      if (hubspotContact) {
        // Already exists, don't overwrite
      } else {
        await createContact({
          email,
          first_name: firstName,
          last_name: lastName,
          icp_type: 'inbound',
          sequence_status: 'pending_optin',
          sequence_type: 'inbound',
          sequence_step: 0,
        });
      }
    } catch (hubspotError) {
      console.error('HubSpot inbound sync error:', hubspotError);
      // Nicht-kritischer Fehler, aber an Angie melden damit sie es weiss
      await sendErrorNotification(
        'Inbound Webhook (HubSpot Sync)',
        `HubSpot sync fehlgeschlagen fuer ${email}: ${String(hubspotError)}`,
        0,
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, message: 'Bestätigungs-E-Mail gesendet' });
  } catch (error) {
    console.error('Inbound webhook error:', error);
    // KRITISCH: Angie sofort benachrichtigen damit keine Inbound-Leads verloren gehen
    await sendErrorNotification(
      'Inbound Webhook',
      `Inbound-Lead konnte nicht verarbeitet werden (email: ${email}): ${String(error)}`,
      0,
    ).catch(() => {});
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
