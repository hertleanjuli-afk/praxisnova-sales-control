# Option A Fix - Health-Monitor + vercel.json Cleanup
Datum: 2026-04-16
PR: https://github.com/hertleanjuli-afk/praxisnova-sales-control/pull/21
Branch: `fix/health-monitor-response-logic`
Status: OPEN, nicht gemerged. Wartet auf Angie.

## Pre-Flight Checks durchgefuehrt

- `git log --oneline -5` - main tip `6c8ebe0` (Merge PR #20), clean
- `git status` - clean, auf main gewechselt und `git pull --ff-only`
- `CLAUDE.md` gelesen - Writing-Style-Regeln und neue Skills-Pflicht-Sektion beachtet
- `lib/llm/config.ts` gelesen - 24 Agent-Namen als Referenz

## Skills benutzt

### Skill-Availability-Issues
Die Skills `engineering:debug` und `engineering:architecture` aus der Brief-Pflicht sind **nicht im lokalen Plugin-Ordner**. Wie in `reports/2026-04-16_llm-migration-phase1.md` dokumentiert, fehlt das gesamte `engineering:*` Skill-Verzeichnis unter `~/.agents/skills/` und `~/Desktop/PraxisNovaAI/skills/`.

### Pragmatische Ersatzhandlungen

**engineering:debug (ersatzweise)** fuer A1 Bug-Fix:
1. Reproduziere die Response aus dem Briefing (`{ok:false, healthy:false, issues_found:0}`)
2. Pattern-Match gegen alle 4 Return-Paths in GET - nur 401 und 500 liefern exakt diesen Shape
3. Walk-back durch den try-Block: welche Zeile koennte werfen, die nicht bereits intern gefangen ist?
4. `checkApiReachability` (neu aus #18 yesterday) hat Neon-sql-calls ohne internes try/catch - Kandidat
5. `.rows`-Access in 3 anderen Check-Funktionen - pre-existing Audit-Finding aus gestern, wird mitgefixt

**engineering:architecture (ersatzweise)** fuer A2 Infra-Audit:
- Definiertes Soll: vercel.json-Paths == Route-Dirs
- Diff-Script gegen beide Sets
- Finding: 0 Mismatches (vercel.json ist clean nach #16 Consolidation)

## A1 Health-Monitor Fix

### Was war kaputt
GET `/api/cron/health-monitor` lieferte `{ok:false, healthy:false, issues_found:0}` mit Status 500 im Erfolgsfall.

**Root-Cause**: Neon sql template tag (siehe `lib/db.ts:57`) returned `Promise<Record<string,any>[]>` - also ein direktes Array. Code griff aber auf `.rows` zu (3 Stellen). `.rows` ist `undefined`, `.rows[0]` wirft `Cannot read property '0' of undefined`.

3 Check-Funktionen (`checkRecentErrors`, `checkIncompleteRuns`, `checkMissingRuns`) hatten eigene interne try/catch - sie krashten silently und returned `[]`. Die neue `checkApiReachability` (aus #18 gestern) hatte KEIN eigenes try/catch um den ganzen Loop - wenn die `agent_decisions`-Tabelle nicht existiert oder ein anderer DB-Fehler passiert, warf sie durch, der outer catch in GET fing das ab, und der 500-Response entstand.

### Was geaendert
Zwei Fixes in derselben Datei:

1. **Per-Check-Isolation**: `safeCheck(name, fn)` Wrapper. Jede werfende Check-Funktion wird zu einem Issue im allIssues-Array statt den gesamten Handler zu killen. Partial-Result statt All-or-Nothing.
2. **`.rows` Bug**: 3 Stellen auf direkten Array-Zugriff umgestellt:
   - `checkRecentErrors` line 43
   - `checkIncompleteRuns` line 74
   - `checkMissingRuns` line 114

### Response-Shape nach Fix

Konsistent ueber alle 4 Pfade:

| Situation | Response | Status |
|---|---|---|
| Missing/Invalid Auth | `{ok:false, healthy:false, issues_found:0}` | 401 |
| Alles OK | `{ok:true, healthy:true, issues_found:0}` | 200 |
| N Issues gefunden | `{ok:true, healthy:false, issues_found:N, issues:[...]}` | 200 |
| Outer Catch (sollte nicht mehr) | `{ok:false, healthy:false, issues_found:0}` | 500 |

### Verify-Befehl

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://praxisnova-sales-control.vercel.app/api/cron/health-monitor | jq
```

Erwartung nach Merge + Deploy: `{"ok":true,"healthy":true,"issues_found":0,...}`

Falls immer noch `healthy:false`: das `issues`-Array enthaelt jetzt self-diagnostic Entries mit `agent_name: "check:<name>"` und `error_details` - Angie kann damit weiter debuggen.

## A2 vercel.json Cleanup

### Was war zu pruefen
Brief vermutete non-existent Routes im Schedule. Analyse:

```
vercel.json unique paths: 25
route dirs with route.ts: 27

IN vercel.json but NOT in cron-dir: (keine)
IN cron-dir but NOT in vercel.json: monthly-report, quarterly-report
```

### Verdict: keine Aenderung noetig

Alle 34 Cron-Slots in vercel.json zeigen auf existierende Routes. Keine Leichen.

**Slot-Count unveraendert**:
- Vor diesem PR: 34 Slots
- Nach diesem PR: 34 Slots (keine vercel.json-Aenderung)
- Vercel-Pro-Limit: 40 Slots
- Headroom: 6 Slots

### Nebenbefund (nicht in Scope dieses PRs)
- `monthly-report` Route existiert, aber kein Schedule in vercel.json
- `quarterly-report` Route existiert, aber kein Schedule in vercel.json

Das war schon in `docs/agents/monthly-report.md` und `docs/agents/quarterly-report.md` (aus PR #19) mit `TODO (Angie)`-Markern flagged. Briefing erlaubt kein Agent-Verhalten-Change, also bleibt das als separate Entscheidung fuer Angie.

## Was NICHT angefasst wurde
- Drossel-Logik (`isAlreadyRunning`) - per Brief-Instruktion
- Agent-Verhalten - per Brief-Instruktion
- Config-Files ausser `app/api/cron/health-monitor/route.ts`

## Files geaendert
```
app/api/cron/health-monitor/route.ts  | 36 ++++++++++++++++++++++++++++--------
                                        1 file changed, 28 insertions(+), 8 deletions(-)
```

## Tests
`npm run test:llm` + `npm run test:helpers` weiter gruen (keine Helpers oder LLM-Code angefasst).

Keine neuen Tests fuer A1 - die Check-Funktionen brauchen DB-Mock-Infrastruktur die nicht existiert. Fix ist defensiv (Error-Handling), nicht Logic-Change. Verify-Befehl im Operations-Abschnitt oben.

Kein Test fuer A2 - keine Aenderung.

## Writing-Style
Kein em-dash, kein DACH. Deutsch intern.
