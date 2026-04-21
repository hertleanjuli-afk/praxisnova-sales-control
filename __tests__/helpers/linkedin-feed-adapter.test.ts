/**
 * Tests fuer MockAdapter (Track 1, T1.3).
 *
 * Der MockAdapter ist der Test-Vehicle fuer den Feed-Agent. Diese Tests
 * sichern sein Interface-Contract, damit wir bei Refactors nicht versehentlich
 * das Test-Fundament brechen.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { MockAdapter } from '../../lib/linkedin-feed/adapters/mock.ts';
import type { LinkedInFeedPostRaw } from '../../lib/linkedin-feed/types.ts';

function mk(n: number): LinkedInFeedPostRaw {
  return {
    authorId: `urn:li:person:${n}`,
    authorName: `Person ${n}`,
    authorCompany: `Firma ${n}`,
    postUrl: `https://www.linkedin.com/posts/p${n}`,
    postText: `Text ${n}`,
    postPublishedAt: null,
  };
}

test('MockAdapter: liefert konfigurierte Posts unveraendert', async () => {
  const adapter = new MockAdapter({ posts: [mk(1), mk(2)] });
  const out = await adapter.fetchRecentPosts({ keywords: ['x'] });
  assert.equal(out.length, 2);
  assert.equal(out[0].authorId, 'urn:li:person:1');
});

test('MockAdapter: respektiert maxPosts', async () => {
  const adapter = new MockAdapter({ posts: [mk(1), mk(2), mk(3), mk(4)] });
  const out = await adapter.fetchRecentPosts({ keywords: [], maxPosts: 2 });
  assert.equal(out.length, 2);
});

test('MockAdapter: leere Default-Posts', async () => {
  const adapter = new MockAdapter();
  const out = await adapter.fetchRecentPosts({ keywords: [] });
  assert.equal(out.length, 0);
});

test('MockAdapter: failOnFetch wirft Fehler', async () => {
  const adapter = new MockAdapter({ failOnFetch: true });
  await assert.rejects(
    () => adapter.fetchRecentPosts({ keywords: [] }),
    /MockAdapter.fetchRecentPosts configured to fail/
  );
});

test('MockAdapter: fetchCalls zeichnet Aufrufe auf', async () => {
  const adapter = new MockAdapter({ posts: [mk(1)] });
  await adapter.fetchRecentPosts({
    keywords: ['a', 'b'],
    sinceIsoUtc: '2026-04-21T00:00:00.000Z',
    maxPosts: 10,
  });
  assert.equal(adapter.fetchCalls.length, 1);
  assert.deepEqual(adapter.fetchCalls[0].keywords, ['a', 'b']);
  assert.equal(adapter.fetchCalls[0].maxPosts, 10);
  assert.equal(
    adapter.fetchCalls[0].sinceIsoUtc,
    '2026-04-21T00:00:00.000Z'
  );
});

test('MockAdapter: Name default "mock", anpassbar', () => {
  assert.equal(new MockAdapter().name, 'mock');
  assert.equal(new MockAdapter({ name: 'custom' }).name, 'custom');
});
