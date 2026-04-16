# Agent: monthly-report

## Trigger
Cron-Schedule: TODO (Angie): Nicht in `vercel.json` gefunden. Route existiert unter `/api/cron/monthly-report`, ist aber aktuell nicht automatisiert. Manueller Trigger noetig oder Eintrag in `vercel.json` ergaenzen (vermutlich gewuenscht `0 7 1 * *` fuer 07:00 UTC am 1. des Monats).

## Purpose
Aggregiert alle `weekly_reports` des Vormonats sowie `email_events`, `change_log` und `weekly_feedback` zu einem HTML-Monatsbericht mit Monats-KPIs, Top-3 Email-Schritten nach Open-Rate, Sektor-Vergleich, Empfehlungen, Change-Log und Wochen-Feedback. Versand an Angie und Samantha.

## Inputs
- DB-Tabellen gelesen: `weekly_reports` (Aggregation Vormonat), `email_events` (step-Statistik, sector-Statistik), `change_log`, `weekly_feedback`
- ENVs genutzt: `CRON_SECRET`
- External APIs: Brevo via `sendTransactionalEmail`

## Outputs
- DB-Tabellen geschrieben: keine
- Emails geschickt: ja, an `hertle.anjuli@praxisnovaai.com` und `meyer.samantha@praxisnovaai.com`, Sender `info@praxisnovaai.com` ("PraxisNova AI"), tag `monthly-report`, `wrapAsInternal: true`
- Webhooks: nein

## Failure Modes
- Ohne Schedule in `vercel.json` laeuft der Report aktuell nur bei manuellem Trigger.
- Leere `weekly_reports`-Aggregation liefert einen Bericht mit lauter Nullen, ohne Early-Exit.
- Email-Template enthaelt `&mdash;` im Footer (alter HTML-Entity-Em-Dash), bleibt fuer Darstellung bewusst drin.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
