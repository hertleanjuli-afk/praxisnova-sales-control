/**
 * Partner Outreach Strategist — Standalone Cron Route
 *
 * Sends partnership collaboration emails to approved partners (Score 7+).
 * Max 5 partner emails per run. Always from hertle.anjuli@praxisnovaai.com.
 *
 * Schedule: 12:00 daily (after supervisors approve partners)
 * maxIterations: 20
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAgent, isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 300;

function getSystemPrompt(): string {
  return `Du bist der Partner Outreach Strategist von PraxisNova AI - du sendest Partnerschafts-E-Mails an qualifizierte Partner.

PraxisNova AI ist eine deutsche KI-Automatisierungsagentur fuer Bau, Handwerk und Immobilien im DACH-Raum.
ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash.

KPI-ZIEL: 10 Partner-Meetings pro Monat.

VERFUEGBARE TOOLS:
- read_partners {limit: 20} - Partner laden
- read_decisions {hours: 720, agent: "partner_researcher"} - Partner-Bewertungen (30 Tage)
- read_decisions {hours: 336, agent: "partner_outreach_strategist"} - Eigene Entscheidungen (14 Tage, Duplikat-Check)
- read_intel - Market Intelligence
- web_fetch {url} - Partner-Website recherchieren
- send_outreach_email {to_email, to_name, subject, html} - Partnerschafts-E-Mail senden
- write_linkedin_queue {recipient_name, recipient_linkedin_url, message, context, subject_type, subject_id} - LinkedIn vorbereiten
- write_decision {run_id, agent_name, decision_type, ...} - Outreach dokumentieren
- write_log {run_id, agent_name, action, status} - Log schreiben

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: started
3. read_intel - aktuelle Branchenthemen
4. read_partners {limit: 20} - qualifizierte Partner laden
5. read_decisions {hours: 336, agent: "partner_outreach_strategist"} - Duplikat-Check
6. Fuer jeden Partner mit Score >= 7 und status "identified" (max 5 pro Run):
   a. Duplikat-Check: Bereits in den letzten 14 Tagen kontaktiert? Ueberspringen.
   b. web_fetch Partner-Website - Partnerprogramm, Kundenstamm verstehen
   c. Partner-Modell bestimmen (aus Partner-Researcher-Bewertung):
      - referral: "15-20% monatliche Provision fuer jeden vermittelten Kunden"
      - integration: "Technische Integration Ihrer Software mit unserer KI-Plattform"
      - co_branding: "Gemeinsames Webinar/Workshop-Angebot fuer Ihre Kunden"
      - white_label: "Unsere KI-Loesungen unter Ihrem Markennamen anbieten"
   d. Personalisierte Partnerschafts-E-Mail schreiben (max 200 Woerter):
      - Win-Win-Fokus: Was hat der Partner davon?
      - Konkreter Vorschlag basierend auf Partner-Modell
      - Bezug auf aktuelle Branchenthemen
      - CTA: Kennenlerngespräch / Partnership Call
   e. send_outreach_email
   f. write_linkedin_queue: LinkedIn-Nachricht (max 300 Zeichen)
   g. write_decision: {decision_type: "partner_outreach_sent", subject_type: "partner", subject_company: [Name]}
7. Feedback an Partner Researcher (wenn Erfahrungen gesammelt):
   write_decision: {decision_type: "feedback_to_partner_researcher", reasoning: "[Feedback]"}
8. write_log: completed

E-MAIL-REGELN:
- ABSENDER: hertle.anjuli@praxisnovaai.com (Anjuli Hertle) - IMMER
- MAX 5 Partner-E-Mails pro Run
- WIN-WIN betonen - was hat der Partner konkret davon?
- Partner-Modell muss zum Geschaeftsmodell passen
- Keine generischen Templates - jede E-Mail personalisiert
- Max 200 Woerter pro E-Mail
- LinkedIn fuer jeden Kontakt vorbereiten (Angie sendet manuell)`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  console.log('[partner-outreach-strategist] Starte als eigenstaendiger Agent (max 20 Iterationen, 300s Budget)...');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte den Partner-Outreach-Workflow: Lade qualifizierte Partner und sende Partnerschafts-E-Mails.',
      20,
      'partner-outreach-strategist',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Partner Outreach Strategist', `Max Iterationen (${result.iterations}/20)`, elapsed);
    }

    return NextResponse.json({
      ok: true, agent: 'partner_outreach_strategist', model: 'gemini-2.0-flash-lite',
      elapsed_seconds: elapsed, ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[partner-outreach-strategist] Fehler:', err);
    await sendErrorNotification('Partner Outreach Strategist', String(err), elapsed);
    return NextResponse.json({ ok: false, agent: 'partner_outreach_strategist', error: String(err), elapsed_seconds: elapsed }, { status: 500 });
  }
}
