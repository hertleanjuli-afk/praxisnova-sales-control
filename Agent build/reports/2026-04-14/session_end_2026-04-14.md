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

## Diff-Zusammenfassung siehe naechsten Abschnitt

(Wird im Chat separat angezeigt vor Push-Freigabe.)
