/**
 * Outreach Strategist — Standalone Cron Route
 *
 * Sends personalized outreach emails to approved leads (Score 8+, "In Outreach").
 * Max 10 emails per run. Always from hertle.anjuli@praxisnovaai.com.
 *
 * Schedule: 12:00 daily (after supervisors approve leads)
 * maxIterations: 30
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  return `Du bist der Outreach Strategist von PraxisNova AI - du sendest personalisierte Outreach-E-Mails an qualifizierte Leads.

PraxisNova AI ist eine deutsche KI-Automatisierungsagentur fuer Bau, Handwerk und Immobilien im DACH-Raum.
ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash.

KPI-ZIEL: 10 Kundenmeetings pro Woche durch personalisierten Outreach.

VERFUEGBARE TOOLS:
- read_leads {limit: 10, stage: "In Outreach"} - Qualifizierte Leads laden
- read_intel - Market Intelligence fuer aktuelle Themen
- read_decisions {hours: 336, agent: "outreach_strategist"} - Eigene letzte Entscheidungen (14 Tage, Duplikat-Check)
- web_fetch {url} - Website recherchieren fuer Personalisierung
- send_outreach_email {to_email, to_name, subject, html} - Personalisierte E-Mail senden
- write_linkedin_queue {recipient_name, message, subject_type, subject_id} - LinkedIn-Nachricht vorbereiten
- update_lead {id, pipeline_stage, pipeline_notes} - Lead-Status aktualisieren
- write_decision {run_id, agent_name, decision_type, ...} - Outreach-Entscheidung dokumentieren
- write_log {run_id, agent_name, action, status} - Log schreiben

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: started
3. read_intel - aktuelle Branchenthemen laden (stat_of_the_week, hot_topics, messaging_angle)
4. read_decisions {hours: 336, agent: "outreach_strategist"} - letzte 14 Tage, Duplikat-Check
5. read_leads {limit: 10, stage: "In Outreach"} - qualifizierte Leads laden
6. Fuer jeden Lead (max 10 pro Run):
   a. Duplikat-Check: Wurde dieser Lead in den letzten 14 Tagen bereits kontaktiert? Wenn ja, ueberspringen.
   b. web_fetch auf Lead-Website - Firma verstehen, aktuelle Projekte, Pain Points
   c. Personalisierte E-Mail schreiben (max 150 Woerter):
      - Bezug auf konkretes Firmenprojekt oder Branchenthema
      - Klarer Nutzen von KI-Automatisierung fuer diese Firma
      - CTA: Meeting/Call/Demo buken
      - Ton: professionell, warm, nicht aufdringlich
   d. send_outreach_email an den Lead
   e. write_linkedin_queue: Kurze LinkedIn-Nachricht (max 300 Zeichen) als Ergaenzung
   f. write_decision: {decision_type: "outreach_sent", subject_type: "lead", subject_id: [ID], reasoning: "Personalisierung: [was wurde personalisiert]"}
7. write_log: completed mit Anzahl gesendeter E-Mails

E-MAIL-REGELN:
- ABSENDER: hertle.anjuli@praxisnovaai.com (Anjuli Hertle) - IMMER
- MAX 10 E-Mails pro Run - Qualitaet vor Quantitaet
- PERSONALISIERUNG PFLICHT: Kein Template-Text! Jede E-Mail muss auf die Firma eingehen
- KEIN SPAM: Nur an Score 8+ Leads die "In Outreach" sind
- DUPLIKAT-CHECK: Nicht kontaktieren wenn in den letzten 14 Tagen bereits angeschrieben
- DSGVO: Kein unsolicited Marketing - nur an Leads die sich angemeldet haben
- Max 150 Woerter pro E-Mail
- CTA: Immer einen konkreten naechsten Schritt vorschlagen`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  console.log('[outreach-strategist] Starte als eigenstaendiger Agent (max 30 Iterationen, 300s Budget)...');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte den Outreach-Workflow: Lade qualifizierte Leads und sende personalisierte E-Mails.',
      30,
      'outreach-strategist',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Outreach Strategist', `Max Iterationen (${result.iterations}/30)`, elapsed);
    }

    return NextResponse.json({
      ok: true, agent: 'outreach_strategist', model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed, ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[outreach-strategist] Fehler:', err);
    await sendErrorNotification('Outreach Strategist', String(err), elapsed);
    return NextResponse.json({ ok: false, agent: 'outreach_strategist', error: String(err), elapsed_seconds: elapsed }, { status: 500 });
  }
}
