# Cross-Repo Agent-Analyse: Website + Sales Control

**Datum:** 13. April 2026
**Repos:** praxisnova-sales-control (Sales Dashboard), praxisnova-website (Marketing-Website)
**Zweck:** Vollstaendige Analyse aller Agenten, Verbindungen und Luecken zwischen beiden Systemen

---

## Abschnitt 1: Agent-Inventar

### 1.1 Gemini-Agenten (AI-Loop via agent-runtime.ts)

Alle Agenten nutzen Google Gemini 2.0 Flash (Lite) ueber eine gemeinsame Runtime mit Function-Calling-Loop. Modell: `gemini-2.0-flash-lite` via `@google/generative-ai` SDK.

| # | Agent | .agents/*.md | Zeilen | Cron-Route | Schedule (UTC) | maxIter | Status |
|---|-------|-------------|--------|------------|----------------|---------|--------|
| 1 | Inbound Response Agent | inbound-response-agent.md | 202 | /api/cron/inbound-response | 08:30, 11:30, 14:00, 17:30 Mo-Fr | 15 | AKTIV |
| 2 | Prospect Researcher | prospect-researcher.md | 218 | /api/cron/prospect-researcher | 06:00, 09:45, 13:45 taeglich | 80 | AKTIV |
| 3 | Sales Supervisor | sales-supervisor.md | 160 | /api/cron/sales-supervisor | 09:15, 14:30 Mo-Fr | 20 | AKTIV |
| 4 | Outreach Strategist | outreach-strategist.md | 320 | /api/cron/outreach-strategist | 08:00, 11:00, 13:00, 15:00, 17:00 Mo-Fr | 60 | AKTIV |
| 5 | Follow-Up Tracker | follow-up-tracker.md | 14 | /api/cron/follow-up-tracker | 09:00 Mo-Fr | 30 | AKTIV (Route voll, .md ist STUB) |
| 6 | Operations Manager | operations-manager.md | 332 | /api/cron/operations-manager | 07:15 Mo-Fr | 15 | AKTIV |
| 7 | Partner Researcher | partner-researcher.md | 227 | /api/cron/partner-researcher | 07:00 taeglich | 25 | AKTIV |
| 8 | Partner Supervisor | partner-supervisor.md | 161 | /api/cron/partner-supervisor | 08:45 Mo-Fr | 20 | AKTIV |
| 9 | Partner Outreach Strategist | partner-outreach-strategist.md | 179 | /api/cron/partner-outreach-strategist | 12:30 Mo-Fr | 20 | AKTIV |
| 10 | Market Intelligence | market-intelligence.md | 173 | /api/cron/market-intelligence | 05:00 Sonntags | 25 | AKTIV |
| 11 | Call List Generator | call-list-generator.md | 133 | /api/cron/call-list-generator | 07:45 Mo-Fr | 40 | AKTIV |

### 1.2 Infrastruktur-Cron-Jobs (kein AI-Loop, reines TypeScript)

| # | Route | Schedule (UTC) | Was es tut | Externe APIs |
|---|-------|----------------|-----------|--------------|
| 12 | /api/cron/apollo-sync | 05:00, 12:00, 23:00 taeglich | 50 Leads/Tag aus Apollo importieren, 4 Suchkonfigurationen rotierend | Apollo API |
| 13 | /api/cron/gmail-reply-sync | Alle 10 Min, 06:00-22:00 | Gmail-Inbox pollen, OOO erkennen, Replies verarbeiten, Angie benachrichtigen | Gmail OAuth, HubSpot, Brevo |
| 14 | /api/cron/google-calendar-sync | Alle 5 Min, 06:00-22:00 | Google Calendar auf Buchungen pruefen, pipeline_stage auf 'Booked' setzen | Google Calendar OAuth |
| 15 | /api/cron/process-sequences | 07:30, 10:30, 13:30, 16:30 Mo-Fr | Email-Sequenzen ausfuehren (5 Typen: immobilien, handwerk, bau, inbound, allgemein) | Brevo, HubSpot |
| 16 | /api/cron/brevo-stats-sync | 19:00 Mo-Fr | Email-Performance-Metriken von Brevo laden | Brevo Stats API |
| 17 | /api/cron/health-monitor | 07:05, 11:50, 15:20 Mo-Fr | Agent-Schedules ueberwachen, Fehler/Timeouts erkennen, Alerts senden | Brevo |
| 18 | /api/cron/error-sentinel | 06:15, 09:30, 12:00, 15:15, 18:00 Mo-Fr | 5 API-Routes pingen, DB-Checks, Agent-Error-Logs pruefen | Brevo |
| 19 | /api/cron/daily-summary | 11:45, 17:45 Mo-Fr | Tages-Zusammenfassung senden | Brevo |
| 20 | /api/cron/daily-backup | 02:00 taeglich | 8 Tabellen als CSV nach Vercel Blob exportieren, >30 Tage loeschen | Vercel Blob |
| 21 | /api/cron/weekly-report | 06:45 Montags | Wochen-HTML-Report mit KPI-Trends | Brevo |
| 22 | /api/cron/linkedin-post-generator | 05:30 Mo-Fr | 2 LinkedIn-Post-Entwuerfe/Tag generieren (Gemini direkt, kein Agent-Loop) | Gemini REST |
| 23 | /api/cron/linkedin-posting-check | 15:30 Mo-Fr | Pruefen ob 2 Posts veroeffentlicht wurden, Erinnerung senden | Brevo |
| 24 | /api/cron/linkedin-response-check | 08:10 Mo-Fr | LinkedIn-Tracking-Timeouts pruefen, in call_queue verschieben | DB |
| 25 | /api/cron/news-agent | 05:30 Mo-Fr | 2-3 Branchen-News pro Sektor via Gemini (AI-generiert, kein echtes Scraping) | Gemini REST |
| 26 | /api/cron/monthly-report | 1. des Monats | Monats-Aggregat | Brevo |
| 27 | /api/cron/quarterly-report | Quartalsweise | 3-Monats-Trend | Brevo |

**Gesamt: 27 Cron-Routes mit 57 Cron-Eintraegen in vercel.json**

### 1.3 Webhook-Endpoints (7 Routes)

| Route | Auth | Zweck | Status |
|-------|------|-------|--------|
| /api/webhooks/website-leads | Origin-Check (praxisnovaai.com) + Rate-Limit | Email-Popup-Leads von Website empfangen | AKTIV |
| /api/webhooks/inbound | INBOUND_WEBHOOK_SECRET | Legacy-Inbound-Formular mit Double-Opt-In | AKTIV |
| /api/webhooks/website-clicks | Origin-Check | Anonyme Seitenaufrufe/Klicks tracken | AKTIV |
| /api/webhooks/brevo | Brevo Signature (optional seit Fix 13.04.) | Email-Events (Opens, Clicks, Bounces, Unsubscribes) | AKTIV |
| /api/webhooks/hubspot | (zu pruefen) | HubSpot Contact-Sync-Events | AKTIV |
| /api/webhooks/calendly | (zu pruefen) | Calendly-Buchungs-Events | AKTIV |
| /api/webhooks/calendly-email | (zu pruefen) | Calendly-Email-Events | AKTIV |

### 1.4 Sonstige API-Routes

| Route | Zweck |
|-------|-------|
| /api/track-click | Direkte Click-Tracking-Route (von WebsiteTracker.tsx aufgerufen) |
| /api/confirm-optin | Double-Opt-In-Bestaetigung fuer Inbound-Leads |
| /api/email-tracking | Email-Open/Click-Tracking |
| /api/linkedin-tracking | LinkedIn-Queue-Verwaltung |
| /api/partner-linkedin-tracking | Partner-LinkedIn-Queue |
| /api/trigger/apollo-sync | Manueller Trigger fuer Apollo-Sync |
| /api/trigger/google-calendar-sync | Manueller Trigger fuer Calendar-Sync |

---

## Abschnitt 2: Inbound Agent Deep-Dive

### 2.1 Der vollstaendige Inbound-Flow (Website bis Antwort-Email)

```
Website-Besucher
    |
    v
[Cookie-Consent Banner] -- analytics: true --> Tracking startet
    |
    v
[WebsiteTracker.tsx] -- pageview/clicks --> Sales Control /api/track-click (direkt)
[lib/tracking.ts]    -- pageview/clicks --> Website /api/track --> Sales Control /api/webhooks/website-clicks
    |
    v
[Popup nach 10s] -- Email-Eingabe + DSGVO-Checkbox
    |
    v
[/api/lead] (Website-API-Route)
    |
    +--> HubSpot API (Lead anlegen) -- KANN FEHLSCHLAGEN wenn Token fehlt
    |
    +--> Sales Control /api/webhooks/inbound (mit INBOUND_WEBHOOK_SECRET)
           |
           v
         Lead in DB: sequence_type='inbound', sequence_status='pending_optin', sequence_step=0
         + visitorId mit website_clicks verknuepft
         + Double-Opt-In Email gesendet (Step 0 der Inbound-Sequenz)
         + Angie-Notification via Brevo
         + HubSpot-Sync (zweiter Versuch)
           |
           v
         [Besucher klickt Bestaetigungslink]
           |
           v
         /api/confirm-optin --> sequence_status='active'
           |
           v
         [/api/cron/process-sequences] -- 4x taeglich
           sendet Steps 1-6 der Inbound-Sequenz (Welcome, Potenzialrechner, Case Study, Frage, Follow-Up)
           |
           v (parallel)
         [/api/cron/inbound-response] -- 4x taeglich
           liest neue Leads (pipeline_stage='Neu', outreach_source IS NULL, letzte 6h)
           bewertet Intent-Score anhand website_clicks
           sendet personalisierte Email (HIGH/MEDIUM/LOW Variante)
           setzt pipeline_stage='In Outreach', outreach_source='agent_inbound_response'
```

### 2.2 Inbound Response Agent - Detailanalyse

**Existiert als vollstaendiger Agent:** JA
- Instruktionsdatei: `.agents/inbound-response-agent.md` (202 Zeilen, komplett)
- Cron-Route: `app/api/cron/inbound-response/route.ts` (118 Zeilen, komplett)
- vercel.json: 4 Eintraege (08:30, 11:30, 14:00, 17:30 UTC Mo-Fr)

**Job-Beschreibung:**
Der Agent reagiert auf neue Website-Leads mit einer personalisierten Email. Er bewertet den Click-Verlauf (Intent-Score 1-10), recherchiert die Firma via web_fetch, waehlt eine von drei Email-Varianten (HIGH/MEDIUM/LOW) und sendet via Brevo.

**Wie erfaehrt er von neuen Leads:**
Via `read_inbound_leads` Tool in agent-runtime.ts. SQL-Query:
```sql
SELECT * FROM leads
WHERE created_at >= NOW() - INTERVAL '360 minutes'  -- letzte 6 Stunden
  AND (outreach_source IS NULL OR outreach_source = '')
  AND (pipeline_stage = 'Neu' OR pipeline_stage IS NULL)
ORDER BY created_at ASC LIMIT 5
```

**Brevo-Verbindung:** JA - sendet via `send_outreach_email` Tool (Absender: hertle.anjuli@praxisnovaai.com)

**Angie-Notification:** INDIREKT - Der Webhook `/api/webhooks/inbound` benachrichtigt Angie sofort bei Lead-Eingang. Der Agent selbst sendet keine separate Notification an Angie.

**Calendar-Interaktion:** NEIN - Der Agent verlinkt nur den Calendly-Link in HIGH-Intent-Emails. Keine aktive Calendar-Integration.

### 2.3 KRITISCHE PROBLEME im Inbound-Flow

#### Problem 1: Zwei Webhook-Pfade mit unterschiedlichem Verhalten

**Pfad A:** Website `/api/lead` --> Sales Control `/api/webhooks/inbound`
- Setzt `sequence_type='inbound'`, `sequence_status='pending_optin'`
- Sendet Double-Opt-In Email
- Lead bekommt automatische Inbound-Sequenz nach Bestaetigung
- Auth: INBOUND_WEBHOOK_SECRET

**Pfad B:** Website --> Sales Control `/api/webhooks/website-leads`
- Setzt `source='website_popup'`, `pipeline_stage='Neu'`
- Setzt KEIN `sequence_type` und KEINEN `sequence_status`
- KEINE Double-Opt-In Email
- KEINE automatische Sequenz
- Auth: Origin-Check (kein Secret)

**Aktuell nutzt die Website Pfad A** (das Popup ruft `/api/lead` auf, das an `/webhooks/inbound` weiterleitet). Pfad B (`/webhooks/website-leads`) wurde am 12.04. erstellt, ist aber von der Website NICHT aufgerufen. Es ist ein zweiter, neuerer Endpoint der parallel existiert aber anders funktioniert.

#### Problem 2: Schedule-Diskrepanz

Die `.agents/inbound-response-agent.md` sagt: "Laeuft alle 15 Minuten" (`*/15 6-22 * * *`).
Die Cron-Route und vercel.json sagen: 4x taeglich (alle 3 Stunden).
Das heisst: Die Reaktionszeit ist im besten Fall 3 Stunden, nicht 15 Minuten.

#### Problem 3: read_inbound_leads Query matcht nicht optimal

Die Query filtert nach `pipeline_stage='Neu'`. Aber Leads aus `/webhooks/inbound` haben initial `pipeline_stage=NULL` (wird nicht explizit gesetzt). Das ist okay weil die Query auch `pipeline_stage IS NULL` akzeptiert. Trotzdem: Der Prospect Researcher laeuft VORHER (06:00) und koennte Inbound-Leads bereits als Outbound qualifizieren bevor der Inbound Agent sie sieht (08:30).

#### Problem 4: 504 Timeout (bekannt, 13.04.)

Der Inbound Agent hatte einen 504 Timeout am Morgen des 13.04. Das wurde als Teil der Cron-Staffelung gefixt (Zeitverschiebung).

---

## Abschnitt 3: Verbindungs-Matrix

### 3.1 Website --> Sales Control

| Quelle (Website) | Ziel (Sales Control) | Typ | Status |
|-------------------|---------------------|-----|--------|
| Popup (Popup.tsx) | /api/lead (Website) --> /api/webhooks/inbound | HTTP POST | **LIVE** |
| WebsiteTracker.tsx (Pageviews/Clicks) | /api/track-click (direkt) | HTTP POST | **LIVE** (consent-gated) |
| lib/tracking.ts (trackClick/trackPageView) | /api/track (Website) --> /api/webhooks/website-clicks | HTTP POST | **LIVE** (consent-gated) |
| Popup "Danke"-Screen | Calendly (extern) | Link | **LIVE** |
| Alle CTA-Buttons | Calendly (extern) | Link | **LIVE** |
| Potenzialrechner Ergebnis-CTA | Calendly (extern) | Link | **LIVE** (aber KEIN trackClick) |
| Nav CTA-Buttons | Calendly (extern) | Link | **LIVE** (aber KEIN trackClick) |
| (keiner) | /api/webhooks/website-leads | - | **NICHT VERBUNDEN** |

### 3.2 Sales Control - Interne Agent-Verbindungen

| Quelle | Ziel | Verbindungstyp | Status |
|--------|------|---------------|--------|
| Apollo Sync | leads Tabelle (stage=Neu) | SQL INSERT | **LIVE** (Fix 13.04. fuer .rows Bug) |
| Prospect Researcher | leads (stage In Outreach/Nurture/Nicht qualifiziert) | SQL UPDATE via Agent-Tool | **LIVE** |
| Sales Supervisor | Prospect Researcher Decisions lesen | SQL via read_decisions | **LIVE** |
| Sales Supervisor | leads (Score-Korrekturen) | SQL via update_lead | **LIVE** |
| Outreach Strategist | leads (In Outreach, Score 8+) lesen | SQL via read_leads | **LIVE** |
| Outreach Strategist | Brevo (personalisierte Emails) | API via send_outreach_email | **LIVE** |
| Outreach Strategist | linkedin_queue (Score 9+ Leads) | SQL via write_linkedin_queue | **LIVE** |
| Outreach Strategist | Prospect Researcher Cache lesen | SQL via read_decisions (7 Tage) | **LIVE** |
| Follow-Up Tracker | leads (In Outreach, >48h ohne Kontakt) | SQL via read_leads | **LIVE** (neu 13.04.) |
| Inbound Response Agent | leads (Neu, outreach_source NULL) | SQL via read_inbound_leads | **LIVE** |
| Inbound Response Agent | Brevo (personalisierte Antwort) | API via send_outreach_email | **LIVE** |
| Inbound Response Agent | website_clicks (Intent-Score) | SQL via website_analytics | **LIVE** |
| Call List Generator | leads (step>=3 oder score>=9) | SQL via read_call_candidates | **LIVE** |
| Call List Generator | call_queue | SQL via upsert_call_queue | **LIVE** |
| Market Intelligence | Alle Agenten (intel_update) | SQL via write_decision/read_intel | **LIVE** |
| Operations Manager | Alle Agent-Decisions/Reports lesen | SQL via read_decisions/read_reports | **LIVE** |
| Operations Manager | Brevo (Morning Briefing an Angie) | API via send_email | **LIVE** |
| Partner Researcher | partners Tabelle | SQL via upsert_partner | **LIVE** |
| Partner Supervisor | Partner Researcher Decisions | SQL via read_decisions | **LIVE** |
| Partner Outreach Strategist | Brevo (Partner-Emails) | API via send_outreach_email | **LIVE** |
| Gmail Reply Sync | leads (Antwort erhalten) | SQL UPDATE | **LIVE** |
| Gmail Reply Sync | Brevo (Angie-Notification) | API | **LIVE** |
| Gmail Reply Sync | HubSpot (Activity Log) | API | **LIVE** |
| Google Calendar Sync | leads (Booked) | SQL UPDATE | **KAPUTT** (OAuth 401) |
| Process Sequences | Brevo (Sequenz-Emails) | API | **LIVE** |
| Process Sequences | HubSpot (Step Update) | API | **LIVE** |
| Brevo Webhooks | /api/webhooks/brevo | HTTP POST | **KAPUTT** (Signature-Fix pending) |
| LinkedIn Response Check | call_queue | SQL | **LIVE** |
| LinkedIn Post Generator | linkedin_post_drafts | SQL + Brevo Notification | **LIVE** |

### 3.3 Sales Control --> Externe Systeme

| Quelle | Ziel | Status |
|--------|------|--------|
| Alle Agenten | Gemini 2.0 Flash Lite (AI) | **LIVE** |
| Apollo Sync | Apollo API | **LIVE** (Fix 13.04.) |
| Gmail Reply Sync | Gmail API (OAuth) | **LIVE** |
| Google Calendar Sync | Google Calendar API (OAuth) | **KAPUTT** (401, ENV-Problem) |
| Outreach/Inbound/Ops/Partner Agents | Brevo (Emails) | **LIVE** |
| Process Sequences | Brevo (Sequenz-Emails) | **LIVE** |
| Inbound Webhook | HubSpot (createContact) | **LIVE** (kann stumm fehlschlagen) |
| Daily Backup | Vercel Blob Storage | **LIVE** |

---

## Abschnitt 4: Kaputte Verbindungen (ERRORS)

### ERROR 1: Google Calendar OAuth 401
- **Was:** Google Calendar Sync gibt 401 zurueck
- **Ursache:** OAuth-Token abgelaufen oder falsche ENV-Variablen
- **Auswirkung:** Neue Buchungen werden nicht automatisch in der leads-Tabelle als "Booked" markiert
- **Fix:** Angie muss Google OAuth neu autorisieren (manuell, braucht Browser-Login)
- **Prioritaet:** P1

### ERROR 2: Brevo Webhook Signature 401
- **Was:** Brevo-Webhooks werden mit 401 abgelehnt
- **Ursache:** Signature-Validierung schlug fehl
- **Fix:** Code fuer optionale Signature geschrieben am 13.04., Deploy ausstehend
- **Auswirkung:** Email-Events (Opens, Clicks, Bounces) werden nicht in der DB gespeichert
- **Prioritaet:** P1

### ERROR 3: Website Tracking - Doppelte Pipelines mit Feld-Mismatch
- **Was:** Zwei parallele Tracking-Pipelines mit unterschiedlichen Feld-Namen
- **Pipeline 1:** WebsiteTracker.tsx --> /api/track-click (direkt, `visitor_id` snake_case)
- **Pipeline 2:** lib/tracking.ts --> /api/track --> /api/webhooks/website-clicks (`visitorId` camelCase)
- **Auswirkung:** Potenzielle Duplikate oder inkonsistente Daten in website_clicks
- **Fix:** Eine Pipeline waehlen und die andere entfernen, oder Feld-Namen harmonisieren
- **Prioritaet:** P2

### ERROR 4: Inbound Agent Schedule-Diskrepanz
- **Was:** Agent-Instruktionen sagen "alle 15 Minuten", tatsaechlich laeuft er 4x taeglich
- **Auswirkung:** Lead-Response-Zeit ist im besten Fall 3 Stunden statt 15 Minuten
- **Ursache:** vercel.json Cron-Eintraege wurden geaendert, .agents/*.md nicht aktualisiert
- **Fix:** Entweder Schedule auf 15 Min erhoehen ODER .md-Datei korrigieren
- **Prioritaet:** P1 (Inbound-Speed ist Sales-kritisch)

---

## Abschnitt 5: Fehlende Verbindungen (MISSING)

### MISSING 1: /api/webhooks/website-leads ist NICHT von der Website aufgerufen
- **Was:** Am 12.04. wurde ein neuer Webhook `/api/webhooks/website-leads` erstellt (Origin-basiert, ohne Secret)
- **Problem:** Kein Code auf der Website ruft diesen Endpoint auf. Das Popup nutzt weiterhin `/api/webhooks/inbound`
- **Auswirkung:** Keine. Der Endpoint existiert aber ist nicht verbunden. Moeglicherweise fuer zukuenftigen Einsatz gedacht.
- **Empfehlung:** Entscheiden ob dieser Endpoint den alten `/webhooks/inbound` ersetzen soll. Falls ja: Website-Code umstellen.

### MISSING 2: Potenzialrechner hat KEINEN Lead-Capture
- **Was:** Der KI-Potenzialrechner ist ein reines Client-Side-Tool. Er sammelt keine Email-Adressen.
- **Auswirkung:** Besucher die den Rechner nutzen (hohes Kaufinteresse!) werden nicht als Leads erfasst, ausser sie geben separat ihre Email im Popup ein.
- **Empfehlung:** Email-Gate vor oder nach den Ergebnissen einbauen. Oder: trackClick auf den Ergebnis-CTA, damit der Intent zumindest anonym erfasst wird.

### MISSING 3: Potenzialrechner-CTA hat KEINEN trackClick
- **Was:** Der "Jetzt KI-Quickcheck buchen" Button auf der Potenzialrechner-Ergebnisseite ruft trackClick NICHT auf
- **Auswirkung:** Klicks auf diesen hochrelevanten CTA werden nicht im Sales Control erfasst
- **Fix:** trackClick-Aufruf hinzufuegen wie bei allen anderen CTAs
- **Prioritaet:** P2

### MISSING 4: Nav-CTAs haben KEINEN trackClick
- **Was:** Die CTA-Buttons in der Navigation (Desktop + Mobile) rufen trackClick nicht auf
- **Auswirkung:** Navigation-Klicks werden nicht getrackt
- **Fix:** trackClick ergaenzen
- **Prioritaet:** P3

### MISSING 5: Keine Inbound-spezifische Email-Sequenz-Differenzierung im Inbound Agent
- **Was:** Der Inbound Response Agent und die Inbound-Sequenz (process-sequences) laufen PARALLEL und unabhaengig voneinander
- **Problem:** Ein Lead kann sowohl eine personalisierte Inbound-Response-Email als auch Step 3 (Welcome) der Inbound-Sequenz am selben Tag bekommen
- **Auswirkung:** Lead bekommt potenziell 2 Emails am selben Tag von unterschiedlichen Systemen
- **Fix:** Koordination zwischen Inbound Agent und process-sequences einbauen (z.B. Inbound Agent setzt outreach_source, process-sequences checkt dieses Feld)

### MISSING 6: HubSpot Import/Export Mismatch (bekannt)
- **Was:** HubSpot-Felder stimmen nicht mit dem Sales Control Schema ueberein
- **Auswirkung:** Bidirektionaler Sync ist unzuverlaessig
- **Status:** Bekannt, noch nicht gefixt

### MISSING 7: Website Tracking Script nicht auf Live-Site installiert (bekannt)
- **Was:** Das Tracking-Script existiert im Code, aber auf der Live-Site praxisnovaai.com wurde es moeglicherweise nicht deployed
- **Auswirkung:** Keine Click-Daten fuer den Inbound Response Agent (Intent-Score = 0 fuer alle Leads)
- **Status:** Muss verifiziert werden (Live-Site pruefen)

---

## Abschnitt 6: Angelegt aber nicht ausgebaut (STUB)

### STUB 1: follow-up-tracker.md (14 Zeilen)
- **Was:** Die Agent-Instruktionsdatei hat nur 14 Zeilen (Name, Kontext, 6 Regeln)
- **Problem:** Alle anderen Agenten haben 130-332 Zeilen mit detaillierten Workflows, Phasen, API-Dokumentation
- **Auswirkung:** Aktuell funktional, da der volle Prompt in der Cron-Route `getSystemPrompt()` eingebettet ist
- **Fix:** Die .md-Datei auf den Standard der anderen Agenten bringen (Workflow-Phasen, DB-Aktionen, API-Config)
- **Prioritaet:** P3

### STUB 2: /api/webhooks/website-leads (unverbunden)
- **Was:** Vollstaendig implementierter Webhook (240 Zeilen), aber von keinem System aufgerufen
- **Problem:** Wurde am 12.04. erstellt, existiert parallel zum alten /api/webhooks/inbound
- **Unterschied zum alten Endpoint:** Kein Double-Opt-In, kein HubSpot-Sync, kein sequence_type
- **Fix:** Entscheidung treffen: Ersetzen oder entfernen?
- **Prioritaet:** P3

### STUB 3: Tote ENV-Variablen im Website-Repo
- **Was:** `HUBSPOT_PORTAL_ID`, `BREVO_API_KEY`, `BREVO_LIST_ID`, `NEXT_PUBLIC_CALENDLY_URL`, `NEXT_PUBLIC_SITE_URL` in .env.example deklariert aber nirgends im Code verwendet
- **Auswirkung:** Verwirrung bei der Konfiguration
- **Fix:** Aus .env.example entfernen oder im Code nutzen
- **Prioritaet:** P3

---

## Abschnitt 7: Priorisierte Fix-Liste

### P0 - UMSATZ GEHT VERLOREN

| # | Problem | Impact | Fix-Aufwand |
|---|---------|--------|-------------|
| P0-1 | Inbound Agent laeuft nur 4x/Tag statt alle 15 Min | Leads warten bis zu 6 Stunden auf Antwort, Conversion sinkt drastisch | vercel.json anpassen ODER akzeptieren und .md korrigieren |
| P0-2 | Website Tracking moeglicherweise nicht auf Live-Site | Intent-Score fuer alle Inbound-Leads = 0, Personalisierung unmoeglich | Live-Site pruefen, ggf. re-deployen |
| P0-3 | Potenzialrechner hat keinen Lead-Capture | Hochinteressierte Besucher gehen ohne Kontaktdaten verloren | Email-Feld einbauen |

### P1 - AGENT-FEHLER

| # | Problem | Impact | Fix-Aufwand |
|---|---------|--------|-------------|
| P1-1 | Google Calendar OAuth 401 | Buchungen werden nicht als "Booked" markiert, Agenten kontaktieren gebuchte Leads weiter | Angie muss OAuth neu autorisieren |
| P1-2 | Brevo Webhook 401 | Email-Performance-Daten fehlen, Bounces/Unsubscribes nicht verarbeitet | Code-Fix deployen (bereits geschrieben 13.04.) |
| P1-3 | Inbound Agent + Inbound Sequenz senden parallel | Lead bekommt doppelte Emails | Koordinationslogik einbauen |

### P2 - FEHLENDE VERBINDUNGEN

| # | Problem | Impact | Fix-Aufwand |
|---|---------|--------|-------------|
| P2-1 | Doppelte Tracking-Pipelines (WebsiteTracker vs tracking.ts) | Dateninkonsistenz, Duplikate in website_clicks | Eine Pipeline konsolidieren |
| P2-2 | Potenzialrechner-CTA ohne trackClick | Klicks auf wichtigsten CTA nicht erfasst | 1 Zeile Code |
| P2-3 | HubSpot Import/Export Mismatch | Bidirektionaler Sync unzuverlaessig | Schema-Mapping pruefen |
| P2-4 | 7 API-Routes ohne Auth (bekannt) | Sicherheitsrisiko | Auth-Middleware ergaenzen |
| P2-5 | DSGVO Blob public statt private (bekannt) | Datenschutz-Risiko | Blob-Zugriffsrechte aendern |

### P3 - NICHT AUSGEBAUTE AGENTEN

| # | Problem | Impact | Fix-Aufwand |
|---|---------|--------|-------------|
| P3-1 | follow-up-tracker.md ist nur ein Stub | Funktioniert, aber nicht standard-konform | .md-Datei ausfuehren |
| P3-2 | /api/webhooks/website-leads unverbunden | Toter Code, Verwirrung | Entscheidung + Cleanup |
| P3-3 | Tote ENV-Variablen im Website-Repo | Verwirrung bei Setup | Cleanup |
| P3-4 | Nav-CTAs ohne trackClick | Minimaler Datenverlust | trackClick ergaenzen |

---

## Abschnitt 8: Empfehlung naechste Schritte

### Sofort (heute/morgen)

1. **Live-Site pruefen:** Ist das Tracking-Script auf praxisnovaai.com aktiv? Ohne Click-Daten ist der Inbound Agent blind. Browser-DevTools oeffnen, Network-Tab pruefen ob Requests an `/api/track` oder `/api/track-click` gehen.

2. **Brevo Webhook Fix deployen:** Der Code ist geschrieben (13.04.), muss nur deployed werden. Ohne den Fix fehlen alle Email-Performance-Daten.

3. **Entscheidung: Inbound Agent Schedule.** Entweder:
   - Option A: Auf `*/15 6-22 * * *` erhoehen (wie in .md beschrieben) - kostet mehr Vercel-Cron-Budget
   - Option B: Akzeptieren dass 4x/Tag reicht und die .md korrigieren

### Diese Woche

4. **Google Calendar OAuth erneuern.** Angie muss das im Browser machen. Ohne das werden Buchungen nicht erkannt.

5. **Doppel-Email-Problem loesen.** Wenn ein neuer Inbound-Lead reinkommt, kann er sowohl vom Inbound Agent (personalisierte Email) als auch von process-sequences (Inbound-Sequenz Step 3) kontaktiert werden. Loesung: process-sequences soll Leads mit `outreach_source='agent_inbound_response'` fuer die ersten 48h ueberspringen.

6. **Potenzialrechner Lead-Capture einbauen.** Ein Email-Feld nach der Berechnung ("Ergebnisse per Email erhalten") wuerde hochqualifizierte Leads erfassen.

### Naechste 2 Wochen

7. **Tracking-Pipelines konsolidieren.** Eine der zwei Pipelines (WebsiteTracker.tsx direkt vs lib/tracking.ts via Proxy) entfernen. Empfehlung: Den Proxy-Ansatz behalten (/api/track), weil er die Sales-Control-URL nicht im Client-Side-Code exponiert.

8. **follow-up-tracker.md ausbauen.** Die Agent-Instruktionsdatei auf den Standard der anderen Agenten bringen.

9. **7 API-Routes absichern.** Auth-Middleware fuer alle ungeschuetzten Routes ergaenzen.

10. **DSGVO Blob auf private umstellen.** Backups duerfen nicht oeffentlich zugaenglich sein.

### Spaeter / Backlog

11. **website-leads Webhook: Entscheidung treffen.** Entweder als Ersatz fuer den alten /inbound-Webhook etablieren (dann braucht er Double-Opt-In) oder entfernen.

12. **HubSpot Schema-Mapping fixen.** Felder zwischen Sales Control und HubSpot harmonisieren.

13. **Tote ENV-Variablen aus Website .env.example entfernen.**

---

## Anhang: Datenbank-Tabellen (Verwendung im System)

| Tabelle | Genutzt von |
|---------|-------------|
| leads | Alle Agenten, Webhooks, Cron-Jobs |
| partners | Partner Researcher, Partner Supervisor, Partner Outreach |
| agent_logs | Alle Agenten (Start/End/Error Logging) |
| agent_decisions | Alle Agenten (Entscheidungen dokumentieren, gegenseitig lesen) |
| agent_reports | Operations Manager, Market Intelligence |
| manager_instructions | Operations Manager (Angie-Anweisungen lesen) |
| email_events | Process Sequences, Brevo Webhook |
| website_clicks | Inbound Agent, WebsiteTracker, Tracking-Webhooks |
| call_queue | Call List Generator, LinkedIn Response Check |
| linkedin_tracking | LinkedIn Response Check |
| linkedin_queue | Outreach Strategist, Partner Outreach (Angie sendet manuell) |
| linkedin_posts | LinkedIn Posting Check |
| linkedin_post_drafts | LinkedIn Post Generator |
| industry_news | News Agent |
| customer_insights | Outreach Strategist |
| agent_updates | News Agent |
| email_performance_daily | Brevo Stats Sync |
| weekly_reports | Weekly Report |
| processed_gmail_messages | Gmail Reply Sync |
| sequences | Process Sequences |
| error_logs | Error Sentinel, Health Monitor |

---

*Report erstellt am 13. April 2026 durch Claude Code Cross-Repo Analyse.*
*Repos: praxisnova-sales-control (GitHub hertleanjuli-afk), praxisnova-website (lokal unter ~/Desktop/PraxisNovaAI/repos/)*
