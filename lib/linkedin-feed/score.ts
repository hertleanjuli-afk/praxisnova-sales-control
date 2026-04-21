/**
 * Relevance-Score fuer LinkedIn-Feed-Posts (Track 1, T1.3).
 *
 * Reine, deterministische Funktion. Keine DB, keine IO. Testbar via
 * __tests__/helpers/linkedin-feed-score.test.ts.
 *
 * Scoring-Heuristik (bewusst simpel gehalten, Erweiterbarkeit ueber
 * icp_config.linkedin_keywords):
 *   - Pro ICP werden die Keywords case-insensitiv im Post-Text gesucht.
 *   - Jeder Keyword-Hit zaehlt. Score = 10 * hits (capped bei 100).
 *   - Wenn mehrere ICPs matchen, gewinnt der mit dem hoechsten Score,
 *     Ties loesen wir deterministisch nach icp.id alphabetisch auf.
 *   - Leerer Post-Text oder leere Keyword-Liste -> Score 0, matchedIcpId = null.
 *
 * Warum so simpel: LLM-basiertes Scoring ist kostentreibend (Gate 5).
 * Keyword-Match laeuft in O(n) ueber den Post-Text pro Keyword. Bei
 * Volumina > 1000 Posts pro Tag kann die Heuristik durch einen semantischen
 * Score (Embedding + Cosine) ersetzt werden, Interface bleibt gleich.
 */

import type { IcpKeywordsSource, LinkedInFeedPostRaw, ScoredPost } from './types.ts';

const MAX_SCORE = 100;
const PER_HIT = 10;

/**
 * Case-insensitiver Wort-Boundary-Match. Wir benutzen einen simplen
 * includes-Test auf lowercase-Seiten, weil LinkedIn-Posts oft Umlaute,
 * Emojis und Formatierung enthalten und Wort-Boundary-Regexe schnell
 * ueberreagieren (RE2 ohne Lookbehind).
 */
function matchKeyword(postText: string, keyword: string): boolean {
  if (!keyword) return false;
  const haystack = postText.toLowerCase();
  const needle = keyword.toLowerCase().trim();
  if (!needle) return false;
  return haystack.includes(needle);
}

export function scorePost(
  post: LinkedInFeedPostRaw,
  icps: readonly IcpKeywordsSource[]
): ScoredPost {
  if (!post.postText || icps.length === 0) {
    return {
      post,
      score: 0,
      matchedIcpId: null,
      matchedKeywords: [],
    };
  }

  let bestScore = 0;
  let bestIcp: string | null = null;
  let bestKeywords: string[] = [];

  // Stabiles Tie-Breaking durch Sortierung nach id.
  const sortedIcps = [...icps].sort((a, b) => a.id.localeCompare(b.id));

  for (const icp of sortedIcps) {
    const matched = icp.keywords.filter((kw) => matchKeyword(post.postText, kw));
    if (matched.length === 0) continue;
    const rawScore = matched.length * PER_HIT;
    const cappedScore = Math.min(rawScore, MAX_SCORE);
    if (cappedScore > bestScore) {
      bestScore = cappedScore;
      bestIcp = icp.id;
      bestKeywords = matched;
    }
  }

  return {
    post,
    score: bestScore,
    matchedIcpId: bestIcp,
    matchedKeywords: bestKeywords,
  };
}

export function scorePosts(
  posts: readonly LinkedInFeedPostRaw[],
  icps: readonly IcpKeywordsSource[]
): ScoredPost[] {
  return posts.map((p) => scorePost(p, icps));
}
