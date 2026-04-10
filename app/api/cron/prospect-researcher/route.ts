/**
 * Prospect Researcher — Standalone Cron Route
 *
 * Runs as an independent Gemini agent with its own 300s budget.
 * Qualifies new leads (pipeline_stage = "Neu") with a 4-dimension scoring rubric.
 *
 * Schedule: 06:30 and 11:30 daily (via vercel.json) - 2x per day for bigger lead pool.
 * maxIterations: 80 — bumped from 50 to prevent timeouts when web_fetch is slow or retries occur. Math: 35 leads × ~5-8 tool calls + overhead.
 * Target: 60-70 qualified leads per day moving to "In Outreach" to feed 3x outreach runs.
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
  return `Du bist der Prospect Researcher von PraxisNova AI - einer deutschen KI-Automatisierungsagentur fuer Bau, Handwerk und Immobilien im DACH-Raum.

ALLE Texte auf DEUTSCH. Technische Feldnamen bleiben Englisch. Kein Em-Dash und kein En-Dash in E-Mails, Texten oder Berichten. Stattdessen Komma, Punkt oder Bindestrich (-) nutzen.

KPI-ZIEL: 10 Kundenmeetings pro Woche. Benoetigt ca. 67 Score-8+-Leads in aktiver Pipeline.
VOLUMEN-ZIEL: Mindestens 30 neue Leads pro Lauf qualifizieren, um 3x Outreach-Laeufe taeglich zu fuettern.

WORKFLOW:
1. Generiere eine run_id (UUID-Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
2. write_log: {run_id, agent_name:"prospect_researcher", action:"started", status:"started"}
3. read_intel - neuesten Market-Intelligence-Bericht laden (falls vorhanden)
4. pipeline_health - bestimme Ansatz A (67+ in Outreach), B (30-66), C (unter 30)
5. read_leads {limit:35, stage:"Neu"} - ERHOEHTES LIMIT fuer mehr Durchsatz
6. Fuer jeden Lead:
   a. Wenn website_url vorhanden: web_fetch - analysiere Firma
   b. Score (1-10) berechnen:
      - Branchen-Fit (30%): 8-10 = KMU Bau/Handwerk/Immobilien 5-200 MA DACH
      - Automatisierungsbedarf (30%): 8-10 = manuelle Prozesse, kein CRM, wachsend
      - Entscheider-Zugang (20%): 8-10 = GF/Inhaber direkt erreichbar, LinkedIn vorhanden
      - Timing & Signale (20%): 8-10 = Stellenanzeigen, Wachstum, Investitionen
   c. update_lead: Score 8-10 -> "In Outreach", 5-7 -> "Nurture", 1-4 -> "Nicht qualifiziert"
   d. write_decision: {run_id, agent_name:"prospect_researcher", decision_type:"qualify_lead",
      subject_type:"lead", subject_id:[ID], subject_company:[Firma], score:[Score],
      reasoning:[Begruendung auf Deutsch], data_payload:{
        company_summary: "[kurze Firmenbeschreibung fuer Outreach-Strategist]",
        pain_points: "[identifizierte Schmerzpunkte]",
        personalization_hook: "[konkreter Aufhaenger fuer E-Mail]",
        industry: "[Branche]",
        employee_count: [Groesse],
        website_analyzed: true/false
      }}
7. write_log: {run_id, agent_name:"prospect_researcher", action:"completed", status:"completed"}

WICHTIG:
- NIEMALS Leads mit pipeline_stage "Wieder aufnehmen" beruehren
- Pipeline-Stage MUSS fuer jeden Lead gesetzt werden
- Bei Ansatz C: Alle verfuegbaren Branchen abarbeiten, KPI-Alert senden
- Fehler loggen: Bei Fehler trotzdem Lauf-Log mit status "partial" schreiben
- Gewichteter Score: (D1*0.30 + D2*0.30 + D3*0.20 + D4*0.20), gerundet auf ganze Zahl
- data_payload VOLLSTAENDIG ausfuellen - der Outreach-Strategist nutzt diese Daten als Cache
- Qualitaet des data_payload ist wichtig: Je besser die Beschreibung, desto besser die E-Mails`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  // Concurrent-run guard — skip if another instance is already running
  if (await isAlreadyRunning('prospect_researcher', 8)) {
    console.log('[prospect-researcher] Bereits aktiv — ueberspringe diesen Lauf.');
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_running' });
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`[prospect-researcher] Starte run ${runId} (max 80 Iterationen, 300s Budget)...`);

  // Write started log BEFORE calling Gemini so the run is always visible in the dashboard
  await writeStartLog(runId, 'prospect_researcher');

  try {
    const result = await runAgent(
      getSystemPrompt(),
      'Starte jetzt den vollstaendigen Prospect-Researcher-Workflow. Recherchiere und bewerte alle neuen Leads. Ziel: 30+ Leads qualifizieren pro Lauf.',
      80, // maxIterations — bumped from 50 to prevent timeouts on slow web fetches
      'prospect-researcher',
    );

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[prospect-researcher] Fertig in ${elapsed}s — ${result.iterations} Iterationen, success=${result.success}`
    );

    await writeEndLog(runId, 'prospect_researcher', result.success ? 'completed' : 'partial', {
      iterations: result.iterations,
    });

    if (!result.success) {
      await sendErrorNotification(
        'Prospect Researcher',
        `Maximale Iterationen erreicht (${result.iterations}/50)`,
        elapsed
      );
    }

    return NextResponse.json({
      ok: true,
      agent: 'prospect_researcher',
      elapsed_seconds: elapsed,
      ...result,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error('[prospect-researcher] Fehler:', err);
    await writeEndLog(runId, 'prospect_researcher', 'error', { error: String(err) });
    await sendErrorNotification('Prospect Researcher', String(err), elapsed);
    return NextResponse.json(
      {
        ok: false,
        agent: 'prospect_researcher',
        error: String(err),
        elapsed_seconds: elapsed,
      },
      { status: 500 }
    );
  }
}
