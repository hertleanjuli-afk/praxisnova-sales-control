# CHANGELOG

Alle nennenswerten Aenderungen am praxisnova-sales-control (und benachbarten Repos wie praxisnova-website, wo im Kontext von Paketen mitgeliefert).

Format: [Datum] Paket-Name / Kurzbeschreibung.

---

## [2026-04-18] Tech-Gaps ntfy.sh als zweite Push-Spur (PR noch offen)

Folge-PR zu T3 Observability. Angie hat kein Slack aber eine ntfy-iOS-App; ntfy-Push wird als gleichwertiger zweiter Kanal zu Slack integriert.

- **GEAENDERT** `lib/observability/logger.ts`: neue `notifyNtfy(entry)` Funktion. `observe.error` ruft beide Channels parallel via Promise.allSettled -> ein ausfallender Channel blockt den anderen nicht.
- **GEAENDERT** `__tests__/helpers/observability.test.ts`: 8 neue ntfy-Tests (kein Topic-env / POST-Body + Title + Priority / priority=high bei critical / 429 / network-throw / beide Channels / nur ntfy / allSettled Isolation)
- **GEAENDERT** `.env.example`: `SLACK_ALERT_WEBHOOK` + `NTFY_TOPIC_URL` dokumentiert, mit Default-Topic `https://ntfy.sh/praxisnovaai-alerts-task110`
- **GEAENDERT** `Agent build/RUNBOOKS-TECH-GAPS-2026-04-18.md`: Runbook A deckt beide Kanaele ab (Slack-Alert ODER ntfy-Push), mit "fehlender Kanal als Signal" Diagnose-Hilfe
- **Branch:** `tech-gaps/ntfy-integration`, basiert auf `tech-gaps/t3-observability`. Merge-Reihenfolge: T3 (#25) zuerst, dann dieser PR gegen main.

### ENV-Aktion offen
- `NTFY_TOPIC_URL=https://ntfy.sh/praxisnovaai-alerts-task110` in Vercel setzen (Production + Preview) nach Merge. Push-Test bereits bestanden.

---

## [2026-04-18] Tech-Gaps Wave 1 / Fallback, Retry, Observability, Memory-Hygiene

Vier Tech-Gaps in 4 isolierten PRs geschlossen. Alle Production-Routes
unangetastet (CLAUDE.md ban list eingehalten). Adoption in den Routes folgt als
Folge-PRs nach Approval. **Status:** PRs warten auf Angies Review.

### T1 — Fallback-Mechanismen (PR #23)
- **NEU** `lib/agents/fallback.ts` mit `executeFallback(agent, primary, spec, context, runner?)`
- **NEU** `lib/agents/configs.ts` mit 3 Pilot-Konfigurationen (lead_ingestor: legacy, outreach_strategist: skill, reply_detector: noop)
- **NEU** `__tests__/helpers/fallback.test.ts` (11 Tests, alle gruen)

### T2 — Retry mit Backoff (PR #24)
- **NEU** `lib/util/retry.ts` mit `retryWithBackoff` plus Wrapper (Apollo 5x, Calendar/Gmail/OpenAI/Brevo 3x)
- **GEAENDERT** `lib/apollo.ts`, `lib/google-calendar-client.ts`, `lib/gmail-client.ts`: 5 Call-Sites migriert
- **NEU** `__tests__/helpers/retry.test.ts` (13 Tests, alle gruen)

### T3 — Observability + Slack + recent-errors (PR #25)
- **NEU** `lib/observability/logger.ts` mit `observe.{debug,info,warn,error}` (JSON Lines, Slack-Send bei Error-Level)
- **NEU** `app/api/observability/recent-errors/route.ts` (GET, Bearer CRON_SECRET, default 50 Errors aus error_logs Tabelle)
- **NEU** `__tests__/helpers/observability.test.ts` (9 Tests, inkl. Slack-Failure-Modes, alle gruen)
- **ENV (optional):** `SLACK_ALERT_WEBHOOK` — wenn nicht gesetzt, kein Slack-Send

### T4 — Memory-Hygiene (PR #26)
- **NEU** `lib/memory/hygiene.ts` mit `verifyMemoryFacts(facts, context, options)` (3 Status: fresh/stale/verify_failed)
- **NEU** `lib/memory/agent-facts.ts` mit 3 Pilot-Agenten je 3 Facts
- **NEU** `docs/memory-hygiene-checks.md` (Failure-Bedeutung + ESC-Pfad pro Fact)
- **NEU** `__tests__/helpers/memory-hygiene.test.ts` (8 Tests, alle gruen)

### Reports und Runbooks (PR docs branch)
- **NEU** `Agent build/CLAUDE-CODE-REPORT-2026-04-18-TECH-GAPS.md` (Executive Summary, Was-rein, Was-aus, Naechste Schritte)
- **NEU** `Agent build/RUNBOOKS-TECH-GAPS-2026-04-18.md` (Runbook A: Slack-Alert, Runbook B: Stale-Fact, Runbook C: Apollo-429-Eskalation)

### Skills genutzt
engineering.architecture, engineering.system-design, engineering.code-review, engineering.testing-strategy, engineering.documentation, operations.runbook (alle Cowork-Plugin-Skills, im SKILLS-MANIFEST eingetragen)

### Branches und PRs
- tech-gaps/t1-fallback (PR #23)
- tech-gaps/t2-retry (PR #24)
- tech-gaps/t3-observability (PR #25)
- tech-gaps/t4-memory-hygiene (PR #26)
- tech-gaps/docs (dieser PR)

---

## [2026-04-17] Skill-Scan Initial / Manifest und External-Reference

Voll-Scan aller verfuegbaren Skills auf Angies Mac plus External-Reference-Integration. Vorbereitung fuer Skill-Router (Batch B) und 8-Agent-Konsolidierung (Batch C).

### Pflicht-Docs nach Repo kopiert (Vorbedingung Option C)
- **NEU** `Agent build/SKILL-ARCHITECTURE-2026-04-17.md` (kopiert aus Documents/Claude/Projects/Agent build)
- **NEU** `Agent build/OPTION-C-PLAN-AMENDMENT-2026-04-17-SKILL-ARCHITECTURE.md`
- **NEU** `Agent build/OPTION-C-MASTER-PLAN-2026-04-17.md`

### Voll-Scan Mac-Home (827 SKILL.md Dateien, 220 unique Skills)
- **NEU** `Agent build/SKILLS-RAW-SCAN-2026-04-17.md`: vollstaendiges Quellen-Inventar nach Source-Type sortiert
- **NEU** `Agent build/SKILLS-MANIFEST.md`: kuratiertes Single-Source-of-Truth-Manifest, 18 Kategorien, primary/optional Skills pro Agent
- **NEU** `Agent build/CLAUDE-CODE-REPORT-2026-04-17-SKILLS-SCAN.md`: Top-30 Skills, Plugin-Overlaps, WARNINGS, Empfehlungen

### External Reference: msitarzewski/agency-agents
- Cloned nach `~/praxisnovaai-external/agency-agents` (MIT-Lizenz, ca. 80 Agenten in 20 Kategorien)
- 5 Uebernahme-Muster extrahiert (YAML-Frontmatter, Persona/Operations-Trennung, Multi-Agent-Workflow, Reality-Checker-Gate, Convert-Adapter)

### Skills genutzt (Pflicht-Sektion)
- engineering.documentation, engineering.architecture, engineering.system-design, operations.runbook (Cowork-Plugins)

### Branch und PR
- Branch: `skill-scan/initial`
- PR-Titel: Skill Inventory: Initial Manifest and External Reference Integration

---

## [2026-04-12] Paket B: Tracking, Calendar Sync, Popup, Sonderzeichen

Vier eigenstaendige Commits, jeder rollback-faehig.

### Teil 1: Website Tracking (Commit `5b6541f`)
- **NEU** `public/tracking.js`: vanilla JS Pageview-Tracker fuer praxisnovaai.com
- **GEAENDERT** `app/api/webhooks/website-clicks/route.ts`: dual-auth (Secret ODER Origin), CORS Preflight, Rate-Limit 10/IP/min
- **NEU** `Agent build/code-changes/PAKET-B-TRACKING-TAG.md`: Install-Guide

### Teil 2: Google Calendar Sync (Commit `d7607f8`)
- **NEU** `lib/google-calendar-client.ts`: REST-Wrapper fuer Calendar v3
- **NEU** `app/api/cron/google-calendar-sync/route.ts`: Cron alle 5 Min 06-22 UTC
- **NEU** `app/api/trigger/google-calendar-sync/route.ts`: manueller ADMIN_SECRET Trigger
- **GEAENDERT** `lib/db.ts`: `leads.google_event_id`, `leads.last_booking_at`, partial unique index
- **GEAENDERT** `vercel.json`: neuer Cron-Entry mit explizitem Minute-Listing
- **GEAENDERT** `app/api/settings/system-health/route.ts`: neuer Agent-Eintrag fuer Ampel
- **Blocker**: GOOGLE_CALENDAR_REFRESH_TOKEN + GOOGLE_CALENDAR_ID muessen von Angie in Vercel gesetzt werden

### Teil 3: Website Email-Popup (Commit `c778a6a`)
- **NEU** `public/popup.js`: Exit-Intent / 30s-Timer Modal mit Email-Form
- **NEU** `app/api/webhooks/website-leads/route.ts`: Origin-auth POST-Handler, Rate-Limit 5/IP/10min, Brevo-Notification an Angie
- **NEU** `Agent build/code-changes/PAKET-B-POPUP-INSTALL.md`: Install-Guide

### Teil 4: Website Sonderzeichen Putzkolonne (Commit `cf8e099` in praxisnova-website)
- **GEAENDERT** 11 Dateien in praxisnova-website, ca. 25 Zeilen: alle em-dash und en-dash aus user-facing Strings entfernt
- **NEU** `WEBSITE-SONDERZEICHEN-FIXES.md`: Diff-Tabelle mit Datei/Zeile/Vorher/Nachher
- **Blocker**: 6 Dateien mit uncommitted WIP wurden nicht angefasst, Follow-ups fuer Angie dokumentiert

### Golden Rules Check
- Kein em-dash in neuem Code: geprueft (grep 0 Treffer).
- Kein en-dash in neuem Code: geprueft (grep 0 Treffer).
- Echte Umlaute in user-facing Strings: geprueft.
- Sie-Form in Kundentexten: geprueft (Popup Headline, Erfolgsmeldung, Fehlermeldung).
- ASCII Umlaute in Code-Kommentaren: OK per Regel.
