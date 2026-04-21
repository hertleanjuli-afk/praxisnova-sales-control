/**
 * MockAdapter fuer den LinkedIn-Feed-Agent (Track 1, T1.3).
 *
 * Liefert vordefinierte Posts, deterministisch. Wird in Unit-Tests benutzt,
 * damit Score + Dedup + Persistenz-Flow ohne externe API getestet werden
 * koennen.
 */

import type { LinkedInFeedAdapter, LinkedInFeedPostRaw } from '../types.ts';

export interface MockAdapterOptions {
  posts?: LinkedInFeedPostRaw[];
  /** Wenn true, wirft fetchRecentPosts einen Fehler (fuer negative Tests). */
  failOnFetch?: boolean;
  name?: string;
}

export class MockAdapter implements LinkedInFeedAdapter {
  public readonly name: string;
  private posts: LinkedInFeedPostRaw[];
  private failOnFetch: boolean;
  public fetchCalls: Array<{
    keywords: string[];
    sinceIsoUtc?: string;
    maxPosts?: number;
  }> = [];

  constructor(options: MockAdapterOptions = {}) {
    this.name = options.name ?? 'mock';
    this.posts = options.posts ?? [];
    this.failOnFetch = options.failOnFetch ?? false;
  }

  async fetchRecentPosts(params: {
    keywords: string[];
    sinceIsoUtc?: string;
    maxPosts?: number;
  }): Promise<LinkedInFeedPostRaw[]> {
    this.fetchCalls.push(params);
    if (this.failOnFetch) {
      throw new Error('MockAdapter.fetchRecentPosts configured to fail');
    }
    const max = params.maxPosts ?? this.posts.length;
    return this.posts.slice(0, max);
  }
}
