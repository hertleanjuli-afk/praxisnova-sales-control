# Agent: Content Creator (A6)

## Purpose
Generiert 3 Content-Drafts pro Run (LinkedIn, Facebook, Newsletter-Snippet) basierend auf aktuellen News-Items mit hohem Relevance-Score. Brand-Voice konform.

## Route
`GET /api/cron/content-creator`

## Cron
`0 10 * * *`

## Input
- Top 3 `news_items` der letzten 48h mit `relevance_score >= 70` und `used_in_content=FALSE`.
- Branche rotiert per Tag (Tag % 3: immobilien, handwerk, bau).
- Brand-Voice aus `~/Desktop/PraxisNovaAI/Agent build/docs/brand-voice.md` (nicht im Repo, nur als Referenz - Prompt enthaelt die Regeln inline).

## Output
- 3 `content_drafts` mit `status='pending_review'`.
- Markiert verwendete news_items als `used_in_content=TRUE`.

## Approval-Flow
Drafts erscheinen im Dashboard unter `/content`. Angie approved oder rejected via PATCH.

## Error-Handling
- Keine News verfuegbar: `recordBlockedTask('no-news-input')`, HTTP 200 mit `drafted=0`.
- Gemini leere Drafts: `recordBlockedTask('gemini-empty-drafts')`, HTTP 500.

## Env-Vars
CRON_SECRET, GEMINI_API_KEY.

## Known Limitations
- Kein Image-Generation integriert.
- Brand-Voice-Regeln inline im Prompt dupliziert. Bei Voice-Updates: Prompt anpassen.
