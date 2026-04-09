/**
 * Sales Supervisor — Standalone Cron Route
 *
 * QA/review agent for Prospect Researcher decisions.
 * Spot-checks high-score leads, validates scoring, corrects if >2 points off.
 *
 * Schedule: 10:00 daily (2 hours after researchers)
 * maxIterations: 20
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runAgent,
  isAuthorized,
  sendErrorNotification,
  writeStartLog,
  writeEndLog,
  isAlreadyRunning,
} from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  return `Du bist der Sales Supervisor von PraxisNova AI - Qualitaetskontrolle fuer Prospect-Researcher-Entscheidungen.

ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash.

AUFGABE: Überprüfe die Entscheidungen des Prospect Researchers der letzten 24 Stunden.

VERFUEGBARE TOOLS:
- read_decisions {hours: 24, agent: "prospect_researcher"} - Prospect-Entscheidungen laden
- web_fetch {url} - Website laden fuer Spot-Checks
- update_lead {id, pipeline_stage, agent_score, pipeline_notes} - Score korrigieren
- write_decision {run_id, agent_name, decision_type, ...} - Eigene Review-Entscheidung schreiben
- write_log {run_id, agent_name, action, status} - Log schreiben
- pipeline_health - Pipeline-Status pruefen

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: {run_id, agent_name:"sales_supervisor", action:"started", status:"started"}
3. read_decisions {hours: 24, agent: "prospect_researcher"} - alle qualify_lead Entscheidungen laden
4. Fuer jede Entscheidung pruefen:
   a. Ist der Score plausibel? (Branchen-Fit, Automatisierungsbedarf, Entscheider-Zugang, Timing)
   b. Stimmt die Pipeline-Stage-Zuweisung? (8-10 -> In Outreach, 5-7 -> Nurture, 1-4 -> Nicht qualifiziert)
   c. Ist die Begruendung nachvollziehbar?
5. Spot-Check: 2-3 Score-8+-Leads per web_fetch verifizieren
6. Bei Abweichung >2 Punkte:
   a. update_lead mit korrigiertem Score und Stage
   b. write_decision: {decision_type: "review_lead", reasoning: "Korrektur: [Grund]"}
7. Feedback an Prospect Researcher (wenn Muster erkennbar):
   write_decision: {decision_type: "feedback_to_prospect_researcher", reasoning: "[Feedback auf Deutsch]"}
8. write_log: {action:"completed", status:"completed", details: {reviewed: N, corrected: N, spot_checked: N}}

REGELN:
- Nur korrigieren wenn Abweichung >2 Punkte
- Score 8+ Leads immer spot-checken (web_fetch Website)
- Bei systematischen Fehlern: Feedback-Decision schreiben
- Bei Ansatz C Leads: besonders kritisch pruefen (kein Score-Inflation)
- Alle Reasoning auf Deutsch`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  // Concurrent-run guard - skip if another instance is already running
  if (await isAlreadyRunning('sales_supervisor', 8)) {
    console.log('[sales-supervisor] Bereits aktiv - ueberspringe diesen Lauf.');
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_running' });
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`[sales-supervisor] Starte run ${runId} (max 20 Iterationen, 300s Budget)...`);

  // Write started log BEFORE calling Gemini so the run is always visible in the dashboard
  await writeStartLog(runId, 'sales_supervisor');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte die Qualitaetskontrolle: Lade alle Prospect-Researcher-Entscheidungen der letzten 24h und pruefe sie.',
      20,
      'sales-supervisor',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Sales Supervisor', `Max Iterationen (${result.iterations}/20)`, elapsed);
    }

    await writeEndLog(runId, 'sales_supervisor', result.success ? 'completed' : 'partial', {
      iterations: result.iterations,
    });

    return NextResponse.json({
      ok: true, agent: 'sales_supervisor', model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed, ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[sales-supervisor] Fehler:', err);
    await writeEndLog(runId, 'sales_supervisor', 'error', { error: String(err) });
    await sendErrorNotification('Sales Supervisor', String(err), elapsed);
    return NextResponse.json({ ok: false, agent: 'sales_supervisor', error: String(err), elapsed_seconds: elapsed }, { status: 500 });
  }
}
