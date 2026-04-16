# Agent: weekly-report

## Trigger
Cron-Schedule: `45 6 * * 1` (06:45 UTC, jeden Montag)

## Purpose
Baut den Wochenbericht fuer die vergangene 7-Tage-Periode. Sammelt KPIs (Leads kontaktiert, Emails gesendet/geoeffnet/beantwortet, Meetings gebucht, LinkedIn-Kette), Sektor-Breakdown, Best Performer, Vergleich zur Vorwoche, Warm-Up-Status, Top-10 Hot-Leads und offene Aufgaben. Schreibt einen Eintrag in `weekly_reports` und verschickt den HTML-Bericht an Angie und Samantha.

## Inputs
- DB-Tabellen gelesen: `email_events` (sent/opened/replied, step-/sector-Aggregation), `leads` (LinkedIn-Datumsfelder, sequence_type, hot leads mit agent_score>=9, no-LinkedIn, inbound pending), `call_logs` (result='appointment' fuer Meetings), `weekly_reports` (Vorwoche)
- ENVs genutzt: `CRON_SECRET`
- External APIs: Brevo via `sendTransactionalEmail`

## Outputs
- DB-Tabellen geschrieben: `weekly_reports` (INSERT pro Lauf)
- Emails geschickt: ja, an `hertle.anjuli@praxisnovaai.com` und `meyer.samantha@praxisnovaai.com`, Sender `info@praxisnovaai.com` ("PraxisNova AI"), tag `weekly-report`, `wrapAsInternal: true`
- Webhooks: nein

## Failure Modes
- Keine Idempotenz: ein zweiter Run am gleichen Tag legt einen weiteren Eintrag in `weekly_reports` an.
- Meetings-Zaehlung basiert ausschliesslich auf `call_logs.result = 'appointment'`. Direkte Calendar-Bookings ohne Call-Eintrag werden nicht gezaehlt.
- Bei fatalem Fehler wird via `logAndNotifyError` benachrichtigt, Bericht wird nicht gesendet.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
