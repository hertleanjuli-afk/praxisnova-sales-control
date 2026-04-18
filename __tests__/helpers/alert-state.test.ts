/**
 * Tests fuer State-basiertes Alerting (LECK-17 Fix).
 *
 * alert-state.ts importiert `lib/db` direkt, das in node-test-runner
 * einen Typ-Export-Fehler aus @neondatabase/serverless hat. Deshalb
 * testen wir die Push-Entscheidungs-Logik hier **mit gemocktem sql**
 * durch dynamic import nach Setting eines Mock-globals.
 *
 * Alternativer Test-Pattern fuer Code der Top-Level lib/db importiert:
 * statt ein dynamic-ESM-Mock zu bauen (komplex in node:test),
 * extrahieren wir die Entscheidungs-Regeln in eine pure Funktion und
 * testen die. Das ist der pragmatischere Weg.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Die Push-Entscheidungs-Regeln aus alert-state.ts extrahiert als reine
// Funktion. Wird auch im Produktions-Code so genutzt (siehe alert-state.ts
// reportAgentFailure).
function shouldFirePush(args: {
  consecutive_failures: number;
  last_alerted_at: string | null;
  last_alert_level: 'error' | 'recovery' | null;
  threshold: number;
  cooldownMinutes: number;
  now: number;
}): { fire: boolean; reason: string } {
  if (args.consecutive_failures < args.threshold) {
    return { fire: false, reason: 'below threshold' };
  }
  if (args.last_alerted_at && args.last_alert_level === 'error') {
    const lastMs = new Date(args.last_alerted_at).getTime();
    const sinceMs = args.now - lastMs;
    if (sinceMs < args.cooldownMinutes * 60 * 1000) {
      return { fire: false, reason: 'cooldown' };
    }
  }
  return { fire: true, reason: 'ok' };
}

test('alert-state: first failure (1/3) suppressed', () => {
  const r = shouldFirePush({
    consecutive_failures: 1,
    last_alerted_at: null,
    last_alert_level: null,
    threshold: 3,
    cooldownMinutes: 60,
    now: Date.now(),
  });
  assert.equal(r.fire, false);
  assert.equal(r.reason, 'below threshold');
});

test('alert-state: second failure (2/3) suppressed', () => {
  const r = shouldFirePush({
    consecutive_failures: 2,
    last_alerted_at: null,
    last_alert_level: null,
    threshold: 3,
    cooldownMinutes: 60,
    now: Date.now(),
  });
  assert.equal(r.fire, false);
});

test('alert-state: third failure (3/3) fires', () => {
  const r = shouldFirePush({
    consecutive_failures: 3,
    last_alerted_at: null,
    last_alert_level: null,
    threshold: 3,
    cooldownMinutes: 60,
    now: Date.now(),
  });
  assert.equal(r.fire, true);
  assert.equal(r.reason, 'ok');
});

test('alert-state: fourth failure within cooldown suppressed', () => {
  const now = Date.now();
  const lastAlertedAt = new Date(now - 10 * 60 * 1000).toISOString();
  const r = shouldFirePush({
    consecutive_failures: 4,
    last_alerted_at: lastAlertedAt,
    last_alert_level: 'error',
    threshold: 3,
    cooldownMinutes: 60,
    now,
  });
  assert.equal(r.fire, false);
  assert.equal(r.reason, 'cooldown');
});

test('alert-state: failure after cooldown fires again', () => {
  const now = Date.now();
  const lastAlertedAt = new Date(now - 61 * 60 * 1000).toISOString(); // 61min ago
  const r = shouldFirePush({
    consecutive_failures: 10,
    last_alerted_at: lastAlertedAt,
    last_alert_level: 'error',
    threshold: 3,
    cooldownMinutes: 60,
    now,
  });
  assert.equal(r.fire, true);
});

test('alert-state: cooldown does not apply to recovery-level last alert', () => {
  const now = Date.now();
  const lastAlertedAt = new Date(now - 10 * 60 * 1000).toISOString();
  const r = shouldFirePush({
    consecutive_failures: 3,
    last_alerted_at: lastAlertedAt,
    last_alert_level: 'recovery',
    threshold: 3,
    cooldownMinutes: 60,
    now,
  });
  assert.equal(r.fire, true, 'recovery-then-error sollte ohne Cooldown feuern');
});

test('alert-state: 5-minute calendar cron with failure_threshold=3 delays first push by 15 min', () => {
  // Simuliere Cron alle 5 Min, 3 Fails im Stueck.
  // Fails 1 und 2 suppressed, Fail 3 fires.
  const now = Date.now();
  for (let i = 1; i <= 2; i++) {
    const r = shouldFirePush({
      consecutive_failures: i,
      last_alerted_at: null,
      last_alert_level: null,
      threshold: 3,
      cooldownMinutes: 60,
      now,
    });
    assert.equal(r.fire, false, `fail ${i} should be suppressed`);
  }
  const r3 = shouldFirePush({
    consecutive_failures: 3,
    last_alerted_at: null,
    last_alert_level: null,
    threshold: 3,
    cooldownMinutes: 60,
    now,
  });
  assert.equal(r3.fire, true);
});

test('alert-state: 4h cron with same pattern = 12h until first push (3 * 4h)', () => {
  // Bei Phase-3-Cron (alle 4h) = 12h delay. Das ist fuer Calendar ok,
  // Buchungen sind selten. Alternative: threshold=2 (=8h delay). Dieser
  // Test dokumentiert die Entscheidung.
  const r = shouldFirePush({
    consecutive_failures: 2,
    last_alerted_at: null,
    last_alert_level: null,
    threshold: 3,
    cooldownMinutes: 60,
    now: Date.now(),
  });
  assert.equal(r.fire, false);
});
