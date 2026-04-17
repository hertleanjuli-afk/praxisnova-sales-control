/**
 * Integration-Tests fuer das retry + observe Pattern in
 * google-calendar-sync. Die retryCalendar-Wrapper sind in
 * lib/google-calendar-client.ts aktiv (Wave 1 T2). Hier testen wir
 * die erwartete Wrapper-Behavior fuer Calendar-spezifische
 * Fehler-Patterns (401 Token-Refresh-Fail, 503 Spike, Network-Error).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { retryCalendar } from '../../lib/util/retry.ts';

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
function silenceConsole() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function restoreConsole() {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

test('calendar-adoption: retryCalendar uses 3 maxAttempts (503-loop)', async () => {
  silenceConsole();
  try {
    let calls = 0;
    let thrown: unknown;
    try {
      await retryCalendar(
        async () => {
          calls += 1;
          const err = new Error('calendar 503');
          Object.assign(err, { status: 503 });
          throw err;
        },
        { baseDelayMs: 1, jitterFactor: 0 },
      );
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 3);
    assert.equal((thrown as { attempts: number }).attempts, 3);
  } finally {
    restoreConsole();
  }
});

test('calendar-adoption: retryCalendar 401 non-retryable (bad token fails immediately)', async () => {
  silenceConsole();
  try {
    let calls = 0;
    let thrown: unknown;
    try {
      await retryCalendar(
        async () => {
          calls += 1;
          const err = new Error('calendar 401');
          Object.assign(err, { status: 401 });
          throw err;
        },
        { baseDelayMs: 1, jitterFactor: 0 },
      );
    } catch (e) {
      thrown = e;
    }
    // 401 ist NICHT retryable per default (Token permanently invalid),
    // also nur 1 attempt. Das ist das gewuenschte Verhalten: wir wollen
    // keinen Retry-Storm bei expired Credentials, wir wollen sofortiges
    // ntfy-Alert an Angie damit sie den Token refreshen kann.
    assert.equal(calls, 1);
    assert.equal((thrown as { attempts: number }).attempts, 1);
  } finally {
    restoreConsole();
  }
});

test('calendar-adoption: retryCalendar recovers after transient 503', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const result = await retryCalendar(
      async () => {
        calls += 1;
        if (calls < 2) {
          const err = new Error('upstream');
          Object.assign(err, { status: 503 });
          throw err;
        }
        return { events: [] };
      },
      { baseDelayMs: 1, jitterFactor: 0 },
    );
    assert.equal(calls, 2);
    assert.deepEqual(result, { events: [] });
  } finally {
    restoreConsole();
  }
});

test('calendar-adoption: retryCalendar network-error retried', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const result = await retryCalendar(
      async () => {
        calls += 1;
        if (calls < 2) throw new TypeError('fetch failed');
        return { ok: true };
      },
      { baseDelayMs: 1, jitterFactor: 0 },
    );
    assert.equal(calls, 2);
    assert.deepEqual(result, { ok: true });
  } finally {
    restoreConsole();
  }
});

test('calendar-adoption: retryCalendar success on first try (happy path)', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const result = await retryCalendar(async () => {
      calls += 1;
      return 'ok';
    });
    assert.equal(calls, 1);
    assert.equal(result, 'ok');
  } finally {
    restoreConsole();
  }
});
