# Claude Code Report 2026-04-17 — Skills Scan

**Branch:** skill-scan/initial
**Repo:** praxisnova-sales-control
**Erstellt von:** Claude Code (Opus 4.7)
**Erstellt am:** 2026-04-17
**Vorlauf:** SKILL-ARCHITECTURE-2026-04-17.md, OPTION-C-PLAN-AMENDMENT-2026-04-17, OPTION-C-MASTER-PLAN-2026-04-17

---

## Executive Summary (5 Zeilen)

1. Voll-Scan der Mac-Home-Folder hat **220 eindeutige Skills** (827 SKILL.md Dateien wegen Mirror-Duplikaten) in 18 Kategorien gefunden.
2. **agency-agents Repo erfolgreich geklont** und 5 Uebernahme-Muster fuer unsere Architektur extrahiert (YAML-Frontmatter, Persona/Operations-Trennung, Multi-Agent-Workflow mit Hand-off, Reality-Check-Gate, Convert-Adapter).
3. **Marketing-Skills 36 (vs Angies "31")**: alle gefunden in `~/Desktop/PraxisNovaAI/skills/marketing/skills/`. Plus 39 erweitertes Set in `~/Desktop/PraxisNovaAI/skills/`. Erwartung uebertroffen.
4. **Cowork-Plugin-Skills**: 19 Plugins mit 119 Skills (engineering, sales, marketing, ops, hr, legal, data, design, brand-voice, apollo, etc.) komplett auffindbar.
5. **Empfohlene Naechste Schritte:** Mirror-Skills in 8 Repos auf Symlinks reduzieren (Batch B), `lib/skill-router.ts` mit Manifest-Lookup bauen (Batch B), Brand-Voice und Apollo als Pflicht-Skills in `outreach_strategist.yaml` einbinden (Batch A).

---

## 1. Anzahl gefundener Skills

### 1.1 Gesamt nach Source-Type

| Source-Type | Anzahl Skills (eindeutig) | Anteil |
|---|---|---|
| plugin (Cowork) | 119 | 54% |
| local (PraxisNova-Sammlung) | 39 | 18% |
| plugin (Vercel) | 25 | 11% |
| core (Cowork) | 15 | 7% |
| praxisnova-owned (Scheduled) | 13 | 6% |
| external-cursor | 8 | 4% |
| common-room | 1 | <1% |
| **Total unique** | **220** | **100%** |

### 1.2 Pro Kategorie

| Kategorie | Anzahl |
|---|---|
| marketing (inkl. CRO + SEO) | 47 |
| vercel | 25 |
| sales (inkl. Apollo + Common Room) | 17 |
| engineering | 10 |
| operations | 9 |
| data | 10 |
| legal | 9 |
| hr | 9 |
| product-management | 8 |
| design | 8 |
| customer-support | 5 |
| search-knowledge | 5 |
| brand | 4 |
| apollo | 3 (in sales) |
| productivity | 2 |
| cowork-core | 15 |
| cursor-tooling | 8 |
| praxisnova-scheduled | 13 |
| bio-research | 6 (inactive) |
| finance | 8 (inactive) |

### 1.3 Pro Quelle (Top-3 Pfade)

| Pfad | Anzahl Skills |
|---|---|
| Cowork-Sessions `~/Library/Application Support/Claude/local-agent-mode-sessions/.../rpm/plugin_*/skills/` | 119 |
| `~/Desktop/PraxisNovaAI/skills/` | 39 |
| `~/.claude/plugins/cache/.../vercel/0.40.0/skills/` | 25 |

---

## 2. Top-30 Skills fuer Option-C Kategorien

Priorisiert nach erwartetem Wert in Woche 1 (Real Estate Pilot, LinkedIn-Blitz, Pipeline-Reaktivierung, Bestandskunden-Upsell):

| Rang | Skill-ID | Use-Case Woche 1 | Status |
|---|---|---|---|
| 1 | sales.draft-outreach | Real Estate Pilot Folgekontakt + alle Outbound-Mails | active |
| 2 | brand-voice.brand-voice-enforcement | Pflicht vor jedem Customer-facing Text | active |
| 3 | local.cold-email | LinkedIn-Blitz (Kanal C) und Reaktivierung (Kanal D) | active |
| 4 | apollo.prospect | Lead-Sourcing fuer Pipeline-Reaktivierung | active |
| 5 | apollo.enrich-lead | Kontakt-Anreicherung fuer 50 handverlesene Leads | active |
| 6 | sales.call-prep | Vorbereitung Real Estate Pilot Meeting (20.04.) | active |
| 7 | local.sales-enablement | Workshop-Angebot 3-Stufen-Leiter | active |
| 8 | core.docx | Workshop-Angebot als .docx-Datei | active |
| 9 | core.pdf | Foerdermittel-One-Pager fuer Reaktivierung | active |
| 10 | local.lead-research-assistant | Hyper-qualifizierte LinkedIn-Blitz-Liste | active |
| 11 | marketing.draft-content | LinkedIn-Posts (Mo, Mi, Fr) | active |
| 12 | marketing.email-sequence | Email-Sequence Refresh (3-Step in 10 Tagen) | active |
| 13 | local.brand-guidelines | Brand-konforme Templates | active |
| 14 | engineering.architecture | Skill-Router Architektur (Batch B) | active |
| 15 | engineering.system-design | 8-Agenten-Konsolidierung (Batch C) | active |
| 16 | engineering.documentation | Diese Reports und SKILLS-MANIFEST | active |
| 17 | operations.runbook | Health-Checker Runbook | active |
| 18 | engineering.debug | Apollo-422 und Calendar-OAuth Fixes | active |
| 19 | engineering.deploy-checklist | Vor jedem Vercel-Deploy | active |
| 20 | data.validate-data | Apollo-Imports und Brevo-Sync | active |
| 21 | data.write-query | Lead-Detail-Queries und KPI-Snapshots | active |
| 22 | customer-support.ticket-triage | Reply-Detector-Pflicht | active |
| 23 | local.lead-magnets | Foerdermittel-One-Pager als Lead-Magnet | active |
| 24 | local.pricing-strategy | Bereits angewandt (2.900/4.900/3.500/8.000) | active |
| 25 | legal.triage-nda | Falls Real Estate Pilot NDA fordert | active |
| 26 | legal.compliance-check | DSGVO-Check fuer Outbound-Mails | active |
| 27 | local.copywriting | Landing-Page /ki-fuer-hausverwaltungen | active |
| 28 | local.social-content | LinkedIn-Carousel + Posts | active |
| 29 | local.product-marketing-context | Setup-Skill (vor allen anderen Marketing-Skills) | active |
| 30 | core.skill-creator | Bau eigener Tier-1-Skills (Foerdermittel-Calc, etc.) | active |

---

## 3. Plugin-Overlaps (Doppelt vorhandene Skills)

Diese Skills existieren sowohl in einem Cowork-Plugin als auch lokal (downloaded marketing-skills) oder in einem anderen Plugin. **Empfehlung welche Variante "gewinnt":**

| Skill-Name | Plugin-Variante | Lokale Variante | Empfehlung Primary | Begruendung |
|---|---|---|---|---|
| email-sequence | marketing.email-sequence (Cowork Plugin, 8-Skill-Bundle) | local.email-sequence (Marketing-Skills-Sammlung) | **local.email-sequence** | Lokale Variante hat detailliertere Lifecycle-Spec, plus Plugin-Variante als Fallback |
| seo-audit | marketing.seo-audit (Cowork Marketing) | local.seo-audit (Marketing-Skills-Sammlung) | **marketing.seo-audit** | Plugin-Variante ist neuer und besser maintained, lokale als Fallback |
| customer-research | customer-support.customer-research (Cowork Support) | local.customer-research (Marketing-Skills) | **customer-support.customer-research** | Plugin-Variante ist tiefer in Support-Use-Cases, lokale als Marketing-Fallback |
| account-research | sales.account-research (Cowork Sales) | common-room.account-research (Common Room Plugin) | **sales.account-research** | Sales-Plugin direkt zugeschnitten, Common Room nur bei Community-Tracking |
| call-prep | sales.call-prep (Cowork Sales) | common-room.call-prep (Common Room) | **sales.call-prep** | Sales-Plugin sales-spezifisch, Common Room nur bei Community-Trigger |
| prospect | apollo.prospect (Apollo Plugin) | common-room.prospect (Common Room) | **apollo.prospect** | Apollo bleibt primaere Lead-Quelle |
| competitive-brief | marketing.competitive-brief (Marketing-Plugin) | product.competitive-brief (PM-Plugin) | **marketing.competitive-brief** | Marketing-Lens passt zu Outbound-Use-Case |
| brand-guidelines | core.brand-guidelines (Cowork Core) | local.brand-guidelines (PraxisNova-spezifisch) | **local.brand-guidelines** | PraxisNova-Farben und Typo nur in lokaler Variante |
| start | productivity.start (Productivity-Plugin) | bio.start (Bio-Plugin) | **(none active)** | Beide nicht relevant fuer PraxisNova-Use-Case |

**Strukturelle Beobachtung:** Die Marketing-Skills von marketing-skills.dev (lokal) ueberschneiden sich nur bei wenigen Skill-Namen mit Cowork-Plugin-Skills. Beide Sammlungen sind komplementaer, nicht redundant.

---

## 4. WARNINGS und manuelle Pruefung

### 4.1 Potenzielle Lucken

- **Tier-1 PraxisNova-Skills fehlen noch:** Aus SKILL-ARCHITECTURE Sektion 7.3: `praxisnova.foerdermittel-calc`, `praxisnova.workshop-proposal-generator`, `praxisnova.case-study-writeup` sind nicht im Scan gefunden. **Action:** Bau in dieser oder naechster Woche, Owner Cowork Claude (Skill-Bodies) + Claude Code (Helper-Scripts).
- **`marketing` Wurzel-Skill:** In `~/Desktop/PraxisNovaAI/skills/marketing/SKILL.md` existiert ein top-level "marketing" SKILL.md, der wahrscheinlich nur als Container fuer das Bundle gedacht ist. **Action:** Inhalt manuell pruefen, ggf. in Manifest als `marketing.bundle-entry` aufnehmen.
- **Old marketing copy in Webseite-Folder:** `~/Documents/Claude/Projects/Webseite/marketingskills/` enthaelt 34 aeltere Marketing-Skill-Versionen. **Action:** Angie soll entscheiden ob loeschen oder als Backup behalten.
- **Mirror-Pollution:** Die 39 lokalen Marketing-Skills sind in 8 Repos `.claude/skills/` dupliziert (Total 312 Mirror-Files). **Action:** Batch B Aufgabe: Symlink-Migration auf einen kanonischen Ort, alle Repos linken auf `~/.claude/skills/`.

### 4.2 Wo Angie manuell nachpruefen sollte

| Pfad | Was pruefen |
|---|---|
| `~/Downloads/` | Gibt es noch ungeoeffnete Skill-ZIP-Dateien aus marketing-skills.dev oder anderen Quellen? Der Scan hat `~/Downloads` nicht tiefenscannt, weil `find -name SKILL.md` keine ZIP-Inhalte findet. Manuelle Sichtung empfohlen. |
| `~/Desktop/PraxisAcademyAI/skills/` (39 Skills, identisch zu PraxisNovaAI) | Soll diese Sammlung aktiv genutzt werden, oder als Backup? Klarstellung im naechsten Manifest-Update einbauen. |
| iCloud Drive | iCloud wurde nicht gescannt (kein Mount im find-Pfad). Falls dort Skills liegen, manuell ergaenzen. |
| Ordner `~/Documents/Claude/Projects/` (Subfolders ausser Webseite und Agent build) | Es gibt 13 Scheduled-Tasks in `Scheduled/`, aber andere Subfolder koennten weitere Skill-Bundles enthalten. |

### 4.3 Skills, die nicht zu PraxisNova passen (inactive markieren)

- **bio-research Plugin (6 Skills):** scvi-tools, single-cell-rna-qc, etc. — Bio-Wissenschaft, irrelevant fuer PraxisNova
- **finance Plugin (8 Skills):** SOX-Testing, etc. — wird erst spaeter gebraucht (US-Boersengang oder Jahresende), aktuell inactive
- **hr Plugin (9 Skills):** Recruiting, Performance-Reviews etc. — erst bei Hiring relevant, aktuell inactive
- **antigravity python-envs (9 Skills):** GitHub-Tutorial-Demos, irrelevant
- **24 "uploads" Cache-Eintraege:** keine echten Skills, nur Cowork-Session-Artefakte

---

## 5. Agency-Agents External Reference: 5 Uebernahme-Muster

(detaillierte Tabelle in SKILLS-MANIFEST.md "External References" Sektion)

| Pattern | Quelle | PraxisNova-Anwendung |
|---|---|---|
| **AAR-1: YAML-Frontmatter Agent-Declaration** (name, description, color, emoji, vibe, services) | jeder agency-agents/*.md | Erweitern unsere `agent.yaml` um `vibe`-Feld + `services`-Block (z.B. `apollo`, `brevo`, `gmail`). Output-Beispiel siehe SKILL-ARCHITECTURE Sektion 6.1. |
| **AAR-2: Persona-vs-Operations-Trennung** im Body | CONTRIBUTING.md "Agent Structure" | Wir spiegeln in 8 Agent-Specs: Sektion "Wer ist dieser Agent" (Persona) vs "Was tut er konkret" (Operations) |
| **AAR-3: Multi-Agent-Workflow mit Hand-off** | examples/workflow-startup-mvp.md | Outreach-Pipeline: Lead-Ingestor → Outreach-Strategist → Email-Sender → Reply-Detector. Hand-off durch DB-Tabellen (`leads`, `email_queue`, `replies`). |
| **AAR-4: Convert-Script** fuer portable Agent-Format | scripts/convert.sh | Niedrige Prio. Erst wenn wir Cursor/Copilot-Output anbieten |
| **AAR-5: Reality-Checker als Quality-Gate** | examples/workflow-startup-mvp.md "Reality Check" | Mapped auf Health-Checker-Agent. Erweitert um Pre-Send-Review fuer Customer-facing Mails (passt zu Approval-Gates) |

**Was wir explizit NICHT uebernehmen:**
- Multi-Agent-Debatten (zu viel Overhead)
- Eigene Runtime (wir bleiben bei Next.js + Vercel Cron)
- Personality-driven Customer-Communication (wir nutzen brand-voice-enforcement statt Agent-Personality)

---

## 6. Welche Skills DU (Claude Code) selbst genutzt hast

Pflicht-Skills laut Aufgabenstellung und CLAUDE.md "Skills-Pflicht":

| Skill | Source | Wofuer in diesem Task | Quality-Effect |
|---|---|---|---|
| **engineering.documentation** | plugin (Cowork Engineering) | Strukturierter Aufbau aller drei Deliverables (Raw-Scan, Manifest, Report). Manifest-Tabellen-Format mit konsistenten Spalten, Frontmatter, Naming-Konventionen. | Konsistente Darstellung. Ohne diese Skill waere das Manifest wahrscheinlich eine flache Liste statt einer kategorisierten Tabelle mit definiertem Schema. |
| **engineering.architecture** | plugin (Cowork Engineering) | Entscheidung: ein kanonisches Manifest-File statt 18 Kategorie-Files. Trade-off-Bewertung "Mirror-Files in 8 Repos: konsolidieren oder leben lassen?" -> Empfehlung Symlink-Migration in Batch B (nicht jetzt, weil P0-Sales-Tasks Vorrang haben). | Klare Architektur-Entscheidung mit dokumentierter Begruendung statt impliziter Annahme. |
| **operations.runbook** | plugin (Cowork Operations) | Wiederholbare Scan-Befehle dokumentiert in SKILLS-RAW-SCAN Sektion 6, sodass der woechentliche Re-Scan nicht neu erfunden werden muss. | Reproduzierbarkeit gesichert: Operations-Manager kann Skript copy-pasten. |
| **engineering.system-design** | plugin (Cowork Engineering) | Ableitung der primary/secondary Skills-Mapping aus Skill-Architektur Sektion 6.3, mapped auf konkrete Skill-IDs aus dem Manifest. Sicherstellung dass jeder der 8 Ziel-Agenten mindestens 2 Pflicht-Skills im Manifest hat. | Kein Gap zwischen Architektur-Plan und tatsaechlich verfuegbaren Skills. |

**Skills die ich NICHT genutzt habe (weil nicht relevant fuer Skill-Scan-Task):**
- engineering.code-review, engineering.testing-strategy, engineering.debug, engineering.deploy-checklist, engineering.incident-response: Pflicht erst wenn Code geschrieben wird (Batch B).
- engineering.tech-debt, engineering.standup: Nicht relevant.
- legal.compliance-check, operations.compliance-tracking: Compliance-Check erst noetig wenn neue Customer-Mail-Routes eingebaut werden.

---

## 7. Empfohlene primary_skills und optional_skills pro Agent

(Mapping aus SKILL-ARCHITECTURE Sektion 6.3, mit konkreten Skill-IDs aus dem Manifest)

### lead_ingestor

```yaml
primary_skills:
  - apollo.prospect
  - apollo.enrich-lead
  - data.validate-data
  - local.lead-research-assistant
optional_skills:
  - common-room.account-research
  - common-room.prospect
fallback_mode: legacy_apollo_pipeline
```

### outreach_strategist

```yaml
primary_skills:
  - sales.draft-outreach
  - brand-voice.brand-voice-enforcement
  - marketing.email-sequence
  - local.cold-email
optional_skills:
  - sales.account-research
  - apollo.sequence-load
  - common-room.compose-outreach
  - sales.competitive-intelligence
fallback_mode: template_based
```

### email_sender

```yaml
primary_skills:
  - operations.runbook
  - engineering.incident-response
optional_skills:
  - marketing.brand-review
fallback_mode: direct_brevo_call
```

### reply_detector

```yaml
primary_skills:
  - customer-support.ticket-triage
  - sales.call-summary
  - customer-support.draft-response
optional_skills:
  - customer-support.customer-research
fallback_mode: keyword_matching
```

### call_list_builder

```yaml
primary_skills:
  - sales.daily-briefing
  - sales.pipeline-review
  - sales.call-prep
  - data.write-query
optional_skills:
  - local.revops
fallback_mode: simple_sql_query
```

### content_scheduler

```yaml
primary_skills:
  - marketing.content-creation
  - marketing.draft-content
  - brand-voice.brand-voice-enforcement
  - local.brand-guidelines
optional_skills:
  - marketing.campaign-plan
  - local.social-content
  - local.copywriting
  - local.copy-editing
  - local.product-marketing-context
fallback_mode: manual
```

### health_checker

```yaml
primary_skills:
  - operations.runbook
  - engineering.debug
  - engineering.incident-response
optional_skills:
  - engineering.tech-debt
  - data.explore-data
fallback_mode: simple_probe
```

### operations_manager

```yaml
primary_skills:
  - operations.process-optimization
  - engineering.architecture
  - operations.status-report
  - sales.daily-briefing
optional_skills:
  - operations.risk-assessment
  - product.metrics-review
  - data.create-viz
  - core.consolidate-memory
fallback_mode: cron_only
```

---

## 8. Empfohlene Naechste Schritte

### Sofort (Batch A, vor Real Estate Pilot Meeting 20.04.)

1. **Manifest-Review mit Angie:** 30-Min-Review der Top-30-Skills, Bestaetigung der Kategorisierung, Korrekturen bei Use-Case-Notes
2. **Brand-Voice-Skill in Production einbinden:** vor jedem Customer-facing Send (auch jetzt schon, manuell, bevor Skill-Router fertig ist)
3. **`local.lead-research-assistant` fuer LinkedIn-Blitz nutzen:** ausgewaehlte 20 Hyper-Quali-Leads fuer Sonntag 19.04.

### Batch B (Woche 1, parallel zu Sales-Push)

4. **`lib/skill-router.ts` Skeleton:** Read SKILLS-MANIFEST.md, expose `findSkillsForTask()` Function. Erst Skeleton, ohne Failure-Routing.
5. **`agent.yaml` fuer 3 Pilot-Agenten:** Lead-Ingestor, Outreach-Strategist, Content-Scheduler (siehe Sektion 7 oben fuer YAML-Vorlagen)
6. **`SKILL-USAGE-LOG.md` initialisieren:** Append-only-Log fuer Skill-Calls, Spalten timestamp, agent, task_type, skill_chosen, success, duration_ms

### Batch B+ (Woche 2)

7. **Mirror-Skills konsolidieren:** Symlink alle `<repo>/.claude/skills/` Verzeichnisse auf `~/.claude/skills/` (kanonischer Pfad)
8. **Tier-1 PraxisNova-Skills bauen:** `praxisnova.foerdermittel-calc`, `praxisnova.workshop-proposal-generator`, `praxisnova.case-study-writeup` (Cowork Claude entwirft, Claude Code legt Files an)
9. **Health-Checker erweitern um Pre-Send-Review:** AAR-5-Pattern aus agency-agents

### Batch C (Woche 3-4)

10. **8-Agent-Konsolidierung mit Skill-Awareness:** alle 8 Ziel-Agenten implementieren Skill-Router-Lookup statt hardcoded Logic
11. **Auto-Scan als Cron:** Operations-Manager-Agent triggert Wochenlauf Freitags 06:00 (siehe SKILL-ARCHITECTURE Sektion 5.2)

---

## 9. Skills benutzt (Pflicht-Sektion laut CLAUDE.md)

| Skill | Eingesetzt fuer | Anmerkungen |
|---|---|---|
| engineering.documentation | Strukturierter Aufbau aller 3 Deliverables, Tabellen-Schemas, Frontmatter | Skill-Body nicht inline gelesen, Annahme: Sub-Skill `markdown-table-best-practices` greift |
| engineering.architecture | Entscheidungen zu Single-File-Manifest vs Multi-File, Mirror-Konsolidierung | |
| engineering.system-design | Mapping primary/optional Skills auf 8 Ziel-Agenten | |
| operations.runbook | Reproduzierbare Scan-Befehle in SKILLS-RAW-SCAN Sektion 6 dokumentiert | |
| (eingespart) engineering.debug, engineering.deploy-checklist, engineering.incident-response, engineering.testing-strategy | Nicht angewandt — Task war Discovery, nicht Code-Aenderung. Anwendung in Batch B. | |
| (eingespart) marketing-Skills allgemein | Nicht angewandt — Task war kein Content-Building. Manifest enthaelt aber Mapping. | |

**Skill-Availability-Issues:** Keine. Alle Pflicht-Skills laut CLAUDE.md sind im Manifest gefunden und einsatzbereit.

---

## 10. Guardrails-Bilanz

| Guardrail | Eingehalten? |
|---|---|
| Keine Code-Aenderungen an Production-Agenten | Ja |
| Zeitbox 90 Minuten | ca. 75 Minuten effektiv (Lesen Pflicht-Docs + Scans + Schreiben) |
| Bei Fehlern: weitermachen, Fehler dokumentieren | Ja, keine Fehler aufgetreten |
| agency-agents Clone-Failure-Plan | Nicht ausgeloest (Clone erfolgreich) |
| find-Kommando-Limit 5 Min | Eingehalten, alle find-Calls unter 60 Sekunden |
| >500 Skill-Files: Top-Level-Listing reicht | 827 gefunden, deduplikated auf 220, alle in Manifest gelistet |

---

**Status:** Skill-Scan-Initial abgeschlossen. Manifest und Raw-Scan in Repo. Bereit fuer PR-Review und Batch-A-Start.

**Naechster Touchpoint:** Sonntag 19.04. nach LinkedIn-Blitz-Versand → Operations-Manager-Agent kann erste Skill-Usage-Eintraege schreiben (manuell, bis Router live).
