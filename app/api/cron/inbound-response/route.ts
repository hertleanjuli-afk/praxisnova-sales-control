/**
 * Inbound Response Agent - Standalone Cron Route
 *
 * Responds to new website form submissions. Scores click-path intent,
 * researches company, sends personalized response.
 *
 * Schedule: 08:00, 11:00, 14:00, 17:00 Berlin time (4x daily).
 * Time window: 6 Stunden (360 min) - muss groesser sein als der Abstand
 * zwischen zwei Cron-Runs, sonst werden Leads uebersprungen.
 *
 * maxIterations: 15
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 120; // Shorter budget — must complete quickly for 15min cycles

function getSystemPrompt(): string {
  return `Du bist der Inbound Response Agent von PraxisNova AI - du antwortest schnell auf neue Website-Formular-Einsendungen.

PraxisNova AI: Deutsche KI-Automatisierungsagentur fuer Bau, Handwerk und Immobilien im DACH-Raum.
ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash.

ZIEL: Antwort innerhalb von 15 Minuten nach Formular-Einsendung. Geschwindigkeit vor Perfektion!

VERFUEGBARE TOOLS:
- read_inbound_leads {minutes: 360, limit: 5} - Neue Inbound-Leads der letzten 6 Stunden laden
- read_intel - Market Intelligence (hot_topics, stat_of_the_week)
- web_fetch {url} - Firmen-Website recherchieren
- send_outreach_email {to_email, to_name, subject, html} - Personalisierte Antwort senden
- update_lead {id, pipeline_stage, pipeline_notes} - Lead-Status aktualisieren
- write_decision {run_id, agent_name, decision_type, ...} - Entscheidung dokumentieren
- write_log {run_id, agent_name, action, status} - Log

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: started
3. read_inbound_leads {minutes: 360, limit: 5} - Neue Leads der letzten 6 Stunden
4. Wenn keine neuen Leads: write_log completed, fertig.
5. read_intel - aktuelle Themen laden (falls vorhanden)
6. Fuer jeden neuen Lead (max 5, aelteste zuerst):
   a. Intent-Score berechnen (1-10):
      - /preise oder /pricing Besuch: +4
      - /ki-potenzialrechner Besuch: +4
      - /ki-quickcheck oder /produkte: +3
      - 3+ Seiten besucht: +2
      - Nur Homepage: +1
      - UTM-Source LinkedIn/Google: +1
      - Button-Clicks: +1
   b. web_fetch auf Lead-Website/Domain - Branche, Groesse, Kontaktperson
   c. Antwort-Variante waehlen:
      - HIGH (Score 7-10): Direkter Meeting-Vorschlag, Calendly-Link, persoenlich
      - MEDIUM (Score 4-6): Wertorientierte Frage, Mehrwert zeigen
      - LOW (Score 1-3): Bildungsorientiert, Link zum KI-Potenzialrechner
   d. send_outreach_email: Personalisierte Antwort (kurz, max 100 Woerter)
   e. update_lead: {pipeline_stage: "In Outreach", pipeline_notes: "Inbound-Response gesendet, Intent-Score: [X]"}
   f. write_decision: {decision_type: "inbound_response", subject_type: "lead", subject_id: [ID], score: [Intent-Score]}
7. write_log: completed

E-MAIL-REGELN:
- ABSENDER: hertle.anjuli@praxisnovaai.com (Anjuli Hertle)
- SCHNELL: Kurze E-Mails, max 100 Woerter
- PERSONALISIERT: Bezug auf Firma/Branche
- HIGH-Intent: "Ich habe gesehen, dass Sie sich unsere Preise angeschaut haben. Lassen Sie uns kurz sprechen..."
- MEDIUM-Intent: "Danke fuer Ihr Interesse! Was ist aktuell Ihre groesste Herausforderung bei..."
- LOW-Intent: "Kennen Sie schon unseren kostenlosen KI-Potenzialrechner? In 2 Minuten erfahren Sie..."
- DSGVO: Nur an Inbound-Leads (haben sich selbst gemeldet)
- outreach_source auf "agent_inbound_response" setzen
- NIEMALS Leads kontaktieren die bereits outreach_source haben`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  console.log('[inbound-response] Starte als eigenstaendiger Agent (max 15 Iterationen, 120s Budget)...');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Pruefe auf neue Inbound-Leads der letzten 6 Stunden (read_inbound_leads mit minutes: 360) und antworte personalisiert. WICHTIG: 6 Stunden, nicht 30 Minuten, weil der Cron nur alle 3 Stunden laeuft und wir sonst Leads verpassen.',
      15,
      'inbound-response',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Inbound Response Agent', `Max Iterationen (${result.iterations}/15)`, elapsed);
    }

    return NextResponse.json({
      ok: true, agent: 'inbound_response', model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed, ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[inbound-response] Fehler:', err);
    await sendErrorNotification('Inbound Response Agent', String(err), elapsed);
    return NextResponse.json({ ok: false, agent: 'inbound_response', error: String(err), elapsed_seconds: elapsed }, { status: 500 });
  }
}
