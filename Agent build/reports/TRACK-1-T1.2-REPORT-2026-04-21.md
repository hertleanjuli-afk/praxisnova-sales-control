# Track 1 T1.2 Dashboard V2 Report

Datum: 2026-04-21
Branch: `track1/t2-dashboard`
Deadline: Do 2026-04-23, 13:00
Status: PR offen, wartet auf Review + Index-Migration (v10) auf Neon durch Angie

---

## Scope

Dashboard-V2 mit allen Metriken aus SALES-CONTROL-SPEC-2026-04-20.md Teil 1.1-1.5:

- **1.1 Lead-Metriken** (4 Werte: heute, diese Woche, letzte Woche, Monat)
- **1.2 Sequenz-Metriken** (7 Werte inkl. "auf letztem Step", "pausiert", "beendet ohne Reply")
- **1.3 LinkedIn-Metriken** (4 Zeitfenster je fuer Requests sent/accepted + Messages sent/received, plus Conversion-Rates Woche + Monat)
- **1.4 Anruf-Metriken** (3 Werte aus `call_queue` + `call_logs`)
- **1.5 Block-Metriken** (3 Werte aus `leads` + `company_blocks`)
- **Konsistenz-Invariante:** Summe Branchen = Gesamt, rot wenn Abweichung

---

## Geliefert

### Neu angelegt

| Datei | Zweck |
|---|---|
| `lib/metrics.ts` | Pure Helper-Funktionen: Datum-Anker, Conversion-Rate, Konsistenz-Check, `SEQUENCE_MAX_STEPS`, `isOnLastStep` |
| `lib/metrics-queries.ts` | SQL-Aggregationen je Metrik-Gruppe, parallel aufrufbar |
| `app/api/metrics/route.ts` | GET-Endpoint (60s revalidate), auth, konsolidierte JSON-Response |
| `app/(dashboard)/dashboard-v2/page.tsx` | Server Component, `revalidate = 60`, ruft Helpers direkt auf |
| `db-migration-v10-dashboard-indexes.sql` | 5 Indexe: `idx_leads_created_at`, `idx_leads_enrolled_at`, `idx_leads_sequence_status`, `idx_call_logs_call_date`, `idx_email_events_lead_event` |
| `db-migration-v10-down.sql` | Rollback fuer v10 |
| `__tests__/helpers/metrics.test.ts` | 25 Unit-Tests (Datum, Conversion, Konsistenz, isOnLastStep) |

### Angepasst

| Datei | Aenderung |
|---|---|
| `app/(dashboard)/layout.tsx` | Nav-Eintrag "Dashboard V2" unter "Uebersicht", Href `/dashboard-v2`, Emoji 🧭 |

---

## Skills-Consultation

| Skill | Verfuegbar? | Anwendung |
|---|---|---|
| `data:sql-queries` | nein, Plugin nicht installiert | Fallback: PLATFORM-STANDARDS 2.1 + 2.2 als Leitfaden, `FILTER(WHERE ...)` Pattern aus Bestandsdashboard uebernommen |
| `data:build-dashboard` | nein | Fallback: Bestands-Dashboard-Design-Tokens nachgenutzt (BG_CARD, CORAL, BORDER), einheitliches Grid per `minmax` |
| `engineering:testing-strategy` | nein | Fallback: vorhandener Test-Pattern aus `__tests__/helpers/alert-state.test.ts` (pure Funktionen, node:test + node:assert/strict), 25 neue Tests fuer alle Helper-Kanten |
| `engineering:code-review` | nein | Selbst-Review per Diff + Gate-Matrix unten |

Alle 4 Skills waren Plugin-only und nicht installiert, siehe auch Skill-Availability aus T1.1-Report. Fallback laut PLATFORM-STANDARDS 3.2 + 3.4.

---

## Gate-Matrix (PR-Body-Template aus PS 3.4)

### Gate 1 – Legal (PS 1.1 + 1.5)
- `./scripts/legal-scan.sh` gruen.
- Keine Forbidden-Phrases im Diff.
- Kein kundenfacing-Content.
- Dashboard-V2 ist internes Tool, keine DSGVO-Erweiterung gegenueber Bestandsdashboard.

### Gate 2 – Security (PS 1.2)
- `./scripts/security-scan.sh` gruen.
- API-Route `/api/metrics` prueft `getServerSession`, 401 ohne Session.
- Page redirected auf `/login` ohne Session.
- Keine Secrets, keine SQL-Injection (alles tagged-template via neon-driver, keine `sql.unsafe`).
- Keine `Access-Control-Allow-Origin: *`.

### Gate 3 – Technical (PS 1.3)
- Tests: `npm run test:helpers` 147/147 gruen, davon 25 neu (Datum-Helpers, Rate, Konsistenz, isOnLastStep, Sequenz-Map).
- Migration v10: idempotent (`CREATE INDEX IF NOT EXISTS`), Down-Migration separater File, beide getestet auf Idempotenz via statisches Pattern.
- TypeScript strict. Keine `any`, keine `console.log` in Produktion (nur `console.error` im API-Error-Handler).
- Migration **nicht** auf Neon ausgefuehrt (CLAUDE.md-Regel).

### Gate 4 – Agent-Safety (PS 1.4)
- n/a fuer T1.2 (keine Agent-Writes, keine Crons, keine externen APIs).

### Gate 5 – Cost (PS 2.1)
- Ausschliesslich SQL-Aggregation, kein LLM-Call im Pfad.
- 6 Queries parallel via `Promise.all`, nicht N+1.
- `Promise.all` spart Waterfall-Latenz, jede Query einmal pro Refresh.
- API-Route hat `revalidate = 60` -> max 1 DB-Round pro Minute pro Instance.

### Gate 6 – Scale (PS 2.2)
- Indexe siehe v10-Migration. Nach Deployment sind folgende Indexe genutzt:
  - v9: `idx_leads_linkedin_state`, `idx_leads_blocked_until`, `idx_linkedin_events_created`, `idx_linkedin_messages_direction`, `idx_company_blocks_until`, `idx_call_queue_scheduled_for`
  - v10 (neu): `idx_leads_created_at`, `idx_leads_enrolled_at`, `idx_leads_sequence_status`, `idx_call_logs_call_date`, `idx_email_events_lead_event`
- Pagination nicht noetig (Queries liefern Counts, keine Rows).
- `EXPLAIN ANALYZE` soll Angie post-deploy fuer die 3 haeufigsten Queries nachziehen (s. unten), ich kann Neon nicht direkt ansprechen.

### Gate 7 – Extensibility (PS 2.3)
- Sequenz-Typen leben in `SEQUENCE_MAX_STEPS` (lib/metrics.ts). Bei neuem Type muss dort + im statischen OR der SQL-Query ergaenzt werden.
- TODO im Code dokumentiert: bei Einfuehrung `icp_config`-Tabelle (PS 3.5) wechselt die Quelle auf DB-Table.
- Konsistenz-Check ist generisch: nimmt beliebig viele Sektoren, zaehlt per `COALESCE(sequence_type, 'allgemein')` GROUP BY.

---

## EXPLAIN-Runs fuer Top-3 Queries (Angie bitte auf Neon verifizieren)

Nach v10-Deployment diese Queries in Neon SQL Editor laufen und Output im PR-Body kleben:

```sql
EXPLAIN ANALYZE
SELECT
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')       AS today,
  COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW()))      AS this_week,
  COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))     AS month
FROM leads;
-- Erwartet: idx_leads_created_at wird genutzt.

EXPLAIN ANALYZE
SELECT COUNT(*) AS active
FROM leads
WHERE sequence_status = 'active'
  AND sequence_step >= 6;
-- Erwartet: idx_leads_sequence_status wird genutzt.

EXPLAIN ANALYZE
SELECT COUNT(*)
FROM linkedin_events
WHERE to_state = 'request_sent'::linkedin_state_enum
  AND created_at >= NOW() - INTERVAL '7 days';
-- Erwartet: idx_linkedin_events_created wird genutzt.
```

---

## Risk + Rollback

- **Migration v10:** `psql "$DATABASE_URL" -f db-migration-v10-down.sql` droppt nur Indexe, kein Daten-Risiko.
- **Dashboard-V2 Page/API:** additiv. `/dashboard-v2` ist eine neue Route. Bestehendes `/` Dashboard unberuehrt.
- **Nav-Eintrag:** 1 Zeile in `app/(dashboard)/layout.tsx`, kann per `git revert` rueckgaengig gemacht werden.
- **Breaking Changes:** keine.

## Observability

- API-Error geht via `console.error('[metrics] query failed', error)`. Ohne weitere Instrumentierung. Falls Angie strukturierte Logs will: Folge-PR mit `observe` Wrapper.

## Offene Punkte

1. **`sequence_status`-Werte:** Ich nehme `'active'`, `'paused'`, `'completed'`, `'stopped_manual'` als bekannt aus Bestandscode. Falls in Neon weitere Werte existieren (z.B. 'booked', 'blocked'), zaehlen sie nicht in "beendet ohne Reply". Bei Bedarf Filter erweitern.
2. **`call_queue.scheduled_for`:** Neue v9-Spalte, Bestands-Rows haben NULL. Queries nutzen `COALESCE(scheduled_for::date, queue_date)` als Fallback.
3. **Konsistenz-Invariante:** Aktuell ueber `sequence_type`. Sobald `icp_config`-Tabelle (PS 3.5) aktiv ist, soll die Spalte auf `leads.icp` oder `leads.icp_config_id` wechseln.
4. **EXPLAIN ANALYZE:** Claude Code kann Neon nicht direkt ansprechen, Angie bitte nach Deployment nachpflegen.

## Naechste Schritte

- T1.3 LinkedIn 7 Tabs auf Branch `track1/t3-linkedin` nach Merge von T1.2.
- T1.4 Block-System UI + Konstanten-Extraktion `config/constants.ts`.
- T1.5 Anrufliste mit 5 Triggern.
- T1.6 Cross-Links.
- T1.7 Cron `unblock-expired`.
