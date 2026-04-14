# Rollback: Inbound Response Cron Temp-Slowdown

**Erstellt:** 2026-04-15
**Geplantes Rollback:** 2026-04-16 (nach API-Key Paid-Upgrade)
**Branch:** `fix/inbound-temp-slowdown-2026-04-15`

## Warum dieser Fix noetig war

Free-Tier Gemini-Quota: inbound-response Agent lief alle 15 Minuten (`*/15 6-22 * * 1-5`), das sind 64 Runs/Werktag. Laut Vercel-Log-Auswertung vom 2026-04-15:

- 93% aller Gemini-Iterations stammen von inbound-response
- 65% aller Retry-Events (429/503) stammen von inbound-response
- Andere Agenten (Sales Supervisor, Outreach, Prospect) werden dadurch gedrosselt

Temp-Fix: Reduzierung auf 4 Runs/Werktag.

## Alter Schedule (vor Fix)

```json
{ "path": "/api/cron/inbound-response", "schedule": "*/15 6-22 * * 1-5" }
```

Bedeutung: Alle 15 Minuten zwischen 06:00 und 22:00 UTC, Montag bis Freitag.
Runs pro Werktag: 4 * 17 = 68, minus die :00-Kollisionen, effektiv ca. 64-68.

## Neuer Schedule (nach Fix)

```json
{ "path": "/api/cron/inbound-response", "schedule": "0 8,12,16,20 * * 1-5" }
```

Bedeutung: Exakt um 08:00, 12:00, 16:00, 20:00 UTC, Montag bis Freitag.
Runs pro Werktag: 4.

Reduktion: 68 -> 4 = -94% Gemini-Calls fuer diesen Agenten.

## Auswirkung auf Inbound-Response-Zeit

**VORHER:** Neue Website-Leads wurden innerhalb von maximal 15 Min kontaktiert.
**NACHHER:** Neue Website-Leads warten maximal 4 Stunden (bis zum naechsten 4-Stunden-Slot).

Wichtige Klaerung: Das ist ein bewusster Trade-off. Angie akzeptiert die laengere Reaktionszeit temporaer, um die anderen Agenten (besonders Outreach) zuverlaessig laufen zu lassen.

## Rollback-Anleitung

### Option A (empfohlen): Git Revert

```bash
cd ~/Documents/GitHub/praxisnova-sales-control
git checkout main
git pull
# Finde den Merge-Commit-SHA fuer fix/inbound-temp-slowdown-2026-04-15
git log --oneline | grep inbound-temp-slowdown
# Revert den Merge (ersetze SHA)
git revert <merge-sha>
git push
```

### Option B (manuell): vercel.json editieren

In `vercel.json` die Zeile ersetzen:

```
{ "path": "/api/cron/inbound-response", "schedule": "0 8,12,16,20 * * 1-5" },
```

durch:

```
{ "path": "/api/cron/inbound-response", "schedule": "*/15 6-22 * * 1-5" },
```

Commit + Push.

## Auswirkung auf andere Agenten (Health-Check)

Geprueft gegen aktuelles `vercel.json` - keine anderen Agenten teilen sich die neuen Slots 08:00, 12:00, 16:00, 20:00 UTC exklusiv:

- 08:00: outreach-strategist laeuft (bestehend)
- 12:00: error-sentinel laeuft (bestehend)
- 16:00: keine anderen Agenten
- 20:00: keine anderen Agenten (ausserhalb Werktags-Peak)

**Kollision 08:00 mit Outreach Strategist:** Beide sind Gemini-Agenten. Im Free-Tier-Szenario ein Risiko. Alternative Slots denkbar (z.B. 07:30, 11:30, 15:30, 19:30) aber der User-Prompt gab explizit "0 8,12,16,20" vor.

**Kollision 12:00 mit Error Sentinel:** Error Sentinel nutzt keine Gemini-API, nur DB + HTTP-Pings. Kein Konflikt.

Wenn 08:00-Kollision Probleme macht, kann Outreach-Strategist 08:00-Slot auf 08:05 verschoben werden.

## Notiz fuer kuenftige Sessions

Dieser Fix ist TEMPORAER. Nach API-Key-Upgrade auf Paid-Tier und Wechsel auf Production-Modell (z.B. gemini-2.5-flash) soll der Cron wieder auf `*/15 6-22 * * 1-5` gesetzt werden um die urspruengliche Reaktionszeit von 15 Minuten wiederherzustellen.
