import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hours = parseInt(searchParams.get('hours') ?? '24', 10);
  const limit = parseInt(searchParams.get('limit') ?? '200', 10);

  try {
    const logs = await sql`
      SELECT
        l.id,
        l.run_id,
        l.agent_name,
        l.action,
        l.status,
        l.details,
        l.created_at
      FROM agent_logs l
      WHERE l.created_at > NOW() - (${hours} || ' hours')::interval
      ORDER BY l.created_at DESC
      LIMIT ${limit}
    `;

    // Also get a summary of current run status per agent
    const runStatus = await sql`
      SELECT
        agent_name,
        MAX(created_at) AS last_log,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '10 minutes') AS recent_count,
        MAX(CASE WHEN action = 'started' AND created_at > NOW() - INTERVAL '2 hours' THEN created_at END) AS run_started_at,
        MAX(CASE WHEN action IN ('completed', 'finished') AND created_at > NOW() - INTERVAL '2 hours' THEN created_at END) AS run_finished_at
      FROM agent_logs
      WHERE created_at > NOW() - (${hours} || ' hours')::interval
      GROUP BY agent_name
    `;

    const agentStatus: Record<string, { running: boolean; started_at: string | null; finished_at: string | null; recent_logs: number }> = {};
    for (const row of runStatus) {
      const startedAt = row.run_started_at;
      const finishedAt = row.run_finished_at;
      const running = startedAt && (!finishedAt || new Date(finishedAt) < new Date(startedAt));
      agentStatus[row.agent_name] = {
        running: !!running,
        started_at: startedAt ?? null,
        finished_at: finishedAt ?? null,
        recent_logs: parseInt(row.recent_count ?? '0', 10),
      };
    }

    return NextResponse.json({ logs, agentStatus, count: logs.length });
  } catch (error) {
    console.error('[API /api/agents/live-log] Error:', error);
    return NextResponse.json({ error: 'Failed to load live log' }, { status: 500 });
  }
}
