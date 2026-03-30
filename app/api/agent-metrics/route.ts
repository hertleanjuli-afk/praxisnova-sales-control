import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    // Prospect Researcher stats (last 7 days)
    const prospectWeek = await sql`
      SELECT COUNT(*) as count, COALESCE(AVG(score), 0) as avg_score,
        COUNT(CASE WHEN score >= 8 THEN 1 END) as high_priority
      FROM agent_decisions
      WHERE agent_name = 'prospect_researcher' AND decision_type = 'qualify_lead'
        AND created_at >= NOW() - INTERVAL '7 days'
    `;
    const prospectTotal = await sql`
      SELECT COUNT(*) as count FROM agent_decisions
      WHERE agent_name = 'prospect_researcher' AND decision_type = 'qualify_lead'
    `;

    // Partner Researcher stats (last 30 days)
    const partnerMonth = await sql`
      SELECT COUNT(*) as count,
        COUNT(CASE WHEN score >= 7 THEN 1 END) as tier1_count
      FROM agent_decisions
      WHERE agent_name = 'partner_researcher' AND decision_type = 'qualify_partner'
        AND created_at >= NOW() - INTERVAL '30 days'
    `;
    const partnerTotal = await sql`
      SELECT COUNT(*) as count FROM agent_decisions
      WHERE agent_name = 'partner_researcher' AND decision_type = 'qualify_partner'
    `;

    // Latest approach used
    const prospectApproach = await sql`
      SELECT data_payload->>'ansatz_used' as ansatz FROM agent_decisions
      WHERE agent_name = 'prospect_researcher' AND data_payload->>'ansatz_used' IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `;
    const partnerApproach = await sql`
      SELECT data_payload->>'ansatz_used' as ansatz FROM agent_decisions
      WHERE agent_name = 'partner_researcher' AND data_payload->>'ansatz_used' IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `;

    // LinkedIn queue
    const linkedinReady = await sql`SELECT COUNT(*) as count FROM linkedin_queue WHERE status = 'ready'`;
    const linkedinTotal = await sql`SELECT COUNT(*) as count FROM linkedin_queue`;

    // Email stats (automation)
    const emailsWeek = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'sent' AND created_at >= NOW() - INTERVAL '7 days'
    `;
    const emailsTotal = await sql`SELECT COUNT(*) as count FROM email_events WHERE event_type = 'sent'`;
    const opensWeek = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'opened' AND created_at >= NOW() - INTERVAL '7 days'
    `;
    const repliesWeek = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'replied' AND created_at >= NOW() - INTERVAL '7 days'
    `;
    const activeSequences = await sql`SELECT COUNT(*) as count FROM leads WHERE sequence_status = 'active'`;
    const pipelineLeads = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE sequence_status NOT IN ('unsubscribed', 'bounced') AND permanently_blocked = FALSE
    `;
    const linkedinManual = await sql`
      SELECT COUNT(*) as count FROM linkedin_connections
    `;

    // Re-engagement pool
    const reEngageTotal = await sql`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN signal_email_reply = TRUE OR signal_linkedin_interest = TRUE OR signal_company_news IS NOT NULL THEN 1 END) as with_signal
      FROM leads WHERE pipeline_stage = 'Wieder aufnehmen'
    `;

    // KPI calculations
    const prospectPipeline = parseInt(prospectWeek[0]?.high_priority ?? '0', 10);
    const partnerPipeline = parseInt(partnerMonth[0]?.tier1_count ?? '0', 10);
    const prospectKpi = prospectPipeline >= 60 ? 'on_track' : prospectPipeline >= 30 ? 'below' : 'critical';
    const partnerKpi = partnerPipeline >= 40 ? 'on_track' : partnerPipeline >= 20 ? 'below' : 'critical';

    const sentWeek = parseInt(emailsWeek[0]?.count ?? '0', 10);
    const openRate = sentWeek > 0 ? (parseInt(opensWeek[0]?.count ?? '0', 10) / sentWeek * 100) : 0;
    const replyRate = sentWeek > 0 ? (parseInt(repliesWeek[0]?.count ?? '0', 10) / sentWeek * 100) : 0;

    return NextResponse.json({
      automation: {
        emails_sent_week: sentWeek,
        emails_sent_total: parseInt(emailsTotal[0]?.count ?? '0', 10),
        open_rate: Math.round(openRate * 10) / 10,
        reply_rate: Math.round(replyRate * 10) / 10,
        active_sequences: parseInt(activeSequences[0]?.count ?? '0', 10),
        pipeline_leads: parseInt(pipelineLeads[0]?.count ?? '0', 10),
        linkedin_manual: parseInt(linkedinManual[0]?.count ?? '0', 10),
      },
      agents: {
        prospect_qualified_week: parseInt(prospectWeek[0]?.count ?? '0', 10),
        prospect_qualified_total: parseInt(prospectTotal[0]?.count ?? '0', 10),
        prospect_avg_score: Math.round(parseFloat(prospectWeek[0]?.avg_score ?? '0') * 10) / 10,
        prospect_high_priority: prospectPipeline,
        prospect_approach: prospectApproach[0]?.ansatz ?? '\u2014',
        partner_qualified_month: parseInt(partnerMonth[0]?.count ?? '0', 10),
        partner_qualified_total: parseInt(partnerTotal[0]?.count ?? '0', 10),
        partner_tier1: partnerPipeline,
        partner_approach: partnerApproach[0]?.ansatz ?? '\u2014',
        linkedin_prepared: parseInt(linkedinTotal[0]?.count ?? '0', 10),
        linkedin_ready: parseInt(linkedinReady[0]?.count ?? '0', 10),
        prospect_kpi: prospectKpi,
        partner_kpi: partnerKpi,
        re_engage_total: parseInt(reEngageTotal[0]?.total ?? '0', 10),
        re_engage_with_signal: parseInt(reEngageTotal[0]?.with_signal ?? '0', 10),
      },
    });
  } catch (error) {
    console.error('[agent-metrics]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
