-- ============================================================================
-- Migration v10 DOWN: Rollback Dashboard-V2 Indexe
-- ============================================================================
-- Usage: psql "$DATABASE_URL" -f db-migration-v10-down.sql
-- Idempotenz: Alle DROPs via IF EXISTS. Kann mehrfach laufen.
-- ============================================================================

DROP INDEX IF EXISTS idx_leads_created_at;
DROP INDEX IF EXISTS idx_leads_enrolled_at;
DROP INDEX IF EXISTS idx_leads_sequence_status;
DROP INDEX IF EXISTS idx_call_logs_call_date;
DROP INDEX IF EXISTS idx_email_events_lead_event;

-- ============================================================================
-- END v10 down
-- ============================================================================
