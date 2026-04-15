# Agent: Marketing Supervisor (A9)

## Purpose
Wochen-Check der Marketing-Agents. Wirft Alerts bei Inaktivitaet oder Queue-Problemen.

## Route
`GET /api/cron/marketing-supervisor`

## Cron
`0 17 * * 0` (Sonntag 17:00 UTC)

## Input
- `news_items` count (24h)
- `content_drafts` pending_review count
- `email_inbox` count (24h)
- `pr_campaigns` pending_review (7d)
- `newsletters` draft (31d)

## Output
- Row in `supervisor_reports`
- Email NUR bei Alerts (nicht bei clean runs)

## Alert-Regeln
- News Scout 0 items 24h -> warn
- Content-Queue >20 pending -> warn
- Email-Inbox 0 items 24h -> warn (OAuth-Verdacht)

## Env
CRON_SECRET, BREVO_API_KEY (nur wenn Alerts), PLANNER_RECIPIENT.
