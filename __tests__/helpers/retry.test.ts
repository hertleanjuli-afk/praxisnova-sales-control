import test from 'node:test';
import assert from 'node:assert/strict';
import {
  retryWithBackoff,
  defaultShouldRetry,
  retryApollo,
} from '../../lib/util/retry.ts';

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

// ─── defaultShouldRetry ─────────────────────────────────────────────────────

test('defaultShouldRetry: HTTP 429 retried', () => {
  const err = Object.assign(new Error('rate limit'), { status: 429 });
  assert.equal(defaultShouldRetry(err), true);
});

test('defaultShouldRetry: HTTP 500/502/503/504 retried', () => {
  for (const status of [500, 502, 503, 504]) {
    const err = Object.assign(new Error('server'), { status });
    assert.equal(defaultShouldRetry(err), true, `status ${status} should retry`);
  }
});

test('defaultShouldRetry: HTTP 400/401/403 NOT retried', () => {
  for (const status of [400, 401, 403, 404]) {
    const err = Object.assign(new Error('client'), { status });
    assert.equal(defaultShouldRetry(err), false, `status ${status} should NOT retry`);
  }
});

test('defaultShouldRetry: parses HTTP code from message format "(429)"', () => {
  const err = new Error('Apollo API Fehler (429): rate limited');
  assert.equal(defaultShouldRetry(err), true);
});

test('defaultShouldRetry: network error retried', () => {
  const err = new TypeError('fetch failed');
  assert.equal(defaultShouldRetry(err), true);
  const econn = new Error('connect ECONNRESET 1.2.3.4:443');
  assert.equal(defaultShouldRetry(econn), true);
});

test('defaultShouldRetry: arbitrary error NOT retried', () => {
  assert.equal(defaultShouldRetry(new Error('something else')), false);
});

// ─── retryWithBackoff happy path ────────────────────────────────────────────

test('retryWithBackoff: success on first attempt, no wait', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls += 1;
      return 'ok';
    });
    assert.equal(calls, 1);
    assert.equal(result, 'ok');
  } finally {
    restoreConsole();
  }
});

test('retryWithBackoff: retries on retryable error then succeeds', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 3) {
          const e = Object.assign(new Error('rate limit'), { status: 429 });
          throw e;
        }
        return 'ok';
      },
      { baseDelayMs: 1, maxDelayMs: 5, jitterFactor: 0 },
    );
    assert.equal(calls, 3);
    assert.equal(result, 'ok');
  } finally {
    restoreConsole();
  }
});

test('retryWithBackoff: gives up after maxAttempts and throws annotated error', async () => {
  silenceConsole();
  try {
    let calls = 0;
    let thrown: unknown;
    try {
      await retryWithBackoff(
        async () => {
          calls += 1;
          throw Object.assign(new Error('server down'), { status: 503 });
        },
        { maxAttempts: 4, baseDelayMs: 1, jitterFactor: 0 },
      );
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 4);
    assert.ok(thrown instanceof Error);
    assert.equal((thrown as { attempts: number }).attempts, 4);
  } finally {
    restoreConsole();
  }
});

test('retryWithBackoff: non-retryable error thrown immediately', async () => {
  silenceConsole();
  try {
    let calls = 0;
    let thrown: unknown;
    try {
      await retryWithBackoff(
        async () => {
          calls += 1;
          throw Object.assign(new Error('bad request'), { status: 400 });
        },
        { maxAttempts: 5, baseDelayMs: 1 },
      );
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 1, 'should not retry on 400');
    assert.equal((thrown as { attempts: number }).attempts, 1);
  } finally {
    restoreConsole();
  }
});

test('retryWithBackoff: custom shouldRetry overrides default', async () => {
  silenceConsole();
  try {
    let calls = 0;
    await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 2) throw new Error('boom');
        return 'ok';
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1,
        shouldRetry: () => true, // retry alles
      },
    );
    assert.equal(calls, 2);
  } finally {
    restoreConsole();
  }
});

// ─── Backoff-Logik ──────────────────────────────────────────────────────────

test('retryWithBackoff: delay grows exponentially (no jitter)', async () => {
  silenceConsole();
  try {
    const delays: number[] = [];
    let lastTs = Date.now();
    let calls = 0;
    try {
      await retryWithBackoff(
        async () => {
          const now = Date.now();
          if (calls > 0) delays.push(now - lastTs);
          lastTs = now;
          calls += 1;
          throw Object.assign(new Error('x'), { status: 503 });
        },
        { maxAttempts: 4, baseDelayMs: 50, jitterFactor: 0 },
      );
    } catch {
      // expected
    }
    assert.equal(delays.length, 3);
    // ungefaehr 50ms, 100ms, 200ms (timer-Toleranz +/- 25ms)
    assert.ok(delays[0] >= 35 && delays[0] <= 100, `delay 1 = ${delays[0]}`);
    assert.ok(delays[1] >= 80 && delays[1] <= 175, `delay 2 = ${delays[1]}`);
    assert.ok(delays[2] >= 175 && delays[2] <= 300, `delay 3 = ${delays[2]}`);
  } finally {
    restoreConsole();
  }
});

// ─── API-Wrapper ────────────────────────────────────────────────────────────

test('retryApollo: uses 5 maxAttempts (probe via 429-loop, fast delays)', async () => {
  silenceConsole();
  try {
    let calls = 0;
    let thrown: unknown;
    try {
      await retryApollo(
        async () => {
          calls += 1;
          throw Object.assign(new Error('rl'), { status: 429 });
        },
        { baseDelayMs: 1, jitterFactor: 0 },
      );
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 5);
    assert.equal((thrown as { attempts: number }).attempts, 5);
  } finally {
    restoreConsole();
  }
});
