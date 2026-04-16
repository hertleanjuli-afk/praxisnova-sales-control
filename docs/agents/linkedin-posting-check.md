# Agent: linkedin-posting-check

## Trigger
Cron-Schedule: `30 15 * * 1-5` (15:30 UTC, Mo-Fr)

## Purpose
Prueft ob an heutigem Tag beide LinkedIn-Posts (post_number 1 und 2) als `posted=true` in `linkedin_posts` markiert sind. Wenn nicht, sendet ein Reminder-Email an Angie und Samantha mit Fortschritt, Wochenziel 14 Posts und Link zum Posting-Tracker.

## Inputs
- DB-Tabellen gelesen: `linkedin_posts` (heute: post_number, posted; aktuelle Woche: COUNT posted=true)
- ENVs genutzt: `CRON_SECRET`, `BREVO_API_KEY`
- External APIs: `https://api.brevo.com/v3/smtp/email`

## Outputs
- DB-Tabellen geschrieben: keine
- Emails geschickt: ja, an `hertle.anjuli@praxisnovaai.com` und `meyer.samantha@praxisnovaai.com`, Sender `hertle.anjuli@praxisnovaai.com` mit Namen "PraxisNova AI"
- Webhooks: nein

## Failure Modes
- Fehlender `BREVO_API_KEY` unterdrueckt den Email-Versand still, Route antwortet trotzdem 200 mit Detail-Objekt.
- Keine Deduplizierung: ein manueller zusaetzlicher Aufruf innerhalb desselben Nachmittags versendet ein zweites Reminder-Email.
- `linkedin_posts` wird ohne Existenzcheck gelesen. Falls die Tabelle fehlt, liefert der Handler 500 und wird nur in `console.error` geloggt.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
