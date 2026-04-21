-- ============================================================================
-- Migration v10: Dashboard-V2 Performance-Indexe (Track 1, T1.2)
-- ============================================================================
-- Was:      Ergaenzt Indexe fuer die Filter-Spalten die Dashboard-V2
--           (app/(dashboard)/dashboard-v2) und die Metrics-API nutzt.
-- Warum:    Gate 6 (PLATFORM-STANDARDS 2.2 Scale): jede WHERE-kritische
--           Spalte braucht einen Index. Dashboard laedt laut Spec <2s.
--           Ohne diese Indexe scannen die Lead-/Sequenz-Metriken bei
--           wachsendem Lead-Volumen full table.
-- Scope:    Nur CREATE INDEX IF NOT EXISTS. Keine Spalten- oder Table-
--           Aenderungen. Kein Risiko fuer Bestandsdaten.
-- Idempotenz: Alle Statements via IF NOT EXISTS. 2x Lauf = no-op.
-- Rollback: psql -f db-migration-v10-down.sql
-- ============================================================================

-- Lead-Metriken 1.1: COUNT(*) FILTER WHERE created_at >= <anker>
CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON leads(created_at);

-- Sequenz-Metriken 1.2: Filter auf enrolled_at + sequence_status.
-- Composite ist nuetzlicher als 2 einzelne Indexe, weil die Dashboard-Query
-- immer beide Spalten zusammen filtert.
CREATE INDEX IF NOT EXISTS idx_leads_enrolled_at
  ON leads(enrolled_at);
CREATE INDEX IF NOT EXISTS idx_leads_sequence_status
  ON leads(sequence_status);

-- Anrufe 1.4: Dashboard zaehlt call_logs.call_date::date = heute.
CREATE INDEX IF NOT EXISTS idx_call_logs_call_date
  ON call_logs(call_date);

-- Sequenz-Metriken 1.2 "beendet ohne Reply" joint auf email_events.
-- Der NOT EXISTS-Subquery filtert email_events per lead_id + event_type.
-- Pruef ob Index schon vorhanden ist (vermutlich ja aus Bestand), sonst anlegen.
CREATE INDEX IF NOT EXISTS idx_email_events_lead_event
  ON email_events(lead_id, event_type);

-- ============================================================================
-- END v10 up
-- ============================================================================
