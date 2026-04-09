-- ============================================================
-- PraxisNova Sales Control Center - DB Migration v5
-- Datum: 9. April 2026
-- Zweck: Missing database objects (sequence_entries table, updated_at column)
-- ============================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS TO LEADS TABLE
-- ============================================================

-- updated_at timestamp for tracking last modification
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Note: total_call_attempts already added in v4, but ensure it exists
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_call_attempts INTEGER DEFAULT 0;


-- ============================================================
-- 2. CREATE SEQUENCE_ENTRIES TABLE (NEW)
-- ============================================================

CREATE TABLE IF NOT EXISTS sequence_entries (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
    -- active: Currently running
    -- paused: Paused by user or disposition
    -- completed: Finished normally
    -- blocked: Stopped due to lead block
    -- pending: Waiting to start

  -- Lifecycle timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,

  -- Step tracking
  current_step INTEGER DEFAULT 1,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sequence_entries_lead_id ON sequence_entries(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_entries_sequence_id ON sequence_entries(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_entries_status ON sequence_entries(status);
CREATE INDEX IF NOT EXISTS idx_sequence_entries_lead_status ON sequence_entries(lead_id, status);


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- New Table: sequence_entries
-- New Columns: leads.updated_at
-- New Indexes: 4 on sequence_entries
-- ============================================================
