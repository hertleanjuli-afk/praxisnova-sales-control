/**
 * Integration-Tests fuer das retry+observe+fallback Pattern in Apollo
 * Lead-Ingestor. Wir testen die Wrapper-Komposition isoliert (nicht die
 * Route selbst, weil die viel DB-State braucht).
 *
 * Szenarien: 429-Spike -> retry greift -> Success,
 *            persistent 429 -> alle Retries aus -> Safe-NoOp,
 *            500 mit Success nach 2 Retries,
 *            400 (non-retryable) -> sofortiger Fail.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { retryApollo } from '../../lib/util/retry.ts';

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

/**
 * Mock eines Apollo-Calls wie im apollo-sync Code, aber mit parametrischen
 * Failures fuer jeden Versuch. Gibt die `attempt`-Zahl im Erfolgs-Output
 * damit Tests verifizieren koennen, dass Retry wirklich griff.
 */
function makeApolloCall(pattern: Array<number | 'ok'>): () => Promise<{ attempt: number }> {
  let attempt = 0;
  return async () => {
    const step = pattern[Math.min(attempt, pattern.length - 1)];
    attempt += 1;
    if (step === 'ok') return { attempt };
    // Annotiere Status wie der apollo-sync Code das macht
    const err = new Error(`Apollo API error ${step}: simulated`);
    Object.assign(err, { status: step });
    throw err;
  };
}

test('apollo-adoption: 429 spike then success recovers via retry', async () => {
  silenceConsole();
  try {
    // Pattern: 429, 429, ok
    const call = makeApolloCall([429, 429, 'ok']);
    const result = await retryApollo(call, { baseDelayMs: 1, jitterFactor: 0 });
    assert.equal(result.attempt, 3, '3rd attempt should succeed');
  } finally {
    restoreConsole();
  }
});

test('apollo-adoption: 500 then success after retry', async () => {
  silenceConsole();
  try {
    const call = makeApolloCall([500, 'ok']);
    const result = await retryApollo(call, { baseDelayMs: 1, jitterFactor: 0 });
    assert.equal(result.attempt, 2);
  } finally {
    restoreConsole();
  }
});

test('apollo-adoption: persistent 429 exhausts 5 retries, throws annotated error', async () => {
  silenceConsole();
  try {
    const call = makeApolloCall([429, 429, 429, 429, 429, 429]);
    let thrown: unknown;
    try {
      await retryApollo(call, { baseDelayMs: 1, jitterFactor: 0 });
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown instanceof Error);
    assert.equal((thrown as { status: number }).status, 429);
    assert.equal((thrown as { attempts: number }).attempts, 5);
  } finally {
    restoreConsole();
  }
});

test('apollo-adoption: 400 non-retryable fails immediately (single attempt)', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const call = async () => {
      calls += 1;
      const err = new Error('bad request');
      Object.assign(err, { status: 400 });
      throw err;
    };
    let thrown: unknown;
    try {
      await retryApollo(call, { baseDelayMs: 1, jitterFactor: 0 });
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 1, 'should not retry on 400');
    assert.equal((thrown as { attempts: number }).attempts, 1);
  } finally {
    restoreConsole();
  }
});

test('apollo-adoption: network-error retried per Apollo-Config', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const call = async () => {
      calls += 1;
      if (calls < 3) {
        throw new TypeError('fetch failed'); // network
      }
      return { attempt: calls };
    };
    const result = await retryApollo(call, { baseDelayMs: 1, jitterFactor: 0 });
    assert.equal(result.attempt, 3);
  } finally {
    restoreConsole();
  }
});

test('apollo-adoption: 422 deprecation signal fails immediately (single attempt)', async () => {
  // Apollo nutzt 422 um auf deprecated Endpoint-Pfade hinzuweisen (siehe
  // lib/apollo.ts URL-History). Retry waere sinnlos weil der Pfad geaendert
  // werden muss, nicht die Zeit abzuwarten ist. Der Wrapper muss sauber
  // throwen, damit der Cron-Handler den Error an observe.error + ntfy
  // weitergibt statt still zu scheitern.
  silenceConsole();
  try {
    let calls = 0;
    const call = async () => {
      calls += 1;
      const err = new Error('Apollo API Fehler (422): endpoint deprecated, use /api/v1/mixed_people/api_search');
      Object.assign(err, { status: 422 });
      throw err;
    };
    let thrown: unknown;
    try {
      await retryApollo(call, { baseDelayMs: 1, jitterFactor: 0 });
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 1, 'should not retry on 422');
    assert.ok(thrown instanceof Error);
    assert.equal((thrown as { status: number }).status, 422);
    assert.equal((thrown as { attempts: number }).attempts, 1);
    assert.match((thrown as Error).message, /422/);
  } finally {
    restoreConsole();
  }
});

test('apollo-adoption: 422 with status only in message (lib/apollo.ts style) fails immediately', async () => {
  // lib/apollo.ts throwt Error mit `(422)` im Text ohne .status-Property.
  // defaultShouldRetry parst den Code aus der Message. Das muss auch
  // ohne .status-Annotation non-retryable sein.
  silenceConsole();
  try {
    let calls = 0;
    const call = async () => {
      calls += 1;
      throw new Error('Apollo API Fehler (422): Unprocessable Entity');
    };
    let thrown: unknown;
    try {
      await retryApollo(call, { baseDelayMs: 1, jitterFactor: 0 });
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 1, 'message-only 422 should not retry');
    assert.equal((thrown as { attempts: number }).attempts, 1);
  } finally {
    restoreConsole();
  }
});
