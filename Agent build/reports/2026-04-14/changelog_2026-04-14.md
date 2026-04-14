# Changelog 2026-04-14 (Analyse-Session am 2026-04-15)

## Branch

`fix/sentinel-2026-04-14` - lokal, noch NICHT gepusht, wartet auf Freigabe

## Commits auf diesem Branch

### Commit 1: `743af52` - fix(sentinel): remove 4 false-positive ROUTE_CHECKS

**Datei:** `app/api/cron/error-sentinel/route.ts`

**Was geaendert:** ROUTE_CHECKS Array von 5 auf 2 Eintraege reduziert.

**Entfernte Checks (mit Begruendung):**

| Route | Grund fuer Entfernung |
|-------|----------------------|
| `/api/linkedin` | Route existiert nicht. Nur Unterordner (connect, list, queue, queue-update, status). Live-Test: 404. |
| `/api/inbound/stats` | Ordner `app/api/inbound/` ist komplett leer. Live-Test: 404. |
| `/api/partners` | Route nutzt `getServerSession(authOptions)`. Sentinel ruft ohne Auth-Header auf. Live-Test: 401 by design. |
| `/api/sequences/status` | Route nutzt `getServerSession(authOptions)`. Sentinel ruft ohne Auth-Header auf. Live-Test: 401 by design. |

**Behaltene und hinzugefuegte Checks:**

| Route | Status | Grund |
|-------|--------|-------|
| `/api/anrufliste` | BEHALTEN | 200 OK, keine Auth, detaillierte verify()-Funktion prueft ok + items Array |
| `/api/health` | NEU | 200 OK, keine Auth, als Basis-Health-Signal |

**Faustregel in Code-Kommentar dokumentiert:** Sentinel prueft nur Routes die ohne Auth aufrufbar sind. Authed Routes wuerden immer False Positives erzeugen.

---

### Commit 2: `947055b` - fix(cron): stagger sales-supervisor to avoid Gemini quota collision

**Datei:** `vercel.json`

**Was geaendert:** Zwei Zeilen, nur das Minuten-Feld im Cron-Ausdruck.

**Neue Cron-Slots:**

| Agent | Alt | Neu |
|-------|-----|-----|
| Sales Supervisor (morgens) | `15 9 * * 1-5` (09:15) | `20 9 * * 1-5` (09:20) |
| Sales Supervisor (nachmittags) | `30 14 * * 1-5` (14:30) | `20 14 * * 1-5` (14:20) |

**Audit 09:20-09:30 Slot (vom User gefordert):**

```
09:00  follow-up-tracker (Gemini) + inbound-response (Gemini)
09:15  inbound-response (Gemini)              <- alter Sales Supervisor Slot (entfernt)
09:17  Inbound Response fertig (maxDuration 120s)
09:20  Sales Supervisor (Gemini)              <- NEUER Slot, frei
09:25  Sales Supervisor fertig (maxDuration 300s)
09:30  inbound-response (Gemini) + error-sentinel (kein Gemini)
```

Keine anderen Jobs in 09:20-09:30. Bestaetigt durch `grep` in `vercel.json`.

**Audit 14:20-14:30 Slot:**

```
14:00  outreach-strategist (Gemini, schedule "0 14 * * 1-5" existiert? Check:)
```

Check vercel.json: Bei 14:00 Uhr laeuft kein spezifischer Job. Der naechste um 14:00 ist outreach-strategist "0 13" und "0 15", also nicht 14:00.

```
14:15  inbound-response (Gemini)
14:17  Inbound Response fertig
14:20  Sales Supervisor (Gemini)              <- NEUER Slot, frei
14:25  Sales Supervisor fertig
14:30  inbound-response (Gemini)              <- alter Sales Supervisor Slot (entfernt)
```

Keine anderen Jobs in 14:20-14:30.

**Warum nicht auch anderen Kollisionen beheben:**

Im 09:00-09:45 Fenster gibt es weitere Kollisionen (follow-up-tracker 09:00 + inbound, prospect-researcher 09:45 + inbound). Diese sind aber NICHT Teil des gemeldeten Sentinel-Alarms. Der User-Scope ist explizit nur Sales Supervisor. Weitere Entzerrungen sollten separat entschieden werden.

---

## Status der Reports

- `debug_report_sentinel_2026-04-14.md` - unveraendert (Diagnose)
- `health_check_2026-04-14.md` - unveraendert (Diagnose)
- `changelog_2026-04-14.md` - dieser Eintrag, jetzt mit 2 Commits
- `error_catalog_update.md` - unveraendert (Patterns)
- `session_end_2026-04-14.md` - wird mit Ausrollstatus aktualisiert

## Nicht umgesetzt (laut User-Vorgabe)

- **Option 2 (Retry exponential):** uebersprungen
- **Calendar OAuth:** Angie macht manuell, Claude Code fasst nicht an

## Naechster Schritt

Auf Angies Freigabe warten bevor `git push origin fix/sentinel-2026-04-14` ausgefuehrt wird. Kein Merge nach main bis Angie die Diff gesehen hat.
