/**
 * Agent System API — unified endpoint for all 9 agents to read/write
 * Secured with AGENT_SECRET (same value as CRON_SECRET is fine)
 *
 * GET  /api/agent?action=leads-to-research   → unresearched leads for Prospect Researcher
 * GET  /api/agent?action=decisions&hours=24  → recent decisions for supervisors / Ops Manager
 * GET  /api/agent?action=reports&hours=24    → recent reports for Ops Manager
 * GET  /api/agent?action=partner-targets     → partner targets list for Partner Researcher
 * GET  /api/agent?action=engagement          → engagement data for Follow-Up Tracker
 * POST /api/agent  { type: 'decision' | 'log' | 'report', payload }
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-agent-secret');
  return secret === process.env.CRON_SECRET;
}

// ── GET ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const hours = parseInt(searchParams.get('hours') ?? '24', 10);

  try {
    switch (action) {

      // Leads for Prospect Researcher — pipeline-stage-aware selection
      // Priority: 'Neu' first, then 'Wieder aufnehmen' (only if re_engage_after passed)
      // Excludes leads already in outreach, cooldown, won, lost, or not qualified
      case 'leads-to-research': {
        const limit = parseInt(searchParams.get('limit') ?? '20', 10);
        const rows = await sql`
          SELECT
            l.id, l.email, l.first_name, l.last_name, l.company,
            l.title, l.industry, l.employee_count, l.linkedin_url,
            l.website_url, l.source, l.created_at,
            l.sequence_status, l.sequence_type,
            l.agent_score, l.agent_scored_at,
            l.pipeline_stage, l.pipeline_notes, l.re_engage_after
          FROM leads l
          WHERE l.permanently_blocked = FALSE
            AND l.sequence_status NOT IN ('unsubscribed', 'bounced', 'active', 'cooldown')
            AND COALESCE(l.pipeline_stage, 'Neu') IN ('Neu', 'Wieder aufnehmen')
            AND (l.pipeline_stage != 'Wieder aufnehmen' OR l.re_engage_after IS NULL OR l.re_engage_after <= NOW())
            AND NOT EXISTS (
              SELECT 1 FROM agent_decisions ad
              WHERE ad.subject_email = l.email
                AND ad.agent_name = 'prospect_researcher'
                AND ad.created_at > NOW() - INTERVAL '7 days'
            )
          ORDER BY (COALESCE(l.pipeline_stage, 'Neu') = 'Neu') DESC, l.created_at DESC
          LIMIT ${limit}
        `;
        return NextResponse.json({ leads: rows, count: rows.length });
      }

      // Safe enrollment check — agent calls this BEFORE enrolling any lead into a sequence
      // Returns whether the lead is safe to enroll (not already in workflow or agent sequence)
      case 'can-enroll': {
        const email = searchParams.get('email');
        if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
        const rows = await sql`
          SELECT id, email, sequence_status, sequence_type, enrolled_at
          FROM leads WHERE email = ${email} LIMIT 1
        `;
        if (rows.length === 0) return NextResponse.json({ can_enroll: true, reason: 'lead not found — will be created' });
        const lead = rows[0];
        const blocked = ['active', 'cooldown', 'unsubscribed', 'bounced'];
        if (blocked.includes(lead.sequence_status)) {
          return NextResponse.json({
            can_enroll: false,
            reason: `Lead is already in status '${lead.sequence_status}' (sequence: ${lead.sequence_type ?? 'unknown'})`,
            lead,
          });
        }
        return NextResponse.json({ can_enroll: true, reason: 'lead is available for enrollment', lead });
      }

      // Recent agent decisions (for supervisors and Ops Manager)
      case 'decisions': {
        const agentName = searchParams.get('agent');
        const rows = agentName
          ? await sql`
              SELECT * FROM agent_decisions
              WHERE created_at >= NOW() - INTERVAL '1 hour' * ${hours}
                AND agent_name = ${agentName}
              ORDER BY created_at DESC
              LIMIT 200
            `
          : await sql`
              SELECT * FROM agent_decisions
              WHERE created_at >= NOW() - INTERVAL '1 hour' * ${hours}
              ORDER BY created_at DESC
              LIMIT 200
            `;
        return NextResponse.json({ decisions: rows, count: rows.length });
      }

      // Recent agent reports (for Ops Manager)
      case 'reports': {
        const rows = await sql`
          SELECT * FROM agent_reports
          WHERE created_at >= NOW() - INTERVAL '1 hour' * ${hours}
          ORDER BY created_at DESC
          LIMIT 50
        `;
        return NextResponse.json({ reports: rows, count: rows.length });
      }

      // Partner targets for Partner Researcher
      case 'partner-targets': {
        // Returns existing partners table entries that haven't been fully researched
        const rows = await sql`
          SELECT p.*, ad.score AS last_score, ad.created_at AS last_researched_at
          FROM partners p
          LEFT JOIN agent_decisions ad ON (
            ad.subject_company = p.company
            AND ad.agent_name = 'partner_researcher'
            AND ad.created_at = (
              SELECT MAX(created_at) FROM agent_decisions
              WHERE subject_company = p.company AND agent_name = 'partner_researcher'
            )
          )
          WHERE p.status NOT IN ('rejected', 'archived')
          ORDER BY p.tier ASC, p.created_at DESC
          LIMIT 15
        `;
        return NextResponse.json({ partners: rows, count: rows.length });
      }

      // Email engagement data for Follow-Up Tracker
      case 'engagement': {
        const rows = await sql`
          SELECT
            l.id, l.email, l.first_name, l.last_name, l.company,
            l.title, l.sequence_status, l.sequence_type, l.sequence_step,
            l.enrolled_at,
            COUNT(CASE WHEN ee.event_type = 'opened' THEN 1 END) AS open_count,
            COUNT(CASE WHEN ee.event_type = 'clicked' THEN 1 END) AS click_count,
            MAX(CASE WHEN ee.event_type IN ('opened','clicked') THEN ee.created_at END) AS last_engaged_at,
            bool_or(ee.event_type = 'replied') AS has_replied
          FROM leads l
          LEFT JOIN email_events ee ON ee.lead_id = l.id
          WHERE l.sequence_status = 'active'
          GROUP BY l.id
          HAVING COUNT(CASE WHEN ee.event_type = 'opened' THEN 1 END) >= 1
          ORDER BY last_engaged_at DESC
          LIMIT 50
        `;
        return NextResponse.json({ leads: rows, count: rows.length });
      }

      case 'instructions': {
        const rows = await sql`
          SELECT * FROM manager_instructions
          WHERE status = 'unread'
          ORDER BY created_at DESC
          LIMIT 20
        `;
        return NextResponse.json({ instructions: rows, count: rows.length });
      }

      case 'linkedin-queue': {
        const status = searchParams.get('status') ?? 'ready';
        const rows = await sql`
          SELECT lq.*,
            l.first_name AS lead_first_name, l.last_name AS lead_last_name, l.company AS lead_company,
            p.company AS partner_company, p.contact_name AS partner_contact_name
          FROM linkedin_queue lq
          LEFT JOIN leads l ON l.id = lq.lead_id
          LEFT JOIN partners p ON p.id = lq.partner_id
          WHERE lq.status = ${status}
          ORDER BY lq.created_at DESC
          LIMIT 100
        `;
        return NextResponse.json({ queue: rows, count: rows.length });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[agent GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, payload } = body as {
      type: 'decision' | 'log' | 'report' | 'partner' | 'linkedin_message' | 'instruction_response' | 'update_pipeline_stage';
      payload: Record<string, unknown>;
    };

    switch (type) {

      // Write a scored agent decision
      case 'decision': {
        const rows = await sql`
          INSERT INTO agent_decisions (
            run_id, agent_name, decision_type, subject_type,
            subject_id, subject_email, subject_company,
            score, reasoning, data_payload, status
          ) VALUES (
            ${payload.run_id as string},
            ${payload.agent_name as string},
            ${payload.decision_type as string},
            ${payload.subject_type as string},
            ${payload.subject_id as number ?? null},
            ${payload.subject_email as string ?? null},
            ${payload.subject_company as string ?? null},
            ${payload.score as number ?? null},
            ${payload.reasoning as string ?? null},
            ${JSON.stringify(payload.data_payload ?? {})},
            ${payload.status as string ?? 'pending'}
          )
          RETURNING id
        `;
        // If Outreach Strategist sends a personalized email, mark the lead
        if (payload.agent_name === 'outreach_strategist' && payload.decision_type === 'send_email' && payload.subject_email) {
          await sql`UPDATE leads SET outreach_source = 'agent_personalized' WHERE email = ${payload.subject_email as string}`;
        }
        // If agent prepares a LinkedIn message, mark the lead
        if (payload.decision_type === 'prepare_linkedin' && payload.subject_email) {
          await sql`UPDATE leads SET linkedin_source = 'agent_prepared' WHERE email = ${payload.subject_email as string}`;
        }

        return NextResponse.json({ ok: true, id: rows[0].id });
      }

      // Write an operational log entry
      case 'log': {
        await sql`
          INSERT INTO agent_logs (run_id, agent_name, action, status, details)
          VALUES (
            ${payload.run_id as string},
            ${payload.agent_name as string},
            ${payload.action as string},
            ${payload.status as string},
            ${JSON.stringify(payload.details ?? {})}
          )
        `;
        return NextResponse.json({ ok: true });
      }

      // Write a supervisor or Ops Manager report
      case 'report': {
        const rows = await sql`
          INSERT INTO agent_reports (team, report_type, summary, metrics, recommendations, flagged_items)
          VALUES (
            ${payload.team as string},
            ${payload.report_type as string},
            ${payload.summary as string ?? null},
            ${JSON.stringify(payload.metrics ?? {})},
            ${payload.recommendations as string ?? null},
            ${JSON.stringify(payload.flagged_items ?? [])}
          )
          RETURNING id
        `;
        return NextResponse.json({ ok: true, id: rows[0].id });
      }

      // Upsert a partner into the partners table
      case 'partner': {
        const rows = await sql`
          INSERT INTO partners (company, website, email, contact_name, contact_title, linkedin_url, category, tier)
          VALUES (
            ${payload.company as string},
            ${payload.website as string ?? null},
            ${payload.email as string ?? null},
            ${payload.contact_name as string ?? null},
            ${payload.contact_title as string ?? null},
            ${payload.linkedin_url as string ?? null},
            ${payload.category as string ?? null},
            ${payload.tier as number ?? 3}
          )
          ON CONFLICT (company) DO UPDATE SET
            website = COALESCE(EXCLUDED.website, partners.website),
            email = COALESCE(EXCLUDED.email, partners.email),
            contact_name = COALESCE(EXCLUDED.contact_name, partners.contact_name),
            contact_title = COALESCE(EXCLUDED.contact_title, partners.contact_title),
            linkedin_url = COALESCE(EXCLUDED.linkedin_url, partners.linkedin_url),
            category = COALESCE(EXCLUDED.category, partners.category),
            tier = COALESCE(EXCLUDED.tier, partners.tier)
          RETURNING id
        `;
        return NextResponse.json({ ok: true, id: rows[0].id });
      }

      case 'instruction_response': {
        await sql`
          UPDATE manager_instructions
          SET status = 'actioned', response = ${payload.response as string}, read_at = NOW()
          WHERE id = ${payload.instruction_id as number}
        `;
        return NextResponse.json({ ok: true });
      }

      case 'linkedin_message': {
        const rows = await sql`
          INSERT INTO linkedin_queue (lead_id, partner_id, source, connection_message, follow_up_message)
          VALUES (
            ${payload.lead_id as number ?? null},
            ${payload.partner_id as number ?? null},
            ${payload.source as string ?? 'agent'},
            ${payload.connection_message as string},
            ${payload.follow_up_message as string ?? null}
          )
          RETURNING id
        `;
        return NextResponse.json({ ok: true, id: rows[0].id });
      }

      // Update lead pipeline stage (used by Prospect Researcher after scoring)
      case 'update_pipeline_stage': {
        await sql`
          UPDATE leads SET
            pipeline_stage = ${payload.stage as string},
            pipeline_stage_updated_at = NOW(),
            pipeline_notes = ${payload.notes as string ?? null},
            re_engage_after = ${payload.re_engage_after as string ?? null}
          WHERE id = ${payload.lead_id as number}
        `;
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[agent POST]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
