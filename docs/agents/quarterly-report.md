# Agent: quarterly-report

## Trigger
Cron-Schedule: TODO (Angie): Nicht in `vercel.json` gefunden. Route existiert unter `/api/cron/quarterly-report`, ist aber aktuell nicht automatisiert. Manueller Trigger noetig oder Eintrag in `vercel.json` ergaenzen (vermutlich gewuenscht am ersten Werktag jedes neuen Quartals).

## Purpose
Baut den Quartalsbericht fuer das zurueckliegende Quartal aus `weekly_reports` (3-Monats-Trend, KPI-Aggregation) und `email_events` (beste und schlechteste Sequenz-Schritte nach Antwortrate). Berechnet ROI (Meetings pro Email), gibt strategische Empfehlungen basierend auf Reply-Rate und Kanal-Verhaeltnis. Versand an Angie und Samantha.

## Inputs
- DB-Tabellen gelesen: `weekly_reports` (3 Monate des Vorquartals), `email_events` (step_number/sequence_type Aggregation)
- ENVs genutzt: `CRON_SECRET`
- External APIs: Brevo via `sendTransactionalEmail`

## Outputs
- DB-Tabellen geschrieben: keine
- Emails geschickt: ja, an `hertle.anjuli@praxisnovaai.com` und `meyer.samantha@praxisnovaai.com`, Sender `info@praxisnovaai.com` ("PraxisNova AI"), tag `quarterly-report`, `wrapAsInternal: true`
- Webhooks: nein

## Failure Modes
- Ohne Schedule in `vercel.json` kein automatisierter Versand.
- Beste/Schlechteste Schritte brauchen mindestens 5 Sends (`HAVING COUNT >= 5`), bei wenig Traffic bleibt die Tabelle leer.
- Email-Template enthaelt `&mdash;` und `&rarr;` im Footer/ROI-Section (HTML-Entities, optisch Em-Dash und Pfeil), bleibt bewusst drin.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
