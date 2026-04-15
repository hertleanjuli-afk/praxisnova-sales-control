# Agent: News Scout (A4)

## Purpose
RSS-Crawler mit Gemini-Relevance-Scoring. Fuettert News-Feed fuer Content Creator und Newsletter.

## Route
`GET /api/cron/news-scout`, Auth via Bearer CRON_SECRET.

## Cron
`0 6 * * *`

## Input
- `industry_feeds` (aktive Feeds), Fallback auf t3n.de und heise.de wenn leer.
- RSS via fetch + regex-parser (kein rss-parser-Dependency).

## Output
- Items in `news_items` mit `relevance_score >= 60`.
- `used_in_content=FALSE`, `shared_with_sales=FALSE` beim Insert.
- Dedup via URL-Unique-Constraint.

## Scoring
Gemini-Prompt fragt nach `{score 0-100, industries[], summary}`. Zielgruppe: Entscheider Immobilien/Handwerk/Bau in Europa.

## Error-Handling
- Feed-Fetch-Fail: Skip, log warn.
- Gemini-Parse-Fail: Skip Item.
- Kein Score >= 60 in ganzer Session: `recordBlockedTask('no-relevant-news')`.

## Env-Vars
CRON_SECRET, GEMINI_API_KEY, GEMINI_MODEL (optional).

## Known Limitations
- Regex-RSS-Parser ist fragil. Wenn Feed-Format exotisch wird: rss-parser-Dep einbauen.
- Web-Search-Extension (Gemini "news today") noch nicht implementiert. Tier 2.
