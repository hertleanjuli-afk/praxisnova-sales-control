/**
 * Shared Agent Runtime — Gemini Function-Calling Loop
 *
 * Extracted from morning-agents/route.ts so each agent cron route
 * can run independently with its own maxDuration budget (300s each).
 *
 * Provides:
 *  - TOOLS (Gemini function declarations)
 *  - handleTool() dispatcher
 *  - sendWithRetry() for 429 rate-limit handli
 *  - runAgent() agentic loo
 */

import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Tool,
  type Part,
  type GenerateContentResult,
  SchemaType,
} from '@google/generative-ai';
import sql from '@/lib/db';

// ─── Gemini Client ───────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.Gemini_API_Key_Sales_Agent || process.env.GEMINI_API_KEY!);

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
        outreach_source: { type: SchemaType.STRING, description: 'z.B. agent_inbound_response, agent_outreach_strategist — verhindert Doppelkontakt' },
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
    name: 'read_decisions',
    description: 'Liest Agent-Entscheidungen aus der Datenbank. Filtert nach Zeitraum und optional nach Agent.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        hours: { type: SchemaType.NUMBER, description: 'Zeitraum in Stunden (default 24)' },
        agent: { type: SchemaType.STRING, description: 'Agent-Name Filter (optional)' },
      },
    },
  },
  {
    name: 'read_reports',
    description: 'Liest Agent-Reports aus der Datenbank. Filtert nach Zeitraum.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        hours: { type: SchemaType.NUMBER, description: 'Zeitraum in Stunden (default 24)' },
      },
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
  {
    name: 'send_outreach_email',
    description: 'Sendet eine personalisierte Outreach-E-Mail an einen Lead oder Partner via Brevo. Absender ist immer hertle.anjuli@praxisnovaai.com.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to_email: { type: SchemaType.STRING, description: 'E-Mail-Adresse des Empfaengers' },
        to_name: { type: SchemaType.STRING, description: 'Name des Empfaengers' },
        subject: { type: SchemaType.STRING, description: 'E-Mail-Betreff' },
        html: { type: SchemaType.STRING, description: 'HTML-Inhalt der E-Mail' },
        from_name: { type: SchemaType.STRING, description: 'Absender-Name (default: Anjuli Hertle)' },
      },
      required: ['to_email', 'to_name', 'subject', 'html'],
    },
  },
  {
    name: 'block_lead',
    description: 'Blockiert einen Lead und optional alle Leads der gleichen Firma. Gruende: manual_stop, no_interest, wrong_timing, replied, company_block',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        lead_id: { type: SchemaType.NUMBER, description: 'ID des Leads' },
        reason: { type: SchemaType.STRING, description: 'Grund: manual_stop | no_interest | wrong_timing | replied | company_block' },
        duration_months: { type: SchemaType.NUMBER, description: 'Blockdauer in Monaten (default: 9)' },
        block_company: { type: SchemaType.BOOLEAN, description: 'Auch alle anderen Leads der Firma blockieren (default: true)' },
        notes: { type: SchemaType.STRING, description: 'Optionaler Kommentar' },
      },
      required: ['lead_id', 'reason'],
    },
  },
  {
    name: 'write_linkedin_queue',
    description: 'Schreibt eine LinkedIn-Nachricht in die Warteschlange. Angie sendet manuell.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipient_name: { type: SchemaType.STRING, description: 'Name des Empfaengers' },
        recipient_linkedin_url: { type: SchemaType.STRING, description: 'LinkedIn-Profil-URL' },
        message: { type: SchemaType.STRING, description: 'Nachrichtentext (max 300 Zeichen)' },
        context: { type: SchemaType.STRING, description: 'Kontext fuer Angie: warum diese Nachricht' },
        subject_type: { type: SchemaType.STRING, description: 'lead | partner' },
        subject_id: { type: SchemaType.NUMBER, description: 'Lead- oder Partner-ID' },
      },
      required: ['recipient_name', 'message', 'subject_type'],
    },
  },
  {
    name: 'read_inbound_leads',
    description: 'Liest neue Inbound-Leads der letzten 30 Minuten die noch nicht kontaktiert wurden.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        minutes: { type: SchemaType.NUMBER, description: 'Zeitfenster in Minuten (default 30)' },
        limit: { type: SchemaType.NUMBER, description: 'Max. Anzahl (default 5)' },
      },
    },
  },
  {
    name: 'web_search',
    description: 'Sucht im Internet nach einem Suchbegriff. Gibt Titel, URLs und Snippets zurueck.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Suchbegriff' },
        num_results: { type: SchemaType.NUMBER, description: 'Anzahl Ergebnisse (default 5)' },
      },
      required: ['query'],
    },
  },
];

export const TOOLS: Tool[] = [{ functionDeclarations: FUNCTION_DECLARATIONS }];

// ─── Tool-Handler ─────────────────────────────────────────────────────────────

export async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
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
                 employee_count, website_url, agent_score, pipeline_stage, pipeline_notes,
                 linkedin_url, source, created_at, sequence_status,
               blocked_until, block_reason, phone, phone_source,
               signal_email_reply, signal_linkedin_interest
          FROM leads
          WHERE pipeline_stage = ${stage}
            AND (permanently_blocked IS NULL OR permanently_blocked = FALSE)
            AND sequence_status NOT IN ('unsubscribed', 'bounced', 'active', 'cooldown')
            AND (signal_email_reply IS NULL OR signal_email_reply = FALSE)
            AND (signal_linkedin_interest IS NULL OR signal_linkedin_interest = FALSE)
            AND pipeline_stage NOT IN ('Blocked', 'Replied', 'Booked')
            AND (blocked_until IS NULL OR blocked_until < NOW())
          ORDER BY created_at ASC LIMIT ${limit}
        `;
        return { leads: rows, count: rows.length };
      }

      case 'update_lead': {
        const { id, pipeline_stage, agent_score, pipeline_notes, outreach_source } = args as {
          id: number; pipeline_stage?: string; agent_score?: number; pipeline_notes?: string; outreach_source?: string;
        };
        await sql`
          UPDATE leads SET
            pipeline_stage = COALESCE(${pipeline_stage ?? null}, pipeline_stage),
            agent_score = COALESCE(${agent_score ?? null}, agent_score),
            agent_scored_at = CASE WHEN ${agent_score ?? null} IS NOT NULL THEN NOW() ELSE agent_scored_at END,
            pipeline_notes = COALESCE(${pipeline_notes ?? null}, pipeline_notes),
            outreach_source = COALESCE(${outreach_source ?? null}, outreach_source),
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

      case 'read_decisions': {
        const hours = (args.hours as number) || 24;
        const agent = args.agent as string | undefined;
        const rows = agent
          ? await sql`
              SELECT * FROM agent_decisions
              WHERE agent_name = ${agent}
                AND created_at >= NOW() - INTERVAL '1 hour' * ${hours}
              ORDER BY created_at DESC LIMIT 50
            `
          : await sql`
              SELECT * FROM agent_decisions
              WHERE created_at >= NOW() - INTERVAL '1 hour' * ${hours}
              ORDER BY created_at DESC LIMIT 50
            `;
        return { decisions: rows, count: rows.length };
      }

      case 'read_reports': {
        const hours = (args.hours as number) || 24;
        const rows = await sql`
          SELECT * FROM agent_reports
          WHERE created_at >= NOW() - INTERVAL '1 hour' * ${hours}
          ORDER BY created_at DESC LIMIT 20
        `;
        return { reports: rows, count: rows.length };
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

      case 'send_outreach_email': {
        const { to_email, to_name, subject, html, from_name = 'Anjuli Hertle' } = args as {
          to_email: string; to_name: string; subject: string; html: string; from_name?: string;
        };
        // --- EMAIL SANITIZATION (Issues #3, #4, #5) ---
      let cleanHtml = html.replace(/,,/g, ',').replace(/\.\./g, '.').replace(/!!/g, '!');
      if (!cleanHtml.includes('<p>') && !cleanHtml.includes('<p ')) {
        cleanHtml = cleanHtml.split(/\n\n+/).map(p => '<p>' + p.trim() + '</p>').filter(p => p !== '<p></p>').join('\n');
      }
      let cleanSubject = subject.replace(/\{Spintax:\s*/gi, '').replace(/\{[^}]*\|([^}]*)\}/g, '$1').replace(/[{}|]/g, '');
      cleanSubject = cleanSubject.replace(/[\u2013\u2014]/g, '-');
      cleanHtml = cleanHtml.replace(/[\u2013\u2014]/g, '-');

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY!,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: from_name, email: 'hertle.anjuli@praxisnovaai.com' },
            to: [{ email: to_email, name: to_name }],
            subject: cleanSubject,
            htmlContent: cleanHtml,
          }),
        });
        const data = await res.json() as { messageId?: string };
        if (!res.ok) throw new Error(`Brevo ${res.status}: ${JSON.stringify(data)}`);
        return { ok: true, messageId: data.messageId, to: to_email };
      }

      case 'block_lead': {
        const { lead_id, reason, duration_months = 9, block_company = true, notes = '' } = args as {
          lead_id: number; reason: string; duration_months?: number; block_company?: boolean; notes?: string;
        };
        const effectiveDuration = reason === 'wrong_timing' ? 3 : (duration_months || 9);
        await sql`
          UPDATE leads SET
            pipeline_stage = ${reason === 'replied' ? 'Replied' : 'Blocked'},
            block_reason = ${reason},
            blocked_until = NOW() + INTERVAL '1 month' * ${effectiveDuration},
            pipeline_notes = CONCAT(COALESCE(pipeline_notes, ''), ' | Blocked: ', ${reason}, ' bis ', (NOW() + INTERVAL '1 month' * ${effectiveDuration})::text, ' ', ${notes})
          WHERE id = ${lead_id}
        `;
        let companyBlockCount = 0;
        if (block_company) {
          const leadRow = await sql`SELECT company FROM leads WHERE id = ${lead_id}`;
          if (leadRow.length > 0 && leadRow[0].company) {
            const companyName = leadRow[0].company;
            const result = await sql`
              UPDATE leads SET
                pipeline_stage = 'Blocked',
                block_reason = 'company_block',
                blocked_until = NOW() + INTERVAL '1 month' * ${effectiveDuration},
                pipeline_notes = CONCAT(COALESCE(pipeline_notes, ''), ' | Firmen-Block: Anderer Kontakt ', ${reason})
              WHERE LOWER(company) = LOWER(${companyName})
                AND id != ${lead_id}
                AND pipeline_stage NOT IN ('Replied', 'Booked', 'Customer')
            `;
            companyBlockCount = result.count || 0;
          }
        }
        return { ok: true, lead_id, reason, duration_months: effectiveDuration, company_leads_blocked: companyBlockCount };
      }

      case 'write_linkedin_queue': {
        const {
          recipient_name, recipient_linkedin_url = null, message,
          context = null, subject_type, subject_id = null,
        } = args as Record<string, unknown>;
        const rows = await sql`
          INSERT INTO linkedin_queue
            (recipient_name, recipient_linkedin_url, message, context, subject_type, subject_id, status)
          VALUES
            (${recipient_name as string}, ${recipient_linkedin_url as string | null},
             ${message as string}, ${context as string | null},
             ${subject_type as string}, ${subject_id as number | null}, 'pending')
          RETURNING id
        `;
        return { ok: true, id: rows[0].id, recipient: recipient_name };
      }

      case 'read_inbound_leads': {
        const minutes = (args.minutes as number) || 30;
        const limit = (args.limit as number) || 5;
        const rows = await sql`
          SELECT id, email, first_name, last_name, company, title, industry,
                 employee_count, website_url, source, utm_source, utm_medium,
                 utm_campaign, created_at
          FROM leads
          WHERE created_at >= NOW() - INTERVAL '1 minute' * ${minutes}
            AND (outreach_source IS NULL OR outreach_source = '')
            AND (pipeline_stage = 'Neu' OR pipeline_stage IS NULL)
          ORDER BY created_at ASC
          LIMIT ${limit}
        `;
        return { leads: rows, count: rows.length };
      }

      case 'web_search': {
        const query = args.query as string;
        const numResults = (args.num_results as number) || 5;
        // Use Google Custom Search API if available, otherwise return guidance
        if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
          const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}&num=${numResults}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
          const data = await res.json() as { items?: Array<{ title: string; link: string; snippet: string }> };
          return {
            results: (data.items || []).map(item => ({
              title: item.title,
              url: item.link,
              snippet: item.snippet,
            })),
            count: data.items?.length || 0,
          };
        }
        // Fallback: use web_fetch on common search-friendly URLs
        return { error: 'Google Search API nicht konfiguriert. Nutze web_fetch mit konkreten URLs statt web_search.' };
      }

      default:
        return { error: `Unbekanntes Tool: ${name}` };
    }
  } catch (err) {
    return { error: String(err), tool: name };
  }
}

// ─── Gemini Call with Retry on 429 ───────────────────────────────────────────

export async function sendWithRetry(
  fn: () => Promise<GenerateContentResult>,
  maxRetries = 3,
): Promise<GenerateContentResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit = err && typeof err === 'object' && (
        ('status' in err && (err as { status: number }).status === 429) ||
        (err instanceof Error && (err.message.includes('429') || err.message.includes('503')))
      );
      if (isRateLimit && attempt < maxRetries) {
        const waitMs = 15000 + attempt * 10000; // 15s, 25s, 35s
        console.log(`[agent-runtime] 429 Rate Limit — warte ${waitMs / 1000}s (Versuch ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// ─── Agentic Loop ────────────────────────────────────────────────────────────

export async function runAgent(
  systemPrompt: string,
  taskDescription: string,
  maxIterations: number,
  agentName: string,
): Promise<{ success: boolean; iterations: number; summary: string }> {

  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
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

    // Collect text
    const textParts = parts.filter(p => p.text);
    if (textParts.length > 0) {
      summary = (textParts[textParts.length - 1].text ?? '').slice(0, 500);
    }

    // Process function calls
    const functionCalls = parts.filter(p => p.functionCall);
    if (functionCalls.length === 0) break; // Done — no more tool calls

    console.log(`[${agentName}] Iteration ${iterations}/${maxIterations} — ${functionCalls.length} tool call(s): ${functionCalls.map(p => p.functionCall!.name).join(', ')}`);

    // Execute all tool calls in parallel
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

    // Send results back to Gemini (with retry on 429)
    response = await sendWithRetry(() => chat.sendMessage(toolResults as Part[]));
  }

  console.log(`[${agentName}] Finished — ${iterations} iterations, success=${iterations < maxIterations}`);

  return {
    success: iterations < maxIterations,
    iterations,
    summary,
  };
}

// ─── Direct DB log writer (call BEFORE Gemini, so runs are always visible) ───

export async function writeStartLog(runId: string, agentName: string): Promise<void> {
  try {
    await sql`
      INSERT INTO agent_logs (run_id, agent_name, action, status)
      VALUES (${runId}, ${agentName}, 'started', 'started')
    `;
  } catch (e) {
    console.error(`[${agentName}] Failed to write start log:`, e);
  }
}

export async function writeEndLog(
  runId: string,
  agentName: string,
  status: 'completed' | 'partial' | 'error',
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await sql`
      INSERT INTO agent_logs (run_id, agent_name, action, status, details)
      VALUES (${runId}, ${agentName}, 'completed', ${status}, ${details ? JSON.stringify(details) : null})
    `;
  } catch (e) {
    console.error(`[${agentName}] Failed to write end log:`, e);
  }
}

/** Returns true if this agent already started a run in the last windowMinutes (concurrent-run guard) */
export async function isAlreadyRunning(agentName: string, windowMinutes = 8): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT id FROM agent_logs
      WHERE agent_name = ${agentName}
        AND action = 'started'
        AND created_at > NOW() - INTERVAL '1 minute' * ${windowMinutes}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (rows.length === 0) return false;
    // Check if a matching completed/error log also exists after that start
    const startId = rows[0].id;
    const done = await sql`
      SELECT id FROM agent_logs
      WHERE agent_name = ${agentName}
        AND action = 'completed'
        AND id > ${startId}
        AND created_at > NOW() - INTERVAL '1 minute' * ${windowMinutes}
      LIMIT 1
    `;
    return done.length === 0; // started but not yet completed = still running
  } catch {
    return false; // on DB error, allow the run
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

export function isAuthorized(request: Request): boolean {
  const headers = request.headers;
  const authHeader = headers.get('authorization');
  const agentSecret = headers.get('x-agent-secret');

  const validCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validAgent = agentSecret === process.env.AGENT_SECRET;

  return validCron || validAgent;
}

// ─── Email Reply Handler (Brevo Webhook) ──────────────────────────────────
export async function handleEmailReply(leadEmail: string) {
  const leads = await sql`
    SELECT id, company FROM leads WHERE LOWER(email) = LOWER(${leadEmail})
  `;
  if (leads.length === 0) return { ok: false, reason: 'lead_not_found' };
  const lead = leads[0];
  await sql`
    UPDATE leads SET
      signal_email_reply = true,
      pipeline_stage = 'Replied',
      pipeline_notes = CONCAT(COALESCE(pipeline_notes, ''), ' | Antwort erhalten am ', NOW()::text)
    WHERE id = ${lead.id}
  `;
  let companyBlockCount = 0;
  if (lead.company) {
    const result = await sql`
      UPDATE leads SET
        pipeline_stage = 'Blocked',
        block_reason = 'company_block',
        blocked_until = NOW() + INTERVAL '9 months',
        pipeline_notes = CONCAT(COALESCE(pipeline_notes, ''), ' | Firmen-Block: Kontakt hat geantwortet am ', NOW()::text)
      WHERE LOWER(company) = LOWER(${lead.company})
        AND id != ${lead.id}
        AND pipeline_stage NOT IN ('Replied', 'Booked', 'Customer')
    `;
    companyBlockCount = result.count || 0;
  }
  return { ok: true, lead_id: lead.id, company_leads_blocked: companyBlockCount };
}

// ─── Error notification helper ───────────────────────────────────────────────

export async function sendErrorNotification(
  agentName: string,
  error: string,
  elapsed: number,
): Promise<void> {
  if (!process.env.BREVO_API_KEY) return;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'PraxisNova AI System', email: 'hertle.anjuli@praxisnovaai.com' },
      to: [{ email: 'hertle.anjuli@praxisnovaai.com', name: 'Anjuli Hertle' }],
      subject: `[FEHLER] ${agentName} fehlgeschlagen`,
      htmlContent: `
        <h2>${agentName} - Fehler-Bericht</h2>
        <p><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
        <p><strong>Laufzeit:</strong> ${elapsed} Sekunden</p>
        <p><strong>Fehler:</strong> ${error}</p>
        <p>Bitte pruefe die Vercel Logs unter:<br>
        <a href="https://vercel.com/hertleanjuli-1008s-projects/praxisnova-sales-control/logs">Vercel Logs</a></p>
      `,
    }),
  }).catch(e => console.error(`[${agentName}] Fehler-Email konnte nicht gesendet werden:`, e));
}
