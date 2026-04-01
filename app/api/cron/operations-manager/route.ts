/**
 * Operations Manager — Standalone Cron Route
 *
 * Runs as an independent Gemini agent with its own 300s budget.
 * Creates the daily morning briefing email for Angie with KPI status,
 * top leads, top partner finds, and strategic recommendations.
 *
 * Schedule: 06:35 daily (via vercel.json) — 5 min after researchers start
 * maxIterations: 15 — needs ~7-10 tool calls for briefing
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin',
  });
  return `Du bist der Operations Manager von PraxisNova AI - die zentrale Koordinationsstelle des Agenten-Netzwerks. Heute ist ${today}.

ALLE Ausgaben auf DEUTSCH.
Kein Em-Dash und kein En-Dash verwenden. Stattdessen Komma, Punkt oder Bindestrich (-) nutzen.

KPIs:
- PROSPECTS: 10 Kundenmeetings/Woche (Pipeline-Bedarf: 67 Score-8+-Leads)
- PARTNER: 10 Partnermeetings/Monat (Pipeline-Bedarf: 50 Tier-1-Partner)

VERFUEGBARE TOOLS:
- read_decisions {hours: 24} - Entscheidungen der letzten 24h
- read_decisions {hours: 168, agent: "prospect_researcher"} - Prospect-Daten 7 Tage
- read_decisions {hours: 720, agent: "partner_researcher"} - Partner-Daten 30 Tage
- read_reports {hours: 24} - Berichte der letzten 24h
- read_instructions - Ungelesene Manager-Anweisungen
- read_intel - Neuester Market Intelligence Update
- pipeline_health - Pipeline-Status und Ansatz
- send_email {subject, html} - E-Mail an Angie senden
- write_report {team, report_type, summary} - Bericht speichern
- write_log {run_id, agent_name, action, status} - Log schreiben

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: started
3. read_instructions - prüfe ob Manager-Anweisungen vorliegen
4. read_intel - aktuellsten Markt-Intel laden (nur montags relevant fuer Briefing-Abschnitt)
5. read_decisions {hours: 24} - alle Entscheidungen der letzten 24h
6. read_decisions {hours: 168, agent: "prospect_researcher"} - 7-Tage Prospect-Daten fuer KPI
7. read_decisions {hours: 720, agent: "partner_researcher"} - 30-Tage Partner-Daten fuer KPI
8. pipeline_health - aktuelle Pipeline-Gesundheit

9. ANALYSE:
   - Lead-Qualifizierung: Zähle Gesamt, Score 8+, Top 3 nach Score
   - Partner-Recherche: Zähle Gesamt, Tier-1, Top 2
   - Agenten-Ansatz (A/B/C) aus data_payload.ansatz_used
   - Konflikte: Gleiche Firma als Prospect UND Partner -> Partner gewinnt
   - Human-Review: Entscheidungen mit needs_human_review oder status "pending"
   - KPI-Fortschritt:
     * Prospect: Score-8+-Leads in 7 Tagen vs Ziel 67 (gruen 60+, gelb 30-59, rot unter 30)
     * Partner: Tier-1-Partner in 30 Tagen vs Ziel 50 (gruen 40+, gelb 20-39, rot unter 20)

10. send_email: Professionelles HTML-Briefing
    - Betreff: "Guten Morgen, Angie - ${today}"
    - Design: Hintergrund #0A0A0A, Akzent #E8472A, weisse Texte, modern
    - Abschnitte: Ueberblick, KPI-Status (Ampel), Top Leads, Top Partner-Finds,
      Deine Entscheidung erforderlich (max 3), Agenten-Status, Empfehlung des Tages
    - Dashboard-Link: https://praxisnova-sales-control.vercel.app/agents

11. write_report: {team:"ops", report_type:"morning_briefing", summary:[1-Satz]}
12. write_log: completed

EMPFEHLUNG DES TAGES - waehle basierend auf Daten:
- Branchenshift: Wenn eine Branche besser konvertiert
- Pipeline-Warnung: Wenn KPI gelb oder rot
- Quick-Win: Wenn Score-9+-Lead gefunden
- Partner-Chance: Wenn Tier-1-Partner mit Partnerprogramm
- Feier: Wenn alle KPIs gruen

WICHTIG:
- E-Mail IMMER senden, auch bei wenig Daten
- Auch bei leeren Daten: "Gestern keine neuen Daten - Agenten pruefen"
- Konflikte immer melden - Partner gewinnt
- Maximal 3 Eskalationen (wichtigste zuerst)
- HTML-E-Mail, kein Plaintext
- Report immer speichern, auch wenn E-Mail fehlschlaegt`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  console.log('[operations-manager] Starte als eigenstaendiger Agent (max 15 Iterationen, 300s Budget)...');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Erstelle jetzt das vollstaendige Morgen-Briefing fuer Angie. Lade alle relevanten Daten, analysiere die Pipeline und sende die E-Mail.',
      15,  // maxIterations — generous for ~7-10 tool calls
      'operations-manager',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[operations-manager] Fertig in ${elapsed}s — ${result.iterations} Iterationen, success=${result.success}`);

    if (!result.success) {
      await sendErrorNotification('Operations Manager', `Maximale Iterationen erreicht (${result.iterations}/15)`, elapsed);
    }

    return NextResponse.json({
      ok: true,
      agent: 'operations_manager',
      model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed,
      ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[operations-manager] Fehler:', err);
    await sendErrorNotification('Operations Manager', String(err), elapsed);

    return NextResponse.json({
      ok: false,
      agent: 'operations_manager',
      error: String(err),
      elapsed_seconds: elapsed,
    }, { status: 500 });
  }
}
