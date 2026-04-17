# Option C Plan, Amendment 01: Skill-basierte Architektur und aggressive Revenue-Execution

**Erstellt:** 2026-04-17 Abend
**Status:** Ergaenzt und erweitert `OPTION-C-MASTER-PLAN-2026-04-17.md`
**Priorität:** P0, verbindliche Grundlage fuer alle Builds ab sofort
**Anlass:** Angie hat gefordert, dass Claude Code alle lokalen Skills (Cowork-Skills, PraxisAI-Folder, externe Referenz-Agenten) aktiv nutzt und die Revenue-Execution noch aggressiver wird.

---

## 0. Warum dieses Amendment

Der urspruengliche Master Plan hat die Skill-Nutzung nur als eine von mehreren Techniken erwaehnt. Angie moechte sie jetzt als **Kern-Architektur**. Das ist gut, weil:

1. Skill-Wiederverwendung reduziert Fehlerquellen drastisch (Skills sind getestet, Ad-hoc-Code nicht)
2. Jede neue Agenten-Faehigkeit ist dann ein Konfigurationsthema, nicht ein Entwicklungs-Thema
3. Claude Code wird zum Integrator, nicht zum Neu-Erfinder. Das spart Zeit und Geld.
4. Das macht das System spaeter verkaufbar als "Plattform" (Option C Back-End)

Zusaetzlich: 2.000 Euro in 7 Tagen ist ambitioniert. Wir erweitern den Deal-Funnel, nicht nur Real Estate Pilot.

---

## 1. Zentrale Architektur-Aenderung: Skill-First

### 1.1 Begriffsdefinition

**Skill** im Sinne dieses Plans ist eine in sich geschlossene Capability-Einheit. Sie hat:
- Klaren Input (z.B. "Prospect-Firma XY")
- Klaren Output (z.B. "Research-Report Markdown")
- Eigene Anweisungen (SKILL.md oder README.md)
- Optional: Helper-Scripts

**Skill-Quellen in unserem System:**

| Quelle | Pfad | Inhalt |
|---|---|---|
| Cowork-Core-Skills | `~/.claude/skills/` (Kundensicht) bzw. `/sessions/peaceful-laughing-volta/mnt/.claude/skills/` | docx, pdf, xlsx, pptx, canvas-design, doc-coauthoring, etc. |
| Cowork-Plugin-Skills | `mnt/.remote-plugins/plugin_*/skills/` | apollo, brand-voice, sales, marketing, data, engineering, operations, legal, human-resources, etc. (rund 140 Skills) |
| PraxisAI-Local-Skills | Angie's Desktop, z.B. `~/Desktop/PraxisAI/skills/` | Firmenspezifische Skills (z.B. Foerdermittel-Berechnung, Real-Estate-Pilot-Context, etc., muessen noch angelegt werden) |
| Externe Referenz | github.com/msitarzewski/agency-agents | Blueprint fuer Multi-Agent-Koordination, wird adaptiert nicht geklont |
| Agents-Build-Outputs | `Agent build/skills/` (neu) | Case-Study-Skills, Foerderantrags-Skills, die Claude Code baut |

### 1.2 Drei Ebenen der Skill-Nutzung

**Ebene 1: Cowork-Claude (Planung, Strategie, Texte)**
- Nutzt bereits alle Cowork-Skills (brand-voice, marketing, sales, docx, pptx, etc.)
- Diese Ebene ist fertig, keine Anpassung noetig
- Deliverables gehen immer in `Agent build/`

**Ebene 2: Claude Code (Build, Integration, Automatisierung)**
- Muss **aktiv** die engineering:* Skills, operations:* Skills und data:* Skills nutzen
- Muss die lokalen PraxisAI-Skills scannen und in seinen Arbeitsprozess integrieren
- Muss externe Referenz-Muster (msitarzewski/agency-agents) als Inspiration fuer Multi-Agent-Koordination nutzen

**Ebene 3: Unsere eigenen Agenten (Production)**
- Werden so gebaut, dass jeder Agent selbst "Skill-aware" ist
- Beispiel: Outreach-Strategist-Agent sucht zuerst in Skills-Folder nach passender Template-Generator-Skill, nutzt diese, fallback ist generische Logik
- Vorteil: Neue Features = neue Skills hinzufuegen, nicht Code aendern

### 1.3 Skill-Manifest (zentrale Discovery)

Claude Code erstellt und pflegt `Agent build/SKILLS-MANIFEST.md`. Das Manifest ist eine Tabelle mit Spalten: Skill-Name, Pfad, Quelle, Kategorie, Letzte-Pruefung, Genutzt-von-Agent, Status.

Jeder Agent-Code referenziert dieses Manifest. Jede Woche wird das Manifest automatisch neu gescannt (Task des Operations-Manager-Agent).

---

## 2. Skill-Integration in die 8 Ziel-Agenten

Aus dem Master Plan kennen wir die 8 konsolidierten Agenten. Hier die Skill-Mapping:

| Agent | Pflicht-Skills | Optionale Skills | Fallback |
|---|---|---|---|
| Lead Ingestor | apollo:prospect, apollo:enrich-lead, data:validate-data | common-room:account-research | Legacy-Apollo-Code |
| Outreach Strategist | brand-voice:brand-voice-enforcement, marketing:email-sequence, sales:draft-outreach | sales:account-research, apollo:sequence-load | Alte Template-Logik |
| Email Sender | operations:runbook, engineering:incident-response (fuer Fehler) | marketing:brand-review | Direkter Brevo-Call |
| Reply Detector | customer-support:ticket-triage, sales:call-summary | customer-support:customer-research | Keyword-Matching |
| Call List Builder | sales:daily-briefing, sales:pipeline-review | sales:call-prep | Einfache SQL-Query |
| Content Scheduler | marketing:content-creation, marketing:draft-content, brand-voice:brand-voice-enforcement | marketing:campaign-plan | Manuell |
| Health Checker | operations:runbook, engineering:debug, engineering:incident-response | engineering:tech-debt | Simple Probe |
| Operations Manager | operations:process-optimization, engineering:architecture | operations:risk-assessment | Cron nur |

**Regel:** Jeder Agent lädt beim Start seine Pflicht-Skills. Fehlt eine Skill, wird der Agent in den Degraded-Mode geschaltet und nutzt den Fallback, plus einen Slack-Alert an Angie.

---

## 3. Wie Skills dynamisch ausgewaehlt werden

Statt fester Skill-Zuordnung bekommt jeder Agent einen **Skill-Router**. Der Router entscheidet pro Task welche Skill passt.

**Pseudo-Logik:**
1. Agent bekommt Task (z.B. "Outreach fuer Hausverwaltung X")
2. Agent fragt Skill-Router: "Welche Skill passt fuer Task-Typ 'Outreach', Zielgruppe 'Hausverwaltung'?"
3. Router lädt Skill-Manifest und matcht auf Kategorie, Zielgruppe, Spracheinstellung
4. Router gibt Prioritaetsliste zurueck: `[sales:draft-outreach, marketing:email-sequence, fallback]`
5. Agent versucht Skill 1, wenn Fehler dann Skill 2, wenn Fehler dann Fallback
6. Ergebnis plus Skill-Nutzungs-Log gehen in DB und in `Agent build/SKILL-USAGE-LOG.md`

**Maintenance:** Wenn eine Skill oft fehlschlaegt, wird sie automatisch niedriger priorisiert. Nach 3 Fehlschlaegen Alarmierung an Angie.

---

## 4. External Reference: msitarzewski/agency-agents

Wir **klonen nicht** das Repo. Wir lesen es, identifizieren 3 bis 5 Muster und uebertragen sie.

**Zu pruefende Muster (Claude Code Aufgabe in Batch A):**
1. Wie werden Agenten orchestriert (Message-Queue? Direct-Call?)
2. Wie werden Skills deklariert (YAML? JSON-Schema?)
3. Wie wird Fallback implementiert
4. Wie wird Retry/Backoff geregelt
5. Wie wird Observability/Logging strukturiert

**Output:** `Agent build/EXTERNAL-REFERENCE-ANALYSIS-msitarzewski.md` mit den 3 bis 5 konkreten Uebernahme-Entscheidungen.

**Zeitbox:** Maximal 90 Minuten Analyse, nicht tiefer graben. Wir wollen Muster, keine Code-Kopien.

---

## 5. Aggressive Revenue-Execution: Weg zu 2.000 Euro in 7 Tagen

Der urspruengliche Master Plan hat Real Estate Pilot AG als Hauptweg. Das bleibt, aber wir erweitern den Funnel aggressiv, weil 40 Prozent Chance auf 2.900 Euro reicht nicht fuer 100 Prozent Planung.

### 5.1 Vier parallele Revenue-Kanaele diese Woche

**Kanal A: Real Estate Pilot AG Workshop-Deal (Montag)**
- Erwartung: 40 Prozent Chance auf 2.900 bis 4.900 Euro
- Deliverable-Stand: Meeting-Script fertig, Angebot-Leiter fertig
- Owner: Angie
- Deadline: Dienstag 21.04. schriftliches Angebot, Donnerstag 23.04. Unterschrift

**Kanal B: Upsell bei den 3 Forderungsmanagement-Pilot-Kunden (sofort)**
- Diese 3 Kunden sind bereits aktiv mit uns, aber nicht als Case Study und nicht als Cross-Sell bearbeitet
- Angebot: "KI-Workshop fuer Ihr Team, damit Sie den Forderungsmanagement-Prozess selbst erweitern koennen", 1.900 Euro Case-Study-Preis (statt 2.900)
- Erwartung: 1 von 3 konvertiert = 1.900 Euro
- Owner: Angie (Telefonanruf am Samstag)
- Deadline: Dienstag 21.04. muendliche Zusage

**Kanal C: LinkedIn-DM-Blitz an 20 hyper-qualifizierte Kontakte (Samstag/Sonntag)**
- Zielgruppe: Geschaeftsfuehrer PropTech, Hausverwaltung, Kanzleien DACH, unter 200 MA
- Angebot: "Kostenloser 30-min Strategie-Call. Wenn wir nach 30 Minuten keinen konkreten KI-Hebel finden, bekommen Sie 500 Euro Cash zurueck bei Buchung." (Risiko-Umkehr)
- Ziel: 3 Calls gebucht, davon 1 Conversion zu 2.900 Euro Workshop
- Erwartung: 30 Prozent Chance auf 2.900 Euro
- Owner: Angie schreibt, Claude Cowork entwirft Texte mit brand-voice Skill
- Deadline: Sonntag 19.04. Abend alle 20 Messages raus

**Kanal D: Bestehende Pipeline reaktivieren (Sonntag)**
- 3.000 Kontakte aus altem Outreach
- Nicht reaktivieren mit Mail-Blast, sondern: 50 handverlesene, die zu neuer ICP passen
- Neue Message: "Wir haben unser Angebot neu strukturiert. Foerderfaehig mit bis zu 50 Prozent Kostenuebernahme. Darf ich Ihnen eine 1-Seiten-Uebersicht schicken?"
- Erwartung: 5 Prozent Reply-Rate = 2 bis 3 Leads, davon 1 in der Woche abschluss-reif
- Owner: Claude Code filtert Liste, Claude Cowork schreibt Message, Angie versendet
- Deadline: Montag 20.04. vormittag (vor dem Real Estate Pilot Meeting)

### 5.2 Erwartungswert-Rechnung

| Kanal | Wahrscheinlichkeit | Ticket-Mittel | Erwartungswert |
|---|---|---|---|
| A Real Estate Pilot | 40% | 3.500 | 1.400 |
| B Upsell Pilots | 33% | 1.900 | 627 |
| C LinkedIn Blitz | 30% | 2.900 | 870 |
| D Pipeline Reaktivierung | 25% | 2.900 | 725 |

**Summe Erwartungswert: 3.622 Euro**

Das ist deutlich ueber dem 2.000 Euro Ziel, gibt uns Puffer. Selbst wenn 2 Kanaele ausfallen, sollten wir 2.000 Euro erreichen.

### 5.3 Hartgrenzen

- **Kein Discount unter 1.900 Euro netto** in dieser Woche, egal welcher Kanal
- **Kein Gratis-Projekt mehr**, auch nicht als "Pilot" (Angies Beobachtung: wird nicht angenommen und entwertet)
- **Nur Zahlung per Rechnung nach Leistung**, keine Vorauszahlung gefordert (reduziert Zahlungs-Friktion)
- **Jede Conversation wird in call_queue geloggt**, auch muendliche Zusagen

---

## 6. Skill-Einsatz bei den 4 Revenue-Kanaelen

| Kanal | Skill-Nutzung |
|---|---|
| A Real Estate Pilot | sales:call-prep, sales:draft-outreach, docx (fuer Angebot), legal:triage-nda (falls NDA kommt) |
| B Upsell | sales:pipeline-review, sales:draft-outreach, customer-support:draft-response |
| C LinkedIn Blitz | brand-voice:brand-voice-enforcement, sales:draft-outreach, marketing:draft-content |
| D Pipeline Reaktivierung | apollo:prospect (fuer ICP-Filter), marketing:email-sequence, brand-voice:brand-voice-enforcement |

Diese Skill-Nutzung wird in jedem Deliverable dokumentiert, in der Header-Sektion "Skills genutzt".

---

## 7. Wer macht was (verschaerfte Task-Allocation)

### Claude (Cowork, Strategic Advisor)

- Erstellt alle Texte, Angebote, Meeting-Scripts
- Pflegt alle .md-Deliverables in `Agent build/`
- Entwirft die Skill-Architektur (dieses Dokument)
- Bereitet Verhandlungs-Sparring vor (fuer Angies Calls)
- Verfasst LinkedIn-Blitz-Texte mit brand-voice-Skill
- Schreibt die Angebots-Templates in Docx
- Aktualisiert CHANGELOG, Session-Docs, Memory
- Entwirft Foerdermittel-One-Pager
- Liefert wochentlichen Status-Report jeden Freitag

**Claude macht NICHT:** Code aendern, Deployments anstossen, DB-Queries gegen Live-System, Agent-Konfiguration.

### Claude Code (Build, Integration, Automatisierung)

- Scannt Skills-Folder (lokal und in mnt)
- Baut SKILLS-MANIFEST.md und haelt es aktuell
- Konsolidiert 24 auf 8 Agenten (Batch C)
- Fixt die kritischen Bugs (Apollo, Calendar, Dashboard) (Batch A)
- Baut Skill-Router in jeden Agent ein
- Analysiert msitarzewski/agency-agents und uebernimmt 3 bis 5 Muster
- Liefert Reports nach jeder Session in `Agent build/`
- Pflegt ERROR-CATALOGUE.md
- Deployt und monitort
- Pflichtnutzung der engineering:* Skills und operations:* Skills

**Claude Code macht NICHT:** Marketing-Texte schreiben, Angebote verhandeln, Strategie-Entscheidungen, neue Features ohne Option-C-Bezug.

### Angie (Execution, Sales, Ownership)

Siehe separates Dokument `ANGIE-MANUAL-TASKS-2026-04-17.md` fuer Details. Kurz:
- Fuehrt Real Estate Pilot Meeting
- Ruft die 3 Pilot-Kunden an
- Schickt LinkedIn-DMs
- Gibt Texte und Angebote frei bevor sie rausgehen
- Entscheidet ueber Batch-Freigaben fuer Claude Code
- Stimmt mit Samantha ab

### Samantha (Co-Founder, Backup, Operations)

- Dry-Run Meeting am Samstag oder Sonntag
- Silent Support waehrend Real Estate Pilot Meeting
- Uebernimmt Call 2 der Pilot-Kunden (falls Angie Zeit-constrained)
- Pflegt Rechnungslegung fuer Neukunden
- Prueft Claude-Deliverables auf fachliche Korrektheit

---

## 8. Naechste Dokumente (werden in dieser Session erstellt)

1. `SKILL-ARCHITECTURE-2026-04-17.md` (Detail-Dokument mit Implementierungs-Details fuer Claude Code) - siehe Sektion 9
2. `ANGIE-MANUAL-TASKS-2026-04-17.md` (Angies Working Doc, prioritaet-sortiert, speed-focused)
3. `CLAUDE-CODE-PROMPTS-COPY-PASTE-2026-04-17.md` (Copy-Paste-ready Prompts fuer Claude Code Sessions)

Zusaetzlich Updates:
- CHANGELOG.md wird ergaenzt
- SESSION-2026-04-17-OPTION-C-ACTIVATION.md wird ergaenzt mit Amendment-Info

---

## 9. Verweis auf Skill-Architektur-Dokument

Die vollstaendige Architektur-Definition (Manifest-Schema, Router-Logik, Scan-Prozess, Wartung) steht im Dokument `SKILL-ARCHITECTURE-2026-04-17.md`. Dieses Amendment gibt den Rahmen, das separate Dokument gibt die Details fuer die technische Umsetzung durch Claude Code.

---

## 10. Guardrails fuer dieses Amendment

- Wenn die Skill-Integration zu komplex wird (mehr als 3 Tage Dev-Zeit), wird sie abgebrochen und auf das MVP reduziert: einfaches Manifest ohne Router
- Wenn die 4 Revenue-Kanaele zu viel parallelen Effort erfordern, wird Kanal D (Pipeline Reaktivierung) zuerst gestrichen
- Jeder Agent behaelt Fallback-Logik, damit Skill-Fehler nie den Production-Pfad killen
- Keine experimentellen Features in dieser Woche, nur Stabilisierung und ICP-Umbau

---

**Status:** Verbindlich ab 2026-04-17 Abend. Angie bestaetigt per Slack oder Antwort in Cowork.
**Owner:** Claude Cowork (Strategie), Claude Code (Technik), Angie (Execution, Sales)
