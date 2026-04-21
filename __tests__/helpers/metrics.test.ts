/**
 * Tests fuer lib/metrics.ts (Track 1, T1.2).
 *
 * Pure-Function-Tests, keine DB-Abhaengigkeit. Laeuft via
 * `npm run test:helpers`. SQL-Queries leben in lib/metrics-queries.ts und
 * werden hier nicht getestet (erfordert DB), ihr Verhalten wird stattdessen
 * via EXPLAIN-Output im PR-Body dokumentiert.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startOfToday,
  startOfIsoWeek,
  startOfLastIsoWeek,
  startOfMonth,
  buildTimeWindows,
  calcConversionRate,
  checkConsistency,
  isOnLastStep,
  SEQUENCE_MAX_STEPS,
} from '../../lib/metrics.ts';

// ---------------------------------------------------------------------------
// Datums-Helpers
// ---------------------------------------------------------------------------

test('startOfToday schneidet Stunden ab', () => {
  const now = new Date('2026-04-21T15:42:11.123Z');
  const s = startOfToday(now);
  assert.equal(s.toISOString(), '2026-04-21T00:00:00.000Z');
});

test('startOfIsoWeek auf Mittwoch liefert Montag derselben Woche', () => {
  // 2026-04-22 ist ein Mittwoch
  const wed = new Date('2026-04-22T09:00:00.000Z');
  const mon = startOfIsoWeek(wed);
  assert.equal(mon.toISOString(), '2026-04-20T00:00:00.000Z');
});

test('startOfIsoWeek auf Sonntag liefert Montag derselben Iso-Woche', () => {
  // 2026-04-26 ist ein Sonntag, Iso-Woche startete am 2026-04-20
  const sun = new Date('2026-04-26T23:59:00.000Z');
  const mon = startOfIsoWeek(sun);
  assert.equal(mon.toISOString(), '2026-04-20T00:00:00.000Z');
});

test('startOfIsoWeek auf Montag ist idempotent', () => {
  const mon = new Date('2026-04-20T12:00:00.000Z');
  assert.equal(startOfIsoWeek(mon).toISOString(), '2026-04-20T00:00:00.000Z');
});

test('startOfLastIsoWeek liefert Montag -7 Tage', () => {
  const wed = new Date('2026-04-22T09:00:00.000Z');
  const prev = startOfLastIsoWeek(wed);
  assert.equal(prev.toISOString(), '2026-04-13T00:00:00.000Z');
});

test('startOfMonth gibt 1. des Monats 00:00 UTC', () => {
  const now = new Date('2026-04-21T15:42:00.000Z');
  assert.equal(startOfMonth(now).toISOString(), '2026-04-01T00:00:00.000Z');
});

test('buildTimeWindows liefert konsistente Anker zum Stichtag', () => {
  const now = new Date('2026-04-22T10:30:00.000Z');
  const w = buildTimeWindows(now);
  assert.equal(w.today, '2026-04-22T00:00:00.000Z');
  assert.equal(w.thisWeek, '2026-04-20T00:00:00.000Z');
  assert.equal(w.lastWeekStart, '2026-04-13T00:00:00.000Z');
  assert.equal(w.lastWeekEnd, '2026-04-20T00:00:00.000Z');
  assert.equal(w.monthStart, '2026-04-01T00:00:00.000Z');
  assert.equal(w.now, '2026-04-22T10:30:00.000Z');
});

// ---------------------------------------------------------------------------
// Conversion-Rate
// ---------------------------------------------------------------------------

test('calcConversionRate: 0 sent -> 0', () => {
  assert.equal(calcConversionRate(0, 0), 0);
});

test('calcConversionRate: 0 sent, 5 accepted (defensive) -> 0', () => {
  assert.equal(calcConversionRate(0, 5), 0);
});

test('calcConversionRate: 100 sent, 25 accepted -> 25', () => {
  assert.equal(calcConversionRate(100, 25), 25);
});

test('calcConversionRate: rundet auf 1 Nachkommastelle', () => {
  assert.equal(calcConversionRate(7, 3), 42.9);
});

test('calcConversionRate: 100% moeglich', () => {
  assert.equal(calcConversionRate(10, 10), 100);
});

test('calcConversionRate: negatives sent defensiv auf 0', () => {
  assert.equal(calcConversionRate(-5, 2), 0);
});

// ---------------------------------------------------------------------------
// Konsistenz
// ---------------------------------------------------------------------------

test('checkConsistency: leere Breakdown = 0 ergibt consistent=false wenn total > 0', () => {
  const r = checkConsistency([], 5);
  assert.equal(r.consistent, false);
  assert.equal(r.sectorSum, 0);
  assert.equal(r.totalLeads, 5);
  assert.equal(r.delta, -5);
});

test('checkConsistency: Summe = Total ist consistent', () => {
  const r = checkConsistency(
    [
      { sector: 'allgemein', count: 30 },
      { sector: 'immobilien', count: 20 },
    ],
    50
  );
  assert.equal(r.consistent, true);
  assert.equal(r.delta, 0);
});

test('checkConsistency: Summe > Total zeigt positiven Delta', () => {
  const r = checkConsistency(
    [
      { sector: 'a', count: 30 },
      { sector: 'b', count: 25 },
    ],
    50
  );
  assert.equal(r.consistent, false);
  assert.equal(r.delta, 5);
});

test('checkConsistency: Summe < Total zeigt negativen Delta (typischer Filter-Bug)', () => {
  // Forensik LECK-18: sector-Query mit WHERE sequence_type IS NOT NULL
  // produzierte Summe < Total. Diesen Fall muss checkConsistency erkennen.
  const r = checkConsistency(
    [
      { sector: 'immobilien', count: 40 },
      { sector: 'handwerk', count: 5 },
    ],
    50
  );
  assert.equal(r.consistent, false);
  assert.equal(r.delta, -5);
});

// ---------------------------------------------------------------------------
// isOnLastStep + SEQUENCE_MAX_STEPS
// ---------------------------------------------------------------------------

test('SEQUENCE_MAX_STEPS deckt alle 5 Live-Sequenzen ab', () => {
  assert.deepEqual(Object.keys(SEQUENCE_MAX_STEPS).sort(), [
    'allgemein',
    'bauunternehmen',
    'handwerk',
    'immobilien',
    'inbound',
  ]);
});

test('isOnLastStep: allgemein Step 7 ist Last', () => {
  assert.equal(isOnLastStep('allgemein', 7), true);
});

test('isOnLastStep: allgemein Step 6 ist NICHT Last', () => {
  assert.equal(isOnLastStep('allgemein', 6), false);
});

test('isOnLastStep: immobilien Step 6 ist Last', () => {
  assert.equal(isOnLastStep('immobilien', 6), true);
});

test('isOnLastStep: null-Type -> false', () => {
  assert.equal(isOnLastStep(null, 6), false);
});

test('isOnLastStep: null-Step -> false', () => {
  assert.equal(isOnLastStep('immobilien', null), false);
});

test('isOnLastStep: unbekannter Type -> false', () => {
  assert.equal(isOnLastStep('propTech', 5), false);
});

test('isOnLastStep: Step > Max ist trotzdem Last (ueber-geskipped)', () => {
  assert.equal(isOnLastStep('immobilien', 9), true);
});
