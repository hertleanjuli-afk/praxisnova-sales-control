import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyMemoryFacts,
  getStaleFacts,
  type MemoryFact,
} from '../../lib/memory/hygiene.ts';

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

function makeFact(
  id: string,
  result: boolean | 'throws' | 'hangs',
): MemoryFact {
  return {
    id,
    description: `desc for ${id}`,
    verify: async () => {
      if (result === 'throws') throw new Error('boom');
      if (result === 'hangs') {
        // hangt 800ms - reicht um withTimeout(100ms) zu triggern, blockt
        // aber den Test-Runner-Exit nicht stundenlang
        await new Promise((r) => {
          const timer = setTimeout(r, 800);
          // unref damit Node nicht aufs Timer wartet vor process.exit
          if (typeof timer.unref === 'function') timer.unref();
        });
        return true;
      }
      return result;
    },
  };
}

test('verifyMemoryFacts: all fresh facts return status=fresh', async () => {
  silenceConsole();
  try {
    const results = await verifyMemoryFacts(
      [makeFact('a', true), makeFact('b', true), makeFact('c', true)],
      { agent: 'test_agent' },
    );
    assert.equal(results.length, 3);
    assert.ok(results.every((r) => r.status === 'fresh'));
    assert.equal(getStaleFacts(results).length, 0);
  } finally {
    restoreConsole();
  }
});

test('verifyMemoryFacts: stale fact gets status=stale, agent run continues', async () => {
  silenceConsole();
  try {
    const results = await verifyMemoryFacts(
      [makeFact('a', true), makeFact('b', false), makeFact('c', true)],
      { agent: 'test_agent', run_id: 'r-1' },
    );
    assert.equal(results.length, 3);
    assert.equal(results[0].status, 'fresh');
    assert.equal(results[1].status, 'stale');
    assert.equal(results[2].status, 'fresh');
    const stale = getStaleFacts(results);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].fact_id, 'b');
  } finally {
    restoreConsole();
  }
});

test('verifyMemoryFacts: throwing fact gets status=verify_failed with error', async () => {
  silenceConsole();
  try {
    const results = await verifyMemoryFacts(
      [makeFact('a', true), makeFact('b', 'throws'), makeFact('c', true)],
      { agent: 'test_agent' },
    );
    assert.equal(results[1].status, 'verify_failed');
    assert.match(results[1].error ?? '', /boom/);
    // andere Facts bleiben fresh
    assert.equal(results[0].status, 'fresh');
    assert.equal(results[2].status, 'fresh');
  } finally {
    restoreConsole();
  }
});

test('verifyMemoryFacts: hanging fact gets timeout, status=verify_failed', async () => {
  silenceConsole();
  try {
    const start = Date.now();
    const results = await verifyMemoryFacts(
      [makeFact('a', 'hangs')],
      { agent: 'test_agent' },
      { timeoutMs: 100 },
    );
    const elapsed = Date.now() - start;
    assert.equal(results[0].status, 'verify_failed');
    assert.match(results[0].error ?? '', /timeout/);
    assert.ok(elapsed < 1000, `should not wait full 10s, elapsed=${elapsed}`);
  } finally {
    restoreConsole();
  }
});

test('verifyMemoryFacts: topN=3 limits to first three facts', async () => {
  silenceConsole();
  try {
    const results = await verifyMemoryFacts(
      [
        makeFact('a', true),
        makeFact('b', true),
        makeFact('c', true),
        makeFact('d', false),
        makeFact('e', false),
      ],
      { agent: 'test_agent' },
      { topN: 3 },
    );
    assert.equal(results.length, 3);
    assert.deepEqual(
      results.map((r) => r.fact_id),
      ['a', 'b', 'c'],
    );
  } finally {
    restoreConsole();
  }
});

test('verifyMemoryFacts: topN=0 verifies all facts', async () => {
  silenceConsole();
  try {
    const results = await verifyMemoryFacts(
      [makeFact('a', true), makeFact('b', false), makeFact('c', true)],
      { agent: 'test_agent' },
      { topN: 0 },
    );
    assert.equal(results.length, 3);
  } finally {
    restoreConsole();
  }
});

test('verifyMemoryFacts: never throws even when all facts are bad', async () => {
  silenceConsole();
  try {
    const results = await verifyMemoryFacts(
      [makeFact('a', 'throws'), makeFact('b', false), makeFact('c', 'throws')],
      { agent: 'test_agent' },
    );
    assert.equal(results.length, 3);
    // Caller bekommt 3 Status zurueck und kann Fallback-Entscheidung treffen
    assert.equal(getStaleFacts(results).length, 3);
  } finally {
    restoreConsole();
  }
});

test('verifyMemoryFacts: each result has duration_ms >= 0', async () => {
  silenceConsole();
  try {
    const results = await verifyMemoryFacts(
      [makeFact('a', true)],
      { agent: 'test_agent' },
    );
    assert.ok(results[0].duration_ms >= 0);
  } finally {
    restoreConsole();
  }
});
