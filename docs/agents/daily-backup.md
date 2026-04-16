# Agent: daily-backup

## Trigger
Cron-Schedule: `0 2 * * *` (02:00 UTC taeglich, 03:00 Berlin Winter / 04:00 Sommer)

## Purpose
Exportiert die Kern-Tabellen als CSV nach Vercel Blob Storage als zweite unabhaengige Backup-Schicht zusaetzlich zu Neons Point-in-Time-Recovery. Prunt Backups aelter als 30 Tage.

## Inputs
- DB-Tabellen gelesen: `leads`, `linkedin_tracking`, `call_queue`, `email_events` (letzte 30 Tage), `sequences`, `agent_logs` (letzte 7 Tage), `error_logs` (letzte 30 Tage), `partners`
- ENVs genutzt: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`
- External APIs: Vercel Blob SDK (`put`, `list`, `del`)

## Outputs
- DB-Tabellen geschrieben: keine
- Emails geschickt: nein
- Webhooks: nein. Artefakte landen unter `praxisnova-backup/YYYY-MM-DD/{tablename}.csv` in Vercel Blob.

## Failure Modes
- Fehlender `BLOB_READ_WRITE_TOKEN` laesst den Cron frueh mit 500 abbrechen.
- Einzelne Tabellen-Dumps sind in try/catch gekapselt: eine nicht existierende Tabelle liefert leeres Array statt Abbruch.
- Prune-Schritt ist non-critical, Fehler werden nur geloggt. Alte Backups koennen sich stauen wenn list/del dauerhaft fehlschlaegt.

## Owner
Primary: Angie (angie@praxisnovaai.com)
Co-Author: Claude Code (Session 2026-04-17)

## Last Review
2026-04-17
