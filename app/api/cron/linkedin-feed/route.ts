/**
 * CRON: LinkedIn Post-Feed Agent
 * Schedule: 0 8 * * * (08:00 UTC daily)
 *
 * Faengt ICP-relevante LinkedIn-Posts aus externem Feed, bewertet sie gegen
 * icp_config.linkedin_keywords (oder Code-Fallback) und speichert in
 * linkedin_feed_posts. Kein LinkedIn-TOS-Write-Verkehr, nur Read-Only-Ingest.
 *
 * Auth: Bearer CRON_SECRET (wie andere Crons im Projekt).
 * Adapter: Apify-Stub (default). Tests nutzen MockAdapter direkt via
 *   runFeedAgent(mock). Production: ENV APIFY_TOKEN + APIFY_LINKEDIN_ACTOR_ID.
 * Observability: cron_locks + cron_runs via lib/cron-observability.ts.
 */

import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/agent-runtime';
import { beginCronRun, endCronRun } from '@/lib/cron-observability';
import { runFeedAgent } from '@/lib/linkedin-feed/feed-agent';
import { createApifyAdapter } from '@/lib/linkedin-feed/adapters/apify';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const CRON_NAME = 'linkedin-feed';

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const handle = await beginCronRun(CRON_NAME, {
    ttlSeconds: 600,
    metadata: { source: 'vercel-cron' },
  });

  if (!handle) {
    return NextResponse.json(
      { status: 'skipped', reason: 'lock_busy' },
      { status: 200 }
    );
  }

  const adapter = createApifyAdapter();

  try {
    const result = await runFeedAgent(adapter);
    await endCronRun(handle, 'success', {
      itemsProcessed: result.inserted,
      metadata: {
        adapter: adapter.name,
        fetched: result.fetched,
        afterBatchDedup: result.afterBatchDedup,
        afterDbDedup: result.afterDbDedup,
        inserted: result.inserted,
        durationMs: result.durationMs,
      },
    });

    return NextResponse.json({
      status: 'success',
      runId: handle.runId,
      ...result,
      adapter: adapter.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await endCronRun(handle, 'failed', {}, message);
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'linkedin-feed: run failed',
        runId: handle.runId,
        error: message,
        ts: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { status: 'failed', error: message, runId: handle.runId },
      { status: 500 }
    );
  }
}
