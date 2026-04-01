/**
 * morning-agents — Vercel Cron Endpoint
 *
 * Führt alle 3 Morgen-Agenten aus via Google Gemini Flash API (kostenlos).
 * Gemini Free Tier (gemini-2.0-flash-lite): freies Kontingent — mit Retry-Logik bei 429.
 *
 * Ablauf: Gemini Flash → Tool-Calling → DB-Reads/Writes → E-Mail via Brevo
 * Schedule: 06:30 täglich (vercel.json)
 *
 * Setup: GEMINI_API_KEY in Vercel Environment Variables setzen
 * Holen: https://aistudio.google.com/apikey (kostenlos)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Tool,
  type Part,
  type GenerateContentResult,
  SchemaType,
} from '@google/generative-ai';
import sql from '@/lib/db';

export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Tool-Definitionen (Gemini Function Declarations) ────────────────────────

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'web_fetch',
    description: 'Lädt den Inhalt einer Website (max 8.000 Zeichen). Für Partner- und Prospect-Recherche.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: 'Vollständige URL mit https://' },
      },
      required: ['url'],
    },
  },
  {
    name: 'pipeline_health',
    description: 'Gibt Anzahl Leads pro Pipeline-Stage zurück und empfiehlt Ansatz A/B/C.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'read_leads',
    description: 'Lädt Leads aus der Datenbank. Standardmäßig pipeline_stage = Neu.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: 'Max. Anzahl Leads (default 30)' },
        stage: { type: SchemaType.STRING, description: 'Pipeline-Stage Filter (default: Neu)' },
      },
    },
  },
  {
    name: 'update_lead',
    description: 'Aktualisiert Pipeline-Stage und Score eines Leads.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.NUMBER, description: 'Lead ID' },
        pipeline_stage: { type: SchemaType.STRING, description: 'Neue Stage: In Outreach | Nurture | Nicht qualifiziert' },
        agent_score: { type: SchemaType.NUMBER, description: 'Score 1-10' },
        pipeline_notes: { type: SchemaType.STRING, description: 'Begründung auf Deutsch' },
      },
      required: ['id'],
    },
  },
  {
    name: 'read_partners',
    description: 'Lädt Partner aus der Datenbank.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: 'Max. Anzahl (default 20)' },
        tier: { type: SchemaType.NUMBER, description: 'Tier-Filter: 1, 2 oder 3' },
      },
    },
  },
  {
    name: 'upsert_partner',
    description: 'Speichert oder aktualisiert einen Partner in der Datenbank.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        company: { type: SchemaType.STRING, description: 'Firmenname (unique key)' },
        website: { type: SchemaType.STRING },
        contact_name: { type: SchemaType.STRING },
        contact_title: { type: SchemaType.STRING },
        linkedin_url: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING, description: 'z.B. IT-Berater Bau, Steuerberatung' },
        tier: { type: SchemaType.NUMBER, description: '1=Top, 2=Mittel, 3=Langfristig' },
      },
      required: ['company'],
    },
  },
  {
    name: 'read_intel',
    description: 'Liest den neuesten Market-Intelligence-Bericht aus der Datenbank.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'read_instructions',
    description: 'Liest ungelesene Manager-Anweisungen aus der Datenbank.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'write_decision',
    description: 'Schreibt eine Agent-Entscheidung (Bewertung) in die Datenbank.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        run_id: { type: SchemaType.STRING, description: 'UUID des aktuellen Laufs' },
        agent_name: { type: SchemaType.STRING },
        decision_type: { type: SchemaType.STRING, description: 'z.B. qualify_partner, qualify_lead' },
        subject_type: { type: SchemaType.STRING, description: 'partner | lead | general' },
        subject_id: { type: SchemaType.NUMBER },
        subject_email: { type: SchemaType.STRING },
        subject_company: { type: SchemaType.STRING },
        score: { type: SchemaType.NUMBER, description: 'Score 1-10' },
        reasoning: { type: SchemaType.STRING, description: 'Begründung auf Deutsch' },
        status: { type: SchemaType.STRING, description: 'completed | pending' },
      },
      required: ['run_id', 'agent_name', 'decision_type'],
    },
  },
  {
    name: 'write_log',
    description: 'Schreibt einen Log-Eintrag für den aktuellen Agent-Lauf.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        run_id: { type: SchemaType.STRING },
        agent_name: { type: SchemaType.STRING },
        action: { type: SchemaType.STRING, description: 'z.B. started, completed, research_lead' },
        status: { type: SchemaType.STRING, description: 'started | completed | partial | error' },
      },
      required: ['run_id', 'agent_name', 'action'],
    },
  },
  {
    name: 'write_report',
    description: 'Schreibt einen Agent-Report in die Datenbank.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        team: { type: SchemaType.STRING, description: 'sales | partner | ops' },
        report_type: { type: SchemaType.STRING, description: 'morning_briefing | kpi_alert' },
        summary: { type: SchemaType.STRING },
        recommendations: { type: SchemaType.STRING },
      },
      required: ['team', 'report_type'],
    },
  },
  {
    name: 'send_email',
    description: 'Sendet eine E-Mail via Brevo an Angie (hertle.anjuli@praxisnovaai.com).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subject: { type: SchemaType.STRING },
        html: { type: SchemaType.STRING, description: 'Vollständiges HTML der E-Mail' },
      },
      required: ['subject', 'html'],
    },
  },
];

const TOOLS: Tool[] = [{ functionDeclarations: FUNCTION_DECLARATIONS }];

// ─── Tool-Handler ─────────────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {

      case 'web_fetch': {
        const res = await fetch(args.url as string, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PraxisNovaBot/1.0)' },
          signal: AbortSignal.timeout(10000),
        });
        const text = await res.text();
        const clean = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000);
        return { url: args.url, content: clean, status: res.status };
      }

      case 'pipeline_health': {
        const rows = await sql`SELECT pipeline_stage, COUNT(*) as count FROM leads GROUP BY pipeline_stage`;
        const health: Record<string, number> = {};
        rows.forEach(r => { health[String(r.pipeline_stage ?? 'null')] = parseInt(String(r.count)); });
        const inOutreach = health['In Outreach'] || 0;
        const approach = inOutreach >= 67 ? 'A' : inOutreach >= 30 ? 'B' : 'C';
        return { stages: health, in_outreach: inOutreach, kpi_target: 67, approach };
      }

      case 'read_leads': {
        const limit = (args.limit as number) || 30;
        const stage = (args.stage as string) || 'Neu';
        const rows = await sql`
          SELECT id, email, first_name, last_name, company, title, industry,
                 employee_count, website_url, agent_score, pipeline_stage, created_at
          FROM leads WHERE pipeline_stage = ${stage}
            AND (sequence_status = 'none' OR sequence_status IS NULL)
          ORDER BY created_at DESC LIMIT ${limit}
        `;
        return { leads: rows, count: rows.length };
      }

      case 'update_lead': {
        const { id, pipeline_stage, agent_score, pipeline_notes } = args as {
          id: number; pipeline_stage?: string; agent_score?: number; pipeline_notes?: string;
        };
        await sql`
          UPDATE leads SET
            pipeline_stage = COALESCE(${pipeline_stage ?? null}, pipeline_stage),
            agent_score = COALESCE(${agent_score ?? null}, agent_score),
            agent_scored_at = CASE WHEN ${agent_score ?? null} IS NOT NULL THEN NOW() ELSE agent_scored_at END,
            pipeline_notes = COALESCE(${pipeline_notes ?? null}, pipeline_notes),
            pipeline_stage_updated_at = CASE WHEN ${pipeline_stage ?? null} IS NOT NULL THEN NOW() ELSE pipeline_stage_updated_at END
          WHERE id = ${id}
        `;
        return { ok: true, id };
      }

      case 'read_partners': {
        const limit = (args.limit as number) || 20;
        const tier = args.tier as number | null ?? null;
        const rows = tier
          ? await sql`SELECT * FROM partners WHERE tier = ${tier} ORDER BY created_at DESC LIMIT ${limit}`
          : await sql`SELECT * FROM partners ORDER BY tier ASC, created_at DESC LIMIT ${limit}`;
        return { partners: rows, count: rows.length };
      }

      case 'upsert_partner': {
        const { company, website, contact_name, contact_title, linkedin_url, category, tier } = args as {
          company: string; website?: string; contact_name?: string; contact_title?: string;
          linkedin_url?: string; category?: string; tier?: number;
        };
        const rows = await sql`
          INSERT INTO partners (company, website, contact_name, contact_title, linkedin_url, category, tier, status, outreach_source)
          VALUES (${company}, ${website ?? null}, ${contact_name ?? null}, ${contact_title ?? null},
                  ${linkedin_url ?? null}, ${category ?? null}, ${tier ?? null}, 'identified', 'agent_personalized')
          ON CONFLICT (company) DO UPDATE SET
            website = COALESCE(EXCLUDED.website, partners.website),
            contact_name = COALESCE(EXCLUDED.contact_name, partners.contact_name),
            contact_title = COALESCE(EXCLUDED.contact_title, partners.contact_title),
            linkedin_url = COALESCE(EXCLUDED.linkedin_url, partners.linkedin_url),
            category = COALESCE(EXCLUDED.category, partners.category),
            tier = COALESCE(EXCLUDED.tier, partners.tier)
          RETURNING id, company
        `;
        return { ok: true, id: rows[0].id, company: rows[0].company };
      }

      case 'read_intel': {
        const rows = await sql`
          SELECT * FROM agent_decisions
          WHERE decision_type = 'intel_update' AND agent_name = 'market_intelligence'
          ORDER BY created_at DESC LIMIT 1
        `;
        return { intel: rows[0] || null, found: rows.length > 0 };
      }

      case 'read_instructions': {
        const rows = await sql`
          SELECT * FROM manager_instructions WHERE status = 'unread' ORDER BY created_at DESC LIMIT 10
        `;
        if (rows.length > 0) {
          const ids = rows.map(r => r.id);
          await sql`UPDATE manager_instructions SET status = 'read', read_at = NOW() WHERE id = ANY(${ids})`;
        }
        return { instructions: rows, count: rows.length };
      }

      case 'write_decision': {
        const {
          run_id, agent_name, decision_type, subject_type = 'general',
          subject_id = null, subject_email = null, subject_company = null,
          score = null, reasoning = null, status = 'completed'
        } = args as Record<string, unknown>;
        const rows = await sql`
          INSERT INTO agent_decisions
            (run_id, agent_name, decision_type, subject_type, subject_id, subject_email,
             subject_company, score, reasoning, status)
          VALUES
            (${run_id as string}, ${agent_name as string}, ${decision_type as string},
             ${subject_type as string}, ${subject_id as number | null},
             ${subject_email as string | null}, ${subject_company as string | null},
             ${score as number | null}, ${reasoning as string | null}, ${status as string})
          RETURNING id
        `;
        return { ok: true, id: rows[0].id };
      }

      case 'write_log': {
        const { run_id, agent_name, action, status = 'completed' } = args as Record<string, unknown>;
        await sql`
          INSERT INTO agent_logs (run_id, agent_name, action, status)
          VALUES (${run_id as string}, ${agent_name as string}, ${action as string}, ${status as string})
        `;
        return { ok: true };
      }

      case 'write_report': {
        const { team, report_type, summary = null, recommendations = null } = args as Record<string, unknown>;
        const rows = await sql`
          INSERT INTO agent_reports (team, report_type, summary, recommendations)
          VALUES (${team as string}, ${report_type as string}, ${summary as string | null}, ${recommendations as string | null})
          RETURNING id
        `;
        return { ok: true, id: rows[0].id };
      }

      case 'send_email': {
        const { subject, html } = args as { subject: string; html: string };
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY!,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'PraxisNova AI Agent', email: 'info@praxisnovaai.com' },
            to: [{ email: 'hertle.anjuli@praxisnovaai.com', name: 'Angie' }],
            subject,
            htmlContent: html,
          }),
        });
        const data = await res.json() as { messageId?: string };
        if (!res.ok) throw new Error(`Brevo ${res.status}: ${JSON.stringify(data)}`);
        return { ok: true, messageId: data.messageId };
      }

      default:
        return { error: `Unbekanntes Tool: ${name}` };
    }
  } catch (err) {
    return { error: String(err), tool: name };
  }
}

// ─── Gemini Agentic Loop ──────────────────────────────────────────────────────

// Hilfsfunktion: Gemini-Call mit automatischem Retry bei 429
async function sendWithRetry(
  fn: () => Promise<GenerateContentResult>,
  maxRetries = 3,
): Promise<GenerateContentResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit = err && typeof err === 'object' && (
        ('status' in err && (err as { status: number }).status === 429) ||
        (err instanceof Error && err.message.includes('429'))
      );
      if (isRateLimit && attempt < maxRetries) {
        const waitMs = 45000 + attempt * 15000; // 45s, 60s, 75s
        console.log(`[morning-agents] 429 Rate Limit - warte ${waitMs / 1000}s und versuche erneut (Versuch ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

async function runAgent(
  systemPrompt: string,
  taskDescription: string,
  maxIterations = 10,
): Promise<{ success: boolean; iterations: number; summary: string }> {

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    systemInstruction: systemPrompt,
    tools: TOOLS,
  });

  const chat = model.startChat();
  let response = await sendWithRetry(() => chat.sendMessage(taskDescription));
  let iterations = 0;
  let summary = '';

  while (iterations < maxIterations) {
    iterations++;

    const candidate = response.response.candidates?.[0];
    if (!candidate) break;

    const parts = candidate.content.parts;

    // Text sammeln
    const textParts = parts.filter(p => p.text);
    if (textParts.length > 0) {
      summary = (textParts[textParts.length - 1].text ?? '').slice(0, 500);
    }

    // Function Calls verarbeiten
    const functionCalls = parts.filter(p => p.functionCall);
    if (functionCalls.length === 0) break; // Fertig — kein weiterer Tool-Aufruf

    // Alle Tool-Calls parallel ausführen
    const toolResults = await Promise.all(
      functionCalls.map(async (part) => {
        const { name, args } = part.functionCall!;
        const result = await handleTool(name, args as Record<string, unknown>);
        return {
          functionResponse: {
            name,
            response: result as object,
          },
        } as Part;
      }),
    );

    // Ergebnisse zurück an Gemini (mit Retry bei 429)
    response = await sendWithRetry(() => chat.sendMessage(toolResults as Part[]));
  }

  return {
    success: iterations < maxIterations,
    iterations,
    summary,
  };
}

// ─── Agent-Instruktionen ──────────────────────────────────────────────────────

function getProspectResearcherPrompt(): string {
  return `Du bist der Prospect Researcher von PraxisNova AI — einer deutschen KI-Automatisierungsagentur für Bau, Handwerk und Immobilien im DACH-Raum.

ALLE Texte auf DEUTSCH. Technische Feldnamen bleiben Englisch.
Kein Em-Dash (—) und kein En-Dash (–) in E-Mails, Texten oder Berichten. Stattdessen Komma, Punkt oder Bindestrich (-) nutzen.

WORKFLOW:
1. Generiere eine run_id (UUID-Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
2. write_log: {run_id, agent_name:"prospect_researcher", action:"started", status:"started"}
3. pipeline_health → bestimme Ansatz A (67+ in Outreach), B (30-66), C (unter 30)
4. read_leads {limit:20, stage:"Neu"}
5. Für jeden Lead:
   a. Wenn website_url vorhanden: web_fetch → analysiere Firma
   b. Score (1-10): Branchen-Fit (30%) + Automatisierungsbedarf (30%) + Entscheider-Zugang (20%) + Timing (20%)
   c. update_lead: Score 8-10→"In Outreach", 5-7→"Nurture", 1-4→"Nicht qualifiziert"
   d. write_decision: {run_id, agent_name:"prospect_researcher", decision_type:"qualify_lead", subject_type:"lead", subject_id:[ID], subject_company:[Firma], score:[Score], reasoning:[Begründung auf Deutsch]}
6. write_log: {run_id, agent_name:"prospect_researcher", action:"completed", status:"completed"}`;
}

function getPartnerResearcherPrompt(): string {
  return `Du bist der Partner Researcher von PraxisNova AI — einer deutschen KI-Automatisierungsagentur für Bau, Handwerk und Immobilien im DACH-Raum.

ALLE Texte auf DEUTSCH.
Kein Em-Dash (—) und kein En-Dash (–) in E-Mails, Texten oder Berichten. Stattdessen Komma, Punkt oder Bindestrich (-) nutzen.

TIER-1-ZIELE (recherchieren falls noch nicht in DB mit Status "identified"):
- QITEC GmbH (qitec.de), bios-tec (bios-tec.de), make it eazy (make-it-eazy.de)
- control IT (controlit.eu), ETL-Gruppe (etl.de), DATEV SmartExperts (smartexperts.de)
- sevDesk (sevdesk.de), Lexoffice (lexoffice.de)

TIER-2-ZIELE: IVD, ZDB, onOffice, FlowFact, Propstack, PlanRadar

WORKFLOW:
1. Generiere run_id
2. write_log started
3. read_partners → prüfe welche bereits vorhanden sind (keine Duplikate!)
4. Für jeden NEUEN Partner:
   a. web_fetch Website → analysiere Kundenstamm, Partnerprogramme, digitale Reife
   b. Score (1-10): Kundenstamm-Fit (35%) + Digitale Reife (30%) + Reichweite (20%) + Ökonomie (15%)
   c. upsert_partner (tier=1 bei Score 8+, tier=2 bei 6-7)
   d. write_decision: {decision_type:"qualify_partner", subject_type:"partner", subject_company:[Name], score:[Score], reasoning:[Begründung]}
5. write_log completed`;
}

function getOperationsManagerPrompt(): string {
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin',
  });
  return `Du bist der Operations Manager von PraxisNova AI. Heute ist ${today}.

AUFGABE: Erstelle das Morgen-Briefing für Angie und sende es per E-Mail.

WORKFLOW:
1. Generiere run_id
2. write_log started
3. read_instructions → prüfe ob Manager-Anweisungen vorliegen
4. read_intel → aktuellsten Markt-Intel laden (falls vorhanden)
5. Erstelle professionelles HTML-Briefing auf DEUTSCH:
   - Design: Hintergrund #0A0A0A, Akzent-Farbe #E8472A, weiße Texte, sauber und modern
   - Abschnitte: Tages-Zusammenfassung, Pipeline-Status, Heutige Agent-Aktivitäten, Top-Empfehlung, Offene Aufgaben für Angie
   - Füge immer den Link zum Dashboard ein: https://praxisnova-sales-control.vercel.app/agents
6. send_email: Betreff "🤖 Guten Morgen, Angie – ${today}"
7. write_report: {team:"ops", report_type:"morning_briefing", summary:[1-Satz-Zusammenfassung]}
8. write_log completed

WICHTIG: E-Mail IMMER senden, auch wenn wenig Daten vorhanden.`;
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const agentSecret = request.headers.get('x-agent-secret');

  const validCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validAgent = agentSecret === process.env.AGENT_SECRET;

  if (!validCron && !validAgent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY nicht konfiguriert — bitte in Vercel Environment Variables setzen' }, { status: 500 });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  // 1. Prospect Researcher
  console.log('[morning-agents] Starte Prospect Researcher (Gemini Flash)...');
  try {
    const pr = await runAgent(getProspectResearcherPrompt(), 'Starte jetzt den vollständigen Prospect-Researcher-Workflow.');
    results.prospect_researcher = pr;
    console.log(`[morning-agents] Prospect Researcher: ${pr.success ? 'OK' : 'PARTIAL'} (${pr.iterations} Iterationen)`);
  } catch (err) {
    results.prospect_researcher = { success: false, error: String(err) };
    console.error('[morning-agents] Prospect Researcher Fehler:', err);
  }

  // Pause zwischen Agenten (Rate Limit: 15 RPM)
  await new Promise(r => setTimeout(r, 30000));

  // 2. Partner Researcher
  console.log('[morning-agents] Starte Partner Researcher (Gemini Flash)...');
  try {
    const ptr = await runAgent(getPartnerResearcherPrompt(), 'Starte den vollständigen Partner-Researcher-Workflow. Recherchiere alle neuen Tier-1-Ziele.');
    results.partner_researcher = ptr;
    console.log(`[morning-agents] Partner Researcher: ${ptr.success ? 'OK' : 'PARTIAL'} (${ptr.iterations} Iterationen)`);
  } catch (err) {
    results.partner_researcher = { success: false, error: String(err) };
    console.error('[morning-agents] Partner Researcher Fehler:', err);
  }

  // Pause zwischen Agenten (Rate Limit: 15 RPM)
  await new Promise(r => setTimeout(r, 30000));

  // 3. Operations Manager
  console.log('[morning-agents] Starte Operations Manager (Gemini Flash)...');
  try {
    const om = await runAgent(getOperationsManagerPrompt(), 'Erstelle jetzt das vollständige Morgen-Briefing und sende es per E-Mail.');
    results.operations_manager = om;
    console.log(`[morning-agents] Operations Manager: ${om.success ? 'OK' : 'PARTIAL'} (${om.iterations} Iterationen)`);
  } catch (err) {
    results.operations_manager = { success: false, error: String(err) };
    console.error('[morning-agents] Operations Manager Fehler:', err);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // Fehler-Benachrichtigung: E-Mail an Angie wenn ein Agent fehlgeschlagen ist
  const failedAgents = Object.entries(results)
    .filter(([, r]) => r && typeof r === 'object' && 'success' in (r as object) && !(r as { success: boolean }).success)
    .map(([name]) => name);

  if (failedAgents.length > 0 && process.env.BREVO_API_KEY) {
    const errorDetails = failedAgents.map(name => {
      const r = results[name] as { error?: string; iterations?: number };
      return `<li><strong>${name}</strong>: ${r?.error ?? 'Unbekannter Fehler'} (Iterationen: ${r?.iterations ?? 0})</li>`;
    }).join('');

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'PraxisNova AI System', email: 'hertle.anjuli@praxisnovaai.com' },
        to: [{ email: 'hertle.anjuli@praxisnovaai.com', name: 'Anjuli Hertle' }],
        subject: `[FEHLER] Morning Agents: ${failedAgents.length} Agent(en) fehlgeschlagen`,
        htmlContent: `
          <h2>Morning Agents - Fehler-Bericht</h2>
          <p><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
          <p><strong>Laufzeit:</strong> ${elapsed} Sekunden</p>
          <p><strong>Fehlgeschlagene Agenten:</strong></p>
          <ul>${errorDetails}</ul>
          <p>Bitte pruefe die Vercel Logs unter:<br>
          <a href="https://vercel.com/hertleanjuli-1008s-projects/praxisnova-sales-control/logs">Vercel Logs</a></p>
        `,
      }),
    }).catch(e => console.error('[morning-agents] Fehler-Email konnte nicht gesendet werden:', e));
  }

  return NextResponse.json({ ok: true, model: 'gemini-2.0-flash-lite', elapsed_seconds: elapsed, results, failed_agents: failedAgents });
}
