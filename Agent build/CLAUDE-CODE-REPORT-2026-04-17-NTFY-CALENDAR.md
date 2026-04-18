# Claude Code Report 2026-04-17 — NTFY-Calendar-Spam Incident Fix

**Incident:** LECK-17 (siehe `Agent build/ERROR-CATALOGUE.md`)
**Severity:** P0 (Angie bekommt ntfy-Spam alle 5 Min, droht Alert-Fatigue)
**Fix-Datum:** 2026-04-18
**Branches:** `hotfix/ntfy-calendar-spam` (PR #33, gemergt), `fix/calendar-oauth-reset` (Phase 2+3, dieser Report bezieht sich darauf)

---

## Executive Summary

Angie hat seit Merge von PR #31 (Tech-Gaps T3 Calendar Adoption) **alle 5 Minuten** eine ntfy-Push bekommen mit Calendar-OAuth-Fehler. Root-Cause: latenter Scope-/Client-ID-Mismatch (seit mindestens 2026-04-12), verstaerkt durch neues Alert-System ohne State-Dedup.

**Sofort-Mitigation (Phase 1, 15 Min):** Calendar-Cron aus vercel.json entfernt, PR #33 gemergt. Spam stoppt nach Deploy.

**Permanenter Fix (Phase 2+3):** Admin-Reauth-Route + `agent_error_state`-Tabelle + State-basiertes Alerting (3-fail-threshold, 60min cooldown) + 4h-Cron-Schedule + Runbook.

**Ergebnis:** Selbst wenn der OAuth-Zustand weiter broken ist, bekommt Angie **maximal 1 Push pro Stunde** statt 12. Nach Reauth recovery-Push, dann keine mehr.

---

## Phase 1: Hotfix (PR #33, gemergt)

### Was rein

- `vercel.json`: Cron-Eintrag `/api/cron/google-calendar-sync` entfernt
- `Agent build/ERROR-CATALOGUE.md` neu angelegt, LECK-17 Eintrag mit Symptom / Root-Cause-Hypothese / Phase-Plan

### Effekt

Vercel deployed nach Merge in 30-90 Sek. Cron-Trigger stoppt. Route-Code intakt. ntfy-Push "spam stopped" an Angie gesendet.

### Skills genutzt

engineering.incident-response, engineering.debug, operations.runbook, engineering.code-review.

---

## Phase 2: Root-Cause-Diagnose

**Primaer-Befund:** `GOOGLE_CALENDAR_CLIENT_ID` fehlt in `.env.local`. Nur `_CLIENT_SECRET` und `_REFRESH_TOKEN` sind gesetzt.

In `lib/google-calendar-client.ts:38-39`:
```typescript
const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
```

Der Fallback kombiniert **Gmail Client-ID mit Calendar Client-Secret** — Google validiert ID+Secret als Paar -> `invalid_grant` / `invalid_client`. Dasselbe gilt wenn Vercel-Production-ENV inkonsistent gesetzt ist.

**Sekundaer-Hypothese:** Der Refresh-Token wurde evtl. mit `gmail.modify`-Scope generiert (als Teil des Gmail-OAuth-Flows), nicht mit `calendar.readonly`. Dann failed `events.list` mit 401/403 auch bei sonst korrekten Credentials.

**Amplifier:** Tech-Gaps-T3 (PR #31) hat `observe.error({ critical: true })` im Fatal-Catch eingebaut. Ohne State-Dedup -> jeder failed Cron-Run = 1 Push. 5-Min-Cron -> 12 Pushes/Stunde.

Vollstaendige Diagnose in `Agent build/ERROR-CATALOGUE.md` LECK-17 Sektion Phase 2.

### Skills genutzt

engineering.debug, engineering.incident-response.

---

## Phase 3: Permanenter Fix

### 3a: Admin-Reauth-Route (OAuth-Flow zuruecksetzen)

**Files:**
- `app/api/admin/calendar-reauth/route.ts` — GET, Bearer-CRON_SECRET-Auth, redirect auf Google Consent-Screen mit `access_type=offline&prompt=consent` (erzwingt neuen Refresh-Token), Scope `calendar.readonly`.
- `app/api/admin/calendar-reauth/callback/route.ts` — GET, tauscht `code` gegen Tokens, zeigt Refresh-Token in HTML-Textarea fuer Angies manuelles Copy-Paste. Token wird NICHT in Logs/DB gespeichert.

### 3b: State-basiertes Alerting

**Files:**
- `db-migration-v8-agent-error-state.sql` — neue Tabelle `agent_error_state` (agent_name PK, consecutive_failures, last_failure_at, last_success_at, last_alerted_at, last_alert_level, last_error_message). **Nicht automatisch ausgefuehrt** (per CLAUDE.md). Angie muss auf Neon laufen lassen.
- `lib/observability/alert-state.ts` — `reportAgentFailure(agent, msg, ctx, opts)` + `reportAgentSuccess(agent, ctx)`.
  - Threshold default 3 consecutive failures
  - Cooldown default 60 Min zwischen Error-Alerts
  - Bei DB-Ausfall fallback auf direkten `observe.error` (Defense-in-Depth, damit Incidents nicht verschwinden)
  - Recovery-Push (Priority=default, kein Sound) wenn vorherige Error-Alerts existierten
- Calendar-Route umgestellt: alle `observe.error`-Calls durch `reportAgentFailure` ersetzt, Success-Pfad ruft `reportAgentSuccess`.

### 3c: Cron-Frequenz dauerhaft `0 */4 * * *`

Von alle 5 Min auf alle 4h. Calendar-Buchungen kommen selten; 4h-Interval ist ausreichend. Cron wird in diesem PR wieder hinzugefuegt. Safe durch alert-state-Dedup — selbst wenn Reauth noch nicht gemacht wurde, kommen max 2 Pushes bis Angie sich kuemmert (3 failed Cron-Runs = 12h = 1 Push, dann cooldown).

### 3d: Runbook `Agent build/RUNBOOK-CALENDAR-AGENT.md`

Enthaelt:
- Normal-Betrieb-Erklaerung (Cron-Schedule, alert-state-Logik)
- Triage-Matrix fuer verschiedene Error-Varianten (invalid_grant vs invalid_client vs 401 vs timeout)
- Schritt-fuer-Schritt Reauth-Flow (inkl. Browser-Header-Setup fuer Bearer-CRON_SECRET)
- ENV-Check-Commands (`vercel env ls production | grep GOOGLE_CALENDAR`)
- State-Reset Fallback (`DELETE FROM agent_error_state WHERE agent_name='calendar_oauth'`)
- Historie-Zeitleiste

### Tests

- `__tests__/helpers/alert-state.test.ts` — 8 neue Tests fuer Push-Entscheidungs-Logik.
- Alle 82 Tests gruen (74 bestehend + 8 neu).
- TS-Check: kein neuer Fehler durch meine Aenderungen. Ein pre-existing `.next/types/...` Warn fuer google-calendar-sync/route.ts (Next.js Type-Guard-Drift, schon vor T3 vorhanden) ist unberuehrt.

### Skills genutzt

engineering.incident-response (reporting-Framework), engineering.system-design (alert-state-Interface, threshold/cooldown als Konfiguration), engineering.code-review (PR-Iteration), operations.runbook (RUNBOOK-File).

---

## Admin-Reauth-URL fuer Angie

Nach Merge von PR `fix/calendar-oauth-reset`:

1. **DB-Migration ausfuehren:** `db-migration-v8-agent-error-state.sql` auf Neon (via Console oder psql).
2. **Reauth starten:**
   - Browser mit Google-Account eingeloggt der den Kalender besitzt
   - ModHeader/Requestly installieren, Header: `Authorization: Bearer $CRON_SECRET` (aus Vercel ENV)
   - URL oeffnen: `https://praxisnova-sales-control.vercel.app/api/admin/calendar-reauth`
   - Redirect zu Google, Consent geben
   - Callback zeigt neuen Refresh-Token in Textarea
3. **ENV setzen:** `GOOGLE_CALENDAR_REFRESH_TOKEN` in Vercel (Production + Preview). Deploy triggert automatisch.
4. **Verify:** erster Cron-Run in 4h sollte `recovery` ntfy-Push mit `[calendar_oauth] info` senden.

Details + Troubleshooting in `Agent build/RUNBOOK-CALENDAR-AGENT.md`.

---

## Getestete Schritte

- [x] Hotfix PR #33 gemergt, vercel.json auf main verifiziert (`grep -c google-calendar-sync` = 0, nach Phase-3-PR wieder = 1 mit 4h-schedule)
- [x] ntfy-Push "spam stopped" an Angie gesendet (HTTP 200)
- [x] alert-state-Logik mit 8 Unit-Tests abgedeckt (threshold, cooldown, recovery-after-error)
- [x] TS-Check zeigt keine neuen Fehler in meinen Dateien
- [x] Alle 82 Tests gruen
- [ ] Live-Test der Reauth-Route — kann erst nach Merge + Angies Manual-Durchlauf passieren
- [ ] DB-Migration auf Neon — wartet auf Angie
- [ ] recovery-Push nach erstem erfolgreichen Cron-Run — wartet auf Reauth

---

## Guardrails-Bilanz

| Guardrail | Eingehalten? |
|---|---|
| Phase 1 allein reicht, Phase 2+3 koennen verschoben werden | Alle 3 in einer Session fertig. Kein Overrun. |
| Keine DB-Schema-Aenderungen ohne Migration-File | `db-migration-v8-agent-error-state.sql` angelegt, nicht ausgefuehrt. |
| Keine anderen Cron-Jobs anfassen | Nur `google-calendar-sync` beruehrt. |
| Zeitbox 2-3 Stunden | ca. 2h 10min effektiv. |
| PR hotfix sofort gemergt | Ja, PR #33 squash-merge. |
| PR fix/calendar-oauth-reset nach Review | Wartet auf Angie. |

---

## Naechste Schritte (falls relevant)

1. Angie fuehrt Reauth-Flow durch (siehe oben). 5 Min Aufwand.
2. Falls recovery-Push nach Reauth kommt: LECK-17 geschlossen.
3. Phase 4 (optional, spaeter): separater Health-Check-Endpoint alle 30 Min, der **nicht pushed** aber Dashboard-sichtbar macht. Ausserhalb dieser Session.
4. Phase 4 Alternative: generelle Kill-Switch-Route `POST /api/admin/mute-alerts?minutes=60` fuer alle observe.error-Paths. Als Folge-Task empfohlen.

---

**Status:** Hotfix PR #33 merged, Permanent-Fix PR ready for review.
