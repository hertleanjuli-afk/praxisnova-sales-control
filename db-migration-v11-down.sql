-- ============================================================================
-- Migration v11 DOWN: Rollback LinkedIn-Feed + ICP Config + Cron Runs
-- ============================================================================
-- Usage: psql "$DATABASE_URL" -f db-migration-v11-down.sql
-- Idempotenz: Alle DROPs via IF EXISTS. Kann mehrfach laufen.
-- Achtung:  DROP TABLE linkedin_feed_posts / cron_runs loescht Daten.
--           icp_config wird NICHT gedroppt weil sie Track-3-Scope ist und
--           Track-3-Daten enthalten koennte. Nur die von v11 hinzugefuegte
--           Spalte linkedin_keywords wird entfernt.
-- ============================================================================

DROP INDEX IF EXISTS idx_cron_runs_status;
DROP INDEX IF EXISTS idx_cron_runs_started;
DROP INDEX IF EXISTS idx_cron_runs_name;
DROP TABLE IF EXISTS cron_runs;

-- icp_config.linkedin_keywords: nur die v11-Column entfernen, Tabelle behalten.
ALTER TABLE icp_config DROP COLUMN IF EXISTS linkedin_keywords;

DROP INDEX IF EXISTS idx_linkedin_feed_posts_matched_icp;
DROP INDEX IF EXISTS idx_linkedin_feed_posts_processed;
DROP INDEX IF EXISTS idx_linkedin_feed_posts_captured;
DROP INDEX IF EXISTS idx_linkedin_feed_posts_author;
DROP TABLE IF EXISTS linkedin_feed_posts;

-- Hinweis: icp_config-Tabelle wird absichtlich NICHT gedroppt, falls Track 3
-- diese weiter nutzt. Wenn man wirklich alles abreissen will:
--   DROP INDEX IF EXISTS idx_icp_config_enabled;
--   DROP TABLE IF EXISTS icp_config;

-- ============================================================================
-- END v11 down
-- ============================================================================
