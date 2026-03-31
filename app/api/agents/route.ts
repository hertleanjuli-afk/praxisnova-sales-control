import { NextResponse } from 'next/server';
import sql from '@/lib/db';

const AGENTS = [
  { id: 'prospect_researcher', name: 'Prospect Researcher', emoji: '🔍', schedule: '08:00 täglich', role: 'Leads qualifizieren und scoren' },
  { id: 'partner_researcher', name: 'Partner Researcher', emoji: '🤝', schedule: '08:00 täglich', role: 'Partner recherchieren und bewerten' },
  { id: 'operations_manager', name: 'Operations Manager', emoji: '📊', schedule: '08:00 täglich', role: 'Morgen-Briefing und KPI-Tracking' },
  { id: 'sales_supervisor', name: 'Sales Supervisor', emoji: '✅', schedule: '10:00 täglich', role: 'Prospect-Entscheidungen prüfen' },
  { id: 'partner_supervisor', name: 'Partner Supervisor', emoji: '🔎', schedule: '10:00 täglich', role: 'Partner-Entscheidungen prüfen' },
  { id: 'outreach_strategist', name: 'Outreach Strategist', emoji: '✉️', schedule: '12:00 täglich', role: 'Personalisierte Lead-E-Mails' },
  { id: 'partner_outreach_strategist', name: 'Partner Outreach', emoji: '📨', schedule: '12:00 täglich', role: 'Partnerschafts-Anfragen' },
  { id: 'inbound_response_agent', name: 'Inbound Response', emoji: '⚡', schedule: 'Webhook (sofort)', role: 'Reagiert auf neue Website-Leads' },
  { id: 'market_intelligence', name: 'Market Intelligence', emoji: '🌍', schedule: 'Sonntag 08:00', role: 'Wöchentliche Branchenanalyse' },
];

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function getStatus(lastActive: string | null): 'active' | 'idle' | 'never_run' {
  if (!lastActive) return 'never_run';
  const diff = Date.now() - new Date(lastActive).getTime();
  return diff <= FOUR_HOURS_MS ? 'active' : 'idle';
}

export async function GET() {
  try {
    // Run all per-agent queries in parallel
    const agentResults = await Promise.all(
      AGENTS.map(async (agent) => {
        const [lastActivityRows, countRows, trailRows] = await Promise.all([
          sql`SELECT created_at FROM agent_decisions WHERE agent_name = ${agent.id} ORDER BY created_at DESC LIMIT 1`,
          sql`SELECT COUNT(*) FROM agent_decisions WHERE agent_name = ${agent.id} AND created_at >= CURRENT_DATE`,
          sql`SELECT id, decision_type, subject_company, subject_email, score, reasoning, status, created_at, data_payload FROM agent_decisions WHERE agent_name = ${agent.id} ORDER BY created_at DESC LIMIT 20`,
        ]);

        const lastActive = lastActivityRows.length > 0 ? lastActivityRows[0].created_at : null;

        return {
          ...agent,
          last_active: lastActive,
          decisions_today: parseInt(countRows[0]?.count ?? '0', 10),
          status: getStatus(lastActive),
          thinking_trail: trailRows,
        };
      })
    );

    // Today's queue across all agents
    const queue = await sql`
      SELECT id, agent_name, decision_type, subject_company, score, status, created_at
      FROM agent_decisions
      WHERE created_at >= CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ agents: agentResults, queue });
  } catch (error) {
    console.error('[API /api/agents] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load agent data' },
      { status: 500 }
    );
  }
}
