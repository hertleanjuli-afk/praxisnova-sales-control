# Agent: PR Outreach (A7)

## Purpose
Erzeugt personalisierte PR-Pitch-Drafts fuer aktive Pressekontakte. Niemals Auto-Send.

## Route
`GET /api/cron/pr-outreach`

## Cron
`0 9 * * 2,4` (Dienstag und Donnerstag 09:00 UTC)

## Input
- `press_contacts` mit status cold/warm und email vorhanden
- Cooldown 30 Tage (nicht haeufiger kontaktieren)
- Relevante News (score >=70, last 14 days) matched auf Kontakt-Branchen

## Output
- Drafts in `pr_campaigns` mit status='pending_review'
- Max 5 Drafts pro Run

## Error-Handling
- Gemini-Parse-Fail: blocked-task, skip contact
- Keine passenden Kontakte: HTTP 200 mit drafted=0
