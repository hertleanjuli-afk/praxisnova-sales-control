# Agent: Daily Planner Evening (A2)

## Purpose
Abend-Review (18:00 UTC). Matcht geplante Bloecke gegen tatsaechliche Email-Aktivitaet und Lead-Stats, generiert Review + Morgen-Draft, schickt Email an Angie.

## Route
`GET /api/cron/daily-planner-evening`
Auth: `Authorization: Bearer ${CRON_SECRET}`

## Cron
`0 18 * * *`

## Input
- `daily_plans` fuer heute (blocks_json)
- email_events heute (sent/replied)
- leads heute (created_at)
- Gemini-Call fuer Review-Analyse

## Output
- Update `daily_plans` (review_json, status='completed', reviewed_at)
- Email mit Done/Open/Questions/TomorrowNotes

## Error-Handling
- Kein Plan in daily_plans heute: `recordBlockedTask('no-morning-plan')`, weiter mit leerem Plan
- Gemini parse fail: HTTP 500

## Env-Vars
Siehe daily-planner-morning.md (dieselben).

## Known Limitations
- "Wahrscheinlich erledigt" ist LLM-Heuristik ohne echtes Activity-Matching (z.B. GitHub-Commits fehlen in v1). Angie-Review-Questions fuellen die Luecke.
