/**
 * Partner Researcher Cron Trigger
 *
 * Manual/API trigger for the Partner Researcher agent.
 * Not registered in vercel.json (Hobby plan: max 2 cron jobs).
 * Primary scheduling via Claude Cowork remote trigger (daily 08:00 Berlin).
 *
 * Usage:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://praxisnova-sales-control.vercel.app/api/cron/partner-researcher
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = crypto.randomUUID();

  try {
    // ── Phase 1: Pipeline-Gesundheit prüfen ───────────────────────────────
    const pipelineDecisions = await sql`
      SELECT COUNT(*) AS qualified_count
      FROM agent_decisions
      WHERE agent_name = 'partner_researcher'
        AND score >= 7
        AND created_at >= NOW() - INTERVAL '30 days'
    `;
    const qualifiedCount = parseInt(pipelineDecisions[0]?.qualified_count ?? '0', 10);

    // Prüfe ob Meetings in den letzten 30 Tagen stattfanden
    const meetingDecisions = await sql`
      SELECT COUNT(*) AS meeting_count
      FROM agent_decisions
      WHERE agent_name = 'partner_outreach_strategist'
        AND decision_type = 'meeting_booked'
        AND created_at >= NOW() - INTERVAL '30 days'
    `;
    const meetingCount = parseInt(meetingDecisions[0]?.meeting_count ?? '0', 10);

    // Ansatz bestimmen
    let ansatz: 'A' | 'B' | 'C';
    if (qualifiedCount < 10 || meetingCount === 0) {
      ansatz = 'C';
    } else if (qualifiedCount < 30) {
      ansatz = 'B';
    } else {
      ansatz = 'A';
    }

    // ── Phase 2: Feedback vom Outreach-Strategist lesen ───────────────────
    const feedback = await sql`
      SELECT * FROM agent_decisions
      WHERE agent_name = 'partner_outreach_strategist'
        AND decision_type = 'feedback_to_partner_researcher'
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // ── Phase 3: Bestehende Partner laden ─────────────────────────────────
    const existingPartners = await sql`
      SELECT company, website, tier, status
      FROM partners
      WHERE status NOT IN ('rejected', 'archived')
      ORDER BY tier ASC, created_at DESC
    `;

    // ── Log schreiben ─────────────────────────────────────────────────────
    await sql`
      INSERT INTO agent_logs (run_id, agent_name, action, status, details)
      VALUES (
        ${runId},
        'partner_researcher',
        'cron_trigger',
        'success',
        ${JSON.stringify({
          ansatz_used: ansatz,
          pipeline_qualified: qualifiedCount,
          meetings_30d: meetingCount,
          existing_partners: existingPartners.length,
          feedback_items: feedback.length,
          message: ansatz === 'C'
            ? 'Partner-Pipeline kritisch — Ansatz C aktiviert'
            : ansatz === 'B'
              ? 'Pipeline schwach — Ansatz B aktiviert, Fokus auf Tier-1-Erweiterung'
              : 'Pipeline gesund — Standardrecherche',
        })}
      )
    `;

    // Bei Ansatz C: KPI-Alert-Bericht schreiben
    if (ansatz === 'C') {
      await sql`
        INSERT INTO agent_reports (team, report_type, summary, metrics, recommendations, flagged_items)
        VALUES (
          'partner',
          'kpi_alert',
          ${'Partner-Pipeline kritisch — Angies Eingreifen empfohlen. Qualifizierte Tier-1-Partner: ' + qualifiedCount + ', Meetings (30 Tage): ' + meetingCount},
          ${JSON.stringify({ qualified_tier1: qualifiedCount, meetings_30d: meetingCount, ansatz: 'C' })},
          ${'Empfehlung: Zusätzliche Partnerquellen erschließen (PropTech, Baufinanzierung, HR-Software). Manuelle Überprüfung aller neuen Partner-Bewertungen erforderlich.'},
          ${JSON.stringify([])}
        )
      `;
    }

    return NextResponse.json({
      ok: true,
      run_id: runId,
      ansatz,
      pipeline: {
        qualified_tier1: qualifiedCount,
        meetings_30d: meetingCount,
        existing_partners: existingPartners.length,
      },
      feedback_items: feedback.length,
      message: `Partner Researcher Trigger erfolgreich — Ansatz ${ansatz} aktiviert`,
    });
  } catch (error) {
    console.error('[partner-researcher cron]', error);

    // Fehler trotzdem loggen
    try {
      await sql`
        INSERT INTO agent_logs (run_id, agent_name, action, status, details)
        VALUES (
          ${runId},
          'partner_researcher',
          'cron_trigger',
          'error',
          ${JSON.stringify({ error: String(error) })}
        )
      `;
    } catch {
      // Log-Fehler still ignorieren
    }

    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
