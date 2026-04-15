# Agent: Daily Planner Morning (A1)

## Purpose
Erzeugt jeden Morgen (07:00 UTC) einen strukturierten Tagesplan fuer Angie. Schickt Plan als Email und speichert ihn in `daily_plans`.

## Route
`GET /api/cron/daily-planner-morning`
Auth: `Authorization: Bearer ${CRON_SECRET}`

## Cron
`0 7 * * *` (07:00 UTC, entspricht 08:00-09:00 Berlin je nach Sommerzeit)

## Input-Signale
- Offene Tasks aus `~/Desktop/PraxisNovaAI/Agent build/TASKS.md` (blockiert auf Vercel ohne gemounteten Pfad, siehe Blocked-Tasks BT-004)
- Aktive Leads (`leads.sequence_status = 'active'`)
- Email-Aktivitaet letzte 24h
- Gemini-Call fuer Plan-Generierung

## Output
- Row in `daily_plans` (plan_date, blocks_json, status='active')
- Email an `PLANNER_RECIPIENT` (Fallback `hertle.anjuli@praxisnovaai.com`)

## Pflicht-Regeln im Plan
- Mittagspause 12:30-13:30
- Spaziergang 16:00-16:30
- Max 3 Deep-Work-Bloecke je 90 Min mit 15 Min Pause

## Error-Handling
- Gemini-Parse-Fail oder leerer Plan: `recordBlockedTask` + HTTP 500
- TASKS.md fehlt: loggt + weiter mit leerer Task-Liste (degraded)
- DB-Fail beim Insert: throw, HTTP 500

## Env-Vars
- `CRON_SECRET` (Pflicht)
- `GEMINI_API_KEY`, `GEMINI_MODEL` (optional, default `gemini-3-flash-preview`)
- `BREVO_API_KEY` oder `MOCK_BREVO=true`
- `PLANNER_RECIPIENT` (optional)
- `TASKS_MD_PATH` (optional, nur relevant lokal)

## Known Limitations
- TASKS.md-Read nur lokal funktional. Auf Vercel braucht es DB-backed Task-Liste oder Repo-committed Datei. Siehe BT-004.
