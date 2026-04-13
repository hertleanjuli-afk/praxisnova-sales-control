/**
 * Follow-Up Tracker - Cron Route (2026-04-13)
 *
 * Identifiziert Leads mit aktiver Sequenz die seit > 2 Tagen keine
 * Email erhalten haben. Nutzt Gemini um den naechsten Schritt zu
 * entscheiden: Follow-Up senden, Nurture verschieben, oder Sequenz
 * stoppen.
 *
 * Schedule: 09:00 UTC Mo-Fr (nach Prospect Researcher, vor Outreach)
 * maxIterations: 30 - leichtgewichtiger Agent, hauptsaechlich DB-Queries
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
  return `Du bist der Follow-Up Tracker von PraxisNova AI. Deine Aufgabe: Leads identifizieren deren aktive Sequenz ins Stocken geraten ist und die naechsten Schritte entscheiden.

ALLE Texte auf DEUTSCH. Kein Em-Dash oder En-Dash. Stattdessen Komma, Punkt oder Bindestrich (-) nutzen.

VERFUEGBARE TOOLS:
- read_leads {limit: 30, stage: "In Outreach"} - Leads in aktiver Outreach laden
- read_leads {limit: 30, stage: "Nurture"} - Leads in Nurture laden
- read_decisions {hours: 72, agent: "follow_up_tracker"} - Eigene letzte Entscheidungen (Duplikat-Check)
- read_decisions {hours: 48, agent: "outreach_strategist"} - Kuerzlich kontaktierte Leads
- update_lead {id, pipeline_stage, pipeline_notes} - Lead aktualisieren
- write_decision {run_id, agent_name, decision_type, subject_type, subject_id, subject_email, subject_company, score, reasoning, status} - Entscheidung dokumentieren
- write_log {run_id, agent_name, action, status} - Log schreiben
- pipeline_health - Pipeline-Uebersicht laden

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log: started
3. pipeline_health - Gesamtuebersicht laden
4. read_leads {limit: 30, stage: "In Outreach"} - Aktive Outreach-Leads laden
5. read_decisions {hours: 48, agent: "outreach_strategist"} - Kuerzlich vom Outreach kontaktierte Leads laden
6. Fuer jeden Lead in "In Outreach":
   a. PRUEFEN: Wurde der Lead in den letzten 48h vom Outreach Strategist kontaktiert?
      - Wenn JA: ueberspringen (alles OK)
      - Wenn NEIN: Follow-Up noetig
   b. Bewerte die Situation:
      - Wie viele Steps hat der Lead schon durchlaufen (sequence_step)?
      - Hat der Lead Email-Opens/Clicks (signal_email_reply, pipeline_notes)?
      - Wie alt ist der Lead (enrolled_at/created_at)?
   c. ENTSCHEIDE:
      - sequence_step < 3 und keine Engagement-Signale: Belassen, Outreach wird nachfassen
      - sequence_step >= 3 und keine Signale: -> "Nurture" verschieben (update_lead)
      - sequence_step >= 5: -> "Wieder aufnehmen" verschieben (Sequenz erschoepft)
      - Engagement-Signale vorhanden (Opens, Clicks): Belassen, Prioritaet fuer Outreach erhoehen (pipeline_notes)
   d. write_decision: Entscheidung dokumentieren
7. write_log: completed mit Zusammenfassung

REGELN:
- Max 10 Leads pro Lauf bearbeiten
- NIE Leads in 'Booked', 'Lost', 'Blocked', 'Wieder aufnehmen' beruehren
- 'Wieder aufnehmen' ist GESCHUETZT
- Bei Unsicherheit: lieber keine Aenderung als falsches Verschieben
- Kein Outreach senden - das ist Aufgabe des Outreach Strategist
- Nur Pipeline-Stages und Notes aktualisieren`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY && !process.env.Gemini_API_Key_Sales_Agent) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  if (await isAlreadyRunning('follow_up_tracker', 8)) {
    console.log('[follow-up-tracker] Bereits aktiv - ueberspringe diesen Lauf.');
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_running' });
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`[follow-up-tracker] Starte run ${runId}...`);

  await writeStartLog(runId, 'follow_up_tracker');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte den Follow-Up-Check: Lade Leads in "In Outreach", pruefe wer seit mehr als 48h nicht kontaktiert wurde, und entscheide die naechsten Schritte. Max 10 Leads bearbeiten.',
      30,
      'follow-up-tracker',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      await sendErrorNotification('Follow-Up Tracker', `Max Iterationen (${result.iterations}/30)`, elapsed);
    }

    await writeEndLog(runId, 'follow_up_tracker', result.success ? 'completed' : 'partial', {
      iterations: result.iterations,
    });

    return NextResponse.json({
      ok: true,
      agent: 'follow_up_tracker',
      elapsed_seconds: elapsed,
      ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[follow-up-tracker] Fehler:', err);
    await writeEndLog(runId, 'follow_up_tracker', 'error', { error: String(err) });
    await sendErrorNotification('Follow-Up Tracker', String(err), elapsed);
    return NextResponse.json(
      { ok: false, agent: 'follow_up_tracker', error: String(err), elapsed_seconds: elapsed },
      { status: 500 },
    );
  }
}
