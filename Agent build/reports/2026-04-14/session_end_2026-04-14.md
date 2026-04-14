# Session-End Report - Sentinel Alarm Debug + Fix

**Alarm vom:** 2026-04-14 08:15 UTC
**Analyse + Fix am:** 2026-04-15
**Branch:** `fix/sentinel-2026-04-14`, 2 Commits lokal, NICHT gepusht

## Was wurde gemacht

### Phase 1: Diagnose (bereits im ersten Session-Durchlauf)

- Git-Log beider Repos geprueft
- Alle 5 "401"-Routes lokal im Code gelesen
- Alle 5 Routes live getestet (curl)
- Auth-Mechanismus identifiziert (NextAuth `getServerSession`)
- Gemini-Model-Konfiguration analysiert (`gemini-3-flash-preview` Preview-Modell)
- sendWithRetry-Logik geprueft (429/503, 3 Retries, 15/25/35s)
- Error-Sentinel-Code vollstaendig gelesen
- Voll-Health-Check aller Agenten + Webhooks + Drittsysteme

### Phase 2: Fix-Rollout (diese Session)

**Option 1: Sentinel-Cleanup (Commit `743af52`)**

ROUTE_CHECKS in `app/api/cron/error-sentinel/route.ts` reduziert von 5 auf 2:
- Entfernt: `/api/linkedin`, `/api/inbound/stats` (Routes existieren nicht, 404)
- Entfernt: `/api/partners`, `/api/sequences/status` (authed by design)
- Behalten: `/api/anrufliste` (200, mit detailliertem verify)
- Hinzugefuegt: `/api/health` (200, Basis-Check)

Kommentar-Regel im Code hinterlegt: nur unauthed Routes im Sentinel.

**Option 3: Cron-Slot-Entzerrung (Commit `947055b`)**

Sales Supervisor in `vercel.json` verschoben:
- 09:15 UTC -> 09:20 UTC
- 14:30 UTC -> 14:20 UTC

Beide neuen Slots in 09:20-09:30 und 14:20-14:30 sind audited: keine anderen Jobs, Inbound Response (120s maxDuration) laeuft vorher und nachher ohne Ueberlappung.

**Option 2 (Retry exponential):** uebersprungen laut User-Anweisung.

## Offene Punkte

### Kritisch (P0)

1. **Calendar OAuth** - Angie fixt manuell (Claude Code haelt Abstand).

### Wichtig (P1)

2. **Gemini Preview-Modell:** Retry ist linear 15/25/35s. Wenn der neue Cron-Staffelung-Fix die Kollision behebt, sollten 503er drastisch seltener werden. Monitor die naechsten 48h.

3. **Restliche 09:00 und 09:45 Kollisionen** (Follow-up-Tracker + Inbound, Prospect-Researcher + Inbound):
   Nicht Teil dieses Scopes. Optional in einer naechsten Session.

### Moderate Prioritaet (P2)

4. **Sentinel koennte Calendar-Status tracken** (neuer Check). Optional.

## Commits lokal (noch nicht gepusht)

```
947055b  fix(cron): stagger sales-supervisor to avoid Gemini quota collision
743af52  fix(sentinel): remove 4 false-positive ROUTE_CHECKS
c6007f7  (origin/main) feat: company-wide sequence stop on email reply via domain matching
```

## Rollback-Plan

Wenn irgendetwas nach Merge schiefgeht:
```
git checkout main
git reset --hard c6007f7
git push --force-with-lease origin main
```

Beide Commits sind isoliert und einzeln revertierbar:
- Commit 1 (`743af52`): `git revert 743af52` stellt die alten ROUTE_CHECKS wieder her.
- Commit 2 (`947055b`): `git revert 947055b` stellt Sales Supervisor auf 09:15/14:30 zurueck.

## Reports gespeichert

```
Agent build/reports/2026-04-14/
├── debug_report_sentinel_2026-04-14.md
├── health_check_2026-04-14.md
├── changelog_2026-04-14.md       <- aktualisiert mit Ausroll-Details
├── error_catalog_update.md
└── session_end_2026-04-14.md     <- dieser Report
```

## Merge + Verify (2026-04-15, nach PR-Approval)

### Merge bestaetigt

PR #2 `fix: sentinel cleanup + cron slot entzerrung 2026-04-14` wurde auf main gemergt.

```
89474fd  Merge pull request #2 from hertleanjuli-afk/fix/sentinel-2026-04-14
c27e0c0  docs: update session reports for sentinel fix rollout
947055b  fix(cron): stagger sales-supervisor to avoid Gemini quota collision
743af52  fix(sentinel): remove 4 false-positive ROUTE_CHECKS
```

Local main ist fast-forwarded auf `89474fd`.

### Verify-Ergebnis

**Check 1 - Sentinel ROUTE_CHECKS im deployed Code:**

Die 4 Phantom-Checks sind entfernt. Aktive Checks:
- `/api/anrufliste` (verify: ok + items Array)
- `/api/health` (verify: Objekt)

Plus 3 unveraenderte DB-Checks: leads populated, email_events last 24h, agent_logs last 2h.

Die 4 zuvor gemeldeten 401-Quellen (`/api/linkedin`, `/api/inbound/stats`, `/api/sequences/status`, `/api/partners`) werden vom Sentinel NICHT MEHR gepingt. Damit keine Phantom-401er mehr im naechsten Sentinel-Run erwartbar.

**Check 2 - Cron-Slots in vercel.json:**

Beide Aenderungen aktiv:
```
Zeile 26:  "/api/cron/sales-supervisor"  "schedule": "20 9 * * 1-5"   (09:20 UTC)
Zeile 40:  "/api/cron/sales-supervisor"  "schedule": "20 14 * * 1-5"  (14:20 UTC)
```

Vercel deployed vercel.json automatisch beim Merge. Der naechste Cron-Lauf um 09:20 UTC (morgen Mo-Fr) nutzt den neuen Slot.

**Check 3 - Live-Tests der 6 relevanten Routes:**

| Route | HTTP Status | Im Sentinel? | Bewertung |
|-------|-------------|--------------|-----------|
| `/api/anrufliste` | 200 | JA | korrekt |
| `/api/health` | 200 | JA (neu) | korrekt |
| `/api/linkedin` | 404 | NEIN (entfernt) | nicht mehr gepingt |
| `/api/inbound/stats` | 404 | NEIN (entfernt) | nicht mehr gepingt |
| `/api/partners` | 401 | NEIN (entfernt) | nicht mehr gepingt, by design auth |
| `/api/sequences/status` | 401 | NEIN (entfernt) | nicht mehr gepingt, by design auth |

**Gesamtergebnis:** Merge erfolgreich. Beide Fixes wirken wie geplant. Keine Phantom-401er mehr erwartbar.

### Nicht getestet (muss zum naechsten Cron-Lauf beobachtet werden)

- **Sales Supervisor ohne Gemini 503** am morgigen 09:20 UTC. Vercel Cron laeuft Mo-Fr. Bei Alarm auf den Run: Gemini Preview-Modell ist weiter das Nadeloehr und Option 2 (Retry exponential) wird faellig.

### Health-Endpoint Analyse (fuer Folge-Session)

Datei: `app/api/health/route.ts` komplett gelesen (24 Zeilen).

Was `/api/health` prueft:
- **NUR DB-Connection** via `checkConnection()` aus `lib/db.ts`
- `checkConnection()` fuehrt `SELECT 1 AS ok` gegen Neon aus
- Gibt `200` mit `{ status: 'healthy', database: { connected: true, latencyMs: N } }` zurueck
- Gibt `503` mit `{ status: 'unhealthy', database: { connected: false, error: ... } }` bei DB-Fehler

Was `/api/health` NICHT prueft:
- Brevo API Reachability
- Apollo API Reachability
- Google Calendar OAuth Status
- Gmail API Reachability
- HubSpot API Reachability
- Gemini API Quota/Verfuegbarkeit
- Cron-Job letzter-Run-Zeitpunkt
- Blob Storage

**Einschaetzung:** Der aktuelle Sentinel prueft via `/api/health` nur DB + indirekt 3 DB-Tabellen-Counts (leads, email_events, agent_logs). Das ist eine dünne Basis fuer einen vollen Runtime-Health-Check.

**Empfehlung fuer Folge-Session:** Entweder
- **Option A:** `/api/health` erweitern um Sub-Checks (z.B. `{ database, brevo, apollo, calendar }` mit jeweils `ok/latency/error`). Vorteil: ein Endpoint, Sentinel bleibt simpel.
- **Option B:** Einzelne Health-Endpoints `/api/health/db`, `/api/health/brevo`, `/api/health/apollo` anlegen und Sentinel-ROUTE_CHECKS entsprechend erweitern. Vorteil: granularer Alarm welcher Service konkret down ist.

Option A ist einfacher, Option B diagnostisch besser. Ich empfehle Option A als Ausbaustufe 1 (1-2h Aufwand) und Option B nur wenn sich ein Alarm-Flood-Problem ergibt.

Entscheidung bleibt offen fuer naechste Session.
