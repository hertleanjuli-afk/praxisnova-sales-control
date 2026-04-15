# Agent: Newsletter (A8)

## Purpose
Monatlicher Newsletter-Draft basierend auf top-News und approved Content. Niemals Auto-Send.

## Route
`GET /api/cron/newsletter`

## Cron
`0 11 * * 3` (Mittwoch 11:00 UTC, monatlich ueber content-Selektion begrenzt)

## Input
- Top 5 `news_items` der letzten 31 Tage mit score >=70
- Bis zu 3 approved `content_drafts` aus dem letzten Monat (newsletter/linkedin)

## Output
- Row in `newsletters` mit status='draft' und included_news_ids/content_ids
- Email an `NEWSLETTER_REVIEWER` zur Freigabe

## Review-Flow
Dashboard `/newsletter` -> Approve/Reject -> "Als gesendet markieren" aendert status ohne Auto-Send.
Versand erfolgt durch Angie manuell (Brevo Campaign oder transactional).

## Env
CRON_SECRET, GEMINI_API_KEY, BREVO_API_KEY, NEWSLETTER_REVIEWER (optional).

## Known Limitations
- Kein echter Campaign-Send. `brevo_campaign_id` bleibt null bis manuell gesetzt.
- HTML-Body ist statisch beim Insert. Bearbeitung nur durch Re-Run.
