# Agent: Weekly Business Report (A3)

## Purpose
Business-weite Wochenuebersicht, Sonntag 16:00 UTC. Erweitert den bestehenden Sales-orientierten `weekly-report` um Planning- und Time-Investment-Daten. Bestehende `weekly-report`-Route wird NICHT angefasst.

## Route
`GET /api/cron/weekly-business-report`
Auth: `Authorization: Bearer ${CRON_SECRET}`

## Cron
`0 16 * * 0` (Sonntag 16:00 UTC)

## Input
- Leads letzte 7 Tage (gesamt, per industry)
- email_events 7d (sent, replied)
- daily_plans 7d (Zeit-Investment per category)
- 8-Wochen-Lead-Historie fuer lineare Regression (Forecast 4 Wochen)

## Output
- Row in `weekly_reports` (metrics_json, forecast_json)
- HTML-Email mit KPI-Sektionen, Branchen-Bullets, Zeit-Investment, Forecast

## Metriken
- Neue Leads
- Emails gesendet
- Antworten (Reply-Rate)
- Plan-Coverage (Tage mit Plan in `daily_plans`)
- Leads per Industry
- Zeit-Investment per Block-Category (Minuten)
- Forecast: 4 Wochen per OLS-Regression auf 8w Lead-Historie

## Abgrenzung zu bestehender `weekly-report`
- `weekly-report`: existierender Sales-Weekly-Report (Lead/Email-Performance-Fokus).
- `weekly-business-report`: umfassender, inkl. Zeit-Investment, Plan-Coverage, Forecast. Laeuft parallel ohne Overlap im Output-Pfad.

## Error-Handling
- Kein Plan in 7d Window: timeByCategory bleibt leer, keine Fehlermeldung.
- Regression-Fallback: bei n<2 Wochen Historie Konstanz-Forecast (wiederholter letzter Wert).

## Env-Vars
Wie andere Planner (CRON_SECRET, BREVO_API_KEY, PLANNER_RECIPIENT).
