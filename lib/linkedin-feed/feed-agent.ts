/**
 * LinkedIn-Feed-Agent Orchestrator (Track 1, T1.3).
 *
 * Schritte:
 *   1. Keywords aus icp_config laden (oder Fallback).
 *   2. Adapter abfragen (MockAdapter in Tests, ApifyAdapter in Production).
 *   3. Innerhalb-Batch dedupen.
 *   4. Score pro Post.
 *   5. Gegen DB-Bestand filtern (postUrls die schon in linkedin_feed_posts sind).
 *   6. Bulk-Insert in linkedin_feed_posts (ON CONFLICT DO NOTHING).
 *   7. Zaehlwerte zurueckgeben.
 *
 * Persistenz-Schreib ist die einzige Stelle mit DB-Writes. Die reinen
 * Funktionen (score + dedup) sind separat + getestet.
 */

import sql from '../db';
import { loadIcpKeywordSources } from './icp-loader';
import { scorePosts } from './score';
import { dedupeWithinBatch, filterKnownUrls } from './dedup';
import type { LinkedInFeedAdapter, ScoredPost } from './types';

export interface FeedAgentRunResult {
  fetched: number;
  afterBatchDedup: number;
  afterDbDedup: number;
  inserted: number;
  durationMs: number;
}

export interface FeedAgentOptions {
  maxPosts?: number;
  /** Wenn gesetzt, werden nur Posts mit score >= minScore persistiert. */
  minScore?: number;
}

const DEFAULT_MAX_POSTS = 50;
const DEFAULT_MIN_SCORE = 10;

async function fetchKnownUrls(urls: readonly string[]): Promise<string[]> {
  if (urls.length === 0) return [];
  // neon serverless unterstuetzt Array-Bindings. Wir halten uns an
  // tagged-template (kein sql.unsafe).
  const rows = (await sql`
    SELECT post_url FROM linkedin_feed_posts
    WHERE post_url = ANY(${urls as unknown as string[]}::text[])
  `) as Array<{ post_url: string }>;
  return rows.map((r) => r.post_url);
}

async function insertScoredPost(
  adapterName: string,
  sp: ScoredPost
): Promise<boolean> {
  try {
    const rows = (await sql`
      INSERT INTO linkedin_feed_posts (
        author_id,
        author_name,
        author_company,
        post_url,
        post_text,
        post_published_at,
        captured_at,
        relevance_score,
        matched_icp_id,
        matched_keywords,
        processed,
        source_adapter
      )
      VALUES (
        ${sp.post.authorId},
        ${sp.post.authorName ?? null},
        ${sp.post.authorCompany ?? null},
        ${sp.post.postUrl},
        ${sp.post.postText},
        ${sp.post.postPublishedAt ?? null},
        NOW(),
        ${sp.score},
        ${sp.matchedIcpId ?? null},
        ${JSON.stringify(sp.matchedKeywords)}::jsonb,
        false,
        ${adapterName}
      )
      ON CONFLICT (post_url) DO NOTHING
      RETURNING id
    `) as Array<{ id: number }>;
    return rows.length > 0;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'linkedin-feed: insert failed',
        postUrl: sp.post.postUrl,
        error: error instanceof Error ? error.message : String(error),
        ts: new Date().toISOString(),
      })
    );
    return false;
  }
}

export async function runFeedAgent(
  adapter: LinkedInFeedAdapter,
  options: FeedAgentOptions = {}
): Promise<FeedAgentRunResult> {
  const started = Date.now();
  const maxPosts = options.maxPosts ?? DEFAULT_MAX_POSTS;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  const icps = await loadIcpKeywordSources();
  const allKeywords = Array.from(
    new Set(icps.flatMap((i) => i.keywords.map((k) => k.toLowerCase())))
  );

  const raw = await adapter.fetchRecentPosts({
    keywords: allKeywords,
    maxPosts,
  });
  const fetched = raw.length;

  const batchDeduped = dedupeWithinBatch(raw);
  const afterBatchDedup = batchDeduped.length;

  const scored = scorePosts(batchDeduped, icps);

  const knownUrls = await fetchKnownUrls(batchDeduped.map((p) => p.postUrl));
  const newPosts = filterKnownUrls(scored, knownUrls);
  const afterDbDedup = newPosts.length;

  let inserted = 0;
  for (const sp of newPosts) {
    if (sp.score < minScore) continue;
    const ok = await insertScoredPost(adapter.name, sp);
    if (ok) inserted += 1;
  }

  return {
    fetched,
    afterBatchDedup,
    afterDbDedup,
    inserted,
    durationMs: Date.now() - started,
  };
}
