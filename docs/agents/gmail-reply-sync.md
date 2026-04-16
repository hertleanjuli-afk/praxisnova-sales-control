# Agent: gmail-reply-sync

## Trigger
Cron-Schedule: `0,10,20,30,40,50 6-22 * * *` (alle 10 Minuten zwischen 06:00 und 22:00 UTC, taeglich inkl. Wochenende)

## Purpose
Pollt Angies Gmail-Inbox per OAuth2, matcht eingehende Mails gegen `leads.email` (plus Domain-Fallback fuer Kollegen), unterscheidet Out-of-Office von echten Antworten. Echte Replies setzen Lead auf `Antwort erhalten`, loesen 9-Monats-Firmen-Block aus, stoppen aktive Sequenzen, loggen in HubSpot und benachrichtigen Angie. OOO pausiert die Sequenz bis zum erkannten Rueckkehrdatum.

## Inputs
- DB-Tabellen gelesen: `leads` (Lookup per Email und per Domain), `processed_gmail_messages` (Dedupe-Check)
- ENVs genutzt: `CRON_SECRET`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `USER_1_EMAIL` (optional, Default `hertle.anjuli@praxisnovaai.com`)
- External APIs: Gmail API (`users.messages.list`, `users.messages.get`, `users.messages.modify`, `users.labels`), Google OAuth Token Endpoint, HubSpot (via `logActivityToHubSpot`), Brevo (via `sendTransactionalEmail`)

## Outputs
- DB-Tabellen geschrieben: `email_events` (INSERT replied/ooo), `leads` (UPDATE pipeline_stage, signal_email_reply, last_reply_at, oof_until, sequence_status, Firmen-Block), `leads` (INSERT bei Domain-Match mit source `email_reply_domain_match`), `sequence_entries` (UPDATE status='replied'), `processed_gmail_messages` (INSERT, inkl. CREATE TABLE IF NOT EXISTS), `agent_logs`
- Emails geschickt: ja, Benachrichtigung an `USER_1_EMAIL` (Angie) bei jedem ersten Real-Reply, via Brevo `wrapAsInternal`
- Webhooks: nein

## Failure Modes
- Fehlende Gmail-ENVs liefern `status: not_configured` und abbrechen ohne Crash, gewollter Graceful-Fail vor OAuth-Bootstrap.
- OOO-Detection mit unbekanntem Rueckkehrdatum pausiert Lead fuer Fallback-7-Tage, kann bei schwer parsbaren Texten zu vorzeitiger Wiederaufnahme fuehren.
- Domain-Match legt automatisch neue Leads an und loest 9-Monats-Block auf der gesamten Firma aus: Risiko bei Shared-Inbox-Adressen oder wenn ein interner Kollege einfach weiterleitet. Free-Mail-Domains sind ausgeschlossen.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
