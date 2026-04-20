-- ============================================================================
-- Migration v9 DOWN: Rollback v9
-- ============================================================================
-- Was:      Rollback fuer db-migration-v9-linkedin-state-blocks.sql.
-- Usage:    psql "$DATABASE_URL" -f db-migration-v9-down.sql
-- Idempotenz: Alle DROPs via IF EXISTS. Kann mehrfach laufen.
-- Achtung:  DROP TABLE linkedin_messages / linkedin_events / company_blocks /
--           cron_locks loescht alle enthaltenen Daten unwiederbringlich.
--           linkedin_tracking (v4) wird NICHT angefasst.
-- ============================================================================

-- 7. call_queue: Trigger-Spalten + Indexe entfernen
DROP INDEX IF EXISTS idx_call_queue_source_trigger;
DROP INDEX IF EXISTS idx_call_queue_priority;
DROP INDEX IF EXISTS idx_call_queue_scheduled_for;
ALTER TABLE call_queue DROP COLUMN IF EXISTS source_trigger;
ALTER TABLE call_queue DROP COLUMN IF EXISTS priority;
ALTER TABLE call_queue DROP COLUMN IF EXISTS icp_score;
ALTER TABLE call_queue DROP COLUMN IF EXISTS trigger_context;
ALTER TABLE call_queue DROP COLUMN IF EXISTS scheduled_for;

-- 6. cron_locks: gesamte Tabelle
DROP TABLE IF EXISTS cron_locks;

-- 5. company_blocks: gesamte Tabelle
DROP TABLE IF EXISTS company_blocks;

-- 4. linkedin_events: gesamte Tabelle
DROP TABLE IF EXISTS linkedin_events;

-- 3. linkedin_messages: gesamte Tabelle (FK loest sich mit)
DROP TABLE IF EXISTS linkedin_messages;

-- 2. leads: Zusatzspalten + Indexe entfernen
DROP INDEX IF EXISTS idx_leads_linkedin_state;
DROP INDEX IF EXISTS idx_leads_blocked_until;
ALTER TABLE leads DROP COLUMN IF EXISTS linkedin_state;
ALTER TABLE leads DROP COLUMN IF EXISTS linkedin_state_changed_at;
ALTER TABLE leads DROP COLUMN IF EXISTS blocked_until;
ALTER TABLE leads DROP COLUMN IF EXISTS block_reason;
ALTER TABLE leads DROP COLUMN IF EXISTS block_scope;

-- 1. Enum erst am Ende, weil Spalten auf ihn referenziert haben
DROP TYPE IF EXISTS linkedin_state_enum;

-- ============================================================================
-- END v9 down
-- ============================================================================
