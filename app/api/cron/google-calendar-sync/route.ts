/**
 * Google Calendar Sync Cron (Paket B Teil 2, 2026-04-12)
 *
 * Ziel: wenn ein Besucher der praxisnovaai.com via Google Appointment
 * Schedule (calendar.app.google/...) einen Termin bucht, soll der Lead
 * sofort im Sales-Tool auftauchen - ohne dass Angie manuell die Calendly-
 * Mail parsen und einen Lead anlegen muss. Google Calendar ersetzt damit
 * Calendly in der Sales-Tool-Integration.
 *
 * Schedule: alle 5 Minuten (sehr aggressiv, weil Buchungen oft sofort
 * verlangen dass Angie reagiert - 5 Minuten ist fuer Vercel Pro kein
 * Problem, der Cron ist sehr leichtgewichtig).
 *
 * Graceful fail: wenn GOOGLE_CALENDAR_REFRESH_TOKEN / GOOGLE_CALENDAR_ID
 * nicht gesetzt sind, liefert der Cron `status: not_configured` ohne
 * Crash. Das erlaubt sichere Deploy-Vorstufe bevor der OAuth-Bootstrap
 * durchgefuehrt wurde.
 *
 * Dedup: google_event_id ist Primary-Key pro Event. ON CONFLICT DO
 * UPDATE aktualisiert last_booking_at bei wiederholter Sichtung (z.B.
 * wenn der Gast das Meeting verschiebt oder bestaetigt), neue Events
 * legen einen neuen Lead an.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { writeStartLog, writeEndLog } from '@/lib/agent-runtime';
import {
  readCalendarCredentialsFromEnv,
  getCalendarAccessToken,
  listRecentEvents,
  findExternalAttendee,
  isOwnerCreated,
  type CalendarEvent,
} from '@/lib/google-calendar-client';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Wie weit zurueckblicken pro Cron-Lauf. 24h gibt genug Puffer falls
// ein Run uebersprungen wird.
const CALENDAR_LOOKBACK_MINUTES = 1440;

type LeadInsertResult = {
  leadId: number;
  isNew: boolean;
};

/**
 * Extrahiert Vor- und Nachname aus dem Google Calendar displayName Feld.
 * Google liefert oft nur ein einzelnes Feld "Max Mustermann" - wir
 * splitten am ersten Leerzeichen.
 */
function parseName(displayName: string | undefined): { firstName: string | null; lastName: string | null } {
  if (!displayName) return { firstName: null, lastName: null };
  const trimmed = displayName.trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Legt einen neuen Lead an oder verknuepft ein bestehender Lead mit der
 * google_event_id. Der google_event_id Unique-Index verhindert doppelte
 * Lead-Anlage bei wiederholter Event-Verarbeitung.
 */
async function upsertLeadForBooking(
  event: CalendarEvent,
  attendeeEmail: string,
  attendeeName: string | undefined,
  bookingTime: string | null,
): Promise<LeadInsertResult> {
  // 1. Pruefen ob es bereits einen Lead mit dieser google_event_id gibt
  const byEventId = await sql`
    SELECT id FROM leads WHERE google_event_id = ${event.id} LIMIT 1
  `;
  if (byEventId.length > 0) {
    // Bereits verarbeitet - aktualisiere nur last_booking_at
    await sql`
      UPDATE leads SET last_booking_at = ${bookingTime}, updated_at = NOW()
      WHERE id = ${byEventId[0].id}
    `;
    return { leadId: byEventId[0].id as number, isNew: false };
  }

  // 2. Pruefen ob es bereits einen Lead mit dieser Email gibt (der
  // Besucher hatte frueher schon Kontakt aber ohne Calendar-Booking)
  const byEmail = await sql`
    SELECT id FROM leads WHERE LOWER(email) = LOWER(${attendeeEmail}) LIMIT 1
  `;
  if (byEmail.length > 0) {
    // Lead existiert bereits - verknuepfe ihn mit diesem Event
    await sql`
      UPDATE leads SET
        google_event_id = ${event.id},
        last_booking_at = ${bookingTime},
        pipeline_stage = 'Booked',
        pipeline_stage_updated_at = NOW(),
        pipeline_notes = CONCAT(
          COALESCE(pipeline_notes, ''),
          ' | Google Calendar Buchung am ', NOW()::text,
          ${event.summary ? `, Titel: ${event.summary}` : ''}
        )
      WHERE id = ${byEmail[0].id}
    `;
    return { leadId: byEmail[0].id as number, isNew: false };
  }

  // 3. Neuen Lead anlegen
  const { firstName, lastName } = parseName(attendeeName);
  const inserted = await sql`
    INSERT INTO leads (
      email, first_name, last_name, company, industry,
      pipeline_stage, source, google_event_id, last_booking_at, created_at
    ) VALUES (
      ${attendeeEmail}, ${firstName}, ${lastName}, NULL, NULL,
      'Booked', 'website_calendar_booking', ${event.id}, ${bookingTime}, NOW()
    )
    RETURNING id
  `;
  return { leadId: inserted[0].id as number, isNew: true };
}

/**
 * Haupt-Handler. Wird sowohl vom Vercel-Cron als auch vom manuellen
 * Trigger (/api/trigger/google-calendar-sync) aufgerufen.
 */
export async function runGoogleCalendarSync(): Promise<{
  status: string;
  summary: string;
  events_checked: number;
  new_leads: number;
  existing_leads: number;
  skipped_owner_created: number;
  skipped_no_attendee: number;
  errors: number;
}> {
  const runId = crypto.randomUUID();
  await writeStartLog(runId, 'google_calendar_sync');

  // 1) Credentials lesen
  const creds = readCalendarCredentialsFromEnv();
  if (!creds) {
    console.warn('[google-calendar-sync] ENV vars not configured - skipping');
    await writeEndLog(runId, 'google_calendar_sync', 'partial', {
      status: 'not_configured',
      summary: 'Google Calendar OAuth nicht eingerichtet - siehe Agent build/GOOGLE-CALENDAR-ENV-WERTE.md',
    });
    return {
      status: 'not_configured',
      summary: 'Google Calendar OAuth nicht eingerichtet',
      events_checked: 0,
      new_leads: 0,
      existing_leads: 0,
      skipped_owner_created: 0,
      skipped_no_attendee: 0,
      errors: 0,
    };
  }

  try {
    // 2) Access Token
    const accessToken = await getCalendarAccessToken(creds);

    // 3) Events listen
    const events = await listRecentEvents(accessToken, creds.calendarId, CALENDAR_LOOKBACK_MINUTES);

    let newLeads = 0;
    let existingLeads = 0;
    let skippedOwnerCreated = 0;
    let skippedNoAttendee = 0;
    const errorList: string[] = [];

    // 4) Pro Event entscheiden was zu tun ist
    for (const event of events) {
      try {
        // Skip cancelled events
        if (event.status === 'cancelled') continue;

        // Skip Events die Angie selbst angelegt hat
        if (isOwnerCreated(event, creds.calendarId)) {
          skippedOwnerCreated++;
          continue;
        }

        // Externen Attendee finden (der Gast, nicht Angie)
        const externalAttendee = findExternalAttendee(event, creds.calendarId);
        if (!externalAttendee || !externalAttendee.email) {
          skippedNoAttendee++;
          continue;
        }

        // Booking-Zeit aus event.start lesen (kann dateTime oder date sein)
        const bookingTime = event.start?.dateTime || (event.start?.date ? `${event.start.date}T00:00:00Z` : null);

        const result = await upsertLeadForBooking(
          event,
          externalAttendee.email,
          externalAttendee.displayName,
          bookingTime,
        );

        if (result.isNew) {
          newLeads++;
          console.log(
            `[google-calendar-sync] New lead from Calendar booking: ` +
            `leadId=${result.leadId}, email=${externalAttendee.email}, eventId=${event.id}`,
          );
        } else {
          existingLeads++;
        }

        // Stop active sequences for this lead (a booked lead should
        // not receive further outreach emails)
        await sql`
          UPDATE leads SET
            sequence_status = 'completed',
            cooldown_until = NOW() + INTERVAL '90 days'
          WHERE id = ${result.leadId}
            AND sequence_status IN ('active', 'paused')
        `.catch(() => {});
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errorList.push(`event ${event.id}: ${errMsg.substring(0, 150)}`);
        console.error(`[google-calendar-sync] Error processing event ${event.id}:`, err);
      }
    }

    const summary =
      `${events.length} Events geprueft, ${newLeads} neue Leads, ` +
      `${existingLeads} bestehende Leads aktualisiert, ` +
      `${skippedOwnerCreated} von Angie selbst angelegt, ` +
      `${skippedNoAttendee} ohne externen Attendee` +
      (errorList.length > 0 ? `, ${errorList.length} Fehler` : '');

    await writeEndLog(
      runId,
      'google_calendar_sync',
      errorList.length > 0 ? 'partial' : 'completed',
      {
        events_checked: events.length,
        new_leads: newLeads,
        existing_leads: existingLeads,
        skipped_owner_created: skippedOwnerCreated,
        skipped_no_attendee: skippedNoAttendee,
        errors: errorList.length,
        summary,
      },
    );

    return {
      status: errorList.length > 0 ? 'partial' : 'completed',
      summary,
      events_checked: events.length,
      new_leads: newLeads,
      existing_leads: existingLeads,
      skipped_owner_created: skippedOwnerCreated,
      skipped_no_attendee: skippedNoAttendee,
      errors: errorList.length,
    };
  } catch (err) {
    console.error('[google-calendar-sync] Fatal error:', err);
    await writeEndLog(runId, 'google_calendar_sync', 'error', {
      error: String(err),
      summary: `Fataler Fehler: ${String(err).substring(0, 200)}`,
    });
    return {
      status: 'error',
      summary: `Fataler Fehler: ${String(err).substring(0, 200)}`,
      events_checked: 0,
      new_leads: 0,
      existing_leads: 0,
      skipped_owner_created: 0,
      skipped_no_attendee: 0,
      errors: 1,
    };
  }
}

// ─── Cron-Entry-Point ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth via CRON_SECRET, analog zu allen anderen Cron-Routen
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runGoogleCalendarSync();
  return NextResponse.json({ ok: true, ...result });
}
