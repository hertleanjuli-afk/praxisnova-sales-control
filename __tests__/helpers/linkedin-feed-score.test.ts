/**
 * Tests fuer lib/linkedin-feed/score.ts (Track 1, T1.3).
 *
 * Pure Funktionen, keine DB. Laeuft via `npm run test:helpers`.
 * Gate 3 (Technical): je 1 Test fuer positive Matches, negative Matches,
 * ICP-Auswahl bei Ties, Cap-Logik, leere Eingaben.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePost, scorePosts } from '../../lib/linkedin-feed/score.ts';
import type {
  IcpKeywordsSource,
  LinkedInFeedPostRaw,
} from '../../lib/linkedin-feed/types.ts';

const icps: IcpKeywordsSource[] = [
  {
    id: 'icp-kanzlei',
    displayName: 'Kanzlei',
    keywords: ['steuerberater', 'rechtsanwalt'],
  },
  {
    id: 'icp-proptech',
    displayName: 'PropTech',
    keywords: ['proptech', 'hausverwaltung software'],
  },
];

function mkPost(partial: Partial<LinkedInFeedPostRaw>): LinkedInFeedPostRaw {
  return {
    authorId: partial.authorId ?? 'urn:li:person:abc',
    authorName: partial.authorName ?? 'Test Person',
    authorCompany: partial.authorCompany ?? null,
    postUrl: partial.postUrl ?? 'https://www.linkedin.com/posts/x/a',
    postText: partial.postText ?? '',
    postPublishedAt: partial.postPublishedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Base cases
// ---------------------------------------------------------------------------

test('score: leerer Post-Text liefert 0 und kein ICP', () => {
  const result = scorePost(mkPost({ postText: '' }), icps);
  assert.equal(result.score, 0);
  assert.equal(result.matchedIcpId, null);
  assert.deepEqual(result.matchedKeywords, []);
});

test('score: leere ICP-Liste liefert 0', () => {
  const result = scorePost(mkPost({ postText: 'proptech hoch zehn' }), []);
  assert.equal(result.score, 0);
  assert.equal(result.matchedIcpId, null);
});

test('score: 1 Keyword-Hit = 10', () => {
  const result = scorePost(
    mkPost({ postText: 'Wir bauen PropTech fuer Vermieter' }),
    icps
  );
  assert.equal(result.score, 10);
  assert.equal(result.matchedIcpId, 'icp-proptech');
  assert.deepEqual(result.matchedKeywords, ['proptech']);
});

test('score: 2 Keyword-Hits im gleichen ICP = 20', () => {
  const result = scorePost(
    mkPost({
      postText:
        'Software fuer die Hausverwaltung software und proptech Szene.',
    }),
    icps
  );
  assert.equal(result.score, 20);
  assert.equal(result.matchedIcpId, 'icp-proptech');
  assert.ok(result.matchedKeywords.includes('proptech'));
  assert.ok(result.matchedKeywords.includes('hausverwaltung software'));
});

test('score: Case-insensitiver Match', () => {
  const result = scorePost(
    mkPost({ postText: 'Hallo STEUERBERATER Welt' }),
    icps
  );
  assert.equal(result.score, 10);
  assert.equal(result.matchedIcpId, 'icp-kanzlei');
});

test('score: keine Matches -> 0 und null-ICP', () => {
  const result = scorePost(
    mkPost({ postText: 'Koch-Show in der Stadthalle' }),
    icps
  );
  assert.equal(result.score, 0);
  assert.equal(result.matchedIcpId, null);
  assert.deepEqual(result.matchedKeywords, []);
});

// ---------------------------------------------------------------------------
// Tie-Breaking + Cap
// ---------------------------------------------------------------------------

test('score: bei Tie gewinnt alphabetisch niedrigere ICP-ID', () => {
  // "steuerberater" matcht kanzlei. "proptech" matcht proptech. Beide genau 1 Hit.
  // Bei gleichem Score gewinnt der erste per sortierter ID -> icp-kanzlei.
  const result = scorePost(
    mkPost({ postText: 'Unser steuerberater nutzt proptech taeglich.' }),
    icps
  );
  assert.equal(result.score, 10);
  assert.equal(
    result.matchedIcpId,
    'icp-kanzlei',
    'alphabetisch niedrigere ID gewinnt bei Tie'
  );
});

test('score: staerkerer Match schlaegt schwaecheren', () => {
  const bigIcp: IcpKeywordsSource = {
    id: 'icp-big',
    displayName: 'Big',
    keywords: ['alpha', 'beta', 'gamma'],
  };
  const smallIcp: IcpKeywordsSource = {
    id: 'icp-aaa',
    displayName: 'AAA',
    keywords: ['delta'],
  };
  const result = scorePost(
    mkPost({ postText: 'alpha beta gamma delta' }),
    [bigIcp, smallIcp]
  );
  assert.equal(result.matchedIcpId, 'icp-big');
  assert.equal(result.score, 30);
});

test('score: cap bei 100 auch bei vielen Hits', () => {
  const many = Array.from({ length: 15 }, (_, i) => `kw${i}`);
  const icp: IcpKeywordsSource = {
    id: 'icp-big',
    displayName: 'Big',
    keywords: many,
  };
  const text = many.join(' ');
  const result = scorePost(mkPost({ postText: text }), [icp]);
  assert.equal(result.score, 100);
  assert.equal(result.matchedKeywords.length, 15);
});

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

test('scorePosts: mappt jeden Post 1:1', () => {
  const posts = [
    mkPost({ postText: 'proptech' }),
    mkPost({ postText: 'nix relevantes' }),
  ];
  const results = scorePosts(posts, icps);
  assert.equal(results.length, 2);
  assert.equal(results[0].score, 10);
  assert.equal(results[1].score, 0);
});
