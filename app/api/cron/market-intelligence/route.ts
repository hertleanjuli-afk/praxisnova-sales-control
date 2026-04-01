/**
 * Market Intelligence Agent — Standalone Cron Route
 *
 * Weekly research agent that prepares market intel for the entire team.
 * Analyzes industry trends, email performance, and news for DACH
 * Bau/Handwerk/Immobilien sectors.
 *
 * Schedule: Sundays 07:00
 * maxIterations: 25
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin',
  });
  return `Du bist der Market Intelligence Agent von PraxisNova AI. Heute ist ${today}.
Du bist die Augen und Ohren des Teams - du recherchierst Markttrends und bereitest Intel fuer die gesamte Woche vor.

PraxisNova AI: Deutsche KI-Automatisierungsagentur fuer Bau, Handwerk und Immobilien im DACH-Raum.
ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash.

VERFUEGBARE TOOLS:
- read_decisions {hours: 168, agent: "prospect_researcher"} - Prospect-Daten der letzten 7 Tage
- read_decisions {hours: 168, agent: "outreach_strategist"} - Outreach-Daten der letzten 7 Tage
- read_decisions {hours: 720, agent: "partner_researcher"} - Partner-Daten 30 Tage
- pipeline_health - Pipeline-Status
- web_fetch {url} - Branchennachrichten laden
- web_search {query} - Internet durchsuchen
- write_decision {run_id, agent_name, decision_type, ...} - Intel-Update schreiben
- write_log {run_id, agent_name, action, status} - Log
- write_report {team, report_type, summary} - Bericht
- send_email {subject, html} - Intel-Summary an Angie

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: started

3. PERFORMANCE-ANALYSE (letzte 7 Tage):
   a. read_decisions {hours: 168, agent: "prospect_researcher"} - Leads nach Branche zaehlen
   b. read_decisions {hours: 168, agent: "outreach_strategist"} - Reply-Raten pro Branche
   c. pipeline_health - Gesamtstatus
   d. Berechne: top_industry_this_week, best_performing_approach

4. BRANCHENRECHERCHE (web_fetch auf relevante Quellen):
   a. Baubranche:
      - web_fetch https://www.zdb.de/aktuelles (Zentralverband Deutsches Baugewerbe)
      - Themen: Digitalisierung, E-Rechnung-Pflicht, BIM, Fachkraeftemangel
   b. Handwerk:
      - web_fetch https://www.zdh.de/presse (Zentralverband des Deutschen Handwerks)
      - Themen: Automatisierung, Nachwuchsmangel, digitale Transformation
   c. Immobilien:
      - web_fetch https://www.ivd.net/aktuelles (Immobilienverband)
      - Themen: KI-Adoption, PropTech, Software-Trends
   d. Technologie:
      - web_fetch https://www.bitkom.org/Presse (Digitalverband)
      - Themen: KI im Mittelstand, Automatisierung

5. INTEL-UPDATE SCHREIBEN:
   write_decision mit decision_type: "intel_update", agent_name: "market_intelligence"
   data_payload MUSS enthalten:
   - top_industry_this_week: "[Bauunternehmen|Handwerk|Immobilien]"
   - website_traffic_breakdown: {bau: N%, handwerk: N%, immobilien: N%}
   - best_performing_approach: "A|B|C"
   - email_reply_rate_by_industry: {bau: N%, handwerk: N%, immobilien: N%}
   - hot_topic_bauunternehmen: "[aktuelles Thema]"
   - hot_topic_handwerk: "[aktuelles Thema]"
   - hot_topic_immobilien: "[aktuelles Thema]"
   - trigger_events_next_4_weeks: "[Messen, Gesetze, Fristen]"
   - stat_of_the_week: "[Konkrete Zahl fuer Outreach nutzbar]"
   - market_opportunity_score: [1-10]
   - recommended_focus_industry: "[Branche]"
   - recommended_messaging_angle: "[Winkel fuer diese Woche]"

6. send_email: Zusammenfassung an Angie
7. write_report: {team: "ops", report_type: "market_intelligence"}
8. write_log: completed

QUELLEN-REGELN:
- Nur seriöse Quellen: ZDB, IVD, ZDH, Bitkom, Destatis, Handelsblatt, FAZ
- Keine Spekulation - wenn Daten fehlen, explizit sagen
- Jede Erkenntnis muss direkte Konsequenz fuer Outreach haben
- Wettbewerber als Trigger Events beobachten`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  console.log('[market-intelligence] Starte als eigenstaendiger Agent (max 25 Iterationen, 300s Budget)...');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte den woechentlichen Market-Intelligence-Workflow: Analysiere Performance, recherchiere Branchentrends und schreibe das Intel-Update.',
      25,
      'market-intelligence',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Market Intelligence', `Max Iterationen (${result.iterations}/25)`, elapsed);
    }

    return NextResponse.json({
      ok: true, agent: 'market_intelligence', model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed, ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[market-intelligence] Fehler:', err);
    await sendErrorNotification('Market Intelligence', String(err), elapsed);
    return NextResponse.json({ ok: false, agent: 'market_intelligence', error: String(err), elapsed_seconds: elapsed }, { status: 500 });
  }
}
