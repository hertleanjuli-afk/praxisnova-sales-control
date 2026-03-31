/**
 * morning-agents — Vercel Cron Endpoint
 *
 * Führt alle 3 Morgen-Agenten aus (Prospect Researcher, Partner Researcher,
 * Operations Manager) vollständig server-seitig via Anthropic Claude API.
 *
 * Warum dieser Ansatz: Claude Code Trigger-Container blockieren alle
 * ausgehenden HTTPS-Verbindungen auf Netzwerkebene — weder curl noch
 * Node.js fetch noch die Neon-DB-Verbindung funktionieren dort.
 * Auf Vercel haben wir vollen Netzwerkzugriff.
 *
 * Ablauf pro Agent-Aufgabe:
 *   1. Kontext aus DB laden (Leads, Partner, Pipeline-Health, Intel)
 *   2. Claude API mit Tool-Calling aufrufen (System-Prompt = agent .md)
 *   3. Tool-Requests ausführen (web_fetch, DB-Reads, DB-Writes, send_email)
 *   4. Agentic Loop bis Claude fertig ist (stop_reason = "end_turn")
 *
 * Schedule: 08:00 Uhr täglich (Europa/Berlin) → vercel.json
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sql from '@/lib/db';

export const maxDuration = 300; // 5 Minuten

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Tool-Definitionen ────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'web_fetch',
    description: 'Lädt den Inhalt einer Website (max 8.000 Zeichen). Für Partner- und Prospect-Recherche.',
    input_schema: {
      type: 'object' as const,
      properties: { url: { type: 'string', description: 'Vollständige URL mit https://' } },
      required: ['url'],
    },
  },
  {
    name: 'pipeline_health',
    description: 'Gibt Anzahl Leads pro Pipeline-Stage zurück und empfehlt Ansatz A/B/C.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'read_leads',
    description: 'Lädt Leads aus der Datenbank. Standardmäßig pipeline_stage = Neu.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max. Anzahl Leads (default 30)' },
        stage: { type: 'string', description: 'Pipeline-Stage Filter (default: Neu)' },
      },
    },
  },
  {
    name: 'update_lead',
    description: 'Aktualisiert Pipeline-Stage und Score eines Leads.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'Lead ID' },
        pipeline_stage: { type: 'string', description: 'Neue Stage: In Outreach | Nurture | Nicht qualifiziert' },
        agent_score: { type: 'number', description: 'Score 1-10' },
        pipeline_notes: { type: 'string', description: 'Begründung auf Deutsch' },
      },
      required: ['id'],
    },
  },
  {
    name: 'read_partners',
    description: 'Lädt Partner aus der Datenbank.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max. Anzahl (default 20)' },
        tier: { type: 'number', description: 'Tier-Filter: 1, 2, oder 3' },
      },
    },
  },
  {
    name: 'upsert_partner',
    description: 'Speichert oder aktualisiert einen Partner in der Datenbank.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company: { type: 'string', description: 'Firmenname (unique key)' },
        website: { type: 'string' },
        contact_name: { type: 'string' },
        contact_title: { type: 'string' },
        linkedin_url: { type: 'string' },
        category: { type: 'string', description: 'z.B. IT-Berater Bau, Steuerberatung, Cloud-Buchhaltung' },
        tier: { type: 'number', description: '1=Top, 2=Mittel, 3=Langfristig' },
      },
      required: ['company'],
    },
  },
  {
    name: 'read_intel',
    description: 'Liest den neuesten Market-Intelligence-Bericht aus der Datenbank.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'read_instructions',
    description: 'Liest ungelesene Manager-Anweisungen aus der Datenbank.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'write_decision',
    description: 'Schreibt eine Agent-Entscheidung (Bewertung) in die Datenbank.',
    input_schema: {
      type: 'object' as const,
      properties: {
        run_id: { type: 'string', description: 'UUID des aktuellen Laufs' },
        agent_name: { type: 'string', description: 'z.B. partner_researcher' },
        decision_type: { type: 'string', description: 'z.B. qualify_partner, qualify_lead' },
        subject_type: { type: 'string', description: 'partner | lead | general' },
        subject_id: { type: 'number' },
        subject_email: { type: 'string' },
        subject_company: { type: 'string' },
        score: { type: 'number', description: 'Score 1-10' },
        reasoning: { type: 'string', description: 'Begründung auf Deutsch' },
        data_payload: { type: 'object', description: 'Zusätzliche strukturierte Daten' },
        status: { type: 'string', description: 'completed | pending' },
      },
      required: ['run_id', 'agent_name', 'decision_type'],
    },
  },
  {
    name: 'write_log',
    description: 'Schreibt einen Log-Eintrag für den aktuellen Agent-Lauf.',
    input_schema: {
      type: 'object' as const,
      properties: {
        run_id: { type: 'string' },
        agent_name: { type: 'string' },
        action: { type: 'string', description: 'z.B. started, completed, research_lead' },
        status: { type: 'string', description: 'started | completed | partial | error' },
        details: { type: 'object', description: 'Zusätzliche Details' },
      },
      required: ['run_id', 'agent_name', 'action'],
    },
  },
  {
    name: 'write_report',
    description: 'Schreibt einen Agent-Report in die Datenbank.',
    input_schema: {
      type: 'object' as const,
      properties: {
        team: { type: 'string', description: 'sales | partner | ops' },
        report_type: { type: 'string', description: 'morning_briefing | kpi_alert | weekly_summary' },
        summary: { type: 'string' },
        metrics: { type: 'object' },
        recommendations: { type: 'string' },
        flagged_items: { type: 'array', items: { type: 'object' } },
      },
      required: ['team', 'report_type'],
    },
  },
  {
    name: 'send_email',
    description: 'Sendet eine E-Mail via Brevo an Angie.',
    input_schema: {
      type: 'object' as const,
      properties: {
        subject: { type: 'string' },
        html: { type: 'string', description: 'Vollständiges HTML der E-Mail' },
        to: { type: 'string', description: 'Empfänger-E-Mail (default: hertle.anjuli@praxisnovaai.com)' },
      },
      required: ['subject', 'html'],
    },
  },
];

// ─── Tool-Handler ─────────────────────────────────────────────────────────────

async function handleTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {

      case 'web_fetch': {
        const url = input.url as string;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PraxisNovaBot/1.0; research)' },
          signal: AbortSignal.timeout(10000),
        });
        const text = await res.text();
        // HTML → lesbarer Text (einfaches Strip)
        const clean = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000);
        return JSON.stringify({ url, content: clean, status: res.status });
      }

      case 'pipeline_health': {
        const rows = await sql`
          SELECT pipeline_stage, COUNT(*) as count FROM leads GROUP BY pipeline_stage
        `;
        const health: Record<string, number> = {};
        rows.forEach(r => { health[r.pipeline_stage || 'null'] = parseInt(r.count); });
        const inOutreach = health['In Outreach'] || 0;
        const approach = inOutreach >= 67 ? 'A' : inOutreach >= 30 ? 'B' : 'C';
        return JSON.stringify({ stages: health, in_outreach: inOutreach, kpi_target: 67, approach, healthy: inOutreach >= 67 });
      }

      case 'read_leads': {
        const limit = (input.limit as number) || 30;
        const stage = (input.stage as string) || 'Neu';
        const rows = await sql`
          SELECT id, email, first_name, last_name, company, title, industry,
                 employee_count, linkedin_url, website_url, lead_score, agent_score,
                 pipeline_stage, outreach_source, sequence_status, created_at
          FROM leads
          WHERE pipeline_stage = ${stage}
            AND (sequence_status = 'none' OR sequence_status IS NULL)
          ORDER BY created_at DESC LIMIT ${limit}
        `;
        return JSON.stringify({ leads: rows, count: rows.length });
      }

      case 'update_lead': {
        const { id, pipeline_stage, agent_score, pipeline_notes } = input as {
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
        return JSON.stringify({ ok: true, id });
      }

      case 'read_partners': {
        const limit = (input.limit as number) || 20;
        const tier = input.tier as number | null ?? null;
        const rows = tier
          ? await sql`SELECT * FROM partners WHERE tier = ${tier} ORDER BY created_at DESC LIMIT ${limit}`
          : await sql`SELECT * FROM partners ORDER BY tier ASC, created_at DESC LIMIT ${limit}`;
        return JSON.stringify({ partners: rows, count: rows.length });
      }

      case 'upsert_partner': {
        const { company, website, contact_name, contact_title, linkedin_url, category, tier } = input as {
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
        return JSON.stringify({ ok: true, id: rows[0].id, company: rows[0].company });
      }

      case 'read_intel': {
        const rows = await sql`
          SELECT * FROM agent_decisions
          WHERE decision_type = 'intel_update' AND agent_name = 'market_intelligence'
          ORDER BY created_at DESC LIMIT 1
        `;
        return JSON.stringify({ intel: rows[0] || null, found: rows.length > 0 });
      }

      case 'read_instructions': {
        const rows = await sql`
          SELECT * FROM manager_instructions WHERE status = 'unread' ORDER BY created_at DESC LIMIT 10
        `;
        if (rows.length > 0) {
          const ids = rows.map(r => r.id);
          await sql`UPDATE manager_instructions SET status = 'read', read_at = NOW() WHERE id = ANY(${ids})`;
        }
        return JSON.stringify({ instructions: rows, count: rows.length });
      }

      case 'write_decision': {
        const {
          run_id, agent_name, decision_type, subject_type = 'general',
          subject_id = null, subject_email = null, subject_company = null,
          score = null, reasoning = null, data_payload = null, status = 'completed'
        } = input as Record<string, unknown>;
        const rows = await sql`
          INSERT INTO agent_decisions
            (run_id, agent_name, decision_type, subject_type, subject_id, subject_email, subject_company, score, reasoning, data_payload, status)
          VALUES
            (${run_id as string}, ${agent_name as string}, ${decision_type as string}, ${subject_type as string},
             ${subject_id as number | null}, ${subject_email as string | null}, ${subject_company as string | null},
             ${score as number | null}, ${reasoning as string | null},
             ${data_payload ? JSON.stringify(data_payload) : null}, ${status as string})
          RETURNING id
        `;
        return JSON.stringify({ ok: true, id: rows[0].id });
      }

      case 'write_log': {
        const { run_id, agent_name, action, status = 'completed', details = null } = input as Record<string, unknown>;
        await sql`
          INSERT INTO agent_logs (run_id, agent_name, action, status, details)
          VALUES (${run_id as string}, ${agent_name as string}, ${action as string}, ${status as string},
                  ${details ? JSON.stringify(details) : null})
        `;
        return JSON.stringify({ ok: true });
      }

      case 'write_report': {
        const { team, report_type, summary = null, metrics = null, recommendations = null, flagged_items = null } = input as Record<string, unknown>;
        const rows = await sql`
          INSERT INTO agent_reports (team, report_type, summary, metrics, recommendations, flagged_items)
          VALUES (${team as string}, ${report_type as string}, ${summary as string | null},
                  ${metrics ? JSON.stringify(metrics) : null}, ${recommendations as string | null},
                  ${flagged_items ? JSON.stringify(flagged_items) : null})
          RETURNING id
        `;
        return JSON.stringify({ ok: true, id: rows[0].id });
      }

      case 'send_email': {
        const { subject, html, to = 'hertle.anjuli@praxisnovaai.com' } = input as { subject: string; html: string; to?: string };
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY!, 'content-type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'PraxisNova AI Agent', email: 'info@praxisnovaai.com' },
            to: [{ email: to as string, name: 'Angie' }],
            subject,
            htmlContent: html,
          }),
        });
        const data = await res.json() as { messageId?: string };
        if (!res.ok) throw new Error(`Brevo error ${res.status}: ${JSON.stringify(data)}`);
        return JSON.stringify({ ok: true, messageId: data.messageId });
      }

      default:
        return JSON.stringify({ error: `Unbekanntes Tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err), tool: name });
  }
}

// ─── Agent-Runner: Agentic Loop ───────────────────────────────────────────────

async function runAgent(systemPrompt: string, taskDescription: string, maxIterations = 40): Promise<{ success: boolean; iterations: number; summary: string }> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: taskDescription }
  ];

  let iterations = 0;
  let summary = '';

  while (iterations < maxIterations) {
    iterations++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Text aus der Antwort extrahieren
    const textBlocks = response.content.filter(b => b.type === 'text');
    if (textBlocks.length > 0) {
      summary = (textBlocks[textBlocks.length - 1] as Anthropic.TextBlock).text.slice(0, 500);
    }

    // Wenn fertig → raus
    if (response.stop_reason === 'end_turn') {
      return { success: true, iterations, summary };
    }

    // Tool-Calls verarbeiten
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];

      // Assistent-Turn hinzufügen
      messages.push({ role: 'assistant', content: response.content });

      // Tool-Ergebnisse sammeln
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await handleTool(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Tool-Ergebnisse als User-Turn hinzufügen
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unerwarteter stop_reason
    break;
  }

  return { success: false, iterations, summary: `Max. Iterationen erreicht (${maxIterations})` };
}

// ─── Agent-Instruktionen ──────────────────────────────────────────────────────

function getProspectResearcherPrompt(): string {
  return `Du bist der Prospect Researcher von PraxisNova AI — einer deutschen B2B KI-Automatisierungsagentur für Bau, Handwerk und Immobilien im DACH-Raum.

ALLE Texte (reasoning, logs, notes) auf DEUTSCH schreiben. Technische Feldnamen bleiben Englisch.

WORKFLOW:
1. Generiere eine UUID (run_id) — nutze crypto.randomUUID() Stil: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
2. Schreibe start-Log: write_log {run_id, agent_name:"prospect_researcher", action:"started", status:"started"}
3. Prüfe Pipeline-Gesundheit: pipeline_health → bestimme Ansatz A/B/C
4. Lade Leads: read_leads {limit:20, stage:"Neu"}
5. Für jeden Lead:
   a. Wenn website_url vorhanden: web_fetch die Website und analysiere Branche, Größe, digitale Reife
   b. Berechne Score (1-10) nach diesen Dimensionen (gewichtet):
      - Branchen-Fit (30%): 8-10=KMU Bau/Handwerk/Immobilien DACH, 5-7=teilweise, 1-4=falsch
      - Automatisierungsbedarf (30%): 8-10=deutlich manuelle Prozesse/kein CRM, 5-7=teilweise, 1-4=stark automatisiert
      - Entscheider-Zugang (20%): 8-10=GF/Inhaber direkt erreichbar, 5-7=identifiziert, 1-4=nicht findbar
      - Timing (20%): 8-10=Wachstumssignale/neue Projekte, 5-7=stabil, 1-4=negative Signale
   c. update_lead: Score 8-10 → "In Outreach", 5-7 → "Nurture", 1-4 → "Nicht qualifiziert"
   d. write_decision (decision_type:"qualify_lead")
6. Abschluss-Log: write_log {action:"completed", status:"completed"}
KPI-Ziel: 67 Score-8+-Leads in aktiver Pipeline für 10 Meetings/Woche.`;
}

function getPartnerResearcherPrompt(): string {
  return `Du bist der Partner Researcher von PraxisNova AI — einer deutschen B2B KI-Automatisierungsagentur für Bau, Handwerk und Immobilien im DACH-Raum.

ALLE Texte auf DEUTSCH. Technische Feldnamen Englisch.

TIER-1-ZIELE (diese Woche recherchieren — falls noch nicht in DB):
- QITEC GmbH (qitec.de) — IT-Berater Bau
- bios-tec (bios-tec.de) — IT-Berater Bau
- make it eazy (make-it-eazy.de) — IT-Berater Bau
- control IT (controlit.eu) — IT-Berater Bau
- ETL-Gruppe (etl.de) — Steuerberatung
- DATEV SmartExperts (smartexperts.de) — Steuerberatung
- sevDesk (sevdesk.de) — Cloud-Buchhaltung
- Lexoffice (lexoffice.de) — Cloud-Buchhaltung

TIER-2-ZIELE: IVD, ZDB, onOffice, FlowFact, Propstack, PlanRadar

WORKFLOW:
1. Generiere run_id (UUID)
2. write_log started
3. read_partners — prüfe welche bereits in DB (keine Duplikate)
4. Für jeden NEUEN Partner (nicht in DB):
   a. web_fetch Website → analysiere Kundenstamm, digitale Reife, Partnerprogramme
   b. Score berechnen (gewichtet):
      - Kundenstamm-Fit (35%): 8-10=20+ KMU Bau/Handwerk/Immobilien, 5-7=gemischt, 1-4=B2C/Konzern
      - Digitale Reife (30%): 8-10=versteht KI, kein Konkurrent, 5-7=digital, 1-4=skeptisch
      - Reichweite (20%): 8-10=50+ Ziel-KMU, 5-7=20-50, 1-4=unter 20
      - Ökonomie (15%): 8-10=attraktives Revenue-Sharing, 5-7=ok, 1-4=gering
   c. upsert_partner (tier=1 bei Score 8+, tier=2 bei 6-7)
   d. write_decision (decision_type:"qualify_partner", subject_type:"partner")
5. write_log completed
KPI-Ziel: 50 Tier-1-Partner in aktiver Pipeline für 10 Partner-Meetings/Monat.`;
}

function getOperationsManagerPrompt(): string {
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin' });
  return `Du bist der Operations Manager von PraxisNova AI. Heute ist ${today}.

AUFGABE: Erstelle den Tages-Briefing-Report für Angie und sende ihn per E-Mail.

WORKFLOW:
1. Generiere run_id
2. write_log started
3. Lies Entscheidungen der letzten 24h aus der DB (du hast Zugriff via write_decision — beziehe dich auf die Ergebnisse des heutigen Laufs)
4. Lies Manager-Anweisungen: read_instructions
5. Analysiere: Wie viele Leads qualifiziert? Partner recherchiert? KPI-Status?
6. Erstelle professionelles HTML-Briefing (deutsch, PraxisNova Brand: #0A0A0A Hintergrund, #E8472A Akzent)
   - Tages-Zusammenfassung
   - Prospect Researcher Ergebnisse
   - Partner Researcher Ergebnisse
   - KPI-Status (Ampel: grün/gelb/rot)
   - Top-Empfehlung des Tages
   - Offene Aufgaben für Angie
7. send_email (an hertle.anjuli@praxisnovaai.com)
8. write_report (morning_briefing)
9. write_log completed

WICHTIG: IMMER die E-Mail senden, auch wenn wenig Daten vorhanden sind.`;
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Authentifizierung
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const agentSecret = request.headers.get('x-agent-secret');
  const agentSecretEnv = process.env.AGENT_SECRET;

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    agentSecret !== agentSecretEnv
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  // ── 1. Prospect Researcher ─────────────────────────────────────────────────
  console.log('[morning-agents] Starte Prospect Researcher...');
  try {
    const pr = await runAgent(
      getProspectResearcherPrompt(),
      'Starte jetzt den vollständigen Prospect-Researcher-Workflow. Führe alle Phasen nacheinander aus.',
    );
    results.prospect_researcher = pr;
    console.log(`[morning-agents] Prospect Researcher: ${pr.success ? 'OK' : 'PARTIAL'} (${pr.iterations} Iterationen)`);
  } catch (err) {
    results.prospect_researcher = { success: false, error: String(err) };
    console.error('[morning-agents] Prospect Researcher Fehler:', err);
  }

  // ── 2. Partner Researcher ──────────────────────────────────────────────────
  console.log('[morning-agents] Starte Partner Researcher...');
  try {
    const ptr = await runAgent(
      getPartnerResearcherPrompt(),
      'Starte jetzt den vollständigen Partner-Researcher-Workflow. Recherchiere alle neuen Tier-1-Ziele.',
    );
    results.partner_researcher = ptr;
    console.log(`[morning-agents] Partner Researcher: ${ptr.success ? 'OK' : 'PARTIAL'} (${ptr.iterations} Iterationen)`);
  } catch (err) {
    results.partner_researcher = { success: false, error: String(err) };
    console.error('[morning-agents] Partner Researcher Fehler:', err);
  }

  // ── 3. Operations Manager ──────────────────────────────────────────────────
  console.log('[morning-agents] Starte Operations Manager...');
  try {
    const om = await runAgent(
      getOperationsManagerPrompt(),
      'Erstelle jetzt das vollständige Morgen-Briefing und sende es per E-Mail.',
    );
    results.operations_manager = om;
    console.log(`[morning-agents] Operations Manager: ${om.success ? 'OK' : 'PARTIAL'} (${om.iterations} Iterationen)`);
  } catch (err) {
    results.operations_manager = { success: false, error: String(err) };
    console.error('[morning-agents] Operations Manager Fehler:', err);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  return NextResponse.json({ ok: true, elapsed_seconds: elapsed, results });
}
