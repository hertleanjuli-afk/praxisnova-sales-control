# Agent: health-monitor

## Trigger
Cron-Schedule: `5 7 * * 1-5`, `50 11 * * 1-5`, `20 15 * * 1-5` (Mo-Fr, 3 Slots pro Tag)

## Purpose
Agent-Scheduling-Watchdog und externe API-Reachability-Check. Prueft `agent_logs` auf Errors der letzten 2h, haengende Runs ohne Completion nach 10 Minuten, fehlende Starts gegenueber `AGENT_SCHEDULES` sowie Erreichbarkeit von Neon, Gemini, Brevo, Gmail und HubSpot. Bei 2 aufeinanderfolgenden Fehlschlaegen einer externen API oder Agent-Problemen wird eine Alert-Email gesendet.

## Inputs
- DB-Tabellen gelesen: `agent_logs` (errors, started/completed), `agent_decisions` (vorheriger API-Status fuer 2-Consecutive-Fails-Regel)
- ENVs genutzt: `CRON_SECRET`, `BREVO_API_KEY`, `ALERT_EMAIL` (Default `hertle.anjuli@praxisnovaai.com`), `SENDER_EMAIL`, `GEMINI_API_KEY`, `GMAIL_ACCESS_TOKEN`, `HUBSPOT_TOKEN`
- External APIs: Neon (`SELECT 1`), `https://generativelanguage.googleapis.com/v1beta/models`, `https://api.brevo.com/v3/account`, `https://gmail.googleapis.com/gmail/v1/users/me/profile`, `https://api.hubapi.com/integrations/v1/me`

## Outputs
- DB-Tabellen geschrieben: `agent_decisions` (INSERT api_check-Log pro Run und API)
- Emails geschickt: ja, an `ALERT_EMAIL` via Brevo wenn Issues gefunden. Kein `wrapAsInternal`.
- Webhooks: nein

## Failure Modes
- Hardcoded `AGENT_SCHEDULES` Map stimmt nicht 1:1 mit `vercel.json` ueberein (z.B. apollo_sync steht hier 05:00/12:00, vercel.json hat zusaetzlich 23:00). Dadurch entstehen False-Negatives oder fehlende Checks.
- Fehlender `BREVO_API_KEY` verhindert den Alert-Versand, Issues werden nur geloggt.
- `result.rows` wird in `checkRecentErrors` und `checkIncompleteRuns` genutzt, obwohl Neons `sql``` direkt ein Array liefert. TODO (Angie): pruefen ob dieser Code noch laeuft oder ein Bugfix haengt.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
