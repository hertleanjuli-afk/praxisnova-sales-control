import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { updateContact } from '@/lib/hubspot';

/**
 * Calendly Booking Detection via Brevo Inbound Email Parsing
 *
 * Flow:
 * 1. Calendly sends confirmation email to anjuli@praxisnovaai.com
 * 2. Gmail filter auto-forwards to Brevo inbound address
 * 3. Brevo parses the email and sends webhook here
 * 4. We extract the guest email from the Calendly notification
 * 5. Find matching lead → set status to "booked" → stop sequence
 *
 * Brevo Inbound Webhook payload format:
 * {
 *   "Uuid": ["..."],
 *   "Subject": "New Event: 30 Minute Meeting - Samantha Meyer and John Doe",
 *   "From": { "Name": "Calendly", "Address": "notifications@calendly.com" },
 *   "To": [{ "Name": "...", "Address": "..." }],
 *   "TextBody": "...",
 *   "HtmlBody": "...",
 *   "RawHtmlBody": "...",
 *   "Headers": { ... }
 * }
 */

// Patterns to extract guest email from Calendly notification emails
const EMAIL_PATTERNS = [
  // "Email: guest@example.com" pattern in text body
  /E-?mail[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi,
  // "Guest Email: guest@example.com"
  /Guest\s*E-?mail[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi,
  // mailto: links in HTML
  /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi,
  // Generic email pattern as fallback
  /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
];

// Emails to exclude (not guest emails)
const EXCLUDED_EMAILS = new Set([
  'notifications@calendly.com',
  'noreply@calendly.com',
  'info@praxisnovaai.com',
  'hertle.anjuli@praxisnovaai.com',
  'anjuli@praxisnovaai.com',
  'samantha@praxisnovaai.com',
  'meyer-samantha@praxisnovaai.com',
]);

function extractGuestEmail(textBody: string, htmlBody: string): string | null {
  const allText = `${textBody}\n${htmlBody}`;
  const foundEmails = new Set<string>();

  for (const pattern of EMAIL_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(allText)) !== null) {
      const email = (match[1] || match[0]).toLowerCase().trim();
      if (!EXCLUDED_EMAILS.has(email) && !email.includes('calendly.com')) {
        foundEmails.add(email);
      }
    }
  }

  // Return the first non-excluded email found
  const emails = Array.from(foundEmails);
  return emails.length > 0 ? emails[0] : null;
}

function isCalendlyEmail(from: string, subject: string): boolean {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();
  return (
    fromLower.includes('calendly') ||
    subjectLower.includes('new event') ||
    subjectLower.includes('confirmed') ||
    subjectLower.includes('meeting') ||
    subjectLower.includes('30 minute') ||
    subjectLower.includes('termin')
  );
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    // Brevo may send form-encoded data
    const text = await request.text();
    try {
      body = JSON.parse(text);
    } catch {
      console.error('Calendly webhook: Could not parse body');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
  }

  const {
    Subject: subject = '',
    From: from = {},
    TextBody: textBody = '',
    HtmlBody: htmlBody = '',
    RawHtmlBody: rawHtmlBody = '',
  } = body;

  const fromAddress = from?.Address || from?.address || '';
  const fromName = from?.Name || from?.name || '';

  console.log(`Calendly webhook received: Subject="${subject}", From="${fromName} <${fromAddress}>"`);

  // Verify this is actually a Calendly notification
  if (!isCalendlyEmail(fromAddress, subject)) {
    console.log('Not a Calendly email, skipping');
    return NextResponse.json({ ok: true, skipped: true, reason: 'not_calendly' });
  }

  // Extract guest email from email content
  const guestEmail = extractGuestEmail(
    textBody,
    htmlBody || rawHtmlBody
  );

  if (!guestEmail) {
    console.warn('Calendly webhook: Could not extract guest email from notification');
    return NextResponse.json({
      ok: false,
      error: 'Could not extract guest email',
      subject,
    });
  }

  console.log(`Calendly booking detected for: ${guestEmail}`);

  try {
    // Find lead in database
    const leads = await sql`
      SELECT * FROM leads WHERE email = ${guestEmail}
    `;

    if (leads.length === 0) {
      console.log(`No lead found for ${guestEmail} — may be a new contact`);
      return NextResponse.json({
        ok: true,
        message: 'No matching lead found',
        guest_email: guestEmail,
      });
    }

    const lead = leads[0];

    // Update lead status to "booked"
    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 90);

    await sql`
      UPDATE leads SET
        sequence_status = 'booked',
        exited_at = NOW(),
        cooldown_until = ${cooldownUntil.toISOString()}
      WHERE id = ${lead.id}
    `;

    // Log the event
    await sql`
      INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
      VALUES (${lead.id}, ${lead.sequence_type}, ${lead.sequence_step}, 'booked')
    `;

    // Sync to HubSpot
    if (lead.hubspot_id) {
      try {
        await updateContact(lead.hubspot_id, {
          sequence_status: 'booked',
          cooldown_until: cooldownUntil.toISOString().split('T')[0],
        });
      } catch (hubspotError) {
        console.error('HubSpot booking sync error:', hubspotError);
      }
    }

    console.log(`Lead ${lead.id} (${guestEmail}) marked as booked, sequence stopped`);

    return NextResponse.json({
      ok: true,
      lead_id: lead.id,
      guest_email: guestEmail,
      previous_status: lead.sequence_status,
      new_status: 'booked',
    });
  } catch (error) {
    console.error('Calendly webhook DB error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
