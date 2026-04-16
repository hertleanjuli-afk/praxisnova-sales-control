# Agent: news-agent

## Trigger
Cron-Schedule: `30 5 * * 1-5` (05:30 UTC, Mo-Fr). Sonntag und Samstag skipped der Handler selbst.

## Purpose
Generiert mit Gemini taeglich 2-3 Industry-News-Eintraege pro Sektor (Bau, Handwerk, Immobilien, KI-Automatisierung) fuer deutsche KMU. Freitags werden alle vier Sektoren abgedeckt, Mo-Do rotierend. Jeder Eintrag bekommt headline, summary, relevance_score und for_linkedin-Flag. Ergebnisse dienen als Input fuer linkedin-post-generator und outreach-strategist.

## Inputs
- DB-Tabellen gelesen: keine (Tabelle wird on-the-fly angelegt)
- ENVs genutzt: `CRON_SECRET`, `Gemini_API_Key_Sales_Agent` oder `GEMINI_API_KEY`
- External APIs: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

## Outputs
- DB-Tabellen geschrieben: `industry_news` (CREATE TABLE IF NOT EXISTS, INSERT ON CONFLICT DO NOTHING), `agent_updates` (INSERT 'news-agent'/'daily_news')
- Emails geschickt: nein, aber `logAndNotifyError` sendet Benachrichtigung bei fatalem Fehler
- Webhooks: nein

## Failure Modes
- Gemini liefert kein valides JSON-Array: Sektor wird uebersprungen, Log-Only.
- Gemini generiert News nur aus Trainingsdaten, keine Echtzeit-Feeds. Content kann wiederkehrend sein.
- Em-/En-Dashes werden per `.replace(/[—–]/g, '-')` gesaeubert bevor DB-Insert.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
