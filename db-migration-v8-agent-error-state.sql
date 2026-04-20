-- Migration v8: agent_error_state fuer Push-Dedup
--
-- Tracked pro Agent consecutive failures und zuletzt-alertete-Zeit,
-- damit observe.error nicht jedem Cron-Run einen Push feuert sondern
-- nur bei 3+ failures und/oder Cooldown abgelaufen.
--
-- Schema:
--   agent_name           : logischer Agent-Identifier (z.B. 'calendar_oauth')
--   consecutive_failures : Counter, 0 wenn letzter Run OK
--   last_failure_at      : letzter fail-Zeitpunkt
--   last_success_at      : letzter OK-Zeitpunkt
--   last_alerted_at      : wann zuletzt ntfy/slack gefeuert wurde (fuer Cooldown)
--   last_alert_level     : 'error' oder 'recovery' oder NULL (keiner gefeuert)
--   last_error_message   : abgeschnitten, fuer Debug
--
-- Eindeutigkeit: agent_name ist PRIMARY KEY (upsert-Logik im Code).
--
-- Ausfuehren via Neon Console. Keine automatische Ausfuehrung.
-- Rollback: DROP TABLE agent_error_state;

CREATE TABLE IF NOT EXISTS agent_error_state (
  agent_name           TEXT PRIMARY KEY,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_failure_at      TIMESTAMPTZ,
  last_success_at      TIMESTAMPTZ,
  last_alerted_at      TIMESTAMPTZ,
  last_alert_level     TEXT,
  last_error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_error_state_alerted
  ON agent_error_state (last_alerted_at DESC NULLS LAST);
