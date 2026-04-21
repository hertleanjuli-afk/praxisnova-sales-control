/**
 * ApifyAdapter fuer den LinkedIn-Feed-Agent (Track 1, T1.3).
 *
 * Stub-Implementierung. Production-Use erfordert:
 *   - Vercel-ENV APIFY_TOKEN (Apify API Token)
 *   - Vercel-ENV APIFY_LINKEDIN_ACTOR_ID (z.B. harvestapi~linkedin-post-search)
 *   - optional APIFY_MAX_POSTS_PER_RUN (Default 50)
 *
 * Solange die ENV-Vars nicht gesetzt sind, liefert fetchRecentPosts eine
 * leere Liste und loggt einen strukturierten Warn-Event. So laeuft der Cron
 * ohne zu failen, und Angie kann den Adapter per ENV scharf schalten.
 *
 * Scope T1.3: Adapter-Interface + Stub. Echte Apify-Integration (Actor-Run,
 * Dataset-Fetch, Pagination) folgt in separatem Track, sobald Angie die
 * Apify-Kosten-Cap festgelegt hat (Gate 6 Cost).
 */

import type { LinkedInFeedAdapter, LinkedInFeedPostRaw } from '../types.ts';

export interface ApifyAdapterConfig {
  token?: string;
  actorId?: string;
  maxPostsPerRun?: number;
}

export function createApifyAdapter(
  config: ApifyAdapterConfig = {}
): LinkedInFeedAdapter {
  const token = config.token ?? process.env.APIFY_TOKEN ?? '';
  const actorId =
    config.actorId ?? process.env.APIFY_LINKEDIN_ACTOR_ID ?? '';
  const maxPostsPerRun =
    config.maxPostsPerRun ??
    Number(process.env.APIFY_MAX_POSTS_PER_RUN ?? 50);

  const configured = Boolean(token && actorId);

  return {
    name: 'apify',
    async fetchRecentPosts(params) {
      if (!configured) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            msg: 'linkedin-feed: ApifyAdapter not configured, skipping fetch',
            hasToken: Boolean(token),
            hasActorId: Boolean(actorId),
            ts: new Date().toISOString(),
          })
        );
        return [];
      }

      // Production-Implementierung: Actor-Run + Dataset-Paginator.
      // Siehe https://docs.apify.com/api/v2 fuer Endpoints.
      // Absichtlich als Stub gehalten, echte Integration separater Track.
      console.info(
        JSON.stringify({
          level: 'info',
          msg: 'linkedin-feed: ApifyAdapter stub invoked, returning empty',
          actorId,
          keywords: params.keywords,
          maxPostsPerRun,
          ts: new Date().toISOString(),
        })
      );
      return [] as LinkedInFeedPostRaw[];
    },
  };
}
