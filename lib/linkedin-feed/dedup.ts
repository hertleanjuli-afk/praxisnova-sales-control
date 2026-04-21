/**
 * Dedup-Logik fuer LinkedIn-Feed-Posts (Track 1, T1.3).
 *
 * Reine Funktionen, testbar ohne DB. Der Agent nutzt dedupPosts bevor
 * persistiert wird, damit wir nicht mehrfach denselben Post scoren oder
 * schreiben.
 *
 * Dedup-Schluessel:
 *   - Innerhalb eines Batch: post_url (normalisiert).
 *   - Gegen Bestand: postUrls die bereits in linkedin_feed_posts existieren.
 *     Der Agent gibt die Liste als zweiten Parameter rein, wir filtern hier.
 */

import type { LinkedInFeedPostRaw, ScoredPost } from './types.ts';

function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    u.hash = '';
    // LinkedIn haengt haeufig Tracking-Params dran, die wir fuer Dedup
    // abschneiden. Lokales URL-Objekt ist robust genug dafuer.
    const paramsToStrip = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'trk',
      'trackingId',
      'originalSubdomain',
    ];
    for (const p of paramsToStrip) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return url.trim();
  }
}

/**
 * Entfernt Duplikate innerhalb des Batches per normalisierter URL.
 * Erstes Vorkommen gewinnt, spaetere werden ignoriert.
 */
export function dedupeWithinBatch(
  posts: readonly LinkedInFeedPostRaw[]
): LinkedInFeedPostRaw[] {
  const seen = new Set<string>();
  const out: LinkedInFeedPostRaw[] = [];
  for (const p of posts) {
    const key = normalizeUrl(p.postUrl);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...p, postUrl: key });
  }
  return out;
}

/**
 * Filtert ScoredPosts gegen bereits bekannte URLs (DB-Bestand).
 * Ruft der Agent nachdem er known_urls via `SELECT post_url FROM
 * linkedin_feed_posts WHERE post_url = ANY(...)` geladen hat.
 */
export function filterKnownUrls(
  scored: readonly ScoredPost[],
  knownUrls: readonly string[]
): ScoredPost[] {
  const knownSet = new Set(knownUrls.map(normalizeUrl));
  return scored.filter((s) => !knownSet.has(normalizeUrl(s.post.postUrl)));
}

export const __test__ = {
  normalizeUrl,
};
