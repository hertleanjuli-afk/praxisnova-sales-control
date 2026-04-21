/**
 * Tests fuer lib/linkedin-feed/dedup.ts (Track 1, T1.3).
 *
 * Pure Funktionen, keine DB. Laeuft via `npm run test:helpers`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeWithinBatch,
  filterKnownUrls,
  __test__,
} from '../../lib/linkedin-feed/dedup.ts';
import type {
  LinkedInFeedPostRaw,
  ScoredPost,
} from '../../lib/linkedin-feed/types.ts';

const { normalizeUrl } = __test__;

function mkPost(url: string, text = 'body'): LinkedInFeedPostRaw {
  return {
    authorId: 'urn:li:person:abc',
    authorName: 'A',
    authorCompany: null,
    postUrl: url,
    postText: text,
    postPublishedAt: null,
  };
}

function mkScored(url: string, score = 10): ScoredPost {
  return {
    post: mkPost(url),
    score,
    matchedIcpId: 'icp-proptech',
    matchedKeywords: ['proptech'],
  };
}

// ---------------------------------------------------------------------------
// normalizeUrl
// ---------------------------------------------------------------------------

test('normalizeUrl: trimmt Hash und Tracking-Params', () => {
  const url =
    'https://www.linkedin.com/posts/abc?utm_source=x&trk=y&other=keep#ref';
  const normalized = normalizeUrl(url);
  assert.ok(!normalized.includes('utm_source'));
  assert.ok(!normalized.includes('trk='));
  assert.ok(normalized.includes('other=keep'));
  assert.ok(!normalized.includes('#ref'));
});

test('normalizeUrl: invalide URL bleibt getrimmt aber unveraendert', () => {
  const url = '  not-a-url  ';
  assert.equal(normalizeUrl(url), 'not-a-url');
});

test('normalizeUrl: leerer Input liefert leeren String', () => {
  assert.equal(normalizeUrl(''), '');
});

// ---------------------------------------------------------------------------
// dedupeWithinBatch
// ---------------------------------------------------------------------------

test('dedupeWithinBatch: filtert exakte Duplikate', () => {
  const posts = [
    mkPost('https://www.linkedin.com/posts/a'),
    mkPost('https://www.linkedin.com/posts/a'),
    mkPost('https://www.linkedin.com/posts/b'),
  ];
  const deduped = dedupeWithinBatch(posts);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].postUrl, 'https://www.linkedin.com/posts/a');
  assert.equal(deduped[1].postUrl, 'https://www.linkedin.com/posts/b');
});

test('dedupeWithinBatch: filtert Tracking-Param-Duplikate', () => {
  const posts = [
    mkPost('https://www.linkedin.com/posts/a'),
    mkPost('https://www.linkedin.com/posts/a?utm_source=feed'),
    mkPost('https://www.linkedin.com/posts/a#hash'),
  ];
  const deduped = dedupeWithinBatch(posts);
  assert.equal(deduped.length, 1);
});

test('dedupeWithinBatch: leerer Input liefert leeren Output', () => {
  assert.deepEqual(dedupeWithinBatch([]), []);
});

test('dedupeWithinBatch: leere URL wird geskippt', () => {
  const posts = [mkPost(''), mkPost('https://www.linkedin.com/posts/a')];
  const deduped = dedupeWithinBatch(posts);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].postUrl, 'https://www.linkedin.com/posts/a');
});

// ---------------------------------------------------------------------------
// filterKnownUrls
// ---------------------------------------------------------------------------

test('filterKnownUrls: entfernt bereits bekannte URLs', () => {
  const scored = [
    mkScored('https://www.linkedin.com/posts/a'),
    mkScored('https://www.linkedin.com/posts/b'),
    mkScored('https://www.linkedin.com/posts/c'),
  ];
  const known = ['https://www.linkedin.com/posts/b'];
  const result = filterKnownUrls(scored, known);
  assert.equal(result.length, 2);
  assert.equal(result[0].post.postUrl, 'https://www.linkedin.com/posts/a');
  assert.equal(result[1].post.postUrl, 'https://www.linkedin.com/posts/c');
});

test('filterKnownUrls: normalisiert beide Seiten (known + scored)', () => {
  const scored = [
    mkScored('https://www.linkedin.com/posts/a?utm_source=x'),
  ];
  const known = ['https://www.linkedin.com/posts/a'];
  const result = filterKnownUrls(scored, known);
  assert.equal(result.length, 0, 'tracking-params duerfen nicht schuetzen');
});

test('filterKnownUrls: leere knownUrls = alles durchreichen', () => {
  const scored = [mkScored('https://www.linkedin.com/posts/a')];
  const result = filterKnownUrls(scored, []);
  assert.equal(result.length, 1);
});

test('filterKnownUrls: leere scored = leerer Output', () => {
  const result = filterKnownUrls([], ['https://a']);
  assert.deepEqual(result, []);
});
