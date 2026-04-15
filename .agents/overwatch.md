# Agent: Overwatch (A10)

## Purpose
Infrastruktur-Health-Check aller 4h. Prueft APIs (Gemini, Brevo, DB) und Agent-Aktivitaet. Mailt nur bei P0/P1.

## Route
`GET /api/cron/overwatch`

## Cron
`0 */4 * * *` (alle 4 Stunden)

## Checks
- Gemini API reachable (liefert models)
- Brevo API /v3/account 200
- DB `SELECT 1`
- Agent-Aktivitaet via table-count window:
  - daily_plans 30h
  - news_items 30h
  - content_drafts 30h
  - email_inbox processed 16h
- DB-Stats: leads count, unresolved blocked_tasks

## Output
- Row in `health_reports`
- Email NUR bei overall=critical oder overall=warning mit >=2 Alerts

## Alert-Schwellen
- API down -> critical
- API degraded -> warning
- Agent-Table-Check DB-Error -> warning
- >10 unresolved blocked_tasks -> warning

## Env
CRON_SECRET, GEMINI_API_KEY, BREVO_API_KEY, OVERWATCH_RECIPIENT (optional).

## Known Limitations
- Kein echtes Uptime-Tracking fuer jeden Cron (wuerde Cron-Log-Tabelle brauchen). Aktuelles Proxy: table-count.
- Notification-Spam bei anhaltenden Problemen. Kein Alert-Cooldown in v1.
