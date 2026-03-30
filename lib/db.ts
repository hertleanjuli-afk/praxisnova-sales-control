import { neon, NeonQueryFunction } from '@neondatabase/serverless';

const DB_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

let _sql: NeonQueryFunction<false, false> | null = null;

function getNeon(): NeonQueryFunction<false, false> {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!, {
      fetchOptions: { signal: AbortSignal.timeout(DB_TIMEOUT_MS) },
    });
  }
  return _sql;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('abort') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused') ||
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('socket hang up') ||
      msg.includes('could not connect') ||
      msg.includes('too many clients') ||
      msg.includes('connection terminated')
    );
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryable(error)) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        // Reset the client so the next attempt creates a fresh connection
        _sql = null;
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export default function sql(strings: TemplateStringsArray, ...values: any[]): Promise<Record<string, any>[]> {
  return withRetry(() => getNeon()(strings, ...values) as Promise<Record<string, any>[]>);
}

export async function checkConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await withRetry(() => getNeon()`SELECT 1 AS ok`, 1);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function initializeDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      apollo_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      company TEXT,
      title TEXT,
      industry TEXT,
      employee_count INTEGER,
      hubspot_id TEXT,
      linkedin_url TEXT,
      sequence_status TEXT DEFAULT 'none',
      sequence_type TEXT,
      sequence_step INTEGER DEFAULT 0,
      enrolled_at TIMESTAMPTZ,
      exited_at TIMESTAMPTZ,
      cooldown_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      lead_score INTEGER DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS email_events (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id),
      sequence_type TEXT,
      step_number INTEGER,
      event_type TEXT,
      brevo_message_id TEXT,
      sender_used TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS call_logs (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id),
      call_date TIMESTAMPTZ DEFAULT NOW(),
      result TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS stop_reasons (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id),
      reason TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS linkedin_connections (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id) UNIQUE,
      connected_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS error_logs (
      id SERIAL PRIMARY KEY,
      error_type TEXT NOT NULL,
      lead_id INTEGER REFERENCES leads(id),
      sequence_type TEXT,
      step_number INTEGER,
      error_message TEXT NOT NULL,
      context TEXT,
      notified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS website_clicks (
      id SERIAL PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      lead_id INTEGER REFERENCES leads(id),
      page TEXT DEFAULT '/',
      button_id TEXT DEFAULT 'unknown',
      button_text TEXT,
      referrer TEXT,
      clicked_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_website_clicks_visitor ON website_clicks(visitor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_website_clicks_lead ON website_clicks(lead_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_website_clicks_date ON website_clicks(clicked_at)`;

  // Performance Intelligence tables
  await sql`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      leads_contacted INTEGER DEFAULT 0,
      emails_sent INTEGER DEFAULT 0,
      emails_opened INTEGER DEFAULT 0,
      emails_replied INTEGER DEFAULT 0,
      meetings_booked INTEGER DEFAULT 0,
      linkedin_requests INTEGER DEFAULT 0,
      linkedin_connected INTEGER DEFAULT 0,
      linkedin_messages INTEGER DEFAULT 0,
      linkedin_replied INTEGER DEFAULT 0,
      linkedin_meetings INTEGER DEFAULT 0,
      sector_immobilien_count INTEGER DEFAULT 0,
      sector_handwerk_count INTEGER DEFAULT 0,
      sector_bau_count INTEGER DEFAULT 0,
      sector_allgemein_count INTEGER DEFAULT 0,
      best_performing_sector TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS change_log (
      id SERIAL PRIMARY KEY,
      change_date DATE NOT NULL DEFAULT CURRENT_DATE,
      change_type TEXT NOT NULL,
      change_description TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      expected_impact TEXT,
      actual_impact TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS weekly_feedback (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL,
      question_1 TEXT DEFAULT 'Was lief diese Woche gut?',
      answer_1 TEXT,
      question_2 TEXT DEFAULT 'Was lief nicht gut?',
      answer_2 TEXT,
      question_3 TEXT DEFAULT 'Haben wir etwas geändert?',
      answer_3 TEXT,
      question_4 TEXT DEFAULT 'Welche Reaktionen haben wir von Leads bekommen?',
      answer_4 TEXT,
      question_5 TEXT DEFAULT 'Was wollen wir nächste Woche testen?',
      answer_5 TEXT,
      submitted_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Unsubscribe / permanent block tracking
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS permanently_blocked BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS sentiment TEXT`;
  await sql`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS sentiment_confidence REAL`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS reply_sentiment TEXT`;

  // Add columns if they don't exist (for existing databases)
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0`;
  await sql`ALTER TABLE website_clicks ADD COLUMN IF NOT EXISTS utm_source TEXT`;
  await sql`ALTER TABLE website_clicks ADD COLUMN IF NOT EXISTS utm_medium TEXT`;
  await sql`ALTER TABLE website_clicks ADD COLUMN IF NOT EXISTS utm_campaign TEXT`;
  await sql`ALTER TABLE website_clicks ADD COLUMN IF NOT EXISTS utm_content TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS optin_reminded BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_status TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_request_date TIMESTAMPTZ`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_connected_date TIMESTAMPTZ`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_message TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_message_date TIMESTAMPTZ`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_reply TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_reply_date TIMESTAMPTZ`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_no_profile BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_no_profile_date TIMESTAMPTZ`;
  // Mark existing Apollo leads
  await sql`UPDATE leads SET source = 'apollo' WHERE apollo_id IS NOT NULL AND (source IS NULL OR source = 'manual')`;
  // Agent-required lead fields
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS website_url TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS agent_score INTEGER`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS agent_scored_at TIMESTAMPTZ`;

  // ── Agent System Tables ──────────────────────────────────────────────────
  // Partners table (separate from leads — different scoring, different pipeline)
  await sql`
    CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY,
      company TEXT NOT NULL,
      website TEXT,
      email TEXT,
      contact_name TEXT,
      contact_title TEXT,
      linkedin_url TEXT,
      category TEXT,
      tier INTEGER,
      status TEXT DEFAULT 'identified',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_company ON partners(company)`;

  // Agent decisions — every scored qualification or outreach plan
  await sql`
    CREATE TABLE IF NOT EXISTS agent_decisions (
      id SERIAL PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      decision_type TEXT NOT NULL,
      subject_type TEXT NOT NULL,
      subject_id INTEGER,
      subject_email TEXT,
      subject_company TEXT,
      score INTEGER,
      reasoning TEXT,
      data_payload JSONB,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_decisions_run ON agent_decisions(run_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent ON agent_decisions(agent_name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_decisions_date ON agent_decisions(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_decisions_status ON agent_decisions(status)`;

  // Agent logs — operational trace of every agent action
  await sql`
    CREATE TABLE IF NOT EXISTS agent_logs (
      id SERIAL PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_logs_run ON agent_logs(run_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name)`;

  // Agent reports — supervisor and operations manager reports
  await sql`
    CREATE TABLE IF NOT EXISTS agent_reports (
      id SERIAL PRIMARY KEY,
      team TEXT NOT NULL,
      report_type TEXT NOT NULL,
      summary TEXT,
      metrics JSONB,
      recommendations TEXT,
      flagged_items JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_reports_team ON agent_reports(team)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_reports_date ON agent_reports(created_at)`;
}

export interface Lead {
  id: number;
  apollo_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  industry: string | null;
  employee_count: number | null;
  hubspot_id: string | null;
  linkedin_url: string | null;
  sequence_status: string;
  sequence_type: string | null;
  sequence_step: number;
  enrolled_at: string | null;
  exited_at: string | null;
  cooldown_until: string | null;
  created_at: string;
}

export interface EmailEvent {
  id: number;
  lead_id: number;
  sequence_type: string | null;
  step_number: number | null;
  event_type: string | null;
  brevo_message_id: string | null;
  sender_used: string | null;
  created_at: string;
}

export async function getLeadByEmail(email: string): Promise<Lead | null> {
  const rows = await sql`SELECT * FROM leads WHERE email = ${email} LIMIT 1`;
  return (rows[0] as Lead) ?? null;
}

export async function getLeadById(id: number): Promise<Lead | null> {
  const rows = await sql`SELECT * FROM leads WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Lead) ?? null;
}

export async function upsertLead(lead: Partial<Lead> & { email: string }): Promise<Lead> {
  const rows = await sql`
    INSERT INTO leads (
      apollo_id, email, first_name, last_name, company, title,
      industry, employee_count, hubspot_id, linkedin_url,
      sequence_status, sequence_type, sequence_step,
      enrolled_at, exited_at, cooldown_until
    ) VALUES (
      ${lead.apollo_id ?? null},
      ${lead.email},
      ${lead.first_name ?? null},
      ${lead.last_name ?? null},
      ${lead.company ?? null},
      ${lead.title ?? null},
      ${lead.industry ?? null},
      ${lead.employee_count ?? null},
      ${lead.hubspot_id ?? null},
      ${lead.linkedin_url ?? null},
      ${lead.sequence_status ?? 'none'},
      ${lead.sequence_type ?? null},
      ${lead.sequence_step ?? 0},
      ${lead.enrolled_at ?? null},
      ${lead.exited_at ?? null},
      ${lead.cooldown_until ?? null}
    )
    ON CONFLICT (email) DO UPDATE SET
      apollo_id = COALESCE(EXCLUDED.apollo_id, leads.apollo_id),
      first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
      last_name = COALESCE(EXCLUDED.last_name, leads.last_name),
      company = COALESCE(EXCLUDED.company, leads.company),
      title = COALESCE(EXCLUDED.title, leads.title),
      industry = COALESCE(EXCLUDED.industry, leads.industry),
      employee_count = COALESCE(EXCLUDED.employee_count, leads.employee_count),
      hubspot_id = COALESCE(EXCLUDED.hubspot_id, leads.hubspot_id),
      linkedin_url = COALESCE(EXCLUDED.linkedin_url, leads.linkedin_url)
    RETURNING *
  `;
  return rows[0] as Lead;
}

export async function updateLeadSequence(
  id: number,
  updates: {
    sequence_status?: string;
    sequence_type?: string;
    sequence_step?: number;
    enrolled_at?: string | null;
    exited_at?: string | null;
    cooldown_until?: string | null;
  }
): Promise<Lead | null> {
  const rows = await sql`
    UPDATE leads SET
      sequence_status = COALESCE(${updates.sequence_status ?? null}, sequence_status),
      sequence_type = COALESCE(${updates.sequence_type ?? null}, sequence_type),
      sequence_step = COALESCE(${updates.sequence_step ?? null}, sequence_step),
      enrolled_at = COALESCE(${updates.enrolled_at ?? null}, enrolled_at),
      exited_at = COALESCE(${updates.exited_at ?? null}, exited_at),
      cooldown_until = COALESCE(${updates.cooldown_until ?? null}, cooldown_until)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Lead) ?? null;
}

export async function insertEmailEvent(event: {
  lead_id: number;
  sequence_type: string;
  step_number: number;
  event_type: string;
  brevo_message_id?: string;
  sender_used?: string;
}): Promise<EmailEvent> {
  const rows = await sql`
    INSERT INTO email_events (lead_id, sequence_type, step_number, event_type, brevo_message_id, sender_used)
    VALUES (
      ${event.lead_id},
      ${event.sequence_type},
      ${event.step_number},
      ${event.event_type},
      ${event.brevo_message_id ?? null},
      ${event.sender_used ?? null}
    )
    RETURNING *
  `;
  return rows[0] as EmailEvent;
}

export async function getLeadsForSequenceStep(
  sequenceType: string,
  step: number,
  limit: number = 50
): Promise<Lead[]> {
  const rows = await sql`
    SELECT * FROM leads
    WHERE sequence_type = ${sequenceType}
      AND sequence_step = ${step}
      AND sequence_status = 'active'
      AND (cooldown_until IS NULL OR cooldown_until < NOW())
    ORDER BY enrolled_at ASC
    LIMIT ${limit}
  `;
  return rows as Lead[];
}

export async function getEmailEventsForLead(leadId: number): Promise<EmailEvent[]> {
  const rows = await sql`
    SELECT * FROM email_events
    WHERE lead_id = ${leadId}
    ORDER BY created_at ASC
  `;
  return rows as EmailEvent[];
}
