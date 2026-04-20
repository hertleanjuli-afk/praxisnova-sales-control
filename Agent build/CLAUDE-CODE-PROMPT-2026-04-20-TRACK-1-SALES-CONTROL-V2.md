# Claude Code Prompt, Track 1: Sales Control V2 Vollausbau

Erstellt: 2026-04-20 Cowork-Abend
Repo: `~/Desktop/PraxisNovaAI/repos/VERALTET-praxisnova-sales-control` (Live-Repo trotz Prefix, siehe Memory `reference_live_repo_naming.md`)
Start: Sofort, Mo 2026-04-20 ab ca. 17:15
Zeit-Schaetzung: 10 bis 14h autonom
Deadline: Mi 2026-04-22 20:00 (vor Amelie-Meeting Do 13:00)

---

## 0. PFLICHT: Skills + PLATFORM-STANDARDS lesen BEVOR du anfaengst

Skills-Quelle: `~/Desktop/PraxisNovaAI/skills/` (Desktop-Ordner von Angie)

Schritt 1: `ls ~/Desktop/PraxisNovaAI/skills/` (Uebersicht aller Skills)
Schritt 2: Lies `~/Desktop/PraxisNovaAI/CLAUDE.md` und `~/Desktop/PraxisNovaAI/CLAUDE-CODE-PROMPTS.md` falls vorhanden
Schritt 3: Lies `SKILL.md` in allen relevanten Unterordnern BEVOR du mit Code anfaengst
Schritt 4: **Lies `Agent build/PLATFORM-STANDARDS-2026-04-20.md` vollstaendig.** Dieses Dokument ist ab 2026-04-20 die harte Referenz fuer Legal + Security + Tech + Agenten-Safety + Cost + Scale. Jeder Check in PR-Body bestaetigen.
Schritt 5: Wende Skill- und Standards-Inhalte an, dokumentiere im PR-Body laut Template (PLATFORM-STANDARDS 3.4)

Empfohlene Skills fuer Track 1 (lies diese explizit, falls im Ordner vorhanden):
- architecture / system-design fuer Schema-Migrationen und State-Machine
- code-review vor jedem Merge
- testing-strategy fuer die 5 Anrufliste-Trigger-Tests (Pflicht)
- deploy-checklist vor Production-Merge
- documentation fuer Runbook pro neuer Seite
- sql-queries fuer Dashboard-Aggregationen
- validate-data fuer Dashboard-Konsistenz
- **legal:compliance-check** fuer DSGVO-Review der Anrufliste-Telefonie (Art. 6 Abs. 1 lit. f)
- **operations:risk-assessment** fuer Schema-Breaking-Change-Review

WICHTIG: Claude Code kennt keinen Skill()-Befehl. Liess die SKILL.md-Dateien direkt als Markdown.

---

## 1. Debug-Reihenfolge (Pflicht)

1. Notizen lesen: `Agent build/SALES-CONTROL-SPEC-2026-04-20.md`, `Agent build/CHANGELOG.md`, Memory `project_anrufliste_feature.md`, `project_lead_detail_bug.md`
2. Live-Code lesen: `app/sales-control/`, `app/api/cron/`, `lib/agent-runtime.ts`, bestehende Lead-Detail-Seite
3. DB-Schema scannen: `leads`, `sequences`, `call_list`, `linkedin_*` (falls vorhanden)
4. Dann Migration + Build

---

## 2. Main-State-Check (Pflicht)

```bash
cd ~/Desktop/PraxisNovaAI/repos/VERALTET-praxisnova-sales-control
git checkout main && git pull origin main
git log --oneline -20
```

PR #34 (Calendar-Cron) und PR #37 (Dashboard-Filter) muessen in main sichtbar sein. Wenn nicht: STOP, Status an Angie per Chat.

---

## 3. Aufgaben in Reihenfolge

### T1.1 DB-Migration: LinkedIn-State + Block-System (P0)

Migration `NNN_linkedin_state_and_block.sql`:

```sql
-- Enum fuer LinkedIn-State
CREATE TYPE linkedin_state AS ENUM (
  'open', 'no_linkedin', 'request_sent', 'connected',
  'message_sent', 'replied_positive', 'replied_negative',
  'blocked_person', 'blocked_company'
);

-- Leads-Tabelle erweitern
ALTER TABLE leads
  ADD COLUMN linkedin_state linkedin_state DEFAULT 'open',
  ADD COLUMN linkedin_state_changed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN blocked_until TIMESTAMPTZ,
  ADD COLUMN block_reason TEXT,
  ADD COLUMN block_scope TEXT CHECK (block_scope IN ('person', 'company') OR block_scope IS NULL);

-- Neue Tabelle linkedin_messages
CREATE TABLE linkedin_messages (
  id SERIAL PRIMARY KEY,
  lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  state_at_send linkedin_state,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_linkedin_messages_lead ON linkedin_messages(lead_id);
CREATE INDEX idx_linkedin_messages_direction ON linkedin_messages(direction);

-- Neue Tabelle company_blocks (fuer Firmen-Block inkl. zukuenftige Leads)
CREATE TABLE company_blocks (
  id SERIAL PRIMARY KEY,
  company_domain TEXT,
  company_name TEXT,
  blocked_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (company_domain IS NOT NULL OR company_name IS NOT NULL)
);
CREATE INDEX idx_company_blocks_domain ON company_blocks(company_domain);
CREATE INDEX idx_company_blocks_until ON company_blocks(blocked_until);

-- Migration bestehender Leads
UPDATE leads
  SET linkedin_state = CASE
    WHEN linkedin_url IS NOT NULL AND linkedin_url != '' THEN 'open'::linkedin_state
    ELSE 'no_linkedin'::linkedin_state
  END
  WHERE linkedin_state IS NULL OR linkedin_state = 'open';
```

**Acceptance:** Migration laeuft gruen in Staging (Neon Branch), dann Prod. Bestehende Leads haben sinnvollen State.

---

### T1.2 Dashboard-Metriken live (P0)

Datei: `app/sales-control/dashboard/page.tsx` + API-Route `app/api/metrics/route.ts`

Alle Metriken aus `SALES-CONTROL-SPEC-2026-04-20.md` Teil 1.1 bis 1.5. Jede Metrik in eigenem SQL-Query, keine Hartcodes. React Server Component + 60s Cache.

**Konsistenz-Invariante:** Summe aller ICP-Branchen-Counts = Gesamt-Count. Wenn nicht: Alarm + rote Zahl im UI.

**Acceptance:** Dashboard laedt in <2s. Alle 20+ Zahlen konsistent. Visual Regression Test per Screenshot.

---

### T1.3 LinkedIn-Workflow Seite `/sales-control/linkedin` (P0)

7 Tabs mit Filter (aus Spec Teil 2.2):

| Tab | Filter |
|-----|--------|
| Offen | state = open |
| Anfrage raus | state = request_sent |
| Verbunden | state = connected |
| Nachricht raus | state = message_sent |
| Antworten | state = replied_positive |
| Keine LinkedIn | state = no_linkedin |
| Blockiert | state in blocked_person/blocked_company |

**Jede Zeile zeigt (PFLICHT, "Infos fehlen" war Bug):**
- Name + Firma + LinkedIn-Profil-Link (klickbar, oeffnet neuen Tab)
- ICP-Tag + ICP-Score
- Aktueller Sequenz-Step (wenn in Sequenz aktiv)
- Days in current state (z.B. "7 Tage in request_sent")
- Letzte Aktion + Timestamp
- CTA-Button passend zum State (siehe Spec Teil 2.3)
- 3-Dots-Menu: "Lead Detail oeffnen", "In Anrufliste", "Blockieren"

**Tracking (PFLICHT, "taching fehlen" war Bug):**
- Jede State-Transition schreibt Event in neue Tabelle `linkedin_events` (lead_id, from_state, to_state, triggered_by, created_at)
- Dashboard zeigt Funnel: 100 Anfragen -> 40 Verbunden -> 20 Nachricht raus -> 5 Antworten
- Time-in-state Histogramm pro Tab-Spalte

**Actions ohne Refresh:**
- React Server Actions + `revalidatePath`
- Optimistic UI: Button-Click -> sofort visuell wechseln -> bei Fehler rueckgaengig
- Alle 5 Transitions aus Spec Teil 2.3 implementieren

**Acceptance:** E2E-Test: Neuen Lead erstellen, durchlaufen open -> request_sent -> connected -> message_sent -> replied_positive -> Anrufliste-Eintrag. Keine manuellen Refreshes.

---

### T1.4 Block-System mit Default 9 Monate (P0)

Dediziert-Seite `/sales-control/block-manager` plus Block-Modal ueberall wo "Blockieren" Button vorkommt.

Block-Modal:
- Dauer: 3 / 6 / **9 Monate (Default)** / permanent (Radio)
- Scope: Nur Person / **Gesamte Firma (Default wenn Email-Domain eindeutig)** (Radio)
- Freitext-Grund (optional, 200 Zeichen)
- Button "Blockieren" + "Abbrechen"

Wirkung:
- `leads.linkedin_state = blocked_person` oder `blocked_company`
- `leads.blocked_until = NOW() + Dauer`
- Falls Firma geblockt: Eintrag in `company_blocks` mit Domain + Firmennamen
- Cron `unblock-expired` (taeglich 03:00 UTC): setzt abgelaufene Blocks zurueck auf `open`

**Firmen-Block fuer zukuenftige Leads (Angies Entscheidung Ja):**
- Ingestor-Agent muss vor INSERT pruefen: `SELECT 1 FROM company_blocks WHERE (company_domain = $domain OR company_name ILIKE $name) AND blocked_until > NOW()`
- Wenn Match: neuer Lead bekommt `linkedin_state = blocked_company` direkt beim Import
- Lead wird NICHT in Outreach-Queue aufgenommen

**Block-Manager-Seite:**
- Suchfeld: Email / Domain / Firmenname
- Autocomplete findet Firma + alle Kontakte
- Block-Optionen wie oben
- Historie letzte 50 Blocks (Datum, Grund, Scope, Dauer)
- CSV-Export der Block-Liste

**Acceptance:** 9-Monate-Block setzt blocked_until korrekt, Firmen-Block fuer Test-Domain blockt auto-neu-importierten Lead, Unblock-Cron laeuft und befreit abgelaufene Blocks.

---

### T1.5 Anrufliste mit ALLEN 5 Triggern (P0)

Tabelle `call_list` erweitern:
```sql
ALTER TABLE call_list
  ADD COLUMN source_trigger TEXT CHECK (source_trigger IN (
    'linkedin_positive_reply',
    'sequence_email_reply',
    'sequence_finished_no_reply',
    'manual_call_planned',
    'inbound_form_demo_request'
  )),
  ADD COLUMN priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  ADD COLUMN icp_score INT,
  ADD COLUMN trigger_context TEXT,
  ADD COLUMN scheduled_for TIMESTAMPTZ;
```

**Die 5 Trigger implementieren (das ist was fehlt, Angies Wort "trigger fehlen"):**

| Trigger | Wo implementieren | Prio-Logik |
|---------|-------------------|------------|
| `linkedin_positive_reply` | LinkedIn-Workflow: State wechsel auf `replied_positive` | high + icp_score boost (Source=LinkedIn + ICP kombiniert, Angies Entscheidung) |
| `sequence_email_reply` | Reply-Detector-Agent (`agents/reply-detector`): wenn Klassifikation = positive | high + icp_score boost |
| `sequence_finished_no_reply` | Sequenz-Agent: wenn letzter Step abgeschlossen ohne Reply | medium, Context-Text "Follow-up nach Kampagne X" |
| `manual_call_planned` | Button "Call planen" auf Lead-Detail | Prio manuell waehlbar |
| `inbound_form_demo_request` | Website-Inbound-Webhook: wenn demo_request=true | high, Context "Inbound Form" |

**Prio-Algorithmus (Angies Entscheidung: Source + ICP-Score kombiniert):**

```
if trigger in (linkedin_positive_reply, sequence_email_reply, inbound_form_demo_request):
  base = high
elif trigger == sequence_finished_no_reply:
  base = medium
elif trigger == manual_call_planned:
  base = user_choice

effective_priority_score = base_weight[base] + icp_score * 0.5
# Sort anrufliste by effective_priority_score DESC
```

**Dedup:** Kein Duplikat fuer (lead_id, trigger, DATE(created_at)). Ein Lead kann pro Tag pro Trigger nur einen Eintrag haben.

**UI `/sales-control/anrufliste`:**
- Sortiert nach effective_priority_score desc, scheduled_for asc
- Farb-Coding: high=rot, medium=gelb, low=grau
- Spalte "Trigger" zeigt Badge mit Source + Context-Text
- Actions: "Angerufen", "Nicht erreicht", "Callback xx:xx", "Auf LinkedIn verschieben"

**Acceptance:** Je einen Test-Case pro Trigger, 5/5 Eintraege landen in call_list mit korrekter Prio. Dedup-Test: gleicher Lead + Trigger + Tag -> nur 1 Eintrag.

---

### T1.6 Cross-Verknuepfungen (P0)

Jede Seite verlinkt zu allen anderen:

- Anrufliste-Zeile -> Klick oeffnet `/lead/[id]` mit aufgeklapptem LinkedIn-State + Sequenz-Step
- LinkedIn-Tab-Zeile -> Klick oeffnet `/lead/[id]`, springt zum LinkedIn-Panel
- Sequenz-Uebersicht -> Klick auf Lead-Name oeffnet `/lead/[id]`
- Dashboard-KPI "Sequenzen auf letztem Step" -> Klick filtert `/sales-control/sequences?filter=last_step`
- Dashboard-KPI "LinkedIn Nachricht raus" -> Klick filtert `/sales-control/linkedin?tab=message_sent`

Lead-Detail-Seite `/lead/[id]` muss 4 Panels zeigen:
1. Basis-Info (Name, Firma, Email, Phone, ICP-Score, linkedin_url)
2. LinkedIn-Panel (aktueller State + Historie aller Transitions + alle gesendeten/empfangenen Messages)
3. Sequenz-Panel (aktive Sequenz, Step, letzter Touch)
4. Anrufliste-Panel (offene + erledigte Eintraege mit Trigger-Source)

**Acceptance:** Von jedem Panel aus navigierbar zu allen anderen. Kein Dead-End.

---

### T1.7 Cron `unblock-expired` (P0)

Datei: `app/api/cron/unblock-expired/route.ts`, Schedule: taeglich 03:00 UTC.

```typescript
// Leads entblocken
UPDATE leads
  SET linkedin_state = 'open',
      blocked_until = NULL,
      block_reason = NULL,
      block_scope = NULL
  WHERE linkedin_state IN ('blocked_person', 'blocked_company')
    AND blocked_until IS NOT NULL
    AND blocked_until < NOW();

// Firmen-Blocks aufraeumen
DELETE FROM company_blocks WHERE blocked_until < NOW();
```

Report-Zeile in `system_health` Tabelle.

**Acceptance:** Test-Lead mit `blocked_until = NOW() - 1 hour` -> nach Cron-Run state = open.

---

## 4. Report-Template (Pflicht)

Schreibe nach `Agent build/session-docs/2026-04-20_track-1-sales-control-v2-report.md`:

```markdown
# Track 1 Sales Control V2 Report

Start: YYYY-MM-DD HH:MM
Ende: YYYY-MM-DD HH:MM
Production-URL: https://praxisnova-sales-control.vercel.app

## Durchgefuehrte Tasks
- [ ] T1.1 DB-Migration (linkedin_state + blocks)
- [ ] T1.2 Dashboard-Metriken live
- [ ] T1.3 LinkedIn-Workflow 7 Tabs + Tracking + Infos
- [ ] T1.4 Block-System 9 Monate + Firmen-Block
- [ ] T1.5 Anrufliste 5 Trigger + Prio-Algorithmus
- [ ] T1.6 Cross-Verknuepfungen
- [ ] T1.7 Cron unblock-expired

## PRs
- PR #NN: Beschreibung, Skills-Consultation, Review-Status

## Screenshots
- Dashboard (alle Metriken sichtbar)
- LinkedIn-Tab Offen (mit Infos + Tracking)
- Anrufliste mit Trigger-Badges
- Block-Modal 9 Monate Default

## Tests
- E2E LinkedIn-State-Walk: ok/fail
- 5 Anrufliste-Trigger: ok/fail
- Firmen-Block fuer zukuenftige Leads: ok/fail
- Unblock-Cron: ok/fail

## Skills-Consultation
- engineering:architecture fuer Migration: ...
- engineering:system-design fuer Cross-Links: ...
- data:sql-queries fuer Dashboard: ...

## Offene Blocker
...

## Naechste Schritte
...
```

Plus Eintrag in `Agent build/CHANGELOG.md` mit Datum + Batch + Commits.

---

## 5. Regeln (Pflicht)

- Kein em-dash, kein en-dash (Projekt-Regel)
- Deutsche Commit-Messages und PR-Titel
- Nach jedem Merge: CHANGELOG + TASKS.md Update
- Keine destructive Ops ohne Angie-OK
- Bei Unklarheit: Escalation in Chat, nicht raten

---

## 6. Zeitbox

10 bis 14h. Wenn nach 12h nicht mehr als T1.1 bis T1.5 fertig: Stop, Angie fragen was priorisiert wird.

---

## 7. PLATFORM-STANDARDS Compliance (BLOCKER vor Merge)

Referenz: `Agent build/PLATFORM-STANDARDS-2026-04-20.md`.

**Legal-Gate (Section 1.1 + 1.5):**
- [ ] Anrufliste-Feature DSGVO-konform: Rechtsgrundlage in Docs (berechtigtes Interesse Art. 6 Abs. 1 lit. f fuer B2B), Widerspruchsmoeglichkeit pro Lead (Unsubscribe + Call-Opt-Out-Flag), Retention-Policy im Schema (Lead mit letzter Interaktion > 36 Monate = archivieren)
- [ ] Keine Forbidden-Phrases in UI-Texten (`scripts/legal-scan.sh` gruen)
- [ ] Bei LinkedIn-Automation: kein Scraping von LinkedIn (nur manuelle UI-Bedienung, keine automatisierten Actions)

**Security-Gate (Section 1.2):**
- [ ] `scripts/security-scan.sh` exit 0
- [ ] Dashboard-Auth: jeder Read-Endpoint prueft Session, kein Public-Access
- [ ] Block-Toggle nur fuer authentifizierte User (CSRF-Token)

**Technical-Gate (Section 1.3):**
- [ ] `scripts/preflight.sh` exit 0
- [ ] Migration up + down getestet (auf Branch-DB oder Shadow-DB)
- [ ] State-Machine-Tests: jeder Uebergang hat Unit-Test
- [ ] 5 Anrufliste-Trigger jeweils Integration-Test

**Agent-Safety-Gate (Section 1.4):**
- [ ] `unblock-expired` Cron ist idempotent (Run 2x hintereinander = identisches DB-State)
- [ ] Cron-Lock in `cron_locks`-Tabelle verhindert Parallel-Runs
- [ ] Strukturierte Logs mit correlation_id pro Run
- [ ] Dead-Letter-Handling bei fehlgeschlagenen Block-Expirations

**Cost-Gate (Section 2.1):**
- [ ] Dashboard-Metriken: SQL-Aggregation statt LLM (kein LLM-Call fuer Zaehl-Operationen)
- [ ] Anrufliste-Priority-Score: rein rechenbasiert, kein LLM

**Scale-Gate (Section 2.2):**
- [ ] Indexes auf `leads.linkedin_state`, `call_list.priority_score`, `company_blocks.company_id`, `company_blocks.expires_at`
- [ ] Pagination auf allen Listing-Endpoints (Default 50, max 200)
- [ ] `EXPLAIN ANALYZE` fuer die 3 haeufigsten Queries im PR-Body

**Extensibility-Gate (Section 2.3):**
- [ ] Neue `icp_config`-Tabelle genutzt (nicht hardcoded if/else pro ICP)
- [ ] Anrufliste-Trigger als Config-Row, nicht als Code-Switch
- [ ] Block-Default-Dauer (9 Monate) als Konstante in `config/constants.ts`

Wenn eine Gate rot: STOP, Angie fragen.

---

Ende Prompt. Freigabe durch Angie durch Start-Kommando im Chat.
