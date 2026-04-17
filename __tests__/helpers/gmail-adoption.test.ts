/**
 * Integration-Tests fuer das observe + memory-hygiene + retry Pattern in
 * Gmail Reply-Detector.
 *
 * Hinweis: wir importieren NICHT `lib/memory/agent-facts.ts` direkt, weil
 * das Modul auf Top-Level `import sql from '../db'` zieht und `lib/db.ts`
 * einen typed named-export aus `@neondatabase/serverless` verwendet, den
 * Node's --experimental-strip-types Loader nicht aufloesen kann (fine in
 * Next.js Production-Build). Stattdessen spiegelen wir die produktiven
 * Facts (`reply_detector.gmail_oauth_configured`,
 * `reply_detector.processed_label_name_consistent`) hier als Mock-Facts.
 * Das reicht fuer das Hygiene-Pattern-Verifikation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyMemoryFacts,
  getStaleFacts,
  type MemoryFact,
} from '../../lib/memory/hygiene.ts';
import { retryGmail } from '../../lib/util/retry.ts';

// Mirror der DB-freien Facts aus lib/memory/agent-facts.ts
const mockOauthFact: MemoryFact = {
  id: 'reply_detector.gmail_oauth_configured',
  description: 'Gmail OAuth-Credentials existieren',
  verify: async () =>
    Boolean(
      process.env.GMAIL_CLIENT_ID &&
        process.env.GMAIL_CLIENT_SECRET &&
        process.env.GMAIL_REFRESH_TOKEN,
    ),
};

const mockLabelFact: MemoryFact = {
  id: 'reply_detector.processed_label_name_consistent',
  description: 'Gmail-Label-Name Konstante',
  verify: async () => {
    const expected = 'praxisnova-processed';
    return typeof expected === 'string' && expected.length > 0;
  },
};

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

test('gmail-adoption: memory hygiene detects missing OAuth env as stale', async () => {
  silenceConsole();
  try {
    // Keine Gmail-OAuth ENVs -> oauth-Fact wird stale
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;

    const results = await verifyMemoryFacts(
      [mockOauthFact],
      { agent: 'reply_detector' },
      { topN: 1 },
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'stale');
    assert.equal(results[0].fact_id, 'reply_detector.gmail_oauth_configured');
  } finally {
    restoreConsole();
  }
});

test('gmail-adoption: memory hygiene fact fresh when all OAuth envs set', async () => {
  silenceConsole();
  try {
    process.env.GMAIL_CLIENT_ID = 'mock-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'mock-secret';
    process.env.GMAIL_REFRESH_TOKEN = 'mock-token';

    const results = await verifyMemoryFacts(
      [mockOauthFact],
      { agent: 'reply_detector' },
      { topN: 1 },
    );
    assert.equal(results[0].status, 'fresh');
  } finally {
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;
    restoreConsole();
  }
});

test('gmail-adoption: getStaleFacts filters correctly', async () => {
  silenceConsole();
  try {
    // Keine ENVs -> oauth-Fact stale, label-Fact fresh (static)
    delete process.env.GMAIL_CLIENT_ID;
    const results = await verifyMemoryFacts(
      [mockOauthFact, mockLabelFact],
      { agent: 'reply_detector' },
      { topN: 2 },
    );
    const stale = getStaleFacts(results);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].fact_id, 'reply_detector.gmail_oauth_configured');
  } finally {
    restoreConsole();
  }
});

test('gmail-adoption: retryGmail uses 3 maxAttempts (probe 429-loop)', async () => {
  silenceConsole();
  try {
    let calls = 0;
    let thrown: unknown;
    try {
      await retryGmail(
        async () => {
          calls += 1;
          const err = new Error('gmail 429');
          Object.assign(err, { status: 429 });
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

test('gmail-adoption: retryGmail success after 503 then ok', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const result = await retryGmail(
      async () => {
        calls += 1;
        if (calls === 1) {
          const err = new Error('upstream');
          Object.assign(err, { status: 503 });
          throw err;
        }
        return { messages: [] };
      },
      { baseDelayMs: 1, jitterFactor: 0 },
    );
    assert.equal(calls, 2);
    assert.deepEqual(result, { messages: [] });
  } finally {
    restoreConsole();
  }
});
