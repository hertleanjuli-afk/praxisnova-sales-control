/**
 * Unit-Tests fuer Migration v12 (T3.4 icp_score + icp_config).
 *
 * Statische SQL-Struktur-Pruefung. Kein DB-Call.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, '../../db-migration-v12-icp-score-config.sql');

function loadMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8');
}

test('v12: legt icp_config-Tabelle mit JSONB nace_codes an', () => {
  const sql = loadMigration();
  assert.match(sql, /CREATE TABLE IF NOT EXISTS icp_config/i);
  assert.match(sql, /nace_codes\s+JSONB\s+NOT NULL/i);
  assert.match(sql, /industry_keywords\s+JSONB\s+NOT NULL/i);
  assert.match(sql, /base_score\s+INTEGER\s+NOT NULL/i);
  assert.match(sql, /enabled\s+BOOLEAN\s+NOT NULL/i);
});

test('v12: seedet 4 ICPs mit richtigen IDs (ON CONFLICT DO NOTHING)', () => {
  const sql = loadMigration();
  assert.match(sql, /'icp-proptech'/);
  assert.match(sql, /'icp-hausverwaltung'/);
  assert.match(sql, /'icp-kanzlei'/);
  assert.match(sql, /'icp-agentur'/);
  assert.match(sql, /ON CONFLICT \(id\) DO NOTHING/i);
});

test('v12: leads bekommt icp_score, icp_tag, nace_code, ready_to_contact, triage_reason', () => {
  const sql = loadMigration();
  const cols = ['icp_score', 'icp_tag', 'nace_code', 'ready_to_contact', 'triage_reason'];
  for (const col of cols) {
    const regex = new RegExp(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col}`, 'i');
    assert.match(sql, regex, `Spalte ${col} muss via ALTER TABLE ergaenzt werden`);
  }
});

test('v12: hat Indexes auf icp_tag, icp_score, ready_to_contact, nace_code', () => {
  const sql = loadMigration();
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_leads_icp_tag/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_leads_icp_score/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_leads_ready_to_contact/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_leads_nace_code/i);
});

test('v12: NACE-Code-Backfill nutzt JSONB ?-Operator', () => {
  const sql = loadMigration();
  assert.match(sql, /c\.nace_codes \? l\.nace_code/);
});

test('v12: industry_keywords-Fallback nutzt jsonb_array_elements_text', () => {
  const sql = loadMigration();
  assert.match(sql, /jsonb_array_elements_text\(c\.industry_keywords\)/);
});

test('v12: explizit-Ausschluss fuer Bau/Handwerk setzt icp_score=0', () => {
  const sql = loadMigration();
  assert.match(sql, /SET icp_score = 0, icp_tag = NULL/);
  assert.match(sql, /sequence_type IN \('bauunternehmen', 'handwerk'\)/);
  assert.match(sql, /'icp-pivot-2026-04-21-bau-handwerk-raus'/);
});

test('v12: ready_to_contact-Threshold ist 60', () => {
  const sql = loadMigration();
  assert.match(sql, /ready_to_contact = \(icp_score >= 60\)/);
});

test('v12: DOWN-Block reversibel (DROP TABLE icp_config + 5 ALTER DROP COLUMN)', () => {
  const sql = loadMigration();
  assert.match(sql, /-- DOWN/i);
  const dropCols = ['icp_score', 'icp_tag', 'nace_code', 'ready_to_contact', 'triage_reason'];
  for (const col of dropCols) {
    const regex = new RegExp(`ALTER TABLE leads DROP COLUMN IF EXISTS ${col}`, 'i');
    assert.match(sql, regex);
  }
  assert.match(sql, /DROP TABLE IF EXISTS icp_config/i);
});
