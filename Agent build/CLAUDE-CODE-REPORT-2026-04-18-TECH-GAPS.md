# Claude Code Report 2026-04-18 — Tech-Gaps

**Repo:** praxisnova-sales-control
**Erstellt von:** Claude Code (Opus 4.7)
**Erstellt am:** 2026-04-18
**Vorlauf:** SKILLS-MANIFEST.md (PR #22), SKILL-ARCHITECTURE-2026-04-17.md
**Branches:** tech-gaps/t1-fallback (PR #23), tech-gaps/t2-retry (PR #24), tech-gaps/t3-observability (PR #25), tech-gaps/t4-memory-hygiene (PR #26), tech-gaps/docs (dieser PR)

---

## Executive Summary (5 Zeilen)

1. **4 Tech-Gaps in einem Go geschlossen** als 4 separate PRs (T1 Fallback, T2 Retry, T3 Observability, T4 Memory-Hygiene). Jeder PR ist isoliert, hat Tests, hat Rollback-Plan, ist mergebar wenn CI gruen.
2. **40 neue Tests, alle gruen.** Bestehende 10 Tests unangetastet. Coverage fokussiert auf Failure-Modes (Doppel-Fehler, Timeouts, Network-Throws, Webhook-Failures).
3. **Keine Mutation der 9 in CLAUDE.md gebannten Production-Routes.** Alle Tech-Gap-Mechanismen liegen als Shared-Lib-Code vor und sind opt-in fuer die Routes (Adoption-Folgesessions).
4. **Eine ENV-Aenderung optional**: `SLACK_ALERT_WEBHOOK` (T3). Ohne sie laeuft alles, nur ohne Slack-Alerts.
5. **Naechste Schritte:** Adoption in 2-3 Pilot-Routes, Slack-Setup, dann erweitern auf alle 8 Ziel-Agenten in Batch C.

---

## 1. Was implementiert (4 PRs)

### T1 — Fallback-Mechanismen (PR #23)

| Komponente | Pfad |
|---|---|
| Executor | `lib/agents/fallback.ts` |
| Pilot-Konfigurationen | `lib/agents/configs.ts` |
| Tests | `__tests__/helpers/fallback.test.ts` |

**Kernmuster:**
- `executeFallback(agent, primary, spec, context, runner?)` -> `FallbackResult { outcome, result, fallback_kind, duration_ms }`
- Drei Fallback-Typen: `legacy` (alte Funktion), `skill` (sekundaere Skill via SkillRunner-Interface), `noop` (Default, Safe-Skip mit Log)
- Garantierter Safe-NoOp bei Doppel-Fehler

**Drei Pilot-Konfigurationen:**
- `lead_ingestor` -> legacy (Apollo-Sync-Code als Fallback)
- `outreach_strategist` -> skill `marketing.draft-content` (Template-basierter Backup)
- `reply_detector` -> noop (bewusst, statt Keyword-Matching)

**Tests:** 11 Cases. Pro Agent: primary-ok / primary-fail-fallback-greift / primary-fail-fallback-fail-noop. Plus 2 Edge-Cases (missing spec, skill-fallback ohne Runner).

### T2 — Retry mit Backoff (PR #24)

| Komponente | Pfad |
|---|---|
| Wrapper | `lib/util/retry.ts` |
| Migrierte Call-Sites | `lib/apollo.ts`, `lib/google-calendar-client.ts`, `lib/gmail-client.ts` |
| Tests | `__tests__/helpers/retry.test.ts` |

**Kernmuster:**
- `retryWithBackoff(fn, options)` mit Defaults max 3 Versuche, exponentielles Backoff (1s/2s/4s), Jitter +/- 10%
- 5 API-spezifische Wrapper (Apollo 5x, Calendar/Gmail/OpenAI/Brevo 3x)
- Default `shouldRetry`: HTTP 408/425/429/5xx + Network-Errors (fetch failed, ECONNRESET, ETIMEDOUT, EAI_AGAIN). Akzeptiert sowohl `.status` Property als auch `(429)` String-Pattern (Apollo-Wrapper-Format).

**5 Call-Sites migriert:**
1. `lib/apollo.ts` searchPeople (Apollo Search)
2. `lib/google-calendar-client.ts` getCalendarAccessToken (OAuth-Token)
3. `lib/google-calendar-client.ts` listRecentEvents (Events List)
4. `lib/gmail-client.ts` getAccessToken (OAuth-Token)
5. `lib/gmail-client.ts` findLabelId (Labels-API)

Bei jeder Site wird der HTTP-Status via `Object.assign(err, { status })` annotiert, damit `defaultShouldRetry` korrekt entscheidet.

**Tests:** 13 Cases (Filter-Logik HTTP-Codes, Backoff-Wachstum, annotated Error, Wrapper-Behavior).

### T3 — Observability + Slack + recent-errors Endpoint (PR #25)

| Komponente | Pfad |
|---|---|
| Logger | `lib/observability/logger.ts` |
| Endpoint | `app/api/observability/recent-errors/route.ts` |
| Tests | `__tests__/helpers/observability.test.ts` |

**Kernmuster:**
- `observe.{debug,info,warn,error}` mit Pflichtfeldern `agent`/`skill`/`message`/`context`/`duration_ms`
- Output JSON Lines (eine Zeile pro Eintrag), kompatibel mit Vercel Log-Drains
- `error`-Level triggert Slack-Send via `SLACK_ALERT_WEBHOOK` ENV (fire-and-forget, 4s Timeout). Ohne ENV kein Network-Call.
- Doppel-API: `observe.error` (await-able) + `observe.errorSync` (void promise)

**Endpoint `/api/observability/recent-errors`:**
- GET, Auth `Bearer CRON_SECRET`
- Default 50 Errors aus `error_logs` Tabelle (existiert), max 200 via `?limit=`
- Optional `?error_type=` Filter

**Tests:** 9 Cases inkl. Slack-Failure-Modes (429-Response, Network-Throw, kein Webhook -> kein Call).

### T4 — Memory-Hygiene (PR #26)

| Komponente | Pfad |
|---|---|
| Verifier | `lib/memory/hygiene.ts` |
| Pro-Agent Facts | `lib/memory/agent-facts.ts` |
| Doku | `docs/memory-hygiene-checks.md` |
| Tests | `__tests__/helpers/memory-hygiene.test.ts` |

**Kernmuster:**
- `verifyMemoryFacts(facts, context, options)` mit Defaults `topN=3`, `timeoutMs=2000`
- Drei Status: `fresh` / `stale` / `verify_failed`
- Stale -> `logger.warn`, verify_failed -> `logger.error`. Agent-Run blockt nie, der Caller entscheidet ob Fallback verwendet wird.

**Drei Pilot-Agenten konfiguriert (jeweils 3 Facts):**
- `lead_ingestor`: apollo_endpoint_active, leads_table_exists, icp_filters_match_segments
- `outreach_strategist`: brevo_sender_configured, icp_segments_match_master_plan, gemini_model_configured
- `reply_detector`: gmail_oauth_configured, email_log_table_exists, processed_label_name_consistent

**Doku:** Pro Fact die Failure-Bedeutung + Eskalationspfad in `docs/memory-hygiene-checks.md`.

**Tests:** 8 Cases (fresh / stale / throw / timeout / topN-Limit / never-throws / duration-tracking).

---

## 2. Was bewusst ausgelassen und warum

| Was | Warum |
|---|---|
| Adoption in den 9 gebannten Production-Routes | CLAUDE.md verbietet Mutation. Adoption laeuft als Folge-Sessions mit Angies Approval pro Route. |
| Skill-Router selbst (T1 referenziert nur das Interface) | Eigene Arbeit, soll Batch B abdecken. T1 bleibt mit Mock-Runner bewusst entkoppelt. |
| Migration `lib/helpers/gemini-retry.ts` -> `retryOpenAI` | Gemini hat eigene Quirks (25s wait statt exp Backoff). Saubere Migration braucht 30 min Eigenanalyse, war im Zeitbox-Risiko. |
| Migration `lib/brevo.ts` Calls | Brevo-Wrapper hat bereits eigene Retry-Logik. Erst pruefen ob ersetzen oder ergaenzen. |
| `agent_runs`-Tabelle fuer T3 | Endpoint nutzt existierende `error_logs`. Neue Tabelle = DB-Migration = blockiert von "kein Live-Migration"-Regel. |
| Persistenz der stale-Fact-States in T4 | In-Memory pro Run reicht fuer V1. Falls Daily-Stats noetig: separate `memory_fact_log`-Tabelle in Folge-Iteration. |
| Cron-Eintrag fuer Memory-Hygiene-Check | Soll im Agent-Run integriert werden, nicht als separater Cron. Verbraucht keine Cron-Slots. |

---

## 3. Test-Ergebnisse

```
$ npm run test:helpers
ℹ tests 19 (memory-hygiene branch alone)
ℹ pass 19  fail 0
```

Pro Branch (alle bestaetigt):

| Branch | Vorhandene Tests | Neue Tests | Total | Pass |
|---|---|---|---|---|
| tech-gaps/t1-fallback | 10 | 11 | 21 | 21 |
| tech-gaps/t2-retry | 10 | 13 | 23+1* | alle |
| tech-gaps/t3-observability | 10 | 9 | 19+1* | alle |
| tech-gaps/t4-memory-hygiene | 10 | 8 | 18+1* | alle |

*Die "+1" ist der vorhandene logger-Test der manchmal als 2 Eintraege gezaehlt wird.

**TS-Check:** `npx tsc --noEmit` zeigt keine neuen Fehler in den modifizierten/neuen Dateien. Pre-existierende TS-Fehler im Repo (anrufliste/page.tsx etc.) wurden nicht angefasst.

---

## 4. Naechste Schritte

### Sofort (vor Real Estate Pilot Meeting 20.04.)

1. **Angie review der 4 PRs** (#23, #24, #25, #26) — etwa 30 Min, 2308 Zeilen Code aber 60% sind Tests + Doku
2. **Merge T2** zuerst — bringt sofortigen Production-Wert (kein Apollo-Spike kostet mehr Lead-Imports)

### Diese Woche (Batch B Vorlauf)

3. **Slack-Setup fuer T3:** Channel `#praxisnova-alerts`, Incoming-Webhook anlegen, `SLACK_ALERT_WEBHOOK` in Vercel-ENV setzen (Production + Preview)
4. **T1 + T4 mergen**, dann ersten Adoption-PR fuer `gmail-reply-sync` Cron-Route (NICHT in Banned-Liste): executeFallback + verifyMemoryFacts integrieren als Pilot
5. **T3 mergen**, recent-errors Endpoint von neuer Health-Page verlinken

### Naechste 2-3 Wochen (Batch C)

6. Skill-Router bauen (`lib/skill-router.ts`) der das Manifest nutzt und mit `executeFallback` integriert ist
7. `agent_runs` DB-Tabelle als SQL-File schreiben (nicht ausfuehren), Schema reviewen, dann via Angie ausfuehren lassen
8. Migration `lib/helpers/gemini-retry.ts` -> `retryOpenAI` (mit Beibehaltung der 25s wait fuer Gemini-spezifische 429s als override)

---

## 5. Skills benutzt (Pflicht-Sektion CLAUDE.md)

| Skill | Eingesetzt fuer |
|---|---|
| engineering.architecture | Trennung Discovery/Execution in T1, Single-Func + API-Wrapper-Schema in T2, Logger/Slack-Splitting in T3, Fact-Interface = Mock-Point in T4 |
| engineering.system-design | SkillRunner-Interface (T1), Override-Pattern fuer Retry-Wrapper-Tests (T2), LogEntry-Interface mit doppel-API (T3), 3-Status-Modell statt boolean (T4) |
| engineering.code-review | Vor jedem Commit: Diff durchlesen, Naming-Konsistenz, Comment-Qualitaet, Try-Catch-Grenzen pruefen |
| engineering.testing-strategy | Pro Modul Failure-Modes priorisiert (Doppel-Fehler T1, Timeout T4, Network-Failure T2/T3); Tests sind silent (console capture) |
| engineering.documentation | docs/memory-hygiene-checks.md (T4), PR-Bodies mit "Was rein"/"Was bewusst nicht"/"Test plan"/"Rollback" Schema, Code-Header-Comments |
| operations.runbook | RUNBOOKS-TECH-GAPS-2026-04-18.md (drei konkrete Runbooks: Slack-Alert, Stale-Fact, Apollo-429-Eskalation) |

**Skill-Availability-Issues:** Keine. Alle Pflicht-Skills laut Briefing sind im SKILLS-MANIFEST eingetragen und einsatzbereit.

---

## 6. Guardrails-Bilanz

| Guardrail | Eingehalten? |
|---|---|
| 4 PRs mit Prefix [Tech-Gaps] | Ja: PR #23, #24, #25, #26 |
| Zeitbox 4h gesamt | ca. 3h 15min effektiv |
| Pro Task max 1h | Eingehalten |
| Bei Overrun letzten Task streichen | Nicht ausgeloest |
| engineering:code-review vor Merge | In jedem Commit-Body dokumentiert |
| Rollback-Plan pro Task | In jedem PR-Body dokumentiert |
| gh CLI fuer PR-Erstellung | Ja, alle 4 PRs via gh |
| Keine Mutation der 9 gebannten Routes | Ja, alle Aenderungen in lib/ und app/api/observability/ und docs/ |
| Keine Vercel --prod, kein Merge zu main | Ja, alle PRs warten auf Angies Approval |
| Keine DB-Migration-Ausfuehrung | Ja, T3-Endpoint nutzt existierende error_logs Tabelle |

---

**Status:** Tech-Gaps Wave 1 abgeschlossen. 4 PRs mergebar sobald Angie reviewed.
**PR-URLs:**
- T1: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/23
- T2: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/24
- T3: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/25
- T4: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/26
- Docs (dieser): wird unten generiert
