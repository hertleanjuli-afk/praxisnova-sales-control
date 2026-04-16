# Agent: linkedin-post-generator

## Trigger
Cron-Schedule: `30 6 * * 1-5` (06:30 UTC, Mo-Fr). Sonntag und Samstag skipped der Handler selbst.

## Purpose
Erstellt taeglich zwei LinkedIn-Post-Entwuerfe mit Gemini basierend auf aktuellen Industry-News, Customer-Insights und Market-Intelligence. Rotiert das Post-Format nach Wochentag (Aus der Praxis, Vorher/Nachher, Unbequeme Frage, Statistik, Wochenrueckblick) und den Sektor (bau, handwerk, immobilien, ki_automatisierung). Sendet Benachrichtigungsmail an Angie und Samantha mit Link zur Posting-Seite.

## Inputs
- DB-Tabellen gelesen: `industry_news` (heute, used_for_linkedin=true, top 5 nach relevance_score), `customer_insights` (3 zufaellige), `agent_updates` (market-intelligence, letzte 7 Tage, top 2), `linkedin_post_drafts` (COUNT fuer heute)
- ENVs genutzt: `CRON_SECRET`, `Gemini_API_Key_Sales_Agent` oder `GEMINI_API_KEY`, `USER_1_EMAIL`, `USER_2_EMAIL` (optional)
- External APIs: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`, Brevo via `sendTransactionalEmail`

## Outputs
- DB-Tabellen geschrieben: `linkedin_post_drafts` (CREATE TABLE IF NOT EXISTS, INSERT ON CONFLICT DO UPDATE per draft_date+post_number)
- Emails geschickt: ja, an `USER_1_EMAIL` (Angie) und optional `USER_2_EMAIL` (Samantha), via Brevo `wrapAsInternal`
- Webhooks: nein

## Failure Modes
- Gemini liefert kein valides JSON: der jeweilige Post wird uebersprungen, kein Retry, das Tages-Soll kann auf 1 statt 2 sinken.
- Wenn Entwuerfe fuer heute schon existieren (>=2 Zeilen in `linkedin_post_drafts`), skipt der Cron komplett. Manueller Re-Run am selben Tag wird nicht neu generieren.
- Em-/En-Dashes sind im Prompt ausgeschlossen und werden via `clean()` nochmal entfernt.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
