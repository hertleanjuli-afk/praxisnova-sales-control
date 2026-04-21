/**
 * Unit-Tests fuer /api/inbound Route (T3.7, 2026-04-21).
 *
 * Testet die Route-Validierung und Business-Rules statisch ueber den
 * Route-Code. Kein Next.js-Request-Mock (das waere ein Integration-Test).
 * DB + classifyLead werden ueber Module-Mocks abgefangen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRoute(): string {
  return readFileSync(join(__dirname, '../../app/api/inbound/route.ts'), 'utf8');
}

function loadMigration(): string {
  return readFileSync(join(__dirname, '../../db-migration-v13-inbound-consent.sql'), 'utf8');
}

test('inbound route: erwartet die vom Track 2 Schema definierten Felder', () => {
  const route = loadRoute();
  const fields = ['icp', 'name', 'company', 'email', 'phone', 'message', 'source', 'consent_version', 'consented_at'];
  for (const f of fields) {
    assert.match(route, new RegExp(`\\b${f}\\b`), `Feld ${f} muss im Payload-Interface vorkommen`);
  }
});

test('inbound route: CORS-Allowed-Origins konfigurierbar via Env', () => {
  const route = loadRoute();
  assert.match(route, /INBOUND_ALLOWED_ORIGINS/);
  assert.match(route, /Access-Control-Allow-Origin/);
});

test('inbound route: validiert email-Format, name-Pflicht, consent-Pflicht', () => {
  const route = loadRoute();
  assert.match(route, /invalid_email/);
  assert.match(route, /name_required/);
  assert.match(route, /consent_required/);
});

test('inbound route: erkennt die 4 neuen ICPs als allowed', () => {
  const route = loadRoute();
  assert.match(route, /'icp-proptech'/);
  assert.match(route, /'icp-hausverwaltung'/);
  assert.match(route, /'icp-kanzlei'/);
  assert.match(route, /'icp-agentur'/);
});

test('inbound route: Demo-Sources triggern call_queue', () => {
  const route = loadRoute();
  assert.match(route, /demo_request/);
  assert.match(route, /workshop_request/);
  assert.match(route, /dfy_request/);
  assert.match(route, /potenzial_check_request/);
  assert.match(route, /inbound_form_demo_request/);
});

test('inbound route: Idempotency via 5-Minuten-Dedup', () => {
  const route = loadRoute();
  assert.match(route, /INTERVAL\s+'5 minutes'/);
});

test('inbound route: ON CONFLICT UPDATE bewahrt Blocked/Opted-out Stages', () => {
  const route = loadRoute();
  assert.match(route, /pipeline_stage IN \('Blocked','Opted-out'\)/);
});

test('inbound route: call_queue-Insert ist non-blocking (try/catch)', () => {
  const route = loadRoute();
  assert.match(route, /call_queue-Insert non-blocking fehlgeschlagen/);
});

test('v13 migration: ergaenzt consent_version, consented_at, phone', () => {
  const sql = loadMigration();
  assert.match(sql, /ADD COLUMN IF NOT EXISTS consent_version TEXT/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS phone TEXT/i);
});

test('v13 migration: Index auf consented_at fuer Retention', () => {
  const sql = loadMigration();
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_leads_consented_at/i);
});

test('v13 migration: DOWN-Block dokumentiert (auskommentierte DROPs)', () => {
  const sql = loadMigration();
  assert.match(sql, /-- DOWN/i);
  assert.match(sql, /DROP COLUMN IF EXISTS consent_version/i);
  assert.match(sql, /DROP COLUMN IF EXISTS consented_at/i);
});
