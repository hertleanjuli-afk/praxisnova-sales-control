/**
 * Types fuer den LinkedIn-Feed-Agent (Track 1, T1.3).
 *
 * Adapter-Interface entkoppelt den Feed-Agent von der konkreten Quelle
 * (Apify Actor, LinkedIn Scraping API, Unipile, ...). Tests nutzen den
 * MockAdapter aus lib/linkedin-feed/adapters/mock.ts.
 */

export interface LinkedInFeedPostRaw {
  /** Stable identifier fuer den Author (z.B. LinkedIn-URN, Profil-Slug) */
  authorId: string;
  authorName?: string | null;
  authorCompany?: string | null;
  /** Vollstaendige URL zum Post, wird als Dedup-Schluessel verwendet */
  postUrl: string;
  postText: string;
  /** ISO-Datum wann der Post publiziert wurde */
  postPublishedAt?: string | null;
}

export interface LinkedInFeedAdapter {
  /** Name des Adapters fuer Logging + linkedin_feed_posts.source_adapter */
  readonly name: string;
  /**
   * Liefert Roh-Posts. Der Agent uebernimmt Score + Dedup + Persistenz.
   * Der Adapter ist stateless und sollte bei Fehlern (Rate-Limit, Netzwerk)
   * eine leere Liste + geloggten Error zurueckgeben statt zu throwen, damit
   * der Cron nicht haengt.
   */
  fetchRecentPosts(params: {
    keywords: string[];
    sinceIsoUtc?: string;
    maxPosts?: number;
  }): Promise<LinkedInFeedPostRaw[]>;
}

export interface IcpKeywordsSource {
  id: string;
  displayName: string;
  keywords: string[];
}

export interface ScoredPost {
  post: LinkedInFeedPostRaw;
  score: number;
  matchedIcpId: string | null;
  matchedKeywords: string[];
}
