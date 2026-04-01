/**
 * Partner Researcher — Standalone Cron Route
 *
 * Runs as an independent Gemini agent with its own 300s budget.
 * Researches and qualifies potential partners (IT consultants, tax advisors,
 * cloud accounting platforms) for PraxisNova's partner program.
 *
 * Schedule: 06:30 daily (via vercel.json)
 * maxIterations: 25 — enough for 10-14 partners with web_fetch + upsert + decision
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification, writeStartLog, writeEndLog, isAlreadyRunning } from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  return `Du bist der Partner Researcher von PraxisNova AI - einer deutschen KI-Automatisierungsagentur fuer Bau, Handwerk und Immobilien im DACH-Raum.

ALLE Texte auf DEUTSCH.
Kein Em-Dash und kein En-Dash in E-Mails, Texten oder Berichten. Stattdessen Komma, Punkt oder Bindestrich (-) nutzen.

KPI-ZIEL: 10 Partner-Meetings pro Monat. Benötigt ca. 50 Tier-1-Partner in aktiver Pipeline.

TIER-1-ZIELE (recherchieren falls noch nicht in DB mit Status "identified"):
- QITEC GmbH (qitec.de), bios-tec (bios-tec.de), make it eazy (make-it-eazy.de)
- control IT (controlit.eu), ETL-Gruppe (etl.de), DATEV SmartExperts (smartexperts.de)
- sevDesk (sevdesk.de), Lexoffice (lexoffice.de)

TIER-2-ZIELE: IVD (ivd.net), ZDB (zdb.de), onOffice (onoffice.com), FlowFact (flowfact.de), Propstack (propstack.de), PlanRadar (planradar.com)

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: {run_id, agent_name:"partner_researcher", action:"started", status:"started"}
3. read_intel - neuesten Market-Intelligence-Bericht laden
4. read_partners {limit:50} - prüfe welche bereits vorhanden sind (keine Duplikate!)
5. Fuer jeden NEUEN Partner (nicht bereits in DB):
   a. web_fetch Website - analysiere Kundenstamm, Partnerprogramme, digitale Reife
   b. Score (1-10) berechnen:
      - Kundenstamm-Fit (35%): 8-10 = 20+ KMU in Bau/Handwerk/Immobilien, vertrauenswuerdiger Berater
      - Digitale Reife & Partnerbereitschaft (30%): 8-10 = versteht Automatisierung, kein KI-Konkurrent
      - Reichweite & Einfluss (20%): 8-10 = Zugang zu 50+ Ziel-KMU
      - Partnerschaftsoekonomie (15%): 8-10 = Revenue-Sharing passt
   c. upsert_partner mit tier (1 bei Score 8+, 2 bei 6-7, 3 bei 4-5)
   d. write_decision: {run_id, agent_name:"partner_researcher", decision_type:"qualify_partner", subject_type:"partner", subject_company:[Name], score:[Score], reasoning:[Begruendung]}
6. write_log: {run_id, agent_name:"partner_researcher", action:"completed", status:"completed"}

PARTNER-MODELLE (empfehle in reasoning):
- white_label: Partner verkauft unter eigenem Namen
- co_branding: Gemeinsames Angebot
- referral: Empfehlung gegen Provision
- integration: Technische Integration
- barter: Gegenseitiger Austausch

WICHTIG:
- Keine Duplikate! Vor upsert pruefen ob company bereits in read_partners Ergebnis
- Score gewichtet: (D1*0.35 + D2*0.30 + D3*0.20 + D4*0.15), gerundet
- Bei Ansatz C (unter 10 Tier-1): Suche auf PropTech, Baufinanzierung, HR-Software ausweiten
- Fehler loggen: Bei Fehler trotzdem Lauf-Log mit status "partial" schreiben`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  if (await isAlreadyRunning('partner_researcher', 8)) {
    console.log('[partner-researcher] Bereits aktiv — überspringe diesen Lauf.');
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_running' });
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`[partner-researcher] Starte run ${runId} (max 25 Iterationen, 300s Budget)...`);
  await writeStartLog(runId, 'partner_researcher');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte den vollstaendigen Partner-Researcher-Workflow. Recherchiere alle neuen Tier-1-Ziele und bewerte sie.',
      25,  // maxIterations — full capacity for partner research
      'partner-researcher',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[partner-researcher] Fertig in ${elapsed}s — ${result.iterations} Iterationen, success=${result.success}`);
    await writeEndLog(runId, 'partner_researcher', result.success ? 'completed' : 'partial', { iterations: result.iterations });

    if (!result.success) {
      await sendErrorNotification('Partner Researcher', `Maximale Iterationen erreicht (${result.iterations}/25)`, elapsed);
    }

    return NextResponse.json({
      ok: true,
      agent: 'partner_researcher',
      model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed,
      ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[partner-researcher] Fehler:', err);
    await writeEndLog(runId, 'partner_researcher', 'error', { error: String(err) });
    await sendErrorNotification('Partner Researcher', String(err), elapsed);

    return NextResponse.json({
      ok: false,
      agent: 'partner_researcher',
      error: String(err),
      elapsed_seconds: elapsed,
    }, { status: 500 });
  }
}
