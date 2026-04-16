# Agent: brevo-stats-sync

## Trigger
Cron-Schedule: `0 19 * * 1-5` (19:00 UTC, Mo-Fr)

## Purpose
Zieht aggregierte Email-Performance-Daten fuer den Vortag von Brevo (Sends, Opens, Clicks, Bounces, Unsubscribes, Replies) und schreibt einen Tagesdatensatz in `email_performance_daily` inkl. berechneter Raten und Vortagesvergleich.

## Inputs
- DB-Tabellen gelesen: `email_performance_daily` (SELECT open_rate, click_rate WHERE report_date = previousDate)
- ENVs genutzt: `BREVO_API_KEY`, `CRON_SECRET`
- External APIs: `https://api.brevo.com/v3/smtp/statistics/aggregatedReport`, `https://api.brevo.com/v3/smtp/statistics/events?event=reply`

## Outputs
- DB-Tabellen geschrieben: `email_performance_daily` (INSERT ON CONFLICT DO UPDATE per report_date)
- Emails geschickt: nein, aber `logAndNotifyError` sendet Benachrichtigung bei fatalem Fehler
- Webhooks: nein

## Failure Modes
- Fehlender `BREVO_API_KEY` laesst `fetchBrevoAggregatedStats` null zurueckgeben, Cron antwortet 500.
- Brevo trennt Hard- und Soft-Bounces nicht, beide Felder werden als 0 gespeichert (bekanntes Manko).
- Reply-Endpoint-Limit von 1000 Events pro Tag kann zu Undercount bei sehr aktiven Tagen fuehren.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
