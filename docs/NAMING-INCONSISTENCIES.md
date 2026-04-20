# Naming Inconsistencies (Live DB vs. Spec)

Ziel: Bestehende Kollisionen zwischen Live-Datenmodell und neueren Specs
dokumentieren, damit Agents + Dashboards wissen welcher Identifier in welchem
Kontext gilt. Kein Rename, bis es einen dedizierten Sunset-Track gibt.

---

## 1. call_queue vs. call_list

- **DB-Tabelle:** `call_queue` (aus db-migration-v4-upgrade.sql).
- **UI / Spec:** "Anrufliste" / `call_list`.
- **Gilt seit:** v9 Migration (2026-04-20).
- **Reason:** Spec `Agent build/SALES-CONTROL-SPEC-2026-04-20.md` und Prompt T1.5
  nennen die Struktur `call_list`. Ein Rename wurde verworfen, weil bestehende
  Agents und Dashboards (`app/api/anrufliste/route.ts`,
  `app/api/cron/call-list-generator/route.ts`, Dashboard-Metriken) auf
  `call_queue` verweisen. Breaking Change waere nicht minimal-invasiv.
- **Regel:**
  - In SQL, Migrations, Agent-Routes, State-Machine: IMMER `call_queue`.
  - In User-Facing UI-Texten (Labels, Routen `/sales-control/anrufliste`,
    Dashboard-KPIs): "Anrufliste" bzw. `call_list` als User-Nomenklatur erlaubt.
- **Sunset-Trigger:** Wenn Angie einen dedizierten Rename-Track freigibt,
  wird `call_queue` via `ALTER TABLE RENAME TO call_list` umgezogen, alle
  Agent-Routes migriert und dieser Eintrag entfernt.

## 2. linkedin_tracking vs. linkedin_messages + linkedin_events

- **DB-Tabelle (v4):** `linkedin_tracking` mit `connection_status`,
  `request_due_date`, `message_sent`, `reply_received`, + View
  `v_linkedin_actions_due`.
- **Neu in v9:** `linkedin_messages` (Nachrichten-Body + Richtung) und
  `linkedin_events` (State-Transition-Log).
- **Gilt seit:** v9 Migration (2026-04-20).
- **Reason:** Spec verlangt granulareres Event-Modell. `linkedin_tracking`
  bleibt read-only bestehen bis Sunset-Migration v10+. Kein Daten-Backfill in
  v9, nur neue Events ab v9 werden in den neuen Tabellen gefuehrt.
- **Regel:**
  - Neue State-Transitions, Nachrichten: IMMER `linkedin_messages` und
    `linkedin_events`.
  - `linkedin_tracking` + View `v_linkedin_actions_due`: nur Lesen, keine neuen
    Writes aus v9-Code. Bestehende Agents die noch `linkedin_tracking` fuellen
    duerfen das weiter tun, bis sie in einem separaten Track migriert werden.
- **Sunset-Trigger:** Wenn alle Writes auf `linkedin_tracking` ausgeraeumt
  sind, Migration v10+ kopiert die History nach `linkedin_messages`/
  `linkedin_events` und droppt die alte Tabelle.

## 3. leads.status (linkedin_* Praefix) vs. leads.linkedin_state

- **DB-Spalte alt:** `leads.status` enthaelt Werte wie `'linkedin_pending'`,
  `'linkedin_request_sent'`, `'linkedin_connected'`, `'linkedin_message_sent'`,
  `'linkedin_replied'` (aus v4-Kommentar).
- **Neu in v9:** `leads.linkedin_state` als dedizierter Enum mit 9 States
  (`open`, `no_linkedin`, `request_sent`, `connected`, `message_sent`,
  `replied_positive`, `replied_negative`, `blocked_person`, `blocked_company`).
- **Gilt seit:** v9 Migration (2026-04-20).
- **Reason:** Enum trennt LinkedIn-Semantik klar vom Lifecycle-`status`. Vermeidet
  Mehrfach-Bedeutung einer einzigen Spalte.
- **Regel:**
  - Neuer LinkedIn-Workflow-Code liest + schreibt `leads.linkedin_state`.
  - `leads.status` bleibt unveraendert, wird von v9 nicht ueberschrieben,
    ausser dem initialen Mapping (v9 kopiert `status`-Werte mit `linkedin_`-
    Praefix in `linkedin_state`).
- **Sunset-Trigger:** Wenn alle konsumierenden Queries auf `linkedin_state`
  umgestellt sind, kann `status` die `linkedin_*`-Werte verlieren. Separater
  Track, nicht Teil von v9.
