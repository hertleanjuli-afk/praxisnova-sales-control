/**
 * morning-agents — Lightweight Orchestrator
 *
 * Triggers all 3 morning agents as SEPARATE HTTP requests so each gets
 * its own 300s serverless function budget. No more timeout issues.
 *
 * Previously ran all 3 agents sequentially in a single function (hit 300s limit).
 * Now each agent is an independent route:
 *   - /api/cron/prospect-researcher  (30 iterations, 300s)
 *   - /api/cron/partner-researcher   (25 iterations, 300s)
 *   - /api/cron/operations-manager   (15 iterations, 300s)
 *
 * This orchestrator fires all 3 in parallel and returns their status.
 * Schedule: 06:30 daily (vercel.json) — kept for backwards compatibility.
 *
 * Alternatively, each agent can be triggered directly via its own cron schedule.
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Orchestrator only needs seconds, not minutes

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const agentSecret = request.headers.get('x-agent-secret');

  const validCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validAgent = agentSecret === process.env.AGENT_SECRET;

  if (!validCron && !validAgent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://praxisnova-sales-control.vercel.app';

  const agents = [
    '/api/cron/prospect-researcher',
    '/api/cron/partner-researcher',
    '/api/cron/operations-manager',
  ];

  const authHeaders: Record<string, string> = validCron
    ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    : { 'x-agent-secret': process.env.AGENT_SECRET! };

  console.log('[morning-agents] Orchestrator: triggering 3 agents in parallel...');

  // Fire all 3 agents in parallel — each runs in its own serverless function
  const results = await Promise.allSettled(
    agents.map(async (path) => {
      const url = `${baseUrl}${path}`;
      console.log(`[morning-agents] Triggering ${path}...`);

      const res = await fetch(url, {
        headers: authHeaders,
        signal: AbortSignal.timeout(50000), // 50s timeout for the trigger (not the agent itself)
      });

      // We don't wait for the agent to finish — we just confirm it started
      // On Vercel, the fetch will return quickly if the agent is a separate function
      // that runs asynchronously. But if it's synchronous, we'll get the full result.
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${path} returned ${res.status}: ${text.slice(0, 200)}`);
      }

      return { path, status: res.status, ok: true };
    }),
  );

  const summary = results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return { agent: agents[i], triggered: true };
    } else {
      return { agent: agents[i], triggered: false, error: String(r.reason).slice(0, 200) };
    }
  });

  const allTriggered = summary.every(s => s.triggered);

  console.log(`[morning-agents] Orchestrator done. All triggered: ${allTriggered}`);

  return NextResponse.json({
    ok: allTriggered,
    orchestrator: true,
    agents_triggered: summary,
  });
}
