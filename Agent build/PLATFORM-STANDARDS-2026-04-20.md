# PraxisNova AI, Platform-Standards V1

Erstellt: 2026-04-20
Gueltig ab: sofort, fuer alle Builds/Prompts/Agenten
Pruef-Intervall: alle 30 Tage, oder bei groesserem Release
Verantwortlich: Angie (Freigabe) + Claude Code (Enforcement)

Diese Datei ist die Pflichtreferenz fuer JEDEN zukuenftigen Claude-Code-Prompt, Agenten-Build und Website-Change. Jeder Prompt MUSS auf dieses Dokument verweisen, jeder PR MUSS die Auto-Check-Sektion durchlaufen haben.

## Index

- Teil 1: Must-Have Gates vor jedem PR (Legal, Security, Tests)
- Teil 2: Cost + Scale + Extensibility
- Teil 3: Anhang (Skills-Workflow, Forbidden-Phrases, DSGVO-Templates, Auto-Check-Scripts)

---

## TEIL 1: Must-Have Gates vor jedem PR

### 1.1 Legal Compliance Gate (BLOCKER)

Jeder PR, der Kunden-facing Content oder Outreach beruehrt, MUSS durch diesen Scan.

**Forbidden-Phrases (hart):** diese Woerter/Claims duerfen nicht in Produktion, solange keine Nachweise/Zertifizierungen vorhanden sind:

- "bis X% foerderbar" (nur mit go-digital/uWM/AZAV Autorisierungs-Nachweis)
- "Bildungsgutschein" als primaeres Verkaufsargument (nur wenn AZAV-zertifiziert)
- "garantierter ROI", "garantierte Ergebnisse", "100% sicher"
- "Testsieger", "Nr. 1", "Marktfuehrer" (nur mit Studien-Nachweis)
- "kostenlos" ohne Disclaimer zu Folgeaufwand
- "Pilot-Kunden", "Pilot-Programm", "Beta" (neue Firma, keine Pilot-Phase mehr)
- "Autopilot-Abo" als Hauptangebot (nur fuer Bestandskunden)
- konkrete Namen von Foerderprogrammen als Zahlung-erwarten-Signal
- "DSGVO-konform" ohne dass tatsaechlich Audit/Rechtscheck vorliegt
- "ISO 27001", "SOC 2" ohne Zertifikat

**Erlaubte Ersatz-Formulierungen fuer Foerder-Thema:**

- "Wir beraten zu Foerdermoeglichkeiten im Potenzial-Check"
- "Fuer passende Foerderprogramme vermitteln wir einen akkreditierten Partner"
- "Wir pruefen gemeinsam welche Foerderung fuer Sie in Frage kommt"
- "Foerderung ist programm- und betriebs-individuell, wir geben Orientierung"

**Pflichtangaben pro Landing Page / Formular:**

- Impressum-Link sichtbar (nicht nur Footer-Pixel)
- Datenschutzerklaerung-Link
- Bei Formularen: DSGVO-Checkbox, Zweckbindung, Speicherdauer
- Bei Bestellung: Widerrufsbelehrung fuer Verbraucher (B2C), bei B2B klar dokumentiert dass B2B
- Bei Newsletter: Double-Opt-In
- AGB-Link bei kostenpflichtigen Buchungs-Flows

**UWG-Check (unlauterer Wettbewerb):**

- Keine Abwertung von Wettbewerbern namentlich ohne Beleg
- Keine Irrefuehrung ueber wesentliche Eigenschaften (Preis, Foerderung, Lieferzeit)
- Preisangaben brutto und mit MwSt.-Hinweis
- "ab X Euro" nur wenn mindestens 1 Angebot zu diesem Preis existiert
- "Statt X Euro, jetzt Y Euro" nur bei echter vorheriger Gueltigkeit

**DSGVO-Check bei Outreach:**

- Rechtsgrundlage dokumentiert (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse fuer B2B-Cold-Outreach)
- Widerspruchsmoeglichkeit klar und in jeder Email
- Speicherdauer definiert (Standard: 36 Monate fuer kommerziell-relevante Kontakte, sonst loeschen)
- Datenherkunft dokumentiert (Apollo-Export-Protokoll behalten)
- Datenschutzhinweis bei Erstkontakt ("Woher wir Ihre Daten haben, wie wir sie verarbeiten, Widerspruchsrecht")

**AUTO-CHECK-Regel:**

Claude Code muss vor jedem PR folgendes Script laufen lassen:
```bash
scripts/legal-scan.sh
```
Das Script grept nach den Forbidden-Phrases im geaenderten Content. Treffer = PR blockiert bis Angie Override gibt.

**Wenn du als Claude Code das Script nicht findest, erstelle es**. Template in Anhang 3.1.

### 1.2 Security-Gate (BLOCKER)

- Keine Secrets im Code (API-Keys, Tokens, DB-URLs, Credentials)
- `.env*` in `.gitignore`
- Committed-Secret-Scan vor jedem PR (gitleaks oder `git secrets`)
- Vercel-Env-Vars nur via Dashboard, nicht hardcoded
- Nach jedem Security-Incident: Rotation laut `project_vercel_security_rotation_2026-04-20.md`
- DB-Zugriffe gehen ueber RLS oder App-Layer-Guards, nie direkt mit Admin-Keys im Client
- CORS-Header pruefen (nicht `Access-Control-Allow-Origin: *` in Production)
- Webhook-Handler: Signaturpruefung (Apollo, Brevo, Stripe) Pflicht
- Rate-Limiting auf allen Public-Endpoints

**AUTO-CHECK:**

```bash
scripts/security-scan.sh
```
Faellt zurueck auf `gitleaks detect --no-git` wenn vorhanden, sonst Grep-Regex auf gaengige Secret-Patterns.

### 1.3 Technische Qualitaets-Gates (BLOCKER)

Jeder PR MUSS diese Checks bestanden haben:

- TypeScript compiles strict, `any`-Anteil im Diff = 0
- Tests gruen (vorhandene + neue). Neue DB/API-Funktion ohne Test = Block
- Lint + Format sauber
- Build succeeds lokal UND im CI
- Migrations reversibel (up + down funktionieren)
- API-Breaking-Changes erfordern Version-Bump oder Adapter-Schicht
- Keine console.log in Production-Code (Logger verwenden)

**AUTO-CHECK: scripts/preflight.sh**
```bash
#!/usr/bin/env bash
set -euo pipefail
npm run type-check
npm run lint
npm run test -- --run
npm run build
scripts/legal-scan.sh
scripts/security-scan.sh
echo "PREFLIGHT GREEN"
```
Claude Code MUSS dieses Script vor jedem Merge laufen lassen, exit 0 = go.

### 1.4 Agenten-Safety-Standards (BLOCKER fuer Agenten)

Jeder Agent der schreibt (DB, Apollo, Brevo, externe APIs) muss:

**Idempotency:**
- Idempotency-Key auf jeder Schreib-Operation (Uuid aus `lead_id + operation + date`)
- DB-Tabelle `agent_operations_log` mit Unique-Constraint verhindert Doppel-Writes
- Apollo-API: `X-Idempotency-Key` Header wo unterstuetzt

**Retry-Strategie:**
- Exponential-Backoff: 1s, 4s, 16s, dann Dead-Letter
- Max 3 Retries pro Operation
- 4xx-Errors (ausser 408/429): NICHT retryen, direkt in Dead-Letter
- 5xx-Errors + 429: retryen mit Backoff

**Circuit-Breaker:**
- Pro externer API: 5 Errors in 60s = Circuit open fuer 5 Min
- Health-Check-Endpoint pro Agent-Run

**Rate-Limit-Awareness:**
- Apollo: hard-cap 600 requests/min, soft-cap 400 fuer Safety
- Brevo: 10 pro Sekunde
- LLM: Token-Budget pro Agent-Run dokumentiert
- Logging: jedes Mal bei >80% Budget-Auslastung Alert

**Observability:**
- Strukturierte Logs (JSON) mit `correlation_id`, `agent_name`, `lead_id`, `step`
- Metriken pro Agent: Runs, Successes, Failures, Avg-Duration, Token-Spend
- Dead-Letter-Queue in Tabelle `agent_dead_letter` mit `retry_manual` Flag

**Graceful-Degradation:**
- Wenn Apollo down: Lead wird nicht verloren, sondern `status = pending_apollo` und in naechstem Run retried
- Wenn LLM-API down: Rule-based Fallback fuer Trivialfaelle (icp_score aus nace_code)

**AUTO-CHECK:**
```bash
scripts/agent-audit.sh <agent-folder>
```
Prueft: Idempotency-Key im Code, Retry-Config, Logger-Verwendung, Dead-Letter-Write bei Fail.

### 1.5 DSGVO + Datenhygiene (BLOCKER bei Lead-Daten)

- Leads-Tabelle hat `data_source`, `data_collected_at`, `legal_basis`, `retention_until`
- Cron: `retention-cleanup` laeuft taeglich, loescht Leads mit `retention_until < now()`
- Opt-Out-API: `POST /api/privacy/opt-out` mit Email -> loescht aus Apollo + Brevo + DB (oder marked `opted_out = true`)
- Auskunftsanfragen-Handler: `POST /api/privacy/access-request` -> JSON-Export
- Datenschutzhinweis-Template in jeder Cold-Email

---

## TEIL 2: Cost + Scale + Extensibility

### 2.1 Cost-Efficiency-Regeln

**Model-Routing (Claude/Gemini):**

Pro Use-Case das kleinste Model, das die Qualitaet liefert:

| Use-Case | Default-Model | Escalate wenn |
|---|---|---|
| Icp-Scoring einzelner Lead | Haiku 4.5 / Gemini-Flash | Ergebnis unsicher (confidence <0.7) |
| Email-Draft Sequenz-Step | Haiku / Gemini-Flash | Hoch-Wert-Lead (icp_score >85) |
| Agent-Strategie-Entscheidung | Sonnet 4.6 / Gemini-Pro | Nie escalieren, Budget-Cap |
| LinkedIn-Post-Draft (Batch) | Haiku | Pro Woche 1x Sonnet-Review |
| Call-Summary / Transcript | Haiku | Nie, ausreichend |

**Prompt-Caching:**

- Systemprompts + skill-Content in `cache_control: ephemeral` packen (Anthropic)
- Gemini: `cachedContent` API fuer System-Prompts >1024 Tokens
- Pro Agent-Run: System-Prompt darf nur 1x abgerechnet werden, nicht N-mal

**Batching:**

- Apollo: `/people/bulk_enrich` statt N `enrich`-Calls (erspart 80% Kosten)
- Brevo: Batch-Send statt einzelne Sends
- DB: Bulk-Insert statt N Inserts (Neon: `INSERT ... VALUES (...), (...), ...`)
- LLM: wo sinnvoll Batch-API (Anthropic Message-Batches: 50% Rabatt)

**Dedup + Cache:**

- Lead-Enrichment: `enriched_at < 30d` -> nicht nochmal enrichen
- Icp-Scoring: `nace_code` nicht geaendert -> Score aus Cache (DB-Spalte, nicht erneut LLM)
- Company-Info: 90d TTL in `companies`-Tabelle

**Cron-Dedup (gegen parallele Runs):**

- `isAlreadyRunning`-Lock in DB-Tabelle `cron_locks`
- Lock mit TTL (5 Min nach Start), automatisch freigegeben bei Ende
- Beobachtet in Memory `reference_vercel_cron_debugging.md`

**Token-Budget pro Agent:**

In jedem Agent-Code: `MAX_TOKENS_PER_RUN = 50000` (oder use-case-spezifisch). Ueberschreitung -> Abbruch + Alert.

### 2.2 Skalierbarkeits-Patterns

**Queue-First:**

- Webhooks + User-Form-Submits geben 200 zurueck, Arbeit landet in Queue
- Worker-Agent verarbeitet Queue asynchron
- Neon: `pg_boss` oder Supabase-Equivalents. Minimal-Fallback: Tabelle `job_queue` mit Cron-Worker.

**DB-Indexes:**

- Auf jede Foreign-Key-Spalte
- Auf jede `WHERE`-kritische Spalte (Status-Enums, `ready_to_contact`, `icp_score`)
- Composite-Indexe fuer haeufige Query-Kombos
- Regel: jede neue Query mit `EXPLAIN ANALYZE` pruefen

**Connection-Pooling:**

- Neon-Pooler verwenden (nicht direct connection in Serverless-Context)
- Drizzle/Prisma: `postgres`-Treiber mit Pool-Config

**Pagination:**

- Default 50 pro Seite, max 200
- Cursor-based statt Offset bei >10k Rows

**Sync vs. Async:**

- Synchron nur was User direkt braucht (API-Reads)
- Alles schreib-intensive oder LLM-basierte: async via Queue

**Horizontal scaling Vorbereitung:**

- Agents stateless, State in DB
- Keine In-Memory-Caches die Korrektheit beeinflussen
- Feature-Flags pro Agent (an/aus ohne Deploy)

### 2.3 Extensibility-Regeln

**Config-over-Code:**

- Neue ICP = neuer Row in `icp_config` Tabelle, nicht neuer Agent
- Sequenzen-Logik datengesteuert (JSON in DB), nicht hardcoded
- Prompts in DB oder YAML, mit Version-History

**Interface-Layer fuer External-Services:**

- `IApolloClient`, `IEmailProvider`, `ILlmClient` als TypeScript-Interfaces
- Konkrete Impls austauschbar (Apollo -> Clay, Brevo -> Postmark, etc.)
- Tests laufen gegen Mock-Impl

**Feature-Flags:**

- `lib/flags.ts` mit `isEnabled(flagName, context)`
- Pro Flag: DB-Eintrag `feature_flags` (name, enabled, rollout_pct, target_icp)
- Neue Agenten starten mit Flag = `false` und `rollout_pct = 0`

**Skill-Pattern:**

- Neue faehigkeit = neuer Skill-Ordner in `~/Desktop/PraxisNovaAI/skills/<skill>/SKILL.md`
- Nicht als monolithischer Prompt-Wildwuchs
- Jeder Agent nennt in seinem System-Prompt die genutzten Skills

**Magic-Numbers verbieten:**

- Konstanten in `config/constants.ts`
- Keine `3600 * 24 * 30` inline, sondern `RETENTION_DAYS`

**One-Agent-One-Responsibility:**

- Outreach-Strategist macht NUR Sequenz-Zuweisung
- Content-Scheduler macht NUR LinkedIn-Draft
- Kein Agent der "alles" macht

---

## TEIL 3: Anhang

### 3.1 Auto-Check-Script-Templates

Claude Code muss diese Skripte anlegen wenn nicht vorhanden. Alle in `scripts/`:

**scripts/legal-scan.sh:**
```bash
#!/usr/bin/env bash
set -euo pipefail
FORBIDDEN=(
  "bis 80% foerderbar"
  "bis 80% förderbar"
  "bis zu 80% foerderbar"
  "Bildungsgutschein"
  "garantierter ROI"
  "garantierte Ergebnisse"
  "100% sicher"
  "Testsieger"
  "Pilot-Kunden"
  "Pilot-Programm"
  "Autopilot-Abo fuer alle"
  "DSGVO-konform"
)
FAIL=0
for phrase in "${FORBIDDEN[@]}"; do
  if git diff --cached --unified=0 | grep -i "$phrase" >/dev/null 2>&1; then
    echo "LEGAL-BLOCK: '$phrase' im Diff gefunden"
    FAIL=1
  fi
done
if [ "$FAIL" -eq 1 ]; then
  echo "Legal-Scan failed. Entferne verbotene Phrasen oder hole Angie-Override."
  exit 1
fi
echo "LEGAL-SCAN GREEN"
```

**scripts/security-scan.sh:**
```bash
#!/usr/bin/env bash
set -euo pipefail
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --no-git --source . --exit-code 1
else
  PATTERNS=(
    'AKIA[0-9A-Z]{16}'
    'sk-[A-Za-z0-9]{32,}'
    'ghp_[A-Za-z0-9]{36}'
    'ntn_[A-Za-z0-9]{32,}'
    'postgres://[^[:space:]]*:[^[:space:]]*@'
  )
  FAIL=0
  for p in "${PATTERNS[@]}"; do
    if git diff --cached | grep -E "$p" >/dev/null 2>&1; then
      echo "SECURITY-BLOCK: Secret-Pattern im Diff: $p"
      FAIL=1
    fi
  done
  [ "$FAIL" -eq 1 ] && exit 1
fi
echo "SECURITY-SCAN GREEN"
```

**scripts/preflight.sh:**
```bash
#!/usr/bin/env bash
set -euo pipefail
echo "== TYPE-CHECK =="
npm run type-check
echo "== LINT =="
npm run lint
echo "== TEST =="
npm run test -- --run
echo "== BUILD =="
npm run build
echo "== LEGAL =="
bash scripts/legal-scan.sh
echo "== SECURITY =="
bash scripts/security-scan.sh
echo "PREFLIGHT GREEN"
```

**scripts/agent-audit.sh:**
```bash
#!/usr/bin/env bash
set -euo pipefail
AGENT_DIR="$1"
FAIL=0
grep -r "idempotencyKey\|idempotency_key" "$AGENT_DIR" >/dev/null || { echo "NO IDEMPOTENCY in $AGENT_DIR"; FAIL=1; }
grep -r "retry\|backoff" "$AGENT_DIR" >/dev/null || { echo "NO RETRY LOGIC in $AGENT_DIR"; FAIL=1; }
grep -r "logger\|log\\.info\|log\\.error" "$AGENT_DIR" >/dev/null || { echo "NO LOGGER in $AGENT_DIR"; FAIL=1; }
grep -r "dead_letter\|deadLetter" "$AGENT_DIR" >/dev/null || { echo "NO DEAD-LETTER in $AGENT_DIR"; FAIL=1; }
[ "$FAIL" -eq 1 ] && exit 1
echo "AGENT-AUDIT GREEN for $AGENT_DIR"
```

### 3.2 Skill-Workflow (Wiederholung fuer Claude Code)

Pfad: `~/Desktop/PraxisNovaAI/skills/`

Schritt 1: `ls ~/Desktop/PraxisNovaAI/skills/`
Schritt 2: Lies `~/Desktop/PraxisNovaAI/CLAUDE.md` + `CLAUDE-CODE-PROMPTS.md` falls vorhanden
Schritt 3: Lies `SKILL.md` in allen relevanten Unterordnern BEVOR du anfaengst
Schritt 4: Wende die Skill-Inhalte an, dokumentiere im PR-Body

Bei Errors + Debugging IMMER:
1. Code lesen (genannte Datei komplett)
2. git log fuer die Datei pruefen
3. Fehlertext analysieren
4. DANN Hypothese + Fix, nie direkt raten

### 3.3 DSGVO-Templates fuer Cold-Outreach

**Footer fuer B2B-Cold-Email (DE):**

```
Diese E-Mail richtet sich an Sie als Ansprechpartner in Ihrer Funktion bei {{company}}. Ihre Daten haben wir aus oeffentlichen Quellen bzw. professionellen B2B-Datenbanken gewonnen. Wir verarbeiten sie auf Grundlage unseres berechtigten Interesses an B2B-Kontaktaufnahme (Art. 6 Abs. 1 lit. f DSGVO). Wenn Sie keine weitere Kontaktaufnahme wuenschen, antworten Sie kurz mit "Stop" oder klicken Sie hier: {{unsubscribe_link}}.

PraxisNova AI, {{impressum_link}}, {{privacy_link}}
```

**Opt-Out-Handler (Pflicht):**

```
POST /api/privacy/opt-out
{ "email": "..." }
-> 200: Lead in DB markiert opted_out=true, aus Apollo-Sequenzen entfernt, Brevo-Blacklist gesetzt.
Kein Follow-Up, kein Remarketing.
```

**Retention-Policy (Default):**

- Aktiv-engaged Lead: 36 Monate ab letzter Interaktion
- Cold-Lead ohne Response: 12 Monate, dann loeschen
- Opt-Out-Lead: sofort aus Operational-DB, nur noch Hash in Suppression-List

### 3.4 PR-Body-Template (Pflicht)

```markdown
## Summary
...

## Skills used
- `~/Desktop/PraxisNovaAI/skills/<skill-name>/SKILL.md`: wie angewendet
- ...

## Preflight
- [ ] npm run type-check green
- [ ] npm run lint green
- [ ] npm run test green
- [ ] npm run build green
- [ ] scripts/legal-scan.sh green
- [ ] scripts/security-scan.sh green

## Legal/Compliance review
- [ ] Keine Forbidden-Phrases im Diff
- [ ] Bei Marketing-Content: UWG/DSGVO-Check via legal:compliance-check Skill
- [ ] Bei Outreach-Aenderung: DSGVO-Footer vorhanden

## Cost impact
- Neue API-Calls pro Lauf: X (vorher Y)
- Model-Routing: (z.B. Haiku fuer Draft, Sonnet nur Review)
- Neue DB-Queries: erklaert EXPLAIN-Output

## Observability
- Neue Log-Events: ...
- Neue Metriken: ...

## Risk + Rollback
- Breaking Changes? Nein/Ja (Details)
- Rollback-Plan: git revert <sha>, Migration down
```

### 3.5 ICP-Config-Schema (Extensibility)

Statt hardcoded if/else: neue ICP = neue Row in `icp_config`.

```sql
CREATE TABLE icp_config (
  id TEXT PRIMARY KEY,  -- 'icp-proptech' etc.
  display_name TEXT NOT NULL,
  nace_codes TEXT[] NOT NULL,
  base_score INT NOT NULL DEFAULT 50,
  sequence_id TEXT NOT NULL,
  hook_type TEXT NOT NULL,  -- 'foerderung', 'azav', 'whitelabel', 'roi'
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Beispiel-Seeds
INSERT INTO icp_config VALUES
  ('icp-proptech', 'PropTech + Immobilien', ARRAY['41','6820','6831','6832','7022'], 90, 'seq-proptech-workshop', 'roi', true, now(), now()),
  ('icp-kanzlei', 'Steuerberater + Anwaelte', ARRAY['6910','6920','7021'], 80, 'seq-kanzlei-workshop', 'roi', true, now(), now()),
  ('icp-agentur', 'Digitale Agenturen', ARRAY['7311','7312','7320'], 75, 'seq-agentur-dfy', 'whitelabel', true, now(), now());
```

Agent-Code zieht daraus, ICP-Erweiterung = SQL-Insert + optional neue Sequenz, kein Deploy.

### 3.6 Forbidden-Phrases-Evolution

Dies ist eine lebende Liste. Wenn neue Rechtsfragen auftauchen (AZAV erreicht, go-digital-Autorisierung da, neue UWG-Urteile), passen wir `scripts/legal-scan.sh` an.

Template fuer Update:
1. Neue Phrase in FORBIDDEN-Array des Scripts einfuegen
2. Begruendung als Kommentar
3. CHANGELOG.md-Eintrag
4. Memory `feedback_legal_phrases.md` (noch anzulegen) mit Datum + Quelle

### 3.7 Review-Kadenz

- **Woechentlich (Mo morning):** Claude Code scannt alle aktiven Agenten gegen `scripts/agent-audit.sh`. Bericht an Angie.
- **Monatlich:** Token-Budget-Review, Cost-per-Agent-Run, teuerste 5 Agenten identifizieren.
- **Alle 90 Tage:** DSGVO-Retention-Pruefung, Forbidden-Phrases-Review, Rotations-Check (Secrets).
- **Bei jedem groesseren Release:** Section 1.1-1.5 komplett durchgehen.

### 3.8 Escalation-Regeln

Claude Code stoppt und fragt Angie wenn:

- Forbidden-Phrase im Prompt-Input, aber Use-Case legitim erscheint (Override?)
- Security-Scan findet Pattern aber es ist in Test-Fixture (False Positive?)
- Migration kann nicht down gefahren werden (Datenverlust?)
- Agent-Budget >80% aufgebraucht mitten im Run
- API liefert unerwartete 4xx/5xx mit neuer Error-Semantik
- Legal-relevante Aenderung im Angebot (Preis, Scope, Garantie)

---

## Freigabe

- Angie: (zu signen nach Review)
- Gueltig ab Freigabe-Datum bis zum naechsten Review
- Versionierung: dieses Dokument bei jeder Aenderung mit neuem Datum speichern, altes nicht loeschen

Ende PLATFORM-STANDARDS V1.
