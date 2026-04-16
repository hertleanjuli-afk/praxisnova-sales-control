# Agent: linkedin-response-check

## Trigger
Cron-Schedule: `10 8 * * 1-5` (08:10 UTC, Mo-Fr)

## Purpose
Ueberwacht `linkedin_tracking` auf 3-Tage-Timeouts. Setzt betroffene Leads automatisch auf die Anrufliste wenn: LinkedIn-Anfrage seit >3 Tagen ohne Akzeptierung, LinkedIn-Nachricht seit >3 Tagen ohne Antwort, oder Lead hat kein LinkedIn-Profil bzw. Anfrage wurde abgelehnt. Lead muss eine Telefonnummer haben und darf nicht in `Blocked`/`Booked` sein.

## Inputs
- DB-Tabellen gelesen: `linkedin_tracking` JOIN `leads` (request_sent, connected+message_sent, no_linkedin/rejected), `call_queue` (Existenzcheck status='ready'), `leads.total_call_attempts`
- ENVs genutzt: `CRON_SECRET`
- External APIs: keine

## Outputs
- DB-Tabellen geschrieben: `call_queue` (INSERT ON CONFLICT DO NOTHING per lead_id+queue_date, source `linkedin_no_response`, linkedin_trigger=true), `linkedin_tracking` (UPDATE connection_status='ignored'), `leads` (UPDATE outreach_step='on_call_list'), `agent_logs` (via `writeStartLog` / `writeEndLog`)
- Emails geschickt: nein
- Webhooks: nein

## Failure Modes
- Leads mit `total_call_attempts >= 3` werden uebersprungen (Soft-Limit gegen endlose Anrufzyklen).
- ON CONFLICT DO NOTHING greift nur bei exakt gleichem `queue_date`, daher kann derselbe Lead an aufeinanderfolgenden Tagen neu gequeued werden.
- Lead ohne Telefonnummer bleibt dauerhaft auf LinkedIn-Timeout haengen, kein Fallback-Pfad dokumentiert.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
