import { NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * System Health API
 *
 * Returns the live status of all background agents. Drives the
 * "System Status" panel on /settings.
 *
 * agent_logs real schema (from lib/db.ts):
 *   id, run_id, agent_name, action, status, details JSONB, created_at
 *
 * IMPORTANT: the patch template assumed `summary` and `error_message`
 * columns that do not exist. Error details live in details->>'error'.
 *
 * IMPORTANT: only 7 crons call writeEndLog() with underscored agent names:
 *   prospect_researcher, outreach_strategist, operations_manager,
 *   partner_outreach_strategist, partner_supervisor, sales_supervisor,
 *   partner_researcher
 *
 * Other crons (news-agent, linkedin-post-generator, daily-backup, etc.)
 * do not log to agent_logs. For those we infer status from secondary
 * tables they populate (industry_news, linkedin_post_drafts).
 */

type AgentSource = 'agent_logs' | 'industry_news' | 'linkedin_post_drafts' | 'none';

type AgentConfig = {
  key: string;
  label: string;
  schedule: string;
  source: AgentSource;
  // When source === 'agent_logs', this is the value looked up in the agent_name column.
  agentName?: string;
};

const AGENTS: AgentConfig[] = [
  // Agents that write to agent_logs (underscored names)
  { key: 'prospect_researcher',      label: 'Prospect Researcher',       schedule: '4x taeglich Mo-Fr',   source: 'agent_logs', agentName: 'prospect_researcher' },
  { key: 'outreach_strategist',      label: 'Outreach Strategist',       schedule: '6x taeglich Mo-Fr',   source: 'agent_logs', agentName: 'outreach_strategist' },
  { key: 'operations_manager',       label: 'Operations Manager',        schedule: 'Mo-Fr 07:15 UTC',      source: 'agent_logs', agentName: 'operations_manager' },
  { key: 'sales_supervisor',         label: 'Sales Supervisor',          schedule: '2x taeglich Mo-Fr',    source: 'agent_logs', agentName: 'sales_supervisor' },
  { key: 'partner_researcher',       label: 'Partner Researcher',        schedule: 'Taeglich 07:00 UTC',  source: 'agent_logs', agentName: 'partner_researcher' },
  { key: 'partner_supervisor',       label: 'Partner Supervisor',        schedule: 'Mo-Fr 08:45 UTC',     source: 'agent_logs', agentName: 'partner_supervisor' },
  { key: 'partner_outreach_strategist', label: 'Partner Outreach',      schedule: 'Mo-Fr 12:30 UTC',      source: 'agent_logs', agentName: 'partner_outreach_strategist' },

  // Agents inferred from secondary tables
  { key: 'news_agent',               label: 'News Agent',                 schedule: 'Mo-Fr 05:45 UTC',      source: 'industry_news' },
  { key: 'linkedin_post_generator',  label: 'LinkedIn Post Generator',    schedule: 'Mo-Fr 06:30 UTC',      source: 'linkedin_post_drafts' },

  // Agents with no log source - schedule only
  { key: 'daily_backup',             label: 'Nightly Backup',             schedule: 'Taeglich 02:00 UTC',   source: 'none' },
  { key: 'error_sentinel',           label: 'Error Sentinel',             schedule: '5x taeglich Mo-Fr',    source: 'none' },
  { key: 'apollo_sync',              label: 'Apollo Sync',                schedule: '3x taeglich',          source: 'none' },
  { key: 'brevo_stats_sync',         label: 'Brevo Stats Sync',           schedule: 'Mo-Fr 19:00 UTC',      source: 'none' },
  { key: 'linkedin_response_check',  label: 'LinkedIn Response Check',    schedule: 'Mo-Fr 08:00 UTC',      source: 'none' },
  { key: 'health_monitor',           label: 'Health Monitor',             schedule: '3x taeglich Mo-Fr',    source: 'none' },
];

type LogRow = {
  agent_name: string;
  status: string;
  details: Record<string, any> | null;
  created_at: string;
};

export async function GET() {
  try {
    // Latest agent_logs entry per agent (only for the 7 that write logs)
    const loggedAgentNames = AGENTS
      .filter(a => a.source === 'agent_logs' && a.agentName)
      .map(a => a.agentName!) as string[];

    const latestLogs = (await sql`
      SELECT DISTINCT ON (agent_name)
        agent_name,
        status,
        details,
        created_at
      FROM agent_logs
      WHERE agent_name = ANY(${loggedAgentNames})
      ORDER BY agent_name, created_at DESC
    `) as unknown as LogRow[];

    const logMap: Record<string, LogRow> = {};
    latestLogs.forEach(row => { logMap[row.agent_name] = row; });

    // 24h error count per agent_name (any agent, including the 7 we track)
    const errorCounts = (await sql`
      SELECT agent_name, COUNT(*) as error_count
      FROM agent_logs
      WHERE status = 'error'
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY agent_name
    `) as unknown as Array<{ agent_name: string; error_count: string | number }>;

    const errorMap: Record<string, number> = {};
    errorCounts.forEach(row => { errorMap[row.agent_name] = Number(row.error_count); });

    // Secondary signals for agents that do not use writeEndLog
    const todayDate = new Date().toISOString().split('T')[0];

    let newsCountToday = 0;
    let newsLatestAt: string | null = null;
    try {
      const rows = (await sql`
        SELECT COUNT(*)::int AS cnt, MAX(created_at) AS latest
        FROM industry_news
        WHERE news_date = ${todayDate}
      `) as unknown as Array<{ cnt: number; latest: string | null }>;
      newsCountToday = Number(rows[0]?.cnt || 0);
      newsLatestAt = rows[0]?.latest || null;
    } catch { /* table may not exist yet */ }

    let draftsCountToday = 0;
    let draftsLatestAt: string | null = null;
    try {
      const rows = (await sql`
        SELECT COUNT(*)::int AS cnt, MAX(created_at) AS latest
        FROM linkedin_post_drafts
        WHERE draft_date = ${todayDate}
      `) as unknown as Array<{ cnt: number; latest: string | null }>;
      draftsCountToday = Number(rows[0]?.cnt || 0);
      draftsLatestAt = rows[0]?.latest || null;
    } catch { /* table may not exist yet */ }

    // Build response rows
    const result = AGENTS.map(agent => {
      let status: 'ok' | 'error' | 'warning' | 'unknown' = 'unknown';
      let lastRun: string | null = null;
      let errorMessage: string | null = null;
      let summary: string | null = null;
      let extraInfo: string | null = null;
      let errors24h = 0;

      if (agent.source === 'agent_logs' && agent.agentName) {
        const log = logMap[agent.agentName];
        errors24h = errorMap[agent.agentName] || 0;

        if (!log) {
          status = 'unknown';
        } else {
          lastRun = log.created_at;
          if (log.status === 'error' || errors24h > 0) {
            status = 'error';
          } else if (log.status === 'completed' || log.status === 'partial') {
            status = 'ok';
          } else {
            status = 'warning';
          }
          // Extract optional error / summary from details JSONB
          if (log.details && typeof log.details === 'object') {
            if (typeof log.details.error === 'string') {
              errorMessage = log.details.error.substring(0, 300);
            }
            if (typeof log.details.summary === 'string') {
              summary = log.details.summary.substring(0, 200);
            } else if (typeof log.details.iterations === 'number') {
              summary = `${log.details.iterations} Iterationen`;
            }
          }
        }
      } else if (agent.source === 'industry_news') {
        lastRun = newsLatestAt;
        if (newsCountToday > 0) {
          status = 'ok';
          extraInfo = `Heute: ${newsCountToday} Artikel`;
        } else {
          status = 'unknown';
        }
      } else if (agent.source === 'linkedin_post_drafts') {
        lastRun = draftsLatestAt;
        if (draftsCountToday > 0) {
          status = 'ok';
          extraInfo = `Heute: ${draftsCountToday} Entwuerfe`;
        } else {
          status = 'unknown';
        }
      } else {
        // source === 'none' - no data available, only show schedule
        status = 'unknown';
      }

      return {
        key: agent.key,
        label: agent.label,
        schedule: agent.schedule,
        status,
        lastRun,
        lastStatus: status,
        errorMessage,
        summary,
        errors24h,
        extraInfo,
      };
    });

    // Overall system status
    const hasErrors = result.some(r => r.status === 'error');
    const hasUnknown = result.some(r => r.status === 'unknown');
    const overallStatus: 'ok' | 'error' | 'warning' = hasErrors
      ? 'error'
      : hasUnknown
        ? 'warning'
        : 'ok';

    return NextResponse.json({
      overallStatus,
      agents: result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[system-health] GET error:', error);
    return NextResponse.json({ error: 'Failed to load system health' }, { status: 500 });
  }
}
