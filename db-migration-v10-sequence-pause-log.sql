-- Migration v10: sequence_pause_log + ICP-Switch Bau/Handwerk-Pause
-- Track 3, T3.1, 2026-04-21
-- Vorher: Track 1 v9 (linkedin_state + icp_config).
-- Nachher: T3.4 (lead-scoring icp_score / icp_tag basierend auf icp_config).
--
-- Zweck:
--   1. Audit-Log fuer Sequenz-Pausen (sequence_pause_log)
--   2. One-time Pause aller aktiven bauunternehmen/handwerk-Sequenzen im Zuge ICP-Pivot
--   3. KEINE Loeschung. Leads behalten sequence_type fuer Archiv und Reactivation.
--
-- Ausfuehrung: Angie fuehrt manuell aus. Claude Code schreibt nur das SQL-File.
-- Reversible via migration v10.down.

-- UP -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sequence_pause_log (
  id BIGSERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  sequence_type TEXT NOT NULL,
  sequence_step_at_pause INTEGER,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  operator TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sequence_pause_log_lead_id ON sequence_pause_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_pause_log_sequence_type ON sequence_pause_log(sequence_type);
CREATE INDEX IF NOT EXISTS idx_sequence_pause_log_paused_at ON sequence_pause_log(paused_at);

-- Audit-Snapshot in Log BEVOR UPDATE
INSERT INTO sequence_pause_log (lead_id, sequence_type, sequence_step_at_pause, reason, operator)
SELECT
  id,
  sequence_type,
  sequence_step,
  'ICP-Pivot 2026-04-21: Bau/Handwerk raus, neue ICPs PropTech/Hausverwaltung/Kanzlei/Agentur',
  'track-3-migration-v10'
FROM leads
WHERE sequence_type IN ('bauunternehmen', 'handwerk')
  AND sequence_status = 'active';

-- Pause aller aktiven Bau- und Handwerk-Sequenzen
UPDATE leads
SET sequence_status = 'paused'
WHERE sequence_type IN ('bauunternehmen', 'handwerk')
  AND sequence_status = 'active';

-- Verify-Queries (nach Ausfuehrung manuell pruefen):
--   SELECT sequence_type, sequence_status, COUNT(*) FROM leads
--     WHERE sequence_type IN ('bauunternehmen', 'handwerk') GROUP BY 1,2;
--   SELECT sequence_type, COUNT(*), MIN(paused_at), MAX(paused_at)
--     FROM sequence_pause_log WHERE operator = 'track-3-migration-v10' GROUP BY 1;

-- DOWN ---------------------------------------------------------------------
-- Reaktivierung (falls Rollback noetig):
--   UPDATE leads SET sequence_status = 'active'
--     WHERE sequence_type IN ('bauunternehmen', 'handwerk')
--       AND sequence_status = 'paused'
--       AND id IN (SELECT lead_id FROM sequence_pause_log WHERE operator = 'track-3-migration-v10');
--   DELETE FROM sequence_pause_log WHERE operator = 'track-3-migration-v10';
--   DROP TABLE IF EXISTS sequence_pause_log;
