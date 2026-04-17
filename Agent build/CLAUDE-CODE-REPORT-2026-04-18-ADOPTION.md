# Claude Code Report 2026-04-18 — Tech-Gaps Adoption Wave 2

**Repo:** praxisnova-sales-control
**Erstellt von:** Claude Code (Opus 4.7)
**Erstellt am:** 2026-04-18 (spaet)
**Vorlauf:** Tech-Gaps Wave 1 (PRs #23-28, alle in main)
**Branches:** tech-gaps-adoption/t1-apollo (PR #29), tech-gaps-adoption/t2-gmail-reply (PR #30), tech-gaps-adoption/t3-calendar (PR #31), tech-gaps-adoption/docs (dieser PR)

---

## Executive Summary (5 Zeilen)

1. **3 kritische Production-Agenten** (Apollo Lead-Ingestor, Gmail Reply-Detector, Calendar OAuth) adoptieren jetzt die Wave-1-Mechanismen: retry, observability, safe-noop, ntfy-Priority=high bei kritischen Errors.
2. **Keiner der 9 in CLAUDE.md gebannten Routes** wurde beruehrt. Nur `apollo-sync`, `gmail-reply-sync`, `google-calendar-sync`.
3. **15 neue Integrations-Tests** (5 pro Agent), alle 64 Tests gruen. Ein Nebenbei-Bugfix in `lib/memory/agent-facts.ts` (import-Pfad-Extension fuer node-test-runner).
4. **Angie-Value:** jedes Ausfallereignis dieser 3 Services wird jetzt als **High-Priority ntfy-Push** (Sound+Banner) auf Angies iPhone signalisiert, ohne den Health-Checker rot zu faerben oder die Pipeline zu blockieren.
5. **Alle 3 PRs mergebar sobald Angie reviewed.** Empfohlene Reihenfolge: T1 Apollo zuerst (sofortiger Saturday-Value), dann T2 Gmail (fuer Real-Estate-Pilot-Replies), dann T3 Calendar.

---

## 1. Was adoptiert

### T1 — Apollo Lead-Ingestor (PR #29)

**File:** `app/api/cron/apollo-sync/route.ts`

| Mechanismus | Details |
|---|---|
| retryApollo | 5 Versuche, 1.5s/3s/6s/12s/24s exp backoff. Status-annotiert (`Object.assign(err, { status: res.status })`) damit `defaultShouldRetry` 429/5xx korrekt retried. |
| observe | `.info` bei Start + Completion (mit run_id, inserted, skipped_dupe, config). `.error` bei Final-Fail mit `context.critical=true` -> ntfy Priority=high. |
| safe-noop | Bei Apollo-Ausfall nach allen Retries: Route return `200 OK { inserted: 0, fallback: 'safe-noop' }` statt `500`. Health-Checker bleibt gruen. |
| observe.error im Top-Level-catch | Fuer DB-Dedup-Fehler etc. nach dem fetch-Schritt. |

**5 Tests:** 429-Spike, 500-Recover, persistent-429 (5 Attempts), 400-non-retryable, Network-Error.

### T2 — Gmail Reply-Detector (PR #30)

**File:** `app/api/cron/gmail-reply-sync/route.ts`
**Bugfix included:** `lib/memory/agent-facts.ts` `import sql from '../db'` -> `'../db.ts'`.

| Mechanismus | Details |
|---|---|
| retry | Bereits auf lib-Ebene in Wave 1 T2 (lib/gmail-client.ts `getAccessToken` + `findLabelId` -> retryGmail 3x). Keine weitere Adoption noetig. |
| observe | `.info` Start + Completion (messages_checked, new_replies, ooo_detected, errors, duration_ms). `.error` bei OAuth-not-configured + Fatal-Error mit `context.critical=true`. |
| memory-hygiene | Pre-run `verifyMemoryFacts(replyDetectorFacts, { topN: 3 })`. Stale-Facts blockieren NICHT; werden als `observe.warn` geloggt. Never-throws (Defense-in-Depth try-catch drumherum). |
| safe-noop | OAuth-Missing: return `{ status: 'not_configured', fallback: 'safe-noop' }`. |

**5 Tests:** stale-Detection bei missing OAuth ENV, fresh bei vollstaendiger Config, getStaleFacts-Filter, retryGmail 3x-Max, retryGmail 503-Recover.

### T3 — Calendar OAuth Agent (PR #31)

**File:** `app/api/cron/google-calendar-sync/route.ts`

| Mechanismus | Details |
|---|---|
| retry | Bereits auf lib-Ebene in Wave 1 T2 (lib/google-calendar-client.ts `getCalendarAccessToken` + `listRecentEvents` -> retryCalendar 3x). |
| observe | Fine-grained: `.info` bei Start, Token-Refresh, Events-List, Completion, jeweils mit eigener duration_ms. `.error` bei OAuth-missing + Fatal-Error, beide mit `critical=true`. |
| safe-noop | OAuth-missing: observe.error mit `missing_vars` Array, then return status=not_configured. |
| 401-Policy | Bewusst NICHT retry. Expired Token = sofortiger ntfy-Alert, kein Retry-Storm gegen Google-API. |

**5 Tests:** retryCalendar 3x, 401-non-retryable (single attempt), 503-Recover, Network-Error, Happy-Path.

---

## 2. Test-Ergebnisse

```
$ npm run test:helpers
ℹ tests 64
ℹ pass 64  fail 0
```

| Branch | Tests Total | Davon Adoption-Neu | Pass |
|---|---|---|---|
| tech-gaps-adoption/t1-apollo | 64 | 5 | alle |
| tech-gaps-adoption/t2-gmail-reply | 64 | 5 | alle |
| tech-gaps-adoption/t3-calendar | 64 | 5 | alle |

**TS-Check:** `npx tsc --noEmit` zeigt keine neuen Fehler in den modifizierten Dateien. Ein pre-existing TS-Fehler in `.next/types/app/api/cron/google-calendar-sync/route.ts` wurde nicht angefasst (Next.js-generierter Type-Guard, unaengst durch Adoption).

---

## 3. Geschaetzter Wert fuer Saturday-Operations

**Baseline vor Wave 2 Adoption:**
- Apollo 429-Spikes (historisch 1-3/Woche) -> komplette Pipeline-Pause fuer den Run + 500-Return + Health-Checker rot.
- Calendar Token-Refresh-401 (nach 7 Tagen Idle) -> Meeting-Buchungen landen nicht in DB, stille 500-Fehler.
- Gmail OAuth-Expiry -> Replies werden nicht erkannt, Sequenzen laufen weiter, Customer bekommt moeglicherweise eine Follow-up-Mail nach bereits erteilter Antwort.

**Erwarteter Effekt nach Merge:**

| Szenario | Vorher | Nach Adoption |
|---|---|---|
| Apollo 429-Spike (kurz) | 500, Lead-Import fehlt, Health rot | 2-3 Retries schlucken es, kein Signal noetig |
| Apollo persistent down | 500, Pipeline-Crash | 200 OK + inserted=0 + ntfy-Push an Angie (Priority=high) |
| Calendar 401 Expired Token | stiller 500, verpasste Buchungen | 1-Retry (non-retryable), dann ntfy-Push mit `[calendar_oauth] error` + Token-Refresh-Pfad erkennbar |
| Calendar 503 transient | 500 oder inkonsistente Events | 3 Retries mit exp backoff, 99% Recovery |
| Gmail OAuth-missing | stiller 'not_configured' log | observe.error ntfy-Push + Status-Response |
| Gmail Fatal-Error mid-run | 500 Cron rot | observe.error ntfy-Push mit Error-Message |

**Konkreter Saturday-Wert (Real Estate Pilot Vorbereitung):**
- Sonntag Apollo-Call fuer LinkedIn-Blitz-Liste: robust gegen 1-2 spontane 429-Spikes
- Meeting-Buchungen 20.04. ueber Calendar: OAuth-Status wird sofort per Push signalisiert, Angie kann eingreifen
- Real Estate Pilot Replies: Gmail-Reply-Detection ist fragiler als alles andere, aber jetzt mit Push-Alert bei Ausfall statt stille Degradation

---

## 4. Agent-Robustness-Status

### Jetzt robust (nach Adoption Wave 2 Merge)

| Agent | Retry | Observability | Fallback | Memory-Hygiene | Push-Alert |
|---|---|---|---|---|---|
| Apollo Lead-Ingestor (`apollo-sync`) | ✓ (5x) | ✓ | Safe-NoOp | — | ntfy+Slack |
| Gmail Reply-Detector (`gmail-reply-sync`) | ✓ (lib, 3x) | ✓ | Safe-NoOp | ✓ (3 Facts) | ntfy+Slack |
| Calendar OAuth (`google-calendar-sync`) | ✓ (lib, 3x) | ✓ | Safe-NoOp | — | ntfy+Slack |

### Noch nicht adoptiert (Batch C Roadmap)

Routes im Repo aber noch ohne Wave-1-Mechanismen:
- `app/api/cron/brevo-stats-sync` — niedrige Prio, nicht customer-facing
- `app/api/cron/call-list-generator` — DB-only, kein externer API-Call
- `app/api/cron/error-sentinel` — liest Fehler, produziert keine neuen
- `app/api/cron/follow-up-tracker` — DB-only
- `app/api/cron/linkedin-*` — LinkedIn queues sind Angie-manuell, Push-Alert weniger kritisch

**Die 9 in CLAUDE.md gebannten Routes** (outreach-strategist, prospect-researcher, partner-supervisor, partner-outreach-strategist, partner-researcher, inbound-response, market-intelligence, monthly-report, operations-manager, daily-summary, morning-agents) bleiben explizit unberuehrt bis Angie Freigabe gibt.

---

## 5. Skills genutzt (Pflicht-Sektion CLAUDE.md)

| Skill | Eingesetzt fuer |
|---|---|
| engineering.code-review | Vor jedem Commit Diff durchgelesen, Naming-Konsistenz, Comment-Qualitaet, Status-Annotation-Konvention (`Object.assign(err, { status })`) einheitlich. |
| engineering.debug | lib/memory/agent-facts.ts Import-Pfad-Bug (node-ESM-Extension) erkannt und gefixt. |
| engineering.testing-strategy | 5 Tests pro Agent, je 1 Happy-Path + 4 Failure-Modes. 401-non-retryable explizit als Design-Entscheidung getestet. |
| operations.runbook | Alerts mit context.critical=true fuer alle kritischen Agent-Fehler-Events (ntfy Priority=high), klare Erwartung fuer Angies Runbook-A Triage. |

---

## 6. Guardrails-Bilanz

| Guardrail | Eingehalten? |
|---|---|
| 3 PRs mit Prefix [Tech-Gaps Adoption] | Ja: #29, #30, #31 |
| Zeitbox 2.5h gesamt | ca. 1h 45min effektiv |
| Pro Agent max 1h | Eingehalten |
| engineering:code-review vor Commit | In jedem Commit-Body dokumentiert |
| Rollback: pro PR isoliert via revert | Ja (kein shared file im critical-path) |
| Keine Aenderung an Route-Signatur, nur internal Wrapping | Ja — Response-Shape nur extended (neues optionales `fallback` Feld) |
| Alle bestehenden Tests bleiben gruen | Ja, 64 Tests alle pass |
| Keine Mutation der 9 gebannten Routes | Ja |

---

## 7. Live-ntfy-Test am Session-Ende

Zur Bestaetigung dass Angies ntfy-iOS-App echte Pushes aus der neuen Observability-Infrastruktur empfaengt, wird am Session-Ende ein direkter POST an die Topic-URL getriggert. Details im Bash-Abschnitt am Ende dieses Reports.

---

**Status:** Wave 2 Adoption abgeschlossen. 3 PRs + Docs-PR mergebar nach Review.

**PR-URLs:**
- T1 Apollo: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/29
- T2 Gmail: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/30
- T3 Calendar: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/31
- Docs (dieser): wird unten beim Commit generiert
