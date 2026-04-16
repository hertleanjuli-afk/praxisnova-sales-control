# Agent: apollo-sync

## Trigger
Cron-Schedule: `0 5,12,23 * * *` (05:00, 12:00, 23:00 UTC taeglich)

## Purpose
Importiert frische Kontakte aus der Apollo People Search API in die `leads`-Tabelle mit `pipeline_stage = 'Neu'`, damit der Prospect Researcher jeden Morgen neuen Input hat. Rotiert taeglich zwischen 19 Such-Configs fuer Bau, Handwerk und Immobilien europaweit, Ziel sind 50 neue Leads pro Lauf (dedupliziert per Email und Name+Firma).

## Inputs
- DB-Tabellen gelesen: `leads` (SELECT email, LOWER(first_name || ' ' || last_name || '|' || COALESCE(company, '')))
- ENVs genutzt: `APOLLO_API_KEY`, `CRON_SECRET` (via `isAuthorized`)
- External APIs: `https://api.apollo.io/api/v1/mixed_people/api_search` (Apollo People Search, POST)

## Outputs
- DB-Tabellen geschrieben: `leads` (INSERT neue Kontakte), `agent_decisions` (INSERT Run-Log), `agent_logs` (via `writeStartLog` / `writeEndLog`)
- Emails geschickt: nein, aber `sendErrorNotification` bei Apollo-API-Fehler
- Webhooks: nein

## Failure Modes
- Apollo URL-Schema aendert sich (historisch ca. 1x pro Monat umbenannt), 422 oder 404 fuehren zu komplettem Run-Abbruch und Fehler-Email.
- Platzhalter-Emails wenn Apollo keine Email liefert: neue Kontakte werden mit `apollo-{id}@placeholder.praxisnovaai.com` eingetragen. Ohne spaetere Enrichment landen diese nie in einer Outreach-Sequenz.
- Unique-Constraint auf `leads.email` kann Inserts blockieren, wird pro Row gefangen und nur geloggt.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
