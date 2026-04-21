/**
 * Unit-Tests fuer icp-score.ts (T3.4).
 *
 * Pure classifyLeadPure() wird getestet mit gemockten icp_config-Rows.
 * Kein DB-Call, keine I/O-Abhaengigkeit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyLeadPure, _testing, type IcpConfigRow } from '../../lib/icp-score.ts';

const CONFIGS: IcpConfigRow[] = [
  {
    id: 'icp-proptech',
    display_name: 'PropTech',
    nace_codes: ['6820', '6831', '7022'],
    industry_keywords: ['proptech', 'immobiliensoftware'],
    base_score: 90,
    enabled: true,
  },
  {
    id: 'icp-kanzlei',
    display_name: 'Kanzlei',
    nace_codes: ['6910', '6920'],
    industry_keywords: ['kanzlei', 'steuerberater'],
    base_score: 80,
    enabled: true,
  },
  {
    id: 'icp-agentur',
    display_name: 'Agentur',
    nace_codes: ['7311', '7320'],
    industry_keywords: ['agentur', 'digital agency'],
    base_score: 75,
    enabled: true,
  },
  {
    id: 'icp-disabled',
    display_name: 'Disabled Old',
    nace_codes: ['9999'],
    industry_keywords: [],
    base_score: 99,
    enabled: false,
  },
];

test('nace-code-Match hat Vorrang vor industry-Keyword', () => {
  const result = classifyLeadPure(
    { nace_code: '6910', industry: 'Digital Agentur GmbH' },
    CONFIGS
  );
  assert.equal(result.icp_tag, 'icp-kanzlei');
  assert.equal(result.icp_score, 80);
  assert.equal(result.ready_to_contact, true);
});

test('industry-Keyword-Match wenn nace_code fehlt', () => {
  const result = classifyLeadPure(
    { nace_code: null, industry: 'Digital Agency GmbH' },
    CONFIGS
  );
  assert.equal(result.icp_tag, 'icp-agentur');
  assert.equal(result.icp_score, 75);
});

test('industry-Keyword case-insensitive', () => {
  const result = classifyLeadPure(
    { nace_code: null, industry: 'STEUERBERATER Mueller GmbH' },
    CONFIGS
  );
  assert.equal(result.icp_tag, 'icp-kanzlei');
});

test('disabled-Config wird ignoriert', () => {
  const result = classifyLeadPure(
    { nace_code: '9999', industry: null },
    CONFIGS
  );
  assert.notEqual(result.icp_tag, 'icp-disabled');
});

test('ready_to_contact: true bei score >= 60', () => {
  const high = classifyLeadPure({ nace_code: '6820', industry: null }, CONFIGS);
  assert.equal(high.ready_to_contact, true);
  assert.ok(high.icp_score >= 60);
});

test('ready_to_contact: false bei Default-Score 50', () => {
  const result = classifyLeadPure(
    { nace_code: 'unknown-code-12345', industry: 'Unknown Industry' },
    CONFIGS
  );
  assert.equal(result.ready_to_contact, false);
  assert.equal(result.icp_score, 50);
  assert.equal(result.triage_reason, 'no_icp_match');
});

test('Bau/Handwerk-Sequence-Type wird hart ausgeschlossen', () => {
  const result = classifyLeadPure(
    { nace_code: null, industry: null, sequence_type: 'bauunternehmen' },
    CONFIGS
  );
  assert.equal(result.icp_score, 0);
  assert.equal(result.ready_to_contact, false);
  assert.match(result.triage_reason ?? '', /icp-pivot/);
});

test('Hardcoded-Fallback springt an wenn config-Array leer', () => {
  const result = classifyLeadPure(
    { nace_code: '6820', industry: null },
    [] // leere Config-Liste
  );
  assert.equal(result.icp_tag, 'icp-proptech');
  assert.equal(result.icp_score, 90);
  assert.equal(result.triage_reason, 'hardcoded_fallback_used');
});

test('Bau-NACE-Code (41/42/43) -> score 0 via Hardcoded', () => {
  const result = classifyLeadPure(
    { nace_code: '42', industry: null },
    []
  );
  assert.equal(result.icp_score, 0);
  assert.equal(result.icp_tag, 'icp-bau-excluded');
});

test('READY_THRESHOLD ist 60', () => {
  assert.equal(_testing.READY_THRESHOLD, 60);
});

test('Hardcoded-Fallback enthaelt alle 4 neuen ICPs (mindestens)', () => {
  const tags = new Set(Object.values(_testing.HARDCODED_FALLBACK).map(v => v.icp_tag));
  assert.ok(tags.has('icp-proptech'));
  assert.ok(tags.has('icp-hausverwaltung'));
  assert.ok(tags.has('icp-kanzlei'));
  assert.ok(tags.has('icp-agentur'));
});
