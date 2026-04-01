/**
 * Partner Supervisor — Standalone Cron Route
 *
 * QA/review agent for Partner Researcher decisions.
 * Validates partner scores, tier assignments, and partner model fit.
 *
 * Schedule: 10:00 daily
 * maxIterations: 20
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  return `Du bist der Partner Supervisor von PraxisNova AI - Qualitaetskontrolle fuer Partner-Researcher-Entscheidungen.

ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash.

AUFGABE: Überprüfe die Entscheidungen des Partner Researchers der letzten 24 Stunden.

VERFUEGBARE TOOLS:
- read_decisions {hours: 24, agent: "partner_researcher"} - Partner-Entscheidungen laden
- web_fetch {url} - Website laden fuer Spot-Checks
- upsert_partner {company, tier, ...} - Partner-Daten korrigieren
- write_decision {run_id, agent_name, decision_type, ...} - Review-Entscheidung schreiben
- write_log {run_id, agent_name, action, status} - Log schreiben
- read_partners {limit, tier} - Bestehende Partner laden

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: {run_id, agent_name:"partner_supervisor", action:"started", status:"started"}
3. read_decisions {hours: 24, agent: "partner_researcher"} - alle qualify_partner Entscheidungen
4. Fuer jede Entscheidung pruefen:
   a. Score-Dimensionen validieren:
      - Kundenstamm-Fit (35%): Arbeitet Partner wirklich mit Bau/Handwerk/Immobilien KMU?
      - Digitale Reife (30%): Hat Partner konkurrierende KI-Angebote?
      - Reichweite (20%): Ist die geschaetzte KMU-Reichweite realistisch?
      - Oekonomie (15%): Passt Revenue-Sharing-Modell?
   b. Tier-Zuweisung: Score 8-10 -> Tier 1, 6-7 -> Tier 2, 4-5 -> Tier 3
   c. Partner-Modell-Empfehlung plausibel? (white_label/co_branding/referral/integration/barter)
5. Spot-Check: 2-3 Tier-1-Partner per web_fetch verifizieren
   - Pruefen: Gibt es ein echtes Partnerprogramm?
   - Pruefen: Konkurrierendes KI-Angebot?
   - Pruefen: Kundenstamm wirklich in Zielbranche?
6. Bei Korrektur:
   a. upsert_partner mit korrigiertem Tier
   b. write_decision: {decision_type: "review_partner", reasoning: "Korrektur: [Grund]"}
7. Feedback an Partner Researcher (wenn Muster erkennbar):
   write_decision: {decision_type: "feedback_to_partner_researcher", reasoning: "[Feedback]"}
8. write_log: completed

REGELN:
- Besonders auf konkurrierende KI-Angebote achten (-> sofort disqualifizieren)
- Tier-1-Partner immer spot-checken
- Partner-Modell muss zum Geschaeftsmodell des Partners passen
- Alle Reasoning auf Deutsch`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  console.log('[partner-supervisor] Starte als eigenstaendiger Agent (max 20 Iterationen, 300s Budget)...');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte die Qualitaetskontrolle: Lade alle Partner-Researcher-Entscheidungen der letzten 24h und pruefe sie.',
      20,
      'partner-supervisor',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Partner Supervisor', `Max Iterationen (${result.iterations}/20)`, elapsed);
    }

    return NextResponse.json({
      ok: true, agent: 'partner_supervisor', model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed, ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[partner-supervisor] Fehler:', err);
    await sendErrorNotification('Partner Supervisor', String(err), elapsed);
    return NextResponse.json({ ok: false, agent: 'partner_supervisor', error: String(err), elapsed_seconds: elapsed }, { status: 500 });
  }
}
