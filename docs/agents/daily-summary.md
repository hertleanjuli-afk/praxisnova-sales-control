# Agent: daily-summary

## Trigger
Cron-Schedule: `45 11,17 * * 1-5` (11:45 und 17:45 UTC, Mo-Fr)

## Purpose
Stoesst den Versand der taeglichen Zusammenfassungs-Email an das Sales-Team an. Die Logik liegt in `lib/error-notify.ts#sendDailySummary`, dieser Route-Handler ist ein duenner Trigger-Wrapper mit Auth-Check.

## Inputs
- DB-Tabellen gelesen: TODO (Angie): `sendDailySummary` in `lib/error-notify.ts` pruefen, welche Tabellen (vermutlich `agent_logs`, `error_logs`, `email_events`) tatsaechlich ausgewertet werden.
- ENVs genutzt: `CRON_SECRET`
- External APIs: indirekt Brevo via `sendDailySummary`

## Outputs
- DB-Tabellen geschrieben: TODO (Angie): pruefen ob `sendDailySummary` in DB schreibt.
- Emails geschickt: ja, Recipients und genauer Inhalt kommen aus `sendDailySummary`. TODO (Angie): Empfaengerliste aus `lib/error-notify.ts` dokumentieren.
- Webhooks: nein

## Failure Modes
- Jede Exception aus `sendDailySummary` wird als 500 gespiegelt und in `console.error` geloggt, ohne weiteren Retry oder Notification.
- Keine eigene Idempotenz: zwei Laeufe pro Tag (11:45 und 17:45) senden zwei Summary-Emails.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
