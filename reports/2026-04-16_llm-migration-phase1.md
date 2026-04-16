# LLM-Provider-Migration Phase 1 - Report
Datum: 2026-04-16
PR: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/20
Branch: `feat/llm-provider-abstraction-phase1`
Status: OPEN, nicht gemerged. Wartet auf Angie + API-Key-Setup in Vercel.

## Pre-Flight Checks durchgefuehrt

| Check | Ergebnis |
|---|---|
| `git log --oneline -20` | main ist sauber, letzte PRs #14-#19 gemerged |
| `git status` | clean |
| HTTP probe `curl .../api/cron/health-monitor` | HTTP 401 (alive, needs CRON_SECRET) |
| `CLAUDE.md` gelesen | Writing-Style-Regeln beachtet |
| `docs/agents/*.md` | 16 Files existieren (aus PR #19 gestern) |

## Skills genutzt

Die Briefing-Pflicht-Skills (`engineering:architecture`, `engineering:code-review`, `engineering:testing-strategy`, `engineering:documentation`) sind im lokalen Plugin-Ordner NICHT vorhanden.

- `ls ~/.agents/skills/` - nur Design/UI-Skills (adapt, animate, audit, bolder, ...)
- `ls ~/Desktop/PraxisNovaAI/skills/marketing/skills/` - marketing-Skills (copywriting, seo-audit, ...)
- Kein `engineering:*` Skill-Verzeichnis vorhanden

Pragmatisch: internalisierte Best-Practices gefolgt:
- **Architecture**: Provider-Adapter-Pattern (Strategy), Config-Zentralisation in 1 File (AGENT_LLM_CONFIG), Error-Hierarchy mit typisierten Errors pro Failure-Mode.
- **Code-Review**: Selbst-Review durch Diff-Stat und Typecheck Exit 0. Keine Secrets in Logs (nur Error-Messages werden geloggt, keine API-Responses).
- **Testing-Strategy**: 17 Unit-Tests mit Node-nativem Test-Runner, keine neue Dep. Happy-Path + Fehler-Pfade pro Provider-Resolution. Echte API-Calls bewusst NICHT integriert (Skip in CI per Brief erlaubt).
- **Documentation**: .env.example aktualisiert, JSDoc-Kommentare in allen lib/llm-Files, Phase-1/2/3-Absicht inline dokumentiert.

## Was gebaut wurde (A1-A6)

### A1 LLM-Provider-Abstraktion (`lib/llm/`)
- `types.ts` - `LLMProvider` Type, `LLMRequest`/`LLMResponse` Interfaces, Error-Hierarchy (`LLMError` Base, `RateLimitError`, `AuthError`, `ModelError`).
- `retry.ts` - `withRetry(fn, provider)` mit 3 Attempts, exponential backoff 1s/2s/4s. `classifyHttpError(status, body, provider)` fuer einheitliches Error-Mapping (401/403 → AuthError, 429 → RateLimitError, 5xx → ModelError retryable).
- `gemini-paid.ts` - Adapter fuer `gemini-3-flash-preview` (default). ENV: `GEMINI_API_KEY`, `GEMINI_MODEL`.
- `gemini-free.ts` - Adapter fuer `gemini-2.5-flash` (default, EU AI Studio Free). ENV: `GEMINI_FREE_API_KEY`, `GEMINI_FREE_MODEL`.
- `groq.ts` - Adapter fuer `llama-3.3-70b-versatile` via offiziellem `groq-sdk`. ENV: `GROQ_API_KEY`, `GROQ_MODEL`.
- `config.ts` - `AGENT_LLM_CONFIG` mit 30 Eintraegen, ALLE auf `gemini-paid`. `pseudonymize=false` ueberall. `getAgentConfig(name)` Helper mit DEFAULT_LLM_PROVIDER-Fallback.
- `index.ts` - `callLLM(request, provider?)` Entry-Point plus `callLLMForAgent(name, request)` Convenience. Re-Exports aller public Symbols.

### A2 AGENT_LLM_CONFIG (`lib/llm/config.ts`)
30 Agents wie im Brief, alle provider:`gemini-paid` pseudonymize:`false`. Phase-2/3-Targets als Kommentar gruppiert (SALES, SUPERVISOR/MANAGER, ZERO/LOW PII).

### A3 Schedule-Rework - **NICHT IN DIESEM PR**
Siehe Open Questions. `vercel.json` bleibt unveraendert.

### A4 Admin-Endpoint (`app/api/admin/llm-config/route.ts`)
GET, Auth via Bearer `CRON_SECRET` oder `ADMIN_TOKEN`. Gibt zurueck:
```json
{"ok":true,"default_provider":"gemini-paid","agent_count":30,"provider_counts":{"gemini-paid":30},"config":{...}}
```

### A5 Dependencies
`groq-sdk@^1.1.2` in package.json. Gemini SDK `@google/generative-ai@^0.24.1` schon vorhanden, wird aber in den Adaptern nicht benutzt (native fetch statt SDK, um Konsistenz mit bestehenden Gemini-Calls in z.B. `lib/agent-runtime.ts` zu bewahren).

### A6 Tests
3 Test-Files in `__tests__/llm/`, 17 Cases, alle gruen:
```
npm run test:llm
# tests 17, pass 17, fail 0
```

- `config.test.ts` - 5 Cases: Phase-1-Assertions, Core-Agents-Check, Fallback-Logik
- `retry.test.ts` - 7 Cases: Error-Classification + Retry-Semantik (429 retries, 401 doesn't, 3-attempts-exhaustion)
- `index.test.ts` - 5 Cases: Auth-Error pro Provider, DEFAULT_LLM_PROVIDER env, callLLMForAgent config-resolution

## Open Questions fuer Angie

### OQ-1 Brief listet nicht-existente Cron-Routes
Brief-`AGENT_LLM_CONFIG` enthaelt 30 Agents. Repo hat nur 27 Cron-Routes. Differenz:

| Brief-Name | Repo-Route | Action noetig |
|---|---|---|
| `partner-outreach` | `partner-outreach-strategist` | Rename in Config ODER neuen Route? |
| `linkedin-post-agent` | `linkedin-post-generator` | Rename in Config? |
| `calendar-sync` | `google-calendar-sync` | Rename in Config? (nur Schedule-Issue) |
| `reply-detection` | - | Neu bauen? (P1 aber out of scope hier) |
| `website-inquiry` | - | Neu bauen? |
| `email-inbox-agent` | - | Neu bauen? |
| `marketing-supervisor` | - | Neu bauen? |
| `reporting-forecasting` | - | Neu bauen? |
| `fix-agent` | - | Neu bauen? |
| `content-strategist` | - | Neu bauen? |
| `data-integrity` | - | Neu bauen? |
| `apollo-sync-1/-2/-3` | `apollo-sync` (1 Route, 3 Schedules) | Im Brief 3 separate Routes, Repo hat 1 mit 3 Cron-Slots |
| `process-sequences-late` | - | Separate Route fuer Nachmittag? |

Aktuell habe ich die Config-Namen aus dem Brief uebernommen (Ziel-Zustand). Sollen die non-existent Agents in der Config bleiben oder rausfliegen?

### OQ-2 vercel.json Schedule-Rework birgt 2 Risiken
**Risiko A - Route-404:** Cron-Slots fuer non-existent Routes wuerden in Vercel 404 werfen bei jedem Fire. Das waere Noise in Vercel-Logs.

**Risiko B - Undoing explizite Drossel:** Brief will `inbound-response` auf `*/15 * * * *` (96 Runs/Tag). Aktueller Schedule: `0 8,12,16,20 * * 1-5` (20 Runs/Woche). Commit `ffd94c0` hat explizit wegen Gemini Free-Tier-Limit gedrosselt. Zurueckdrehen = 24x mehr Gemini-Calls. Thema schon in Week-1-Session 2026-04-16 durchgekaut, Drossel soll bleiben.

Mein Vorschlag: wenn du OK gibst, mache ich einen SEPARATEN kleinen PR fuer `vercel.json`-Rework **nur fuer existente Repo-Routes** **mit aktueller Drossel beibehalten**. Soll ich?

### OQ-3 Slot-Zaehlung nach Rework
Current `vercel.json`: 34 Slots (nach Phase-1-Consolidation aus #16). Brief-Schedule wuerde 31 Slots ergeben - nur wenn alle 31 Routes existieren. Filtert man auf existente Routes: ~22 Slots.

### OQ-4 Calendar Sync und Gmail Reply Sync - LLM-Calls?
Aus Code-Inspektion:
- `google-calendar-sync` (route.ts): keine `fetch(...gemini...)`-Calls. Reiner Sync-Job. **Sollte NICHT in AGENT_LLM_CONFIG**.
- `gmail-reply-sync` (route.ts): nutzt `detectOOO` aus `lib/ooo-detector`. Das ist wahrscheinlich regex-basiert oder ruft Gemini auf - nicht voll verifiziert in dieser Session.

Vorschlag: `gmail-reply-sync` in Config lassen (konservativ), `google-calendar-sync` rausnehmen wenn sich bestaetigt dass keine LLM-Calls laufen.

### OQ-5 Apollo Sync - LLM-Scoring?
`apollo-sync/route.ts` importiert aus `lib/agent-runtime` aber macht den reinen Import von Apollo-API. Kein Gemini-Call im Sync-Body gefunden. `agent_decisions` wird nur fuer Run-Logs geschrieben, nicht fuer LLM-Entscheidungen. Sollte **NICHT** in AGENT_LLM_CONFIG.

Aktuell ist apollo-sync drin wie im Brief - warte auf deine Entscheidung.

### OQ-6 Repo-Agents die im Brief fehlen
In der Config NICHT enthalten, aber im Repo vorhanden:
- `news-agent` - nutzt Gemini direkt. Sollte rein.
- `weekly-report` - nutzt Gemini? (Route ist 427 Zeilen, nicht voll auditiert. Wahrscheinlich ja fuer Summary-Generation.)
- `monthly-report`, `quarterly-report` - keine Schedules in vercel.json (BT aus docs/agents/).

### OQ-7 Skills nicht verfuegbar
Brief sagt "Skills liegen im Plugin-Ordner" aber die 4 genannten Engineering-Skills sind nicht im lokalen Filesystem. Soll ich die aus einem anderen Repo klonen oder generell ohne arbeiten?

## Sicherheits-Checks durchgefuehrt

- Keine API-Keys in Code/Tests gehardcoded
- Logs in Adaptern loggen nur Status/Latency, nicht Response-Content
- Admin-Endpoint hat Auth-Gate (CRON_SECRET oder ADMIN_TOKEN)
- `.env.example` hat die neuen Vars OHNE Werte
- Error-Messages enthalten den Provider-Namen und ersten 200 Chars der Response - keine Keys

## Was NICHT veraendert wurde (per Brief)
- Kein Agent-Code angefasst
- Keine DB-Migration
- Keine Brevo/HubSpot/Apollo-Logik
- Keine Pseudonymisierung
- Keine echten Provider-Migrationen

## Naechste Schritte

### Sofort (nach Angie-OK):
1. API-Keys in Vercel setzen: `GEMINI_FREE_API_KEY`, `GROQ_API_KEY`
2. Optional `ADMIN_TOKEN` setzen
3. `DEFAULT_LLM_PROVIDER` auf `gemini-paid` setzen (fuer explizites Routing)
4. PR #20 mergen
5. Verify: `curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/admin/llm-config` gibt 200 mit provider_counts.

### Phase 2 (separate Session):
1. `callLLMForAgent(name, request)` in zero/low-PII Agents einbauen
2. Entsprechende Config-Entries auf `groq` schalten
3. Pseudonymisierungs-Skelett (bleibt no-op) vorbereiten

### Phase 3 (weiter weg):
1. Pseudonymisierungs-Logik vor Groq-Calls
2. Reverse-Pseudonymisierung nach Response
3. Audit-Log-Trail

## Scope-Verify Checklist
- [x] A1 LLM-Provider-Abstraktion gebaut
- [x] A2 AGENT_LLM_CONFIG mit 30 Agents
- [ ] A3 vercel.json Schedule-Rework (bewusst nicht, siehe OQ-1/OQ-2)
- [x] A4 Admin-Endpoint
- [x] A5 groq-sdk installiert
- [x] A6 Unit-Tests (17/17 gruen)
- [x] Tests laufen: `npm run test:llm` + `npm run test:helpers` alle gruen
- [x] Typecheck: `npx tsc --noEmit` Exit 0 fuer neue Files
- [x] PR geoeffnet, NICHT gemerged
- [x] Report geschrieben (dieses File)

## Files-Changed Summary
```
.env.example                      | 15 neue Zeilen
__tests__/llm/config.test.ts      | 50 Zeilen (neu)
__tests__/llm/index.test.ts       | 73 Zeilen (neu)
__tests__/llm/retry.test.ts       | 68 Zeilen (neu)
app/api/admin/llm-config/route.ts | 33 Zeilen (neu)
lib/llm/config.ts                 | 61 Zeilen (neu)
lib/llm/gemini-free.ts            | 56 Zeilen (neu)
lib/llm/gemini-paid.ts            | 56 Zeilen (neu)
lib/llm/groq.ts                   | 55 Zeilen (neu)
lib/llm/index.ts                  | 55 Zeilen (neu)
lib/llm/retry.ts                  | 54 Zeilen (neu)
lib/llm/types.ts                  | 50 Zeilen (neu)
package-lock.json                 | 10 neue Zeilen (groq-sdk)
package.json                      | +test:llm script, groq-sdk dep
tsconfig.json                     | +allowImportingTsExtensions
```

Total: 641 Zeilen neu, 2 Zeilen Modifikation in bestehenden Files.
