import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * HubSpot Webhook — Contact Created
 *
 * HubSpot sends webhook events when contacts are created.
 * We import the contact into our DB and start the appropriate sequence.
 *
 * Setup in HubSpot:
 * Settings → Integrations → Webhooks → Create subscription
 * Object: Contact, Event: creation
 * URL: https://praxisnova-sales-control.vercel.app/api/webhooks/hubspot
 *
 * HubSpot sends an array of events:
 * [{ "objectId": 123, "propertyName": "...", "propertyValue": "...", "subscriptionType": "contact.creation", ... }]
 */

export async function POST(request: NextRequest) {
  let events;
  try {
    events = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // HubSpot sends an array of event objects
  if (!Array.isArray(events)) {
    events = [events];
  }

  const results = [];

  for (const event of events) {
    const hubspotId = String(event.objectId);
    const subscriptionType = event.subscriptionType || '';

    // Only process contact creation events
    if (!subscriptionType.includes('contact.creation') && !subscriptionType.includes('contact.propertyChange')) {
      results.push({ hubspotId, skipped: true, reason: 'not_creation_event' });
      continue;
    }

    try {
      // Check if contact already exists in our DB
      const existing = await sql`SELECT id FROM leads WHERE hubspot_id = ${hubspotId}`;
      if (existing.length > 0) {
        results.push({ hubspotId, skipped: true, reason: 'already_exists' });
        continue;
      }

      // Fetch full contact details from HubSpot
      const token = process.env.HUBSPOT_ACCESS_TOKEN;
      if (!token) {
        results.push({ hubspotId, error: 'No HubSpot token configured' });
        continue;
      }

      const contactRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}?properties=email,firstname,lastname,company,jobtitle,icp_type,sequence_status,phone`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!contactRes.ok) {
        results.push({ hubspotId, error: `HubSpot API ${contactRes.status}` });
        continue;
      }

      const contact = await contactRes.json();
      const props = contact.properties || {};

      if (!props.email) {
        results.push({ hubspotId, skipped: true, reason: 'no_email' });
        continue;
      }

      // Check if email already exists in our DB
      const emailExists = await sql`SELECT id FROM leads WHERE email = ${props.email}`;
      if (emailExists.length > 0) {
        // Link hubspot_id to existing lead
        await sql`UPDATE leads SET hubspot_id = ${hubspotId} WHERE email = ${props.email} AND hubspot_id IS NULL`;
        results.push({ hubspotId, email: props.email, action: 'linked_existing' });
        continue;
      }

      // Determine sequence type from icp_type, job title, and company
      let sequenceType = 'allgemein'; // default
      const icpType = (props.icp_type || '').toLowerCase().trim();
      const titleAndCompany = ((props.jobtitle || '') + ' ' + (props.company || '')).toLowerCase();

      if (['immobilien', 'handwerk', 'bauunternehmen'].includes(icpType)) {
        sequenceType = icpType;
      } else if (titleAndCompany.includes('immobilien') || titleAndCompany.includes('makler') || titleAndCompany.includes('real estate')) {
        sequenceType = 'immobilien';
      } else if (titleAndCompany.includes('bauleiter') || titleAndCompany.includes('bau') || titleAndCompany.includes('construction') || titleAndCompany.includes('projektleiter')) {
        sequenceType = 'bauunternehmen';
      } else if (titleAndCompany.includes('handwerk') || titleAndCompany.includes('meister') || titleAndCompany.includes('elektro') || titleAndCompany.includes('sanitär')) {
        sequenceType = 'handwerk';
      }
      // else stays 'allgemein'

      // Insert new lead
      const inserted = await sql`
        INSERT INTO leads (
          email, first_name, last_name, company, title, industry,
          hubspot_id, source,
          sequence_status, sequence_type, sequence_step, enrolled_at
        ) VALUES (
          ${props.email},
          ${props.firstname || null},
          ${props.lastname || null},
          ${props.company || null},
          ${props.jobtitle || null},
          ${sequenceType},
          ${hubspotId},
          ${'apollo'},
          ${'active'},
          ${sequenceType},
          ${1},
          ${new Date().toISOString()}
        )
        RETURNING id
      `;

      results.push({
        hubspotId,
        email: props.email,
        leadId: inserted[0].id,
        action: `imported_and_started_${sequenceType}`,
        sequenceType,
      });
    } catch (error) {
      console.error('HubSpot webhook error for', hubspotId, error);
      results.push({ hubspotId, error: String(error) });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
