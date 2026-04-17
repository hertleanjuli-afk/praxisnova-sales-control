# Option C Master Plan: Narrow Hybrid Launch

**Version:** 1.0
**Datum:** 2026-04-17
**Eigentuemer:** Angie Hertle, Samantha Meyer
**Strategic Advisor:** Claude (Cowork)
**Zielvorgabe Woche 1:** 2.000 Euro Umsatz bis 24.04.2026

---

## Inhalt

0. Management Summary
1. Business Model Option C (Detail)
2. System Analyse: warum es aktuell bricht
3. Ziel-Architektur: robust, einfach, skalierbar
4. Marketing und Growth Strategie (Email, LinkedIn, TikTok)
5. Task Allocation (Angie, Samantha, Cowork Claude, Claude Code)
6. Intelligent Agent System (Future State, self-healing)
7. Execution Plan 7 Tage: Weg zu 2.000 Euro
8. Execution Plan Woche 2 bis 8
9. Guardrails und Risiken
10. KPI-Dashboard Definition

---

## 0. Management Summary

Option C ist kein Neustart, es ist eine Re-Fokussierung. Wir behalten 80 Prozent der Technik, aendern 100 Prozent des Ziels.

**Business Model in 3 Saetzen:**
Wir verkaufen Unternehmen in PropTech, Hausverwaltung, Steuerberatung, Kanzleien und digitalen Agenturen in-House KI-Workshops und Festpreis-Automatisierungen. Wir positionieren uns als Foerder-Kompetenz, nicht als Tech-Anbieter. Kurse folgen spaeter als Back-End, sobald wir 3 bis 5 Referenzen haben.

**Revenue-Logik Woche 1:**
Es gibt genau einen Pfad zu 2.000 Euro bis 24.04: Real Estate Pilot AG (Meeting 20.04.) kauft einen Workshop oder ein Festpreis-Paket. Alles andere in Woche 1 ist Risikomitigation durch Backup-Pipeline.

**System-Logik Woche 1 bis 4:**
Wir ueberarbeiten NICHT das komplette System in 1 Woche. Wir stabilisieren in Woche 1 nur das was fuer Deal-Closing kritisch ist (Website Messaging, Lead-Detail-Seite, Anrufliste, 1 Landing Page). Den Rest des Infrastruktur-Rebuilds machen wir in 3 bis 4 Wochen, waehrend der Sales-Motor laeuft.

**Kostenrahmen:**
Zero Euro neue Ausgaben. Wir nutzen den bestehenden Stack (Vercel, Neon, Brevo, HubSpot Free, Apollo vorhandenes Abo, Gemini Paid). Keine neuen SaaS-Tools. Keine Ads. Kein Bildungs-Zertifikat-Kauf in Woche 1 (AZAV kommt spaeter, wenn Cash da ist).

---

## 1. Business Model Option C (Detail)

### 1.1 Offer Architecture

Drei Angebotssegmente, klare Conversion-Leiter:

#### Segment A: Entry Offer (Lead Capture)

**Produkt:** Kostenloser KI-Quickscan (aendert QuickCheck-Branding)
**Preis:** 0 Euro
**Format:** 30 Min Video-Call + 1-Seiten-Bericht per Email innerhalb 48 Stunden
**Inhalt:** 3 konkrete KI-Use-Cases fuer das Unternehmen, grobe Einsparungsschaetzung, Foerdermoeglichkeiten-Hinweis
**Zweck:** Qualifikation, Vertrauensaufbau, kein Produktverkauf
**Zeitaufwand Angie:** 45 Min pro Call
**Konvertiert in:** 20 bis 30 Prozent auf Segment B oder C

#### Segment B: Core Offer (Hauptumsatz)

**Produkt 1: Inhouse KI-Workshop (1-Tag)**
- Preis: 2.900 Euro netto
- Foerderung kommunizieren: go-digital bis 50 Prozent (ab Monat 2 mit formalem Partner-Status), uWM bis 80 Prozent
- Dauer: 1 Tag (8 Stunden) vor Ort oder remote
- Teilnehmer: bis zu 12 Personen
- Lieferumfang: Live-Workshop plus 15-seitiges Playbook plus 30 Min Q&A Woche spaeter
- Inhalt: KI-Grundlagen fuer das konkrete Geschaeft + Identifikation 3 bis 5 Use Cases + Hands-on mit ChatGPT/Claude + Playbook fuer naechste Schritte
- Margen-Logik: 1 Vorbereitungstag + 1 Liefertag = 2.900 Euro / 2 Manntage = ca. 1.450 Euro/Tag

**Produkt 2: Inhouse KI-Workshop (2-Tage + Follow-up)**
- Preis: 4.900 Euro netto
- Zielkunden: mittelgrosse Unternehmen ab 25 MA
- Dauer: 2 Tage Workshop + 2 Stunden Follow-up nach 30 Tagen
- Zusaetzlich: prototypisches AI-Template (ein kleiner Agent oder ein GPT) auf das Unternehmen zugeschnitten
- Margen-Logik: 2 Vorbereitungstage + 2 Liefertage + 0,5 Follow-up = 4,5 Manntage = ca. 1.090 Euro/Tag

**Produkt 3: Done-for-you Automatisierung (Small Scope)**
- Preis: 3.500 Euro Festpreis
- Dauer: 2 Wochen Build, inkl. 1 Discovery-Workshop-Tag
- Scope: 1 konkrete Automatisierung (z.B. automatische Email-Kategorisierung, Standortdaten-Enrichment, Vertragsparser)
- Deliverables: lauffaehiges System + Dokumentation + 30 Min Handover
- Margen-Logik: 5 Manntage = 700 Euro/Tag (hoehere Marge durch wiederverwendbare Templates)

**Produkt 4: Done-for-you Automatisierung (Medium Scope)**
- Preis: 8.000 Euro Festpreis
- Dauer: 4 Wochen Build, inkl. 2 Workshop-Tage
- Scope: 2 bis 3 Automatisierungen, Integration in Bestands-Tools
- Margen-Logik: 10 Manntage = 800 Euro/Tag

#### Segment C: Back-End Offer (Monat 4+)

**Produkt 5: Online-Kurs Pilot-Cohort**
- Preis: 599 bis 999 Euro pro Person
- Format: 6 Wochen, 1 Live-Session pro Woche, 8 bis 15 Teilnehmer
- Launch: fruehestens Q3 2026, nur wenn 3+ Workshop-Case-Studies stehen
- Zweck: Skalierbares Back-End nach etabliertem Brand

**Produkt 6: KI-Autopilot Retainer**
- Preis: 1.500 Euro pro Monat, min 3 Monate
- Nicht oeffentlich gelistet
- Nur Upsell nach erfolgreichem Workshop oder DFY-Projekt
- Ziel: 3 bis 5 Retainer-Kunden in Monat 6

### 1.2 Zielgruppen-Matrix

| Segment | Groesse (DACH) | Adoption | Warum jetzt | Einstiegsprodukt |
|---|---|---|---|---|
| Hausverwaltungen 10-100 Einheiten | ca. 5.000 Firmen | Mittel, stark steigend | onOffice + Propstack pushen AI-Features | 1-Tages Workshop |
| PropTech Startups | ca. 800 Firmen | Hoch | Wollen Vertikal-Know-how von AI-Expertin | DFY Projekt |
| Steuerberater mit 5-30 MA | ca. 12.000 Kanzleien | Steigend | DATEV-Konkurrenzdruck, Mandanten fragen nach | 1-Tages Workshop mit Sie/Mandanten-Kommunikations-Fokus |
| Kleine Kanzleien | ca. 8.000 | Mittel | Dokumentenautomatisierung ist Hebel | 2-Tages Workshop |
| Digitale Agenturen | ca. 3.000 | Sehr hoch | Wollen AI-Skill fuer eigene Kunden | DFY Projekt oder White-Label-Workshop |

**Bau und Handwerk:** Explizit DEPRIORISIEREN, aber bestehende Leads nicht loeschen. In HubSpot Tag "Bau-Longshot" und Follow-up nur bei klarer Intent-Signals (Stellenanzeige, LinkedIn-Post, Kontakt von uns selbst initiiert).

### 1.3 Preis-Logik

**Warum diese Preise:**
- 2.900 Euro ist das psychologische "Workshop-Standard" in DACH B2B
- 4.900 Euro erlaubt 50%-Foerdermittel-Abruf bei 2.450 Euro Netto fuer Kunde
- 3.500 Euro und 8.000 Euro DFY sind unter-premium positioniert, um Case Studies zu gewinnen
- Nach 3 Case Studies: Preise um 30 bis 50 Prozent heben

**Zahlungsbedingungen:**
- Workshop: 50 Prozent bei Buchung, 50 Prozent nach Workshop. Rechnung per Email, Zahlungsziel 14 Tage
- DFY: 40 Prozent bei Start, 40 Prozent bei Mid-Milestone, 20 Prozent bei Handover
- Keine Stundensaetze kommunizieren, nie. Festpreis oder Paketpreis.

### 1.4 Unique Selling Proposition (neu)

**Alte USP (muss weg):** "Wir automatisieren Prozesse in Bau, Handwerk, Immobilien"

**Neue USP:**
> "Wir bringen KI mit Foerdermittel in Hausverwaltungen und professionelle Dienstleister, ohne dass du selbst lernen musst, wie die Technik funktioniert."

**Tagline Varianten (fuer A/B Test in Content):**
- "KI fuer Hausverwaltung, bezahlt vom Staat"
- "Zwei Tage Workshop, acht Wochen freier Kopf"
- "Wir uebersetzen KI in deine Branche, nicht umgekehrt"
- "Vom Tool zum Team: KI, die wirklich im Unternehmen landet"

---

## 2. System Analyse: warum es aktuell bricht

### 2.1 Symptome die du gemeldet hast

- Agenten fallen aus oder gehen offline
- Automatisierte Workflows brechen regelmaessig
- Dashboard-Daten moeglicherweise unzuverlaessig
- Infrastruktur laeuft nicht sauber

### 2.2 Diagnose (basierend auf Memory-Historie und Projektlogs)

**Haupt-Bruchstellen:**

1. **Cron-Job-Overload auf Vercel Hobby Plan**
   - 40+ Cron-Entries auf Hobby-Plan, Rate Limits und Concurrency-Probleme
   - `isAlreadyRunning` Lock-Logik existiert aber loescht nicht immer sauber bei Timeouts
   - Symptom: Agenten springen "an" aber machen nichts, Logs zeigen 429/503

2. **Apollo 422 Regressionen**
   - Mehrfach gemeldet, unter anderem ff4a2b2 Fix
   - Root cause: Apollo API Schema-Drifts nicht zentral abgefangen
   - Symptom: Prospect-Runs schlagen fehl, Lead-Import bricht ab

3. **Calendar OAuth Token-Probleme**
   - 401 Fehler, OAuth-Token-Refresh unzuverlaessig
   - Symptom: Meeting-Buchung bricht, Lead-Calls nicht im Kalender

4. **Gmail Reply-Detection Luecken**
   - Real Estate Pilot Fall: Amelies Antwort an Marcos Lead-Eintrag wurde nicht zugeordnet
   - Keine unternehmensweite Sequenz-Stopp-Logik

5. **Dashboard Daten-Inkonsistenz**
   - "website-klicks Alle=0 vs Immobilien=100" smoking gun vom 2026-04-11 Forensik-Fall
   - Mehrere Datenquellen (Brevo, HubSpot, interner DB), keine Single Source of Truth
   - Brevo-Stats-Sync ist im Plan aber nicht live

6. **LLM-Fallback-Logik unvollstaendig**
   - Gemini 3 Flash Paid als Primary, Groq als Fallback konfiguriert (Phase 1 LLM-Migration 16.04.)
   - Aber: Retry-Logic fuer einzelne Agent-Routes unterschiedlich ausgepraegt
   - Symptom: einzelne Agents schlagen fehl, andere nicht, inkonsistent

**Strukturelle Schwaechen:**

- **Zu viele Agenten gleichzeitig produktiv:** 24 konfiguriert laut CHANGELOG 16.04., davon viele mit ueberschneidendem Scope. Debug-Flaeche riesig.
- **Keine zentrale Error-Telemetry:** Jeder Agent loggt eigen, keine aggregierte Alert-Ansicht
- **Fehlendes Health-Check-Dashboard:** Du siehst nicht auf einen Blick, welche Agenten heute erfolgreich liefen
- **TASKS.md / Session-Doku ist manuell gepflegt:** ein Daily-Builder-Agent koennte das automatisieren, wird aber noch nicht zuverlaessig getan
- **Kein zentraler "Kill-Switch":** Wenn etwas schief laeuft, kannst du nicht 1-Click alle Agenten pausieren

### 2.3 Priorisierte Bruchstellen fuer Woche 1

Nicht alles muss jetzt weg. Was blockiert Umsatz in Woche 1?

| Bruch | Blockiert Umsatz? | Woche 1 Prio |
|---|---|---|
| Cron-Overload | Ja, Outreach-Agent kann ausfallen | P0 |
| Apollo 422 | Ja, neue Leads | P0 |
| Gmail Reply-Detection | Ja, Real Estate Pilot Replies verpasst | P0 |
| Dashboard Daten | Nein, nur Reporting | P2 |
| Calendar OAuth | Ja, Meeting-Buchung bei Real Estate Pilot | P0 |
| LLM Fallback | Teilweise, Agent-Robustheit | P1 |
| Health-Check | Nein | P2 |
| Kill-Switch | Nein | P2 |

**Woche 1 Fix-Set (Claude Code):**
1. Cron-Entries reduzieren: nur 10 kritische Agenten, Rest pausieren
2. Apollo-Wrapper: zentrale Error-Handling, Schema-Validation
3. Gmail Reply-Detection unternehmensweit (nicht Lead-spezifisch)
4. Calendar OAuth Token-Refresh Fix (falls noch offen)
5. Simple Health-Check Seite (1 Tabelle, letzter Erfolg pro Agent)

---

## 3. Ziel-Architektur: robust, einfach, skalierbar

### 3.1 Prinzipien

1. **Less is more:** Lieber 8 Agenten die 100 Prozent der Zeit laufen als 24 die 60 Prozent laufen
2. **Single Source of Truth:** Neon Postgres ist THE database. Brevo, HubSpot, Apollo sind Feeder, nicht Owner
3. **Fail-closed nicht fail-open:** Agent haelt an bei Unsicherheit und alertet, faelscht keine Daten
4. **Human in the loop an kritischen Gates:** kein Agent verschickt kundenseitige Email ohne Queue/Review
5. **Beobachtbarkeit zuerst, Optimierung zweitens:** bevor wir neue Features bauen, sehen wir jeden Agent-Run als Datensatz

### 3.2 Ziel-Agent-Portfolio (reduced)

Aktuell 24 Agenten. Ziel-Zustand nach Rebuild: **8 Kernagenten**.

| Agent | Zweck | Frequenz | Input | Output |
|---|---|---|---|---|
| Lead Ingestor | Neue Leads aus Apollo/Website importieren und deduplizieren | Alle 2h | Apollo API, Website Form | leads Table |
| Outreach Strategist | 1 Email-Sequenz pro Lead schedulen basierend auf Segment und Trigger | Daily 07:00 | leads Table | email_sequences |
| Email Sender | Emails aus Queue senden via Brevo | Every 30 min | email_queue | Brevo + email_log |
| Reply Detector | Gmail Inbox scannen, Replies zuordnen (per Domaene, nicht nur per Email-Adresse), Sequenzen stoppen | Every 15 min | Gmail API | lead_status, replies Table |
| Call List Builder | Taegliche Anrufliste mit max 10 Leads erzeugen, Scoring-Logik | Daily 08:00 | leads + replies + sequences | call_queue |
| Content Scheduler | LinkedIn-Posts aus Draft-Table zu fixer Uhrzeit ueber manuellen Reminder planen | Daily 06:00 | linkedin_posts Draft | Reminder Email + Calendar Event |
| Health Checker | Alle Agent-Runs der letzten 24h pruefen, anomale Muster alerten | Daily 20:00 | agent_runs Log | health_report Email an Angie |
| Operations Manager | Daily Summary Email mit KPIs und To-Dos | Daily 17:00 | alle DBs | Email an Angie und Samantha |

**Abgeschaltet/archiviert:** Prospect Researcher (macht Lead Ingestor mit), Follow-Up Tracker (macht Outreach Strategist mit), Partner Outreach Strategist (auf manuell, nicht automatisch), Partner Researcher, Sales Supervisor, Partner Supervisor, Marketing Supervisor, Content Creator Agent, Email Campaign Agent, und alle Agents die keinen messbaren Output fuer die naechsten 4 Wochen liefern

### 3.3 Dashboard Ziel-Zustand

Eine einzige Dashboard-Seite mit 4 Sektionen:

1. **Today** (oben, immer sichtbar)
   - Anzahl neuer Leads heute
   - Anzahl Emails geschickt heute
   - Anzahl Replies heute
   - Anzahl Calls auf Liste heute
   - Cron-Jobs: alle gruen / 1 orange / 2+ rot

2. **Deal Pipeline** (Kanban)
   - Spalten: Lead, Qualified, Proposal Sent, Closed Won, Closed Lost
   - Karten mit Firma, Wert, naechster Schritt
   - Clickbar zu Lead-Detail

3. **Revenue Tracking**
   - Monat-to-Date Euro
   - Woche-Ziel vs Ist (in Woche 1: Ziel 2.000 Euro)
   - Naechste 30 Tage Pipeline Euro gewichtet

4. **System Health**
   - Last Run Status pro Agent
   - Error Rate letzten 24h
   - Letzte 10 Fehler mit Log-Link

### 3.4 Datenmodell Kernentitaeten

Minimum Schema (bereits groesstenteils in Neon):

```
leads: id, company, domain, contact_name, contact_email, contact_phone, segment, stage, source, created_at, last_activity
email_log: id, lead_id, direction, subject, sent_at, opened_at, replied_at, content_preview
call_queue: id, lead_id, priority, scheduled_for, disposition, attempt_number
deals: id, lead_id, product, amount, stage, close_date, notes
agent_runs: id, agent_name, started_at, ended_at, status, error_message, metric_json
kpi_snapshots: id, date, metric_name, value
```

Kritisch neu: `deals` Tabelle, sie fehlt noch strukturiert. Heute stehen Deals vermutlich in HubSpot oder nirgends.

---

## 4. Marketing und Growth Strategie

Kein Ad-Spend, kein zusaetzliches Tool-Budget, organisches Wachstum.

### 4.1 Email-Outreach (Agent-Basiert, niedrig Volumen, hohe Qualitaet)

**Vorher:** 100+ Mails pro Tag, generisch
**Nachher:** 15 Mails pro Tag, hyper-personalisiert

**Ablauf pro Mail:**
1. Apollo-Lead gezogen aus neuer Liste: PropTech, Hausverwaltung, Kanzlei, Steuerberater 10-100 MA, DACH
2. Outreach Strategist Agent schreibt personalisierte 1st Mail mit 1 Trigger-Bezug (LinkedIn-Post, Stellenanzeige, Firmen-News)
3. Angie oder Samantha reviewt in 30-Sek Queue-Ansicht, genehmigt oder korrigiert
4. Versand via Brevo

**Email-Sequenz (neu, 3-Step in 10 Tagen):**
- Tag 1: Mail 1 mit Trigger-Bezug, Foerder-Hook ("mit go-digital 50 Prozent gefoerdert"), klare Frage
- Tag 5: Mail 2 Case Study-Teaser (sobald 1 Case Study live ist)
- Tag 10: Mail 3 "Letzte Nachricht, wenn es kein Fit ist kein Problem"
- Danach: LinkedIn Connect-Request ohne Nachricht
- Nach 7 Tagen: Auf Anrufliste falls Unternehmen >20 MA

**Subject Line Beispiele:**
- "Kurze Frage zu [Firmenname] und KI-Einsatz"
- "onOffice + KI = ? (fuer [Firmenname])"
- "Foerdermittel fuer Ihre Digitalisierung bei [Firmenname]"

**Volumen:**
- 15 Mails pro Tag x 5 Werktage = 75 Mails pro Woche
- Erwartete Reply Rate bei guter Personalisierung: 8 bis 15 Prozent = 6 bis 11 Replies pro Woche
- Davon qualifizierte Calls: 30 Prozent = 2 bis 3 Calls pro Woche
- Davon Close: 10 bis 20 Prozent = 1 Deal alle 2 bis 3 Wochen

### 4.2 LinkedIn (Organic)

**Profil-Update Angie (Samstag 18.04. Aufgabe):**
- Headline: "Ich helfe Hausverwaltungen und professionellen Dienstleistern, KI mit Foerdermittel einzufuehren | Co-Founder PraxisNova AI"
- About-Section: 3 Absaetze, davon 1 Story, 1 Problem-Statement, 1 Angebot
- Featured Section: 3 Links (Website, Potenzialrechner, 1 Case Study sobald live)

**Content-Plan (wiederkehrend):**
- Montag: "Insight aus der Woche" (Lerning aus Workshop/Call)
- Mittwoch: "Case Study Teaser" (auch ohne Freigabe als anonymisiert "Ein Kunde aus PropTech...")
- Freitag: "Die unbequeme Frage" (provokant, fuer Engagement)

Samantha macht Parallel-Content fuer Automation/Prozess-Perspektive. Zwei Stimmen statt einer.

**Engagement-Strategie:**
- Jeden Tag: 30 Min in LinkedIn Feed, kommentieren bei 10 Zielkunden-Posts
- Woechentlich: 3 neue Connect-Requests an potenzielle Kunden
- Monatlich: 1 Live-Event oder LinkedIn-Live zu einem konkreten Thema

**Organic Reach Erwartung:**
- Bei 3 Posts pro Woche + 30 Min Engagement/Tag: Followerzahl-Verdoppelung in 60 Tagen
- Inbound Leads (DM): 1 bis 3 pro Woche ab Woche 4

### 4.3 TikTok (realistisch, ab Woche 5)

**Ehrlich:** TikTok in Woche 1 bis 4 ist Ablenkung. Es braucht mindestens 6 bis 8 Wochen Konsistenz bis irgendein Signal kommt. Bei unter 3 Monaten Runway ist das Opportunitaetskosten-negativ.

**Plan TikTok ab Woche 5:**
- Format: 30 bis 60 Sekunden, Angie spricht auf Deutsch
- Content-Saeulen:
  - "KI-Use-Case in 60 Sekunden" (fuer Branche)
  - "Vorher/Nachher KI im Unternehmen"
  - "Foerdermittel-Hack der Woche"
  - "Hinter den Kulissen: Meine AI-Agency baut sich selbst"
- Frequenz: 3 Videos pro Woche
- Cross-Post: LinkedIn (als Video), YouTube Shorts

**Ziel nach 90 Tagen TikTok:** 5.000 Follower, 1 Video mit 100k+ Views als Anker
**Ziel Woche 1 bis 4 TikTok:** NULL. Nicht mit dem Fokus verwaessern.

### 4.4 Partnerschaften (anders als bisher)

**Vorher:** Cold Partner-Outreach mit Referral-Modellen
**Nachher:** Co-Workshop-Angebote an Softwareanbieter

Konkrete Targets:
- onOffice Academy: "KI-fuer-onOffice-Nutzer" Workshop (Co-Branded, 50/50 Revenue Share)
- Haufe Akademie: KI-Referenten-Pool
- IHK Koeln/Leipzig: KI-Grundlagen-Seminare (als Referentin)
- DATEV Marketplace: Listing als KI-Partner fuer Steuerberater

Outreach-Action: 5 konkrete Partner-Pitches in Woche 2.

### 4.5 Content-Repurposing-Logik

Jeder gelieferte Workshop wird zur Content-Maschine:
- Fotos/Screenshots → LinkedIn Carousel
- Teilnehmer-Zitat (mit Freigabe) → LinkedIn Post + Website Testimonial
- Playbook PDF → Lead Magnet (Formular gegen Email)
- Eines der besten Use-Cases → 60-Sekunden TikTok (ab Woche 5)
- Insights → Newsletter

---

## 5. Task Allocation

Klar getrennt: Strategie, Content und Kommunikation (Cowork Claude + Angie), technische Umsetzung (Claude Code).

### 5.1 Angie (15-20h pro Woche Sales und Strategy)

- Kundenkommunikation (Calls, Emails mit Leads, Angebote)
- Real Estate Pilot Meeting 20.04. fuehren
- LinkedIn-Profil und Posts selber schreiben (oder Cowork-generierte Posts finalisieren)
- Finale Freigabe auf Angebote bevor Versand
- Workshop-Delivery beim Kunden
- Netzwerk-Gespraeche und Partner-Calls

### 5.2 Samantha

- Prozess-Design fuer Workshops und DFY-Projekte
- Technische Workshop-Inhalte (Automation-Demo, Template-Building)
- Eigene LinkedIn-Content-Schiene (Prozess-Perspektive)
- Co-Liefer-Rolle bei Workshops
- Review der technischen Claude-Code-Patches

### 5.3 Cowork Claude (Strategie, Content, Struktur)

- Business-Planung und Strategie-Iterationen
- Content-Drafts fuer LinkedIn-Posts
- Email-Copy fuer Outreach-Sequenzen (Angie/Samantha finalisieren)
- Landing-Page-Texte
- Angebots-Dokumente fuer Leads
- Briefing-Dokumente fuer Claude Code
- Pipeline-Reviews und Forecasting
- Session-Doku und Memory-Updates
- Markt- und Wettbewerbs-Analysen bei Bedarf

### 5.4 Claude Code (technische Umsetzung)

- Website-Anpassungen im praxisnova-website Repo
- Agent-Stabilisierung im praxisnova-sales-control Repo (ehem. VERALTET-Prefix)
- Neue Landing Pages (/ki-fuer-hausverwaltungen, /ki-fuer-kanzleien)
- Dashboard-Verbesserungen
- DB-Migrationen
- Cron-Job-Konsolidierung
- Health-Check-Endpunkt und Seite
- Fix: Gmail Reply-Detection unternehmensweit
- Fix: Apollo 422 Wrapper
- Fix: Calendar OAuth (falls noch offen)

**Wichtig (Regel feedback_skills_in_prompts):** Jedes Briefing fuer Claude Code enthaelt zwingend einen Skills-Pflicht-Abschnitt mit allen relevanten Skills.

---

## 6. Intelligent Agent System (Future State)

### 6.1 Prinzipien

1. Self-observing: jeder Agent loggt seinen Run strukturiert
2. Self-healing where safe: bei bekannten Fehlern (Rate Limit, Token Refresh) automatisch retryen
3. Human-in-the-loop bei Unsicherheit: bei unbekanntem Fehler oder Schema-Drift alerten und stoppen
4. Continuous improvement: woechentliche Review der Agent-Metriken mit Angie als Entscheidungstraegerin

### 6.2 Architektur-Komponenten

**1. Agent-Runtime-Core (lib/agent-runtime.ts bereits vorhanden)**
- Erweitern um `agent_runs` Tabellen-Logging
- Retry-Policy-Matrix: welche Fehler = auto-retry, welche = stop und alert
- Budget-Policy: jeder Agent hat Max-Cost und Max-Duration

**2. Error Catalog (project_instruction_rule: "error kataloge")**
- `errors.md` in Repo, pflegen bei jedem neuen bekannten Fehler
- Code ladet Katalog und ordnet Fehler strukturiert zu
- Auto-Fix-Skripte fuer die Top 5 bekannten Fehler

**3. Health Checker Agent**
- Daily 20:00
- Checkt: hat jeder Agent gelaufen? Gab es unerwartete 0-Row-Runs? Gab es ungewoehnlich viele Fehler?
- Output: `health_report_YYYY-MM-DD.md` + Email an Angie

**4. Approval Gates**
- Jede Customer-facing Email: Queue mit 30-Sek-Review-UI
- Jedes neue Lead-Batch > 50: manuelle Freigabe
- Jede Preisaenderung in Angeboten: Approval-Log

**5. Improvement Agent (spaeter, Monat 2)**
- Analysiert woechentlich Metriken
- Schlaegt Optimierungen vor (z.B. "Reply Rate bei Kanzleien 3x hoeher als bei Hausverwaltungen, mehr Kanzleien?")
- Bringt Vorschlag in TASKS.md, implementiert nix autonom ohne Angies "ja"

**6. Memory Hygiene**
- Memory-Files werden zum Start jedes Cron-Runs geprueft: "ist der Fakt noch true?"
- Veraltete Fakten markieren mit STALE-Tag statt loeschen
- Monatlich: Memory-Konsolidierung durch consolidate-memory Skill

### 6.3 Umsetzungsphasen

- Woche 1: Health Checker Agent live, agent_runs Logging
- Woche 2: Error Catalog + Auto-Retry-Policy
- Woche 3 bis 4: Approval Gates fuer Email-Versand
- Woche 6 bis 8: Improvement Agent (nur wenn Umsatz-Ziele Q2 getroffen)

---

## 7. Execution Plan 7 Tage: Weg zu 2.000 Euro

**Ziel:** 2.000 Euro im Bank oder Rechnung mit fixem Zahlungsdatum bis Freitag 24.04.2026

**Primaerer Deal-Pfad:** Real Estate Pilot AG, Meeting 20.04. 13:00, Angebot spaetestens 22.04.

**Backup-Pfad:** 2 weitere Deals in der Pipeline reaktivieren, alte Kontakte aus Handwerk/Bau re-positionieren mit Foerder-Hook

### Freitag 17.04. (heute, nach dieser Planabgabe)

**Angie:**
- [ ] Diese Plan durchlesen, Fragen markieren, mit Samantha besprechen (abends)
- [ ] Samantha einbeziehen: Go/No-Go fuer Option C

**Cowork Claude:**
- [x] Master Plan fertig
- [ ] Claude Code Briefing fertig (Dok 2)
- [ ] Real Estate Pilot Workshop-Angebot-Draft fertig (Dok 3)

### Samstag 18.04.

**Angie (3 Stunden):**
- [ ] Real Estate Pilot Call-Prep komplett: GeoMap Website durchgehen, Produkte, Use-Cases vorformulieren
- [ ] Angebots-Draft von Cowork reviewen, anpassen
- [ ] LinkedIn-Profil neu positionieren (siehe 4.2)
- [ ] 1 neuen LinkedIn-Post schreiben: "Warum ich ab heute nicht mehr Bau mache, sondern Hausverwaltung"

**Samantha (2 Stunden):**
- [ ] Workshop-Playbook-Template: 15 Seiten Struktur mit Platzhaltern, Inhalt fuer Real Estate Pilot spezifizieren
- [ ] Demo-Use-Case fuer GeoMap-Integration skizzieren (z.B. "Automatische Standortbewertung aus Adresslisten")

**Cowork Claude:**
- [ ] Landing-Page-Text "/ki-fuer-hausverwaltungen" draft
- [ ] Neue Email-Sequenz-Texte (3 Mails) fuer Hausverwaltungs-Zielgruppe

### Sonntag 19.04.

**Angie (1 Stunde):**
- [ ] Final Prep Real Estate Pilot, Fragen-Katalog, BANT-Check
- [ ] Samantha einweihen welche Teile sie im Call beantworten soll (technisch)

**Claude Code (on-demand ueber Briefing):**
- [ ] Website-Update: Homepage Messaging aendern (Headline schon gut, Sub-Headline anpassen auf Hausverwaltung/Dienstleister)
- [ ] Neue Seite: `/ki-fuer-hausverwaltungen` (aus Cowork Text)
- [ ] Lead-Detail-Bug fixen
- [ ] Gmail Reply-Detection unternehmensweit Fix
- [ ] Cron-Jobs auf 10 kritische reduzieren

### Montag 20.04. (DEAL DAY)

**Angie (Tag):**
- [ ] 09:00: Letzte Prep und mental Vorbereitung
- [ ] 13:00: Real Estate Pilot AG Meeting (mit Samantha, remote oder vor Ort)
- [ ] Ziel-Outcome: Verbale Zusage fuer Workshop 2.900 oder 4.900 Euro, ODER 8.000 Euro Kleines DFY-Paket
- [ ] 14:30 nach Meeting: Follow-up Email innerhalb 1 Stunde mit Meeting-Zusammenfassung und naechsten Schritten
- [ ] 16:00: Pipeline-Check, naechste 2 warme Kontakte identifizieren (Backup falls Real Estate Pilot sich verzoegert)

**Samantha:**
- [ ] Im Call: technische Fragen zu GeoMap-Integration beantworten
- [ ] Nach Call: zusammen mit Angie Meeting-Notes strukturieren

**Cowork Claude:**
- [ ] Nach Meeting: 45-Min Sync mit Angie, Angebots-Finalisierung basierend auf Meeting-Feedback
- [ ] Angebots-Dokument (Docx oder PDF) finalisieren

### Dienstag 21.04.

**Angie (3 Stunden):**
- [ ] Real Estate Pilot: finales Angebot rausschicken (Deadline 48h nach Meeting)
- [ ] 5 warme Kontakte anrufen (nicht mehr email, direkt Telefon) aus bestehender Liste: PropTech, kleine Hausverwaltungen, ehemalige Anfragen
- [ ] 1 LinkedIn-Post veroeffentlichen
- [ ] 30 Min LinkedIn-Engagement mit Zielkunden-Posts

**Claude Code:**
- [ ] Apollo 422 Wrapper zentralisieren
- [ ] Calendar OAuth Refresh fixen (falls noch offen)
- [ ] Health-Check-Seite live

### Mittwoch 22.04.

**Angie (4 Stunden):**
- [ ] Falls Real Estate Pilot Antwort: Push Call fuer Entscheidung
- [ ] Falls nicht: Follow-up-Call anstossen
- [ ] 10 hyper-personalisierte Cold-LinkedIn-Messages an Hausverwaltungen
- [ ] 1 LinkedIn-Post (Case-Study-Teaser: "Aus meinem Gespraech mit einem PropTech-Unternehmen diese Woche")
- [ ] Backup-Deal 1 ansprechen: konkretes Angebot in Hand

**Cowork Claude:**
- [ ] 3 LinkedIn-Outbound-Messages personalisiert vorbereiten
- [ ] Tageszusammenfassung und Anpassung der Woche

### Donnerstag 23.04.

**Angie (4 Stunden):**
- [ ] Real Estate Pilot: Signierung anstreben (oder spaetestens verbale verbindliche Zusage)
- [ ] 2 neue Intro-Calls halten (aus LinkedIn Engagement Leads)
- [ ] 10 weitere LinkedIn Messages
- [ ] 1 LinkedIn-Post
- [ ] Samantha Retro-Call 30 Min: was lief, was nicht

**Cowork Claude:**
- [ ] Real Estate Pilot Kickoff-Prep falls unterzeichnet (Workshop-Agenda, Discovery-Questions)

### Freitag 24.04. (Deadline)

**Angie:**
- [ ] Final push Real Estate Pilot (letzte Chance)
- [ ] Status: 2.000 Euro verbuchtes Angebot oder Rechnung? Ja/Nein Entscheidung
- [ ] Falls nein: Post-Mortem was fehlte (nicht Selbstkritik, Root Cause)
- [ ] Falls ja: Kickoff Schedule mit Real Estate Pilot, LinkedIn-Post "Erste zahlende Kundin diese Woche"

**Cowork Claude:**
- [ ] Week 1 Retrospektive schreiben
- [ ] Week 2 Plan

### Realistische Erfolgswahrscheinlichkeit

**Primary (Real Estate Pilot schliessen):** 40 bis 55 Prozent realistisch. Sie haben aktiv Gespraech gesucht, das ist ein starkes Intent-Signal. Ablehnung moeglich wenn Budget-Prioritaet fehlt oder Vorstand blockiert.

**Backup-Pfad (alter Kontakt konvertieren):** 10 bis 20 Prozent pro warmem Lead, bei 5 warmen Kontakten: 50 bis 80 Prozent dass mindestens einer dreht.

**Gesamte Wahrscheinlichkeit 2.000 Euro bis 24.04.:** 60 bis 75 Prozent wenn beide Pfade aktiv gespielt werden.

**Wenn verfehlt:** Nicht "alles war falsch", sondern 7 Tage verlaengern, gleicher Plan. Die Pipeline haerter aktivieren, Preis nicht senken.

---

## 8. Execution Plan Woche 2 bis 8

### Woche 2 (25.04. bis 01.05.)
- Real Estate Pilot Delivery-Vorbereitung beginnt (wenn gewonnen)
- 2 neue Partner-Pitches (onOffice, Haufe)
- AZAV-Zertifizierung Research und ersten Antrag vorbereiten (ohne sofortige Kosten: nur Informationspfad)
- Landing Pages live, erste 50 Outreach Emails mit neuer Message
- 3 LinkedIn Posts
- Ziel: 1 bis 2 Discovery Calls gebucht

### Woche 3 (02.05. bis 08.05.)
- Workshop Real Estate Pilot durchgefuehrt (wenn Deal)
- Case-Study-Draft beim Kunden einreichen
- 2 weitere Discovery Calls
- 3 LinkedIn Posts + Engagement
- Ziel: 1 weiterer Deal signiert (zweites €2k+)

### Woche 4 (09.05. bis 15.05.)
- Case Study live auf Website
- Neue Email-Sequenz mit Case-Study-Link starten
- TikTok-Research + Konzept (keine Videos noch)
- Ziel: Pipeline auf 5 qualifizierte Leads

### Woche 5 bis 6 (16.05. bis 29.05.)
- Erstes TikTok-Video
- Zweiter Workshop delivered (zweiter Kunde)
- Online-Kurs-Waitlist Page live
- Ziel: 3 Deals gesamt closed, 50+ Kurs-Waitlist

### Woche 7 bis 8 (30.05. bis 12.06.)
- Kurs-Pilot-Cohort planen (Launch Ziel Monat 3)
- Case Study #2 live
- Erste Retainer-Anfrage (Upsell von Workshop-Kunde)
- Ziel: 5 Deals total, 10.000 bis 20.000 Euro Umsatz akkumuliert

---

## 9. Guardrails und Risiken

**Risiko 1: Real Estate Pilot verzoegert Entscheidung ueber Woche 1 hinaus**
- Mitigation: Backup-Pipeline aktiv halten, 5 warme Telefonate Wochenmitte
- Guardrail: Maximal 2 Follow-ups, danach "offenes Angebot" und weiter ziehen

**Risiko 2: Technik bricht am Tag des Outreach**
- Mitigation: Manuelle Versand-Optionen bereithalten (Gmail direkt, nicht Brevo)
- Guardrail: Bei 2 Tagen in Serie Agent-Ausfall: Claude Code Emergency-Fix

**Risiko 3: LinkedIn-Engagement bleibt flach**
- Mitigation: Nach Woche 2 Content-Format anpassen, auf Umfragen und Polls umstellen
- Guardrail: kein Druck auf Sofort-Erfolg, Content ist Compounding-Spiel

**Risiko 4: Sunk-Cost-Falle bei Bau-Leads**
- Mitigation: klar archivieren, nicht loeschen. Reaktivieren erst wenn Foerder-Anker geschaerft
- Guardrail: Keine weitere Zeit in Bau-Outreach bis mindestens 2 Deals in neuer Zielgruppe

**Risiko 5: Budget-Erschoepfung**
- Mitigation: keine neuen Kosten, kein Ad-Spend, keine neuen Tools
- Guardrail: AZAV nur nach 5.000 Euro Umsatz, bis dahin Bildungsgutschein ohne formale Zertifizierung anbieten (Partner-Akademien werden genutzt)

---

## 10. KPI-Dashboard Definition

**Taegliche Metriken (Operations Manager Email):**
- Neue Leads heute
- Mails versendet
- Mails geoeffnet (Brevo)
- Replies heute
- Calls heute
- Discovery Calls gebucht
- Agent-Fehler letzten 24h

**Woechentliche Metriken (Freitag-Retro):**
- Pipeline Value (Euro, gewichtet)
- Neue Qualifizierte Leads
- Angebote versendet
- Closed Won Euro
- LinkedIn Follower Veraenderung
- Top 3 Lessons der Woche

**Monatliche Metriken:**
- MRR (wenn Retainer starten)
- CAC (Customer Acquisition Cost = Angies Zeit * interner Stundensatz)
- LTV-Annahme pro Segment
- Pipeline Coverage (x-mal Monatsziel in Pipeline)

---

## 11. Was NICHT im Scope dieser Woche ist

- Komplette System-Neuentwicklung (3 bis 4 Wochen Weg)
- TikTok-Content-Produktion
- Online-Kurs-Entwicklung
- AZAV-Zertifizierung-Abschluss
- Rebuild Dashboard komplett
- Alle 24 Agenten refactorieren
- Neue Logo, neues Design
- Neue Unternehmens-Struktur oder Rechtsform
- Internationalisierung (UK, EN)

All das kommt, aber nicht in Woche 1. Scope-Disziplin ist der Schluessel.

---

**Naechste Dokumente:**
1. `CLAUDE-CODE-PROMPT-2026-04-17-OPTION-C-REBUILD.md` (technische Umsetzung)
2. `REAL-ESTATE-PILOT-OFFER-2026-04-17.md` (das 2.000 Euro Ticket)
