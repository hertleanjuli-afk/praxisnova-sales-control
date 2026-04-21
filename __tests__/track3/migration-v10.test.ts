/**
 * Unit-Tests fuer Migration v10 (T3.1 Apollo-Pause).
 *
 * Validiert SQL-Struktur statisch: Table-Create, Audit-Insert, Update,
 * Down-Migration, Indexes. Kein echter DB-Call.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, '../../db-migration-v10-sequence-pause-log.sql');

function loadMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8');
}

test('v10: legt sequence_pause_log-Tabelle mit Pflicht-Spalten an', () => {
  const sql = loadMigration();
  assert.match(sql, /CREATE TABLE IF NOT EXISTS sequence_pause_log/i);
  assert.match(sql, /lead_id\s+INTEGER\s+REFERENCES leads\(id\)/i);
  assert.match(sql, /sequence_type\s+TEXT\s+NOT NULL/i);
  assert.match(sql, /paused_at\s+TIMESTAMPTZ\s+NOT NULL/i);
  assert.match(sql, /reason\s+TEXT\s+NOT NULL/i);
  assert.match(sql, /operator\s+TEXT\s+NOT NULL/i);
});

test('v10: hat Indexes auf lead_id, sequence_type, paused_at', () => {
  const sql = loadMigration();
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_sequence_pause_log_lead_id/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_sequence_pause_log_sequence_type/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_sequence_pause_log_paused_at/i);
});

test('v10: Audit-Snapshot-INSERT erfolgt VOR UPDATE', () => {
  const sql = loadMigration();
  const insertIdx = sql.indexOf('INSERT INTO sequence_pause_log');
  const updateIdx = sql.indexOf("UPDATE leads\nSET sequence_status = 'paused'");
  assert.ok(insertIdx > 0, 'INSERT muss vorhanden sein');
  assert.ok(updateIdx > 0, 'UPDATE muss vorhanden sein');
  assert.ok(insertIdx < updateIdx, 'Audit-Snapshot muss VOR dem UPDATE stehen');
});

test('v10: Pause-Scope ist auf bauunternehmen und handwerk beschraenkt', () => {
  const sql = loadMigration();
  assert.match(
    sql,
    /sequence_type IN \('bauunternehmen', 'handwerk'\)/
  );
  assert.doesNotMatch(
    sql,
    /sequence_type IN \([^)]*'allgemein'/,
    'allgemein darf NICHT pausiert werden'
  );
  assert.doesNotMatch(
    sql,
    /sequence_type IN \([^)]*'inbound'/,
    'inbound darf NICHT pausiert werden'
  );
});

test('v10: DOWN-Migration-Kommentare vorhanden und reversibel', () => {
  const sql = loadMigration();
  assert.match(sql, /-- DOWN/i);
  assert.match(sql, /UPDATE leads SET sequence_status = 'active'/i);
  assert.match(sql, /DELETE FROM sequence_pause_log/i);
  assert.match(sql, /DROP TABLE IF EXISTS sequence_pause_log/i);
});

test('v10: operator-Tag identifiziert Track-3-Quelle', () => {
  const sql = loadMigration();
  assert.match(sql, /'track-3-migration-v10'/);
});
