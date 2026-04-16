import { NextRequest, NextResponse } from 'next/server';
import { AGENT_LLM_CONFIG } from '@/lib/llm/config';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const adminToken = process.env.ADMIN_TOKEN;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (adminToken && authHeader === `Bearer ${adminToken}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providerCounts: Record<string, number> = {};
  for (const cfg of Object.values(AGENT_LLM_CONFIG)) {
    providerCounts[cfg.provider] = (providerCounts[cfg.provider] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    default_provider: process.env.DEFAULT_LLM_PROVIDER ?? 'gemini-paid',
    agent_count: Object.keys(AGENT_LLM_CONFIG).length,
    provider_counts: providerCounts,
    config: AGENT_LLM_CONFIG,
  });
}
