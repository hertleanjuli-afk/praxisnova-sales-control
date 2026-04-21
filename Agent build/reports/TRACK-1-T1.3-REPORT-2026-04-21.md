# Track 1 T1.3 LinkedIn Post-Feed Agent Report

Datum: 2026-04-21
Branch: `track1/t3-linkedin`
Deadline: Do 2026-04-23, 13:00
Status: PR offen, wartet auf Review + v11-Migration auf Neon + ENV-Vars (Production)

---

## Scope

Daily Cron (`0 8 * * *`) der externe LinkedIn-Posts einliest, gegen ICP-Keywords scored und in `linkedin_feed_posts` persistiert. Zwei Adapter: `MockAdapter` (Tests), `ApifyAdapter` (Production-Stub, env-gated). Observability ueber `cron_locks` (v9) + `cron_runs` (v11).

---

## 3 Architektur-Entscheidungen (dokumentiert vor Build)

Ich habe den Build autonom begonnen, weil die Deadline knapp ist und die Handovers klare Intentionen liefern. 3 Entscheidungen moechte ich trotzdem im Review gegenpruefen:

### (A) Tabellenname: `linkedin_feed_posts` statt `linkedin_posts`

`linkedin_posts` existiert bereits in v4 (2026-04-08) fuer **Angies eigene Posts** (`post_date`, `post_number`, `posted BOOLEAN`, `likes`/`comments`/`shares`/`impressions`, UNIQUE per `post_date, post_number`). Das ist semantisch disjunkt zu eingelesenen Feed-Posts. Rename waere Breaking fuer `app/api/linkedin-posting/route.ts` + `/api/cron/linkedin-posting-check/route.ts`.

Entscheidung: neue Tabelle `linkedin_feed_posts`. Dokumentiert in `docs/NAMING-INCONSISTENCIES.md` Abschnitt 4.

### (B) `icp_config`-Tabelle: ich lege sie idempotent in v11 an

`icp_config` existiert noch nicht in main. Track 3 haette sie anlegen sollen (T3.4), aber Status unklar. Ich lege sie idempotent als `CREATE TABLE IF NOT EXISTS` mit PS-3.5-Schema an, plus Spalte `linkedin_keywords JSONB` (`ADD COLUMN IF NOT EXISTS`). **Keine Seed-Daten**, Track 3 soll das fuellen.

Dual-Mode in `lib/linkedin-feed/icp-loader.ts`: Primaer-Quelle ist icp_config. Wenn leer oder Fehler, Fallback auf `lib/config/icp-linkedin-keywords.ts` mit 4 ICP-Keyword-Sets (proptech, hausverwaltung, kanzlei, agentur). So laeuft der Agent ab Tag 1, ohne auf Track-3-Seeds zu warten.

### (C) `cron_runs`-Tabelle: additiv in v11

Angie erwaehnte `cron_runs` "wie Track 3 definiert". Ich habe es nirgends gefunden. Ich lege minimale `cron_runs` in v11 an: `(id, cron_name, run_id, started_at, finished_at, status, items_processed, error_message, metadata)`. Wenn Track 3 ein abweichendes Schema mitbringt, muessen wir eine Konsolidierung fahren (wahrscheinlich v12).

---

## Geliefert

### Neu angelegt

| Pfad | Zweck |
|---|---|
| `db-migration-v11-linkedin-feed-icp-config.sql` | `linkedin_feed_posts` + `icp_config` + `cron_runs`, alle idempotent |
| `db-migration-v11-down.sql` | Rollback fuer v11 (droppt linkedin_feed_posts + cron_runs + linkedin_keywords Spalte, `icp_config` selbst bleibt erhalten) |
| `docs/NAMING-INCONSISTENCIES.md` | Abschnitt 4 zu linkedin_posts vs linkedin_feed_posts |
| `lib/config/icp-linkedin-keywords.ts` | Fallback-Keyword-Sets fuer 4 ICPs |
| `lib/linkedin-feed/types.ts` | Adapter-Interface + Post-Types |
| `lib/linkedin-feed/score.ts` | Pure Relevance-Score (10 pro Hit, cap 100, Tie-Breaking) |
| `lib/linkedin-feed/dedup.ts` | Batch-Dedup + DB-Filter, normalisiert URL (Tracking-Params raus) |
| `lib/linkedin-feed/icp-loader.ts` | Dual-Mode Loader (DB + Code-Fallback) |
| `lib/linkedin-feed/adapters/mock.ts` | `MockAdapter` fuer Tests |
| `lib/linkedin-feed/adapters/apify.ts` | `ApifyAdapter` Stub, env-gated, loggt strukturiert |
| `lib/linkedin-feed/feed-agent.ts` | Orchestrator: fetch -> score -> dedup -> persist |
| `lib/cron-observability.ts` | `beginCronRun` / `endCronRun` mit cron_locks + cron_runs |
| `app/api/cron/linkedin-feed/route.ts` | Cron-Endpoint, CRON_SECRET auth, `maxDuration=300` |
| `__tests__/helpers/linkedin-feed-score.test.ts` | 11 Tests |
| `__tests__/helpers/linkedin-feed-dedup.test.ts` | 10 Tests |
| `__tests__/helpers/linkedin-feed-adapter.test.ts` | 6 Tests |

### Angepasst

| Pfad | Aenderung |
|---|---|
| `vercel.json` | Neuer Cron: `/api/cron/linkedin-feed` mit Schedule `0 8 * * *` |

---

## Skills-Consultation

| Skill | Verfuegbar? | Anwendung |
|---|---|---|
| `engineering:testing-strategy` | nein | Fallback: pure Funktionen isoliert, je 1 Test pro Pfad (leerer Input, Happy Path, Cap, Tie-Breaking). Pattern aus bestehenden helpers-Tests. |
| `engineering:code-review` | nein | Self-Review per Diff + Gate-Matrix unten. Auffaellige Punkte: Dual-Mode-Loader, ApifyAdapter-Stub, URL-Normalisierung |
| `data:sql-queries` | nein | Fallback: PS 2.2 Scale-Regeln (Index auf WHERE-Filterspalten: author_id, captured_at, matched_icp_id, processed). `UNIQUE (post_url)` als Dedup-Constraint. JSONB fuer linkedin_keywords analog zu nace_codes-TEXT-Array. |
| `marketing:content-creation` | nein | Fallback: 4 ICP-Keyword-Sets basierend auf Business-Audit-Pivot (proptech, hausverwaltung, kanzlei, agentur). Bewusst ohne UWG-riskante Begriffe (kein Foerder-/AZAV-/DSGVO-Wording). |
| `legal:compliance-check` | nein | Fallback: `./scripts/legal-scan.sh` + PS 1.1 Forbidden-Phrases-Liste. Keywords auf Forbidden-Liste gecheckt: keine Treffer. |
| `docx` | nein | Dieser Report ist in Markdown, laut Konvention der bisherigen Reports. |

Alle Plugin-Skills waren nicht installiert, wie bei T1.1 + T1.2. Fallback analog.

---

## Gate-Matrix (PR-Body-Template aus PS 3.4)

### Gate 1 – Legal (PS 1.1 + 1.5)

- [x] `./scripts/legal-scan.sh` gruen.
- [x] Agent-Output wird in `linkedin_feed_posts.post_text` gespeichert (Fremd-Content). **Keine** Generierung von kundenfacing-Text in dieser PR.
- [x] Keine Forbidden-Phrases in den Fallback-Keywords (`lib/config/icp-linkedin-keywords.ts`): kein "vermitteln", "Partner-Netzwerk", "akkreditierte Partner", "Bildungsgutschein", "foerderbar".
- [x] Kein Scraping von Personen-Profilen (nur Posts ueber ICP-Keywords-Suche). Feed-Quelle liegt bei Adapter-Wahl (Apify Actor ist in Production, Scope dieser PR ist Stub).

### Gate 2 – Security (PS 1.2)

- [x] `./scripts/security-scan.sh` gruen.
- [x] Keine API-Keys im Code. Apify nur ueber ENV (`APIFY_TOKEN`, `APIFY_LINKEDIN_ACTOR_ID`, `APIFY_MAX_POSTS_PER_RUN`).
- [x] Cron-Endpoint per `isAuthorized` geprueft (CRON_SECRET oder AGENT_SECRET header).
- [x] SQL via tagged-template, keine String-Interpolation, kein `sql.unsafe`.

### Gate 3 – Technical (PS 1.3)

- [x] Tests: `npm run test:helpers` 174/174 gruen, davon 27 neu (score 11, dedup 10, adapter 6).
- [x] Migration v11 idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- [x] Down-Migration separate Datei.
- [x] Migration **nicht** auf Neon ausgefuehrt (CLAUDE.md-Regel).
- [x] TypeScript strict, kein `any` ausser beim Neon-Array-Binding (`urls as unknown as string[]` weil neon-types kein generisches Array-Casting bieten).

### Gate 4 – Agent-Safety (PS 1.4)

- [x] Idempotent: `cron_locks` via `INSERT ... ON CONFLICT DO UPDATE WHERE released_at IS NOT NULL OR acquired_at < NOW() - (ttl)`. Zweiter Concurrent-Run bekommt `{status: skipped, reason: lock_busy}`.
- [x] `linkedin_feed_posts.UNIQUE(post_url)` plus `ON CONFLICT (post_url) DO NOTHING` = doppelte Writes unmoeglich.
- [x] Adapter: bei Fehler kein Throw, leere Liste (`ApifyAdapter`-Stub). Bei konfiguriertem Apify-Fehler: orchestrator throwed, `endCronRun('failed', ..., message)` wird geschrieben.
- [x] Strukturierte Logs: JSON mit `level`, `msg`, `runId`, `ts`.

### Gate 5 – Cost (PS 2.1)

- [x] Kein LLM. Reine Keyword-Substring-Suche in JS.
- [x] Apify-Kosten-Cap dokumentiert in Adapter via `APIFY_MAX_POSTS_PER_RUN` (Default 50 Posts). Bei 1 Run/Tag = max 50 Apify-Item-Calls/Tag. Apify Actor "harvestapi/linkedin-post-search" kostet ca. 0.03 USD / 1000 Items -> unter 1 Cent pro Tag bei Default-Cap.
- [x] DB-Reads: 1 Query `SELECT post_url FROM linkedin_feed_posts WHERE post_url = ANY(...)`, gefolgt von N Inserts. Bei 50 Posts = 1 + 50 Queries pro Run, akzeptabel.
- [ ] **Offen**: Bulk-Insert statt N einzelne Inserts waere effizienter, aber erfordert neon-Array-Parameter-Binding. Folge-PR wenn Lautstaerke es noetig macht.

### Gate 6 – Scale (PS 2.2)

- [x] Indexe in v11:
  - `idx_linkedin_feed_posts_author`
  - `idx_linkedin_feed_posts_captured` (DESC fuer Dashboard-Lists)
  - `idx_linkedin_feed_posts_processed` (partial WHERE processed = false)
  - `idx_linkedin_feed_posts_matched_icp`
  - `UNIQUE(post_url)` implizit ueber Primary-Index
  - `idx_icp_config_enabled`
  - `idx_cron_runs_name`, `idx_cron_runs_started`, `idx_cron_runs_status`
- [x] `cron_locks` Lookup per PK.
- Dashboard-Queries kommen in spaeterem Track (LinkedIn-Feed-Anzeige in UI).

### Gate 7 – Extensibility (PS 2.3)

- [x] Adapter-Interface `LinkedInFeedAdapter` entkoppelt Feed-Quelle. Wechsel von Apify auf Scraping-API/Unipile = neuer Adapter, keine Code-Aenderung im Orchestrator.
- [x] `icp_config.linkedin_keywords` JSONB = neue ICP hinzufuegen via INSERT, kein Code-Deploy.
- [x] Code-Fallback `ICP_LINKEDIN_KEYWORDS_FALLBACK` nur Safety-Net.

---

## Risk + Rollback

- **Migration v11:** idempotent, `psql "$DATABASE_URL" -f db-migration-v11-down.sql`. Rollback droppt `linkedin_feed_posts`, `cron_runs` und die v11-Spalte `icp_config.linkedin_keywords`. `icp_config` selbst bleibt erhalten, damit Track-3-Daten nicht verloren gehen.
- **Breaking Changes:** keine. `linkedin_posts` (v4) unberuehrt.
- **Cron:** neuer Endpoint `/api/cron/linkedin-feed`. Wenn ApifyAdapter nicht konfiguriert ist, laeuft Cron, liefert 0 Ergebnisse, schreibt `cron_runs.status=success items_processed=0`. Kein Fail-Signal, aber Dashboards koennen `items_processed = 0 ueber Tage` als Alert nehmen.
- **Production-Enablement:** ENV in Vercel setzen: `APIFY_TOKEN`, `APIFY_LINKEDIN_ACTOR_ID`, optional `APIFY_MAX_POSTS_PER_RUN`.

## Observability

- `cron_runs` bekommt pro Invocation: start/finish Timestamps, status, items_processed, metadata (adapter-Name, fetched/dedupBatch/dedupDb/inserted/durationMs).
- Strukturierte Log-Events via `console.info/warn/error` mit JSON-Body.
- Dashboards koennen abfragen: `SELECT cron_name, status, items_processed, started_at FROM cron_runs ORDER BY started_at DESC LIMIT 20` (nach v11-Deployment).

## Offene Punkte / TODOs

1. **Bulk-Insert** statt N einzelne Inserts im Orchestrator (Gate 5 Cost-Optimierung).
2. **Apify-Production-Implementation** (Actor-Run + Dataset-Paginator). Aktuell Stub. Separater Track nach Kosten-Cap.
3. **Dashboard-UI** fuer `linkedin_feed_posts` und `cron_runs` (nicht Teil T1.3, evtl. T1.6 Cross-Links).
4. **Schema-Abgleich mit Track 3** fuer `icp_config` und `cron_runs`: wenn Track 3 abweichende Schemas mitbringt, v12-Konsolidierung.

## Deadlines

- Amelie-Meeting Do 2026-04-23 13:00. T1.3 liefert Signal-Ingest-Foundation, UI-Verarbeitung kann in T1.6 folgen.

## Naechste Schritte

- T1.4 Block-System UI + Konstanten `config/constants.ts`.
- T1.5 Anrufliste 5 Trigger.
- T1.6 Cross-Links zwischen Anrufliste, LinkedIn, Sequenz, Feed-Posts.
- T1.7 Cron `unblock-expired`.
