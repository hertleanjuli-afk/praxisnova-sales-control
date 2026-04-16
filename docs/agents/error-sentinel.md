# Agent: error-sentinel

## Trigger
Cron-Schedule: `15 6 * * 1-5`, `30 9 * * 1-5`, `0 12 * * 1-5`, `15 15 * * 1-5`, `0 18 * * 1-5` (Mo-Fr, 5 Slots ueber den Tag verteilt)

## Purpose
Runtime-Health-Checker fuer UI und API des Sales-Control-Dashboards. Pingt kritische Routes, prueft DB-Sanity (leads vorhanden, email_events und agent_logs Aktivitaet im Zeitfenster), sammelt Agent-Fehler der letzten Stunde aus `agent_logs` und schickt eine Warn-Email wenn Probleme gefunden werden. Repariert nichts automatisch.

## Inputs
- DB-Tabellen gelesen: `leads` (COUNT), `email_events` (COUNT letzte 24h), `agent_logs` (COUNT letzte 2h; SELECT status='error' letzte 1h)
- ENVs genutzt: `CRON_SECRET`, `SENTINEL_BASE_URL` (Default `https://praxisnova-sales-control.vercel.app`)
- External APIs: HTTP GET auf `/api/anrufliste`, `/api/health` der Public-Domain

## Outputs
- DB-Tabellen geschrieben: `agent_logs` (via `writeStartLog` / `writeEndLog`)
- Emails geschickt: ja, an `hertle.anjuli@praxisnovaai.com` via Brevo wenn `errorCount > 0` oder `warnCount > 2`, Sender `info@praxisnovaai.com`
- Webhooks: nein

## Failure Modes
- False Positives bei Deployment-Protection: frueher wurden Preview-URLs angepingt, die 401 liefern. BASE_URL ist daher hardcoded auf die Public-Domain.
- Route-Checks fangen nur Endpoints ohne Auth ab. Sessions-geschuetzte Routes wuerden dauerhaft 401 liefern (False Positive) und sind explizit ausgeklammert.
- Wenn die Alert-Email via Brevo fehlschlaegt, wird das nur geloggt, nicht eskaliert.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
