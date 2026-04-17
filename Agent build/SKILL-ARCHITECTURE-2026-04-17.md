# Skill-basierte Architektur fuer PraxisNova AI

**Erstellt:** 2026-04-17 Abend
**Geltungsbereich:** Alle Builds, Updates, Iterationen ab jetzt
**Adressat primaer:** Claude Code
**Referenziert durch:** `OPTION-C-PLAN-AMENDMENT-2026-04-17-SKILL-ARCHITECTURE.md`

---

## 1. Zielbild

Jeder Build-Schritt, jeder Agent, jeder Workflow nutzt **wiederverwendbare Skills** statt Ad-hoc-Code. Skills sind:

- Modulare Faehigkeiten mit klarem Input/Output
- In Markdown und ggf. Hilfsskripten definiert
- Versioniert im Dateisystem
- Per Manifest auffindbar
- Per Router dynamisch anwendbar
- Failover-bereit (Fallback-Pfad, wenn Skill fehlt oder fehlschlaegt)

Das ist analog zu "Agents with Skills" im Konzept von msitarzewski/agency-agents, aber auf unser Tech-Stack zugeschnitten (Next.js, Neon, Vercel Cron).

---

## 2. Skill-Quellen (wo Claude Code scannen muss)

### 2.1 Pflicht-Quellen (immer scannen)

| Nummer | Pfad | Typ | Erwartete Anzahl |
|---|---|---|---|
| 1 | `/sessions/peaceful-laughing-volta/mnt/.claude/skills/` | Core-Skills (docx, pdf, xlsx, etc.) | 15 bis 20 |
| 2 | `/sessions/peaceful-laughing-volta/mnt/.remote-plugins/*/skills/` | Plugin-Skills (sales, marketing, data, engineering, etc.) | 100+ |
| 3 | Angie's lokaler PraxisAI-Folder (Claude Code findet via Desktop-Scan) | Firmeneigene Skills | 0 bis 20 (Start-Zustand) |

### 2.2 Optional-Quellen (beim ersten Durchlauf pruefen, danach bei Bedarf)

| Nummer | Pfad/URL | Nutzung |
|---|---|---|
| 4 | Downloads-Folder | Benutzer-hinzugefuegte Skills |
| 5 | github.com/msitarzewski/agency-agents (read-only) | Referenz-Muster, nicht klonen |
| 6 | `Agent build/skills/` (neu anzulegen) | Eigene gebaute Skills |

### 2.3 Wie Claude Code den lokalen PraxisAI-Folder findet

Claude Code laeuft auf Angies Desktop und hat Zugriff auf ihr Filesystem. Scan-Reihenfolge:

1. `~/Desktop/PraxisAI/skills/`
2. `~/Desktop/PraxisAI/`  (rekursiv, max Tiefe 3)
3. `~/praxisnovaai/skills/`
4. `~/Documents/PraxisAI/`
5. Alle Repos unter Angies-GitHub-Home, die ein `skills/` Verzeichnis haben

Wenn keine lokalen Skills gefunden werden: Claude Code schreibt das in den Report, aber blockiert nicht. Firmeneigene Skills werden dann Schritt fuer Schritt angelegt (Claude Code erzeugt das `skills/` Verzeichnis im `praxisnova-sales-control` Repo als Start).

---

## 3. Skill-Manifest-Schema

Claude Code erstellt `Agent build/SKILLS-MANIFEST.md`. Format ist eine Markdown-Tabelle.

**Spalten:**

| Spalte | Beschreibung |
|---|---|
| id | Eindeutig, z.B. `sales.draft-outreach` |
| name | Menschenlesbar |
| path | Absoluter Pfad zur SKILL.md oder README.md |
| source | `core`, `plugin`, `local`, `external-ref`, `self-built` |
| category | `sales`, `marketing`, `engineering`, `data`, `operations`, `content`, `legal`, `finance`, `hr`, `design`, `meta` |
| input_type | Freitext-Beschreibung |
| output_type | Freitext-Beschreibung |
| last_checked | ISO-Datum |
| used_by_agents | Liste der Agenten, die diese Skill nutzen |
| status | `active`, `experimental`, `deprecated`, `broken` |
| fallback_skill | Optional: ID der Fallback-Skill |
| notes | Freitext |

**Beispieleintrag:**

```
| sales.draft-outreach | Sales Draft Outreach | /sessions/.../plugin_01X.../skills/draft-outreach/SKILL.md | plugin | sales | Prospect-Profil | Cold-Email-Draft | 2026-04-17 | [outreach-strategist, reply-recovery] | active | marketing.draft-content | Primary fuer PropTech-Outreach |
```

Claude Code generiert das Manifest beim ersten Scan und updated es bei jeder weiteren Session. Es dient als Single Source of Truth fuer Skill-Discovery.

---

## 4. Skill-Router (dynamische Auswahl)

### 4.1 Input-Signatur

Der Router bekommt:
- `task_type` (z.B. `outreach_draft`, `lead_enrichment`, `content_linkedin_post`)
- `context` (z.B. `{target_industry: "proptech", lang: "de", persona: "geschaeftsfuehrer"}`)
- `constraints` (z.B. `{max_tokens: 1000, must_include: ["bildungsgutschein"]}`)

### 4.2 Matching-Algorithmus (einfach halten)

1. Filter das Manifest auf `status=active` und passende Kategorie
2. Ranking: exact match auf Kategorie zuerst, dann teilweise Kategorie-Uebereinstimmung, dann Keywords im name/notes
3. Oberste 3 Kandidaten zurueckgeben
4. Agent probiert Kandidat 1, falls Output-Format nicht passt oder Fehler: Kandidat 2, etc.
5. Nach 3 fehlgeschlagenen Versuchen: Fallback-Skill oder Hardcoded-Logik

### 4.3 Logging

Jede Skill-Nutzung wird geloggt in `Agent build/SKILL-USAGE-LOG.md` (append-only). Spalten: timestamp, agent, task_type, skill_chosen, success, duration_ms, notes.

Diese Datei wird woechentlich von Claude Cowork ausgewertet, um Skill-Gesundheit zu bewerten.

---

## 5. Scan-Prozess (von Claude Code auszufuehren)

### 5.1 Erster Scan (einmalig, Batch A)

```
Input: Keine
Output: SKILLS-MANIFEST.md vollstaendig

Schritte:
1. Lies Sektion 2.1, 2.2, 2.3 dieses Dokuments
2. Fuer jeden Pfad: rekursiv nach `SKILL.md` oder `README.md` suchen (bis Tiefe 4)
3. Fuer jede gefundene Datei: Name, Beschreibung extrahieren (aus Frontmatter oder erstem Heading)
4. Kategorie automatisch ableiten aus Pfadstruktur (z.B. `.../sales/.../` -> category=sales)
5. Eintrag in Manifest-Tabelle einfuegen
6. Abgleich mit existierendem Manifest, falls vorhanden
7. Neue Skills mit `status=experimental` markieren bis manuell bestaetigt
8. Entfernte Skills mit `status=deprecated` markieren, nicht loeschen
9. Report `CLAUDE-CODE-REPORT-YYYY-MM-DD-SKILLS-SCAN.md` schreiben
```

### 5.2 Inkrementeller Scan (woechentlich als Cron-Task)

Operations-Manager-Agent triggert das als eigenen Cron. Aenderungen werden im Manifest markiert und in den naechsten Claude-Code-Report aufgenommen.

---

## 6. Integration in die 8 Ziel-Agenten

### 6.1 Basis-Kontrakt fuer jeden Agent

Jeder der 8 Agenten hat:

- `agent.yaml` mit Metadaten (name, version, primary_skills, fallback_mode)
- `execute.ts` (oder `execute.py`) mit Haupt-Logik
- `skills_router.ts` (shared, nicht pro Agent neu schreiben)

**agent.yaml Beispiel (Outreach-Strategist):**

```yaml
name: outreach_strategist
version: 1.0.0
description: Waehlt pro Lead die beste Outreach-Strategie und erstellt Draft
primary_skills:
  - sales.draft-outreach
  - marketing.email-sequence
  - brand-voice.brand-voice-enforcement
optional_skills:
  - sales.account-research
  - apollo.sequence-load
fallback_mode: template_based
trigger: cron
trigger_schedule: "0 8,12,16 * * *"
data_sources:
  - leads_table
  - call_queue
outputs:
  - email_draft (in drafts_table)
```

### 6.2 Lebenszyklus pro Lauf

```
1. Trigger (Cron)
2. Agent laedt agent.yaml
3. Agent laedt SKILLS-MANIFEST.md und baut Router-Cache
4. Agent zieht Daten aus DB
5. Fuer jeden zu verarbeitenden Datensatz:
   a. Agent ruft Router mit task_type und context
   b. Router gibt priorisierte Skill-Liste
   c. Agent fuehrt Skill 1 aus
   d. Bei Fehler/leerem Output: Skill 2
   e. Bei allen Fehlern: Fallback (z.B. Template)
6. Ergebnisse in DB oder als Markdown
7. Log-Eintrag in SKILL-USAGE-LOG.md und DB-Tabelle agent_runs
8. Health-Status an Health-Checker melden
```

### 6.3 Pro-Agent Skills-Mapping (aus Amendment, hier technisch formalisiert)

```
lead_ingestor:
  primary: [apollo.enrich-lead, apollo.prospect, data.validate-data]
  fallback: legacy_apollo_pipeline
outreach_strategist:
  primary: [sales.draft-outreach, marketing.email-sequence, brand-voice.brand-voice-enforcement]
  fallback: template_based
email_sender:
  primary: [operations.runbook]
  fallback: direct_brevo_call
reply_detector:
  primary: [customer-support.ticket-triage, sales.call-summary]
  fallback: keyword_matching
call_list_builder:
  primary: [sales.daily-briefing, sales.pipeline-review]
  fallback: simple_sql_query
content_scheduler:
  primary: [marketing.content-creation, marketing.draft-content, brand-voice.brand-voice-enforcement]
  fallback: manual
health_checker:
  primary: [operations.runbook, engineering.debug, engineering.incident-response]
  fallback: simple_probe
operations_manager:
  primary: [operations.process-optimization, engineering.architecture]
  fallback: cron_only
```

---

## 7. Wartung und Verbesserung

### 7.1 Woechentliches Skill-Review (Freitags, automatisiert)

Der Operations-Manager-Agent fuehrt jeden Freitag aus:

1. Scan laufen lassen
2. SKILL-USAGE-LOG.md auswerten (letzte 7 Tage)
3. Skills mit Success-Rate unter 70 Prozent auf `status=broken` setzen
4. Skills, die nicht genutzt wurden, als `status=stale` markieren (informativ, nicht deprecate)
5. Report `SKILL-HEALTH-REPORT-YYYY-MM-DD.md` nach `Agent build/`

### 7.2 Neue Skills hinzufuegen

Wenn Claude Cowork oder Angie eine neue Skill identifiziert (z.B. "Foerdermittel-Rechner"), dann:

1. Skill wird in `Agent build/skills/<name>/SKILL.md` angelegt
2. Claude Code naechster Scan erfasst sie automatisch
3. Manifest wird aktualisiert
4. Relevanter Agent wird mit dieser Skill im primary_skills-Array versehen

### 7.3 Eigene Skills entwickeln (Priorisierung)

**Tier 1, sofort bauen (Claude Cowork schreibt SKILL.md, Claude Code nicht noetig):**

- `praxisnova.foerdermittel-calc` (berechnet go-digital, uWM, Bildungsgutschein fuer ein Angebot)
- `praxisnova.workshop-proposal-generator` (generiert das 3-Angebot-Leiter-Dokument in Docx)
- `praxisnova.case-study-writeup` (strukturiert Case Studies nach vorgegebenem Format)

**Tier 2, Woche 2:**

- `praxisnova.icp-scorer` (bewertet Leads auf ICP-Fit 0 bis 100)
- `praxisnova.linkedin-dm-writer` (hyper-personalisierte DMs)
- `praxisnova.compliance-check-de` (DSGVO-Check fuer Outbound-Mails)

**Tier 3, Woche 3 und 4:**

- `praxisnova.course-outline-generator` (fuer Q3-Kurs-Vorbereitung)
- `praxisnova.customer-feedback-synthesizer` (verarbeitet Workshop-Feedback)

---

## 8. External Reference: msitarzewski/agency-agents

**Zu uebernehmende Muster (Hypothese, wird in Batch A verifiziert):**

1. **Agent-Manifest als YAML** - scheinbar Standard in dem Repo, passt zu unserer agent.yaml
2. **Role-basierte Agenten-Struktur** - "ContentWriter", "Researcher", "Reviewer" sind Rollen, nicht Code-Klassen. Parallele: unsere 8 Agenten sind Rollen.
3. **Task-Queue statt direkter Aufruf** - moeglicherweise entkoppelt. Fuer uns: DB-Tabelle `agent_tasks` als Queue.
4. **Output-Contracts** - jeder Agent gibt typisierten Output (JSON mit Schema). Fuer uns: TypeScript-Types im `lib/types.ts`.
5. **Tooling-Gleichheit** - alle Agenten nutzen dasselbe Tooling-Interface. Fuer uns: shared Skill-Router.

**Was wir NICHT uebernehmen:**

- Multi-Agent-Debatten (too much overhead fuer unseren Case)
- Separate Runtime (wir bleiben bei Next.js + Vercel Cron)

**Abschluss der Analyse:** Claude Code liefert `Agent build/EXTERNAL-REFERENCE-ANALYSIS-msitarzewski.md` mit verifiziertem Uebernahme-Katalog in Batch A.

---

## 9. Commands fuer Claude Code (kurz)

Siehe separates Dokument `CLAUDE-CODE-PROMPTS-COPY-PASTE-2026-04-17.md` fuer die Copy-Paste-Version. Hier die Kurz-Referenz:

1. **Skill-Scan starten:** "Scanne alle Skill-Quellen aus `SKILL-ARCHITECTURE-2026-04-17.md` Sektion 2 und erstelle `SKILLS-MANIFEST.md`."
2. **Manifest updaten:** "Inkrementeller Scan, nur geaenderte und neue Skills in SKILLS-MANIFEST.md markieren."
3. **Agent mit Skills verknuepfen:** "Nimm Agent X und setze agent.yaml mit primary_skills aus SKILL-ARCHITECTURE-2026-04-17.md Sektion 6.3."
4. **External-Ref analysieren:** "Lese github.com/msitarzewski/agency-agents und schreibe EXTERNAL-REFERENCE-ANALYSIS-msitarzewski.md mit 3 bis 5 Uebernahme-Entscheidungen."

---

## 10. Erfolgs-Kriterien

Das System ist erfolgreich integriert, wenn:

- SKILLS-MANIFEST.md existiert und mindestens 100 Skills listet (aus Pflicht-Quellen)
- 3 der 8 Agenten nutzen Skills aktiv (Lead Ingestor, Outreach Strategist, Content Scheduler sind Erst-Prioritaet)
- SKILL-USAGE-LOG.md hat mindestens 20 Eintraege pro Tag
- Fallback-Logik wird in weniger als 20 Prozent der Skill-Calls ausgeloest
- Angie oder Claude Cowork kann binnen 30 Minuten eine neue Skill hinzufuegen, ohne dass Code-Aenderungen noetig sind

---

**Status:** Architektur-Blueprint. Implementierung durch Claude Code in Batches A bis C.
**Naechster Schritt:** Siehe `CLAUDE-CODE-PROMPTS-COPY-PASTE-2026-04-17.md` Prompt 1.
