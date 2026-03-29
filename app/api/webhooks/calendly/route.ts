import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { updateContact } from '@/lib/hubspot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, payload } = body;

    if (!payload?.email) {
      return NextResponse.json({ ok: true, action: 'no_email_in_payload' });
    }

    const email = payload.email.toLowerCase();

    // Find lead by email
    const leads = await sql`SELECT * FROM leads WHERE email = ${email} LIMIT 1`;
    const lead = leads[0];

    if (!lead) {
      return NextResponse.json({ ok: true, action: 'no_lead_found' });
    }

    if (event === 'invitee.created') {
      // Stop sequence and mark as booked
      if (lead.sequence_status === 'active') {
        const cooldownUntil = new Date();
        cooldownUntil.setDate(cooldownUntil.getDate() + 90);

        await sql`
          UPDATE leads SET
            sequence_status = 'booked',
            exited_at = NOW(),
            cooldown_until = ${cooldownUntil.toISOString()}
          WHERE id = ${lead.id}
        `;

        // Insert email event
        await sql`
          INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
          VALUES (${lead.id}, ${lead.sequence_type}, ${lead.sequence_step}, 'booked')
        `;

        // Update HubSpot if hubspot_id exists
        if (lead.hubspot_id) {
          try {
            await updateContact(lead.hubspot_id, {
              sequence_status: 'booked',
            });
          } catch (e) {
            console.error('HubSpot update error (calendly booking):', e);
          }
        }

        return NextResponse.json({ ok: true, action: 'sequence_stopped' });
      }

      // Lead exists but sequence not active – still log the booking
      await sql`
        INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
        VALUES (${lead.id}, ${lead.sequence_type}, ${lead.sequence_step}, 'booked')
      `;

      return NextResponse.json({ ok: true, action: 'booking_logged' });
    }

    if (event === 'invitee.canceled') {
      // Log cancellation but do NOT restart sequence
      await sql`
        INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
        VALUES (${lead.id}, ${lead.sequence_type}, ${lead.sequence_step}, 'booking_canceled')
      `;

      return NextResponse.json({ ok: true, action: 'cancellation_logged' });
    }

    return NextResponse.json({ ok: true, action: 'unhandled_event' });
  } catch (error) {
    console.error('Calendly webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
