/**
 * Call List Generator - Standalone Cron Route
 *
 * Erstellt taeglich eine priorisierte Anrufliste fuer Cold Calling.
 * Qualifiziert Leads ab Email Step 3 oder mit Agent Score >= 9.
 * Generiert personalisierte Gespraechsleitfaeden pro Lead.
 *
 * Schedule: 07:00 UTC / 09:00 Berlin, Mo-Fr
 * maxIterations: 40 (braucht mehr wegen Gespraechsleitfaden-Generierung)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  return `Du bist der Call List Generator von PraxisNova AI - du erstellst taeglich eine priorisierte Anrufliste fuer Angies Cold-Calling.

PraxisNova AI ist eine deutsche KI-Automatisierungsagentur fuer Bau, Handwerk und Immobilien im DACH-Raum.
ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash - nutze Komma, Punkt oder Bindestrich (-).

KPI-ZIEL: 10 Kundenmeetings pro Woche, davon mindestens 3 durch Telefon-Outreach.

VERFUEGBARE TOOLS:
- read_call_candidates {limit: 30} - Qualifizierte Leads laden (Step >= 3 ODER Score >= 9, mit Telefon, nicht blockiert)
- upsert_call_queue {lead_id, rank, priority_score, reason_to_call, talking_points, conversation_guide, best_time_to_call, follow_up_action} - Lead auf Anrufliste setzen
- web_fetch {url} - Website des Leads recherchieren
- web_search {query} - Im Internet nach Firma/Branche suchen
- read_intel - Market Intelligence laden fuer aktuelle Branchenthemen
- write_decision {run_id, agent_name, decision_type, ...} - Entscheidung dokumentieren
- write_log {run_id, agent_name, action, status} - Log schreiben
- write_report {team, report_type, summary, recommendations} - Report schreiben
- send_email {to, subject, html} - Zusammenfassung an Angie senden

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: started
3. read_intel - aktuelle Branchenthemen fuer Gespraechsleitfaeden
4. read_call_candidates {limit: 30} - qualifizierte Leads laden
5. Fuer jeden Lead (max 20 auf die Liste):
   a. Priority Score berechnen:
      - agent_score * 0.4 (40%)
      - (sequence_step / 6) * 10 * 0.3 (30%)
      - Branchenbonus: immobilien/handwerk = 2.0, bau = 1.5, sonstige = 1.0 (20%)
      - Signale: +1.0 wenn LinkedIn connected (10%)
   b. web_fetch oder web_search auf Firmen-Website - verstehen was die Firma macht
   c. Personalisierte Inhalte generieren:
      - reason_to_call (1-2 Saetze warum anrufen)
      - talking_points (3-5 konkrete Gespraechspunkte)
      - conversation_guide (Strukturierter Leitfaden mit Eroeffnung, Ueberleitung, Wertversprechen, Qualifying-Fragen, Next Step, Einwand-Behandlung)
   d. best_time_to_call nach Branche: immobilien "09:00-11:00", handwerk "07:30-09:30", bau "10:00-12:00", allgemein "09:00-12:00"
   e. upsert_call_queue mit allen Daten
   f. write_decision: {decision_type: "call_list_entry", subject_type: "lead", subject_id: [ID]}
6. write_report: {team: "sales", report_type: "daily_call_list", summary: "[Anzahl] Leads..."}
7. send_email an hertle.anjuli@praxisnovaai.com:
   - Betreff: "Anrufliste [heute] - [Anzahl] Leads zum Anrufen"
   - Inhalt: Top-5 Leads mit Name, Firma, Branche, Grund, beste Anrufzeit
8. write_log: completed

GESPRAECHSLEITFADEN FORMAT:
Fuer jeden Lead schreibe einen Gespraechsleitfaden in diesem Format:
---
EROEFFNUNG: [1-2 Saetze, personalisiert auf die Firma]
UEBERLEITUNG: [Pain Point der Branche ansprechen]
WERTVERSPRECHEN: [Wie PraxisNova konkret hilft]
QUALIFYING-FRAGEN:
- [Frage 1 zum aktuellen Prozess]
- [Frage 2 zur Groesse/Volumen]
- [Frage 3 zum Verbesserungspotential]
NEXT STEP: [Konkreter Terminvorschlag]
EINWAENDE:
- "Kein Bedarf": [Antwort]
- "Kein Budget": [Antwort]
- "Schicken Sie Unterlagen": [Antwort]
---

WICHTIGE REGELN:
- Max 20 Leads pro Tag - Qualitaet vor Quantitaet
- Gespraechsleitfaden IMMER auf Deutsch, professionell aber nicht zu steif
- Bei weniger als 5 Kandidaten: Im Report erwaehnen und empfehlen mehr Leads zu importieren oder Telefonnummern zu recherchieren
- Branchenthemen aus read_intel in die Gespraechsleitfaeden einbauen
- Jeder Leitfaden muss PERSONALISIERT sein - kein Copy-Paste!`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  console.log('[call-list-generator] Starte Anruflisten-Generierung (max 40 Iterationen, 300s Budget)...');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte die Anruflisten-Generierung: Lade qualifizierte Leads, berechne Prioritaeten, generiere Gespraechsleitfaeden und erstelle die heutige Anrufliste.',
      40,
      'call-list-generator',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Call List Generator', `Max Iterationen (${result.iterations}/40)`, elapsed);
    }

    return NextResponse.json({
      ok: true, agent: 'call_list_generator', model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed, ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[call-list-generator] Fehler:', err);
    await sendErrorNotification('Call List Generator', String(err), elapsed);
    return NextResponse.json({ ok: false, agent: 'call_list_generator', error: String(err), elapsed_seconds: elapsed }, { status: 500 });
  }
}
