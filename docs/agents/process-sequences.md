# Agent: process-sequences

## Trigger
Cron-Schedule: `30 7,10,13,16 * * 1-5` (07:30, 10:30, 13:30, 16:30 UTC, Mo-Fr)

## Purpose
Zentrale Sequenz-Execution-Engine. Nimmt OOO-pausierte Leads nach Ablauf von `resume_at` wieder auf, laeuft durch alle aktiven Leads und sendet den faelligen Schritt der passenden Sequenz (immobilien, handwerk, bauunternehmen, inbound, allgemein) via Brevo mit sender-spezifischer Calendly-URL. Schickt Double-Opt-In-Reminder an 24h-pending-Leads und expired Pending-Leads nach 7 Tagen.

## Inputs
- DB-Tabellen gelesen: `leads` (active, resume-ready, pending_optin), `email_events` (alreadySent-Check), `agent_decisions` (inbound_response_agent Deduplizierung letzte 24h)
- ENVs genutzt: `CRON_SECRET`, `BREVO_SENDER_IMMOBILIEN_EMAIL/NAME`, `BREVO_SENDER_HANDWERK_EMAIL/NAME`, `BREVO_SENDER_BAU_EMAIL/NAME`, `BREVO_SENDER_INBOUND_EMAIL/NAME`, `BREVO_SENDER_EMAIL_PRIMARY`, `BREVO_SENDER_NAME`
- External APIs: Brevo via `sendTransactionalEmail`, HubSpot via `updateContact`

## Outputs
- DB-Tabellen geschrieben: `leads` (UPDATE sequence_status, sequence_step, paused/resume-Felder, exited_at, cooldown_until, optin_reminded), `email_events` (INSERT sent/failed pro Step), `agent_logs` (via `writeStartLog` / `writeEndLog`)
- Emails geschickt: ja, Empfaenger sind die Leads selbst. Sender rotiert nach `sequence_type` (info@praxisnovaai.com fuer immobilien/inbound, meyer.samantha@praxisnovaai.com fuer handwerk/bau, alternierend fuer allgemein). Ausserdem Opt-In-Reminder mit Sender `info@praxisnovaai.com`.
- Webhooks: nein

## Failure Modes
- `sendTransactionalEmail` wirft: Fehler wird in `email_events` als `failed` geloggt, `logAndNotifyError` sendet Benachrichtigung, Schritt wird NICHT automatisch retryed. Der Lead bleibt im gleichen `sequence_step` und der naechste Cron-Run versucht es erneut.
- HubSpot-Update-Fehler werden nur in `console.error` geloggt, Sequenz laeuft weiter.
- Spintax-Platzhalter werden durch `sanitizeEmail`/`sanitizeSubject` auf den ersten Wert reduziert, A/B-Logik liegt damit in den Template-Quellen.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
