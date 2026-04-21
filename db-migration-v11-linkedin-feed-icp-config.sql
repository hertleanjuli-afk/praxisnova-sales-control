-- ============================================================================
-- Migration v11: LinkedIn-Feed Posts, ICP Config, Cron Runs
-- ============================================================================
-- Was:      Lege drei Tabellen an
--           - linkedin_feed_posts: eingelesene Posts aus externem LinkedIn-
--             Feed (Apify / Scraper / Unipile), separat von der bestehenden
--             linkedin_posts Tabelle (v4) die eigene Posts trackt.
--           - icp_config: ICP-Stammdaten laut PLATFORM-STANDARDS 3.5,
--             erweitert um linkedin_keywords JSONB fuer Relevance-Scoring.
--           - cron_runs: Run-Log pro Cron-Invocation fuer Observability.
-- Warum:    Track 1 T1.3 LinkedIn Post-Feed Agent. Scope:
--           Agent build/HANDOVER-2026-04-21-CLAUDE-CODE-3-TRACKS.md,
--           Angies Freigabe-Prompt 2026-04-21.
-- Scope:    Minimal-invasiv.
--           - Tabelle heisst linkedin_feed_posts und NICHT linkedin_posts
--             weil die v4-Tabelle linkedin_posts bereits fuer Angies
--             eigene Posts genutzt wird (Engagement-Zahlen, posted_by).
--             Siehe docs/NAMING-INCONSISTENCIES.md Eintrag 4.
--           - icp_config idempotent via CREATE TABLE IF NOT EXISTS.
--             Falls Track 3 diese Tabelle parallel anlegt, greift sich das
--             nicht. Seeds liefert Track 3, hier keine INSERTs.
--             linkedin_keywords-Spalte wird in dieser Migration hinzugefuegt,
--             ADD COLUMN IF NOT EXISTS, damit Track 3 sie entweder schon
--             hat oder sie von uns bekommt.
--           - cron_runs additiv neben cron_locks (v9) und agent_logs
--             (v1-2). Fokus ist Run-History fuer Dashboards und Alerts.
-- Idempotenz: Alle DDL via IF NOT EXISTS. 2x Lauf = no-op.
-- Rollback: psql -f db-migration-v11-down.sql
-- ============================================================================

-- 1. linkedin_feed_posts: eingelesene Posts aus externem Feed
CREATE TABLE IF NOT EXISTS linkedin_feed_posts (
  id                    SERIAL PRIMARY KEY,
  author_id             TEXT NOT NULL,
  author_name           TEXT,
  author_company        TEXT,
  post_url              TEXT NOT NULL,
  post_text             TEXT NOT NULL,
  post_published_at     TIMESTAMPTZ,
  captured_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  relevance_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  matched_icp_id        TEXT,
  matched_keywords      JSONB NOT NULL DEFAULT '[]'::jsonb,
  processed             BOOLEAN NOT NULL DEFAULT false,
  processed_at          TIMESTAMPTZ,
  source_adapter        TEXT NOT NULL,
  UNIQUE (post_url)
);
CREATE INDEX IF NOT EXISTS idx_linkedin_feed_posts_author
  ON linkedin_feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_feed_posts_captured
  ON linkedin_feed_posts(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_feed_posts_processed
  ON linkedin_feed_posts(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_linkedin_feed_posts_matched_icp
  ON linkedin_feed_posts(matched_icp_id);

-- 2. icp_config: zentrale ICP-Stammdaten (PS 3.5)
CREATE TABLE IF NOT EXISTS icp_config (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  nace_codes        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  base_score        INT NOT NULL DEFAULT 50,
  sequence_id       TEXT,
  hook_type         TEXT,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE icp_config
  ADD COLUMN IF NOT EXISTS linkedin_keywords JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_icp_config_enabled
  ON icp_config(enabled);

-- 3. cron_runs: Run-History pro Cron-Invocation
CREATE TABLE IF NOT EXISTS cron_runs (
  id                SERIAL PRIMARY KEY,
  cron_name         TEXT NOT NULL,
  run_id            TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','success','failed','skipped')),
  items_processed   INT NOT NULL DEFAULT 0,
  error_message     TEXT,
  metadata          JSONB
);
CREATE INDEX IF NOT EXISTS idx_cron_runs_name
  ON cron_runs(cron_name);
CREATE INDEX IF NOT EXISTS idx_cron_runs_started
  ON cron_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_runs_status
  ON cron_runs(status);

-- ============================================================================
-- END v11 up
-- ============================================================================
