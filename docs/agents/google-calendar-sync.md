# Agent: google-calendar-sync

## Trigger
Cron-Schedule: `0,5,10,15,20,25,30,35,40,45,50,55 6-22 * * *` (alle 5 Minuten zwischen 06:00 und 22:00 UTC, taeglich)

## Purpose
Pollt Google Calendar per OAuth2 nach neuen Buchungen (Google Appointment Schedule ersetzt Calendly). Jede Buchung eines externen Attendees legt entweder einen neuen Lead mit `pipeline_stage = 'Booked'` an oder verknuepft das Event mit einem bestehenden Lead. Aktive Sequenzen werden fuer gebuchte Leads automatisch beendet, 90-Tage-Cooldown wird gesetzt.

## Inputs
- DB-Tabellen gelesen: `leads` (SELECT per `google_event_id`, SELECT per `email` LOWER)
- ENVs genutzt: `CRON_SECRET`, `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID` (Details in `lib/google-calendar-client.ts`)
- External APIs: Google Calendar Events API (`events.list`), Google OAuth Token Endpoint

## Outputs
- DB-Tabellen geschrieben: `leads` (INSERT neuer Lead mit source `website_calendar_booking`, UPDATE `google_event_id`, `last_booking_at`, `pipeline_stage`, `sequence_status='completed'`, `cooldown_until`), `agent_logs` (via `writeStartLog` / `writeEndLog`)
- Emails geschickt: nein
- Webhooks: nein

## Failure Modes
- Fehlende OAuth-ENVs liefern `status: not_configured` und beenden ohne Crash.
- Von Angie selbst angelegte Events werden via `isOwnerCreated` aus der Verarbeitung gefiltert, ein falsch konfigurierter `calendarId` koennte diese Filterung umgehen und zu Ghost-Leads fuehren.
- Dedup basiert auf `google_event_id`. Wenn Google die Event-ID bei einer Verschiebung tauscht, entsteht ein doppelter Lead (bisher nicht beobachtet, aber nicht verifiziert).

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
