import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createContact, searchContactByEmail } from '@/lib/hubspot';
import { sendTransactionalEmail, generateConfirmLink } from '@/lib/brevo';
import { inboundSequence } from '@/lib/sequences/inbound';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, secret } = body;

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
      if (ex.sequence_status === 'active' || ex.sequence_status === 'unsubscribed') {
        return NextResponse.json({ ok: true, message: 'Lead already exists' });
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

    // Send double opt-in confirmation email (Step 0)
    const confirmLink = generateConfirmLink(email);
    const step0 = inboundSequence[0];
    const emailBody = step0.bodyTemplate
      .replace(/\{\{first_name\}\}/g, firstName || 'dort')
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
    }

    return NextResponse.json({ ok: true, message: 'Bestätigungs-E-Mail gesendet' });
  } catch (error) {
    console.error('Inbound webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
