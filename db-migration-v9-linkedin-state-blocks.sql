-- ============================================================================
-- Migration v9: LinkedIn State, Blocks, Call-Queue Trigger, Cron Locks
-- ============================================================================
-- Was:      Fuehrt 9-State Enum fuer LinkedIn-Workflow ein, neue Tabellen
--           linkedin_messages + linkedin_events + company_blocks + cron_locks,
--           erweitert call_queue um Trigger-Metadaten fuer die Anrufliste.
-- Warum:    Track 1 Sales Control V2, siehe
--           Agent build/SALES-CONTROL-SPEC-2026-04-20.md und
--           Agent build/CLAUDE-CODE-PROMPT-2026-04-20-TRACK-1-SALES-CONTROL-V2.md.
-- Scope:    Minimal-invasiv.
--           - linkedin_tracking (v4) bleibt read-only aktiv bis Sunset-Migration
--             v10+, nicht loeschen. Kein Daten-Backfill von linkedin_tracking
--             nach linkedin_messages. Nur neue Events ab v9.
--           - call_queue behaelt ihren Namen (UI zeigt "Anrufliste"/"call_list"),
--             Naming-Inkonsistenz dokumentiert in docs/NAMING-INCONSISTENCIES.md.
--           - leads.linkedin_state laeuft parallel zu leads.status. Initial
--             werden nur linkedin_% Werte aus leads.status gemappt,
--             leads.status bleibt unveraendert.
-- Idempotenz: Alle Statements via IF NOT EXISTS / IF EXISTS Guards bzw.
--             DO-Block fuer CREATE TYPE. Migration kann mehrfach laufen.
-- Rollback: psql -f db-migration-v9-down.sql
-- ============================================================================

-- 1. LinkedIn-State Enum (idempotent via DO-Block, Postgres kennt kein
--    CREATE TYPE IF NOT EXISTS).
DO $$ BEGIN
  CREATE TYPE linkedin_state_enum AS ENUM (
    'open',
    'no_linkedin',
    'request_sent',
    'connected',
    'message_sent',
    'replied_positive',
    'replied_negative',
    'blocked_person',
    'blocked_company'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. leads: linkedin_state Spalte + Block-Metadaten
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS linkedin_state linkedin_state_enum NOT NULL
  DEFAULT 'open'::linkedin_state_enum;
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS linkedin_state_changed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS block_scope TEXT
  CHECK (block_scope IS NULL OR block_scope IN ('person', 'company'));

CREATE INDEX IF NOT EXISTS idx_leads_linkedin_state
  ON leads(linkedin_state);
CREATE INDEX IF NOT EXISTS idx_leads_blocked_until
  ON leads(blocked_until) WHERE blocked_until IS NOT NULL;

-- Initial-Mapping: leads.status = 'linkedin_*' -> leads.linkedin_state.
-- leads.status bleibt unveraendert. Die Rows sind idempotent weil wir nur
-- setzen wenn linkedin_state noch auf dem Spalten-Default 'open' steht.
UPDATE leads SET linkedin_state = 'open'::linkedin_state_enum
  WHERE status = 'linkedin_pending'
    AND linkedin_state = 'open'::linkedin_state_enum;
UPDATE leads SET linkedin_state = 'request_sent'::linkedin_state_enum
  WHERE status = 'linkedin_request_sent'
    AND linkedin_state = 'open'::linkedin_state_enum;
UPDATE leads SET linkedin_state = 'connected'::linkedin_state_enum
  WHERE status = 'linkedin_connected'
    AND linkedin_state = 'open'::linkedin_state_enum;
UPDATE leads SET linkedin_state = 'message_sent'::linkedin_state_enum
  WHERE status = 'linkedin_message_sent'
    AND linkedin_state = 'open'::linkedin_state_enum;
UPDATE leads SET linkedin_state = 'replied_positive'::linkedin_state_enum
  WHERE status = 'linkedin_replied'
    AND linkedin_state = 'open'::linkedin_state_enum;

-- 3. linkedin_messages: gesendete + empfangene Nachrichten
CREATE TABLE IF NOT EXISTS linkedin_messages (
  id              SERIAL PRIMARY KEY,
  lead_id         INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  body            TEXT NOT NULL,
  sent_at         TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  state_at_send   linkedin_state_enum,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_lead
  ON linkedin_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_direction
  ON linkedin_messages(direction);

-- 4. linkedin_events: State-Transition-Tracking
CREATE TABLE IF NOT EXISTS linkedin_events (
  id            SERIAL PRIMARY KEY,
  lead_id       INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_state    linkedin_state_enum,
  to_state      linkedin_state_enum NOT NULL,
  triggered_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_linkedin_events_lead
  ON linkedin_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_events_created
  ON linkedin_events(created_at);

-- 5. company_blocks: Firmen-Block, wirkt auch fuer zukuenftige Leads
CREATE TABLE IF NOT EXISTS company_blocks (
  id              SERIAL PRIMARY KEY,
  company_domain  TEXT,
  company_name    TEXT,
  blocked_until   TIMESTAMPTZ NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (company_domain IS NOT NULL OR company_name IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_company_blocks_domain
  ON company_blocks(company_domain);
CREATE INDEX IF NOT EXISTS idx_company_blocks_until
  ON company_blocks(blocked_until);

-- 6. cron_locks: Idempotent-Guard gegen parallele Cron-Runs
CREATE TABLE IF NOT EXISTS cron_locks (
  lock_name     TEXT PRIMARY KEY,
  acquired_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at   TIMESTAMPTZ,
  ttl_seconds   INT NOT NULL DEFAULT 300
);
CREATE INDEX IF NOT EXISTS idx_cron_locks_acquired
  ON cron_locks(acquired_at);

-- 7. call_queue: Trigger-Metadaten fuer Anrufliste (Spec T1.5)
-- Tabelle heisst aus historischen Gruenden call_queue. UI nennt sie
-- "Anrufliste"/"call_list". Siehe docs/NAMING-INCONSISTENCIES.md.
ALTER TABLE call_queue
  ADD COLUMN IF NOT EXISTS source_trigger TEXT
  CHECK (source_trigger IS NULL OR source_trigger IN (
    'linkedin_positive_reply',
    'sequence_email_reply',
    'sequence_finished_no_reply',
    'manual_call_planned',
    'inbound_form_demo_request'
  ));
ALTER TABLE call_queue
  ADD COLUMN IF NOT EXISTS priority TEXT
  CHECK (priority IS NULL OR priority IN ('high', 'medium', 'low'));
ALTER TABLE call_queue
  ADD COLUMN IF NOT EXISTS icp_score INT;
ALTER TABLE call_queue
  ADD COLUMN IF NOT EXISTS trigger_context TEXT;
ALTER TABLE call_queue
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_call_queue_source_trigger
  ON call_queue(source_trigger);
CREATE INDEX IF NOT EXISTS idx_call_queue_priority
  ON call_queue(priority);
CREATE INDEX IF NOT EXISTS idx_call_queue_scheduled_for
  ON call_queue(scheduled_for);

-- ============================================================================
-- END v9 up
-- ============================================================================
