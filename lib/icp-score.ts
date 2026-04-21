/**
 * ICP-Score-Klassifikation fuer Leads (Track 3, T3.4, 2026-04-21).
 *
 * Lookup-Reihenfolge:
 *   1. icp_config.nace_codes JSONB-Array (falls leads.nace_code gesetzt)
 *   2. icp_config.industry_keywords (case-insensitive Substring-Match)
 *   3. Hardcoded-Fallback-Map fuer bekannte NACE-Codes und Branchen
 *
 * icp_config ist Single Source of Truth. Hardcoded-Map dient nur als
 * Safety-Net falls Tabelle leer oder Lookup fehlschlaegt (z.B. bei
 * neuen Leads im Ingestor bevor erster Seed lief).
 *
 * Extensibility (PLATFORM-STANDARDS 2.3):
 * neue ICP = neue Row in icp_config. Code-Path bleibt unveraendert.
 *
 * DB-Calls sind lazy importiert (dynamic import), damit die Pure-Functions
 * unabhaengig von der DB-Konfiguration testbar sind (node --test).
 */

export interface IcpClassification {
  icp_tag: string | null;
  icp_score: number;
  ready_to_contact: boolean;
  triage_reason: string | null;
}

export interface IcpConfigRow {
  id: string;
  display_name: string;
  nace_codes: string[];
  industry_keywords: string[];
  base_score: number;
  enabled: boolean;
}

const READY_THRESHOLD = 60;
const DEFAULT_SCORE = 50;

// Hardcoded-Fallback fuer Primaer-NACE-Codes der 4 ICPs. Nur als Safety-Net
// wenn icp_config-Tabelle noch leer oder unerreichbar. Produktionspfad geht
// IMMER ueber icp_config (siehe classifyLead).
const HARDCODED_FALLBACK: Record<string, { icp_tag: string; base_score: number }> = {
  // PropTech + Immobilien-Software
  '6820': { icp_tag: 'icp-proptech', base_score: 90 },
  '6831': { icp_tag: 'icp-proptech', base_score: 90 },
  '6832': { icp_tag: 'icp-hausverwaltung', base_score: 85 },
  '7022': { icp_tag: 'icp-proptech', base_score: 90 },
  '6201': { icp_tag: 'icp-proptech', base_score: 90 },
  // Kanzleien
  '6910': { icp_tag: 'icp-kanzlei', base_score: 80 },
  '6920': { icp_tag: 'icp-kanzlei', base_score: 80 },
  '7021': { icp_tag: 'icp-kanzlei', base_score: 80 },
  // Agenturen
  '7311': { icp_tag: 'icp-agentur', base_score: 75 },
  '7312': { icp_tag: 'icp-agentur', base_score: 75 },
  '7320': { icp_tag: 'icp-agentur', base_score: 75 },
  // Explizit-Ausschluss: Bau/Handwerk
  '41': { icp_tag: 'icp-bau-excluded', base_score: 0 },
  '42': { icp_tag: 'icp-bau-excluded', base_score: 0 },
  '43': { icp_tag: 'icp-bau-excluded', base_score: 0 },
};

export interface LeadInput {
  nace_code?: string | null;
  industry?: string | null;
  sequence_type?: string | null;
}

/**
 * Klassifiziert ein Lead gegen icp_config. Pure Funktion fuer die
 * Entscheidungs-Logik, DB-Lookup separat via loadIcpConfig.
 */
export function classifyLeadPure(
  lead: LeadInput,
  configs: IcpConfigRow[]
): IcpClassification {
  const enabledConfigs = configs.filter(c => c.enabled);

  // Pfad 1: NACE-Code exakt in icp_config.nace_codes JSONB-Array
  if (lead.nace_code) {
    const match = enabledConfigs.find(c =>
      Array.isArray(c.nace_codes) && c.nace_codes.includes(lead.nace_code!)
    );
    if (match) {
      return buildClassification(match.id, match.base_score, null);
    }
  }

  // Pfad 2: industry-Keyword-Substring-Match (case-insensitive)
  if (lead.industry) {
    const lowerIndustry = lead.industry.toLowerCase();
    const match = enabledConfigs.find(c =>
      Array.isArray(c.industry_keywords) &&
      c.industry_keywords.some(kw => lowerIndustry.includes(kw.toLowerCase()))
    );
    if (match) {
      return buildClassification(match.id, match.base_score, null);
    }
  }

  // Pfad 3: Hardcoded-Fallback (Safety-Net)
  if (lead.nace_code && HARDCODED_FALLBACK[lead.nace_code]) {
    const fb = HARDCODED_FALLBACK[lead.nace_code];
    return buildClassification(fb.icp_tag, fb.base_score, 'hardcoded_fallback_used');
  }

  // Pfad 4: alte Bau/Handwerk-Sequenzen explizit ausschliessen
  if (lead.sequence_type === 'bauunternehmen' || lead.sequence_type === 'handwerk') {
    return {
      icp_tag: null,
      icp_score: 0,
      ready_to_contact: false,
      triage_reason: 'icp-pivot-2026-04-21-bau-handwerk-raus',
    };
  }

  // Default: keine Klassifikation, Triage
  return {
    icp_tag: null,
    icp_score: DEFAULT_SCORE,
    ready_to_contact: false,
    triage_reason: 'no_icp_match',
  };
}

function buildClassification(
  icp_tag: string,
  score: number,
  triage_reason: string | null
): IcpClassification {
  return {
    icp_tag,
    icp_score: score,
    ready_to_contact: score >= READY_THRESHOLD,
    triage_reason,
  };
}

/**
 * Laedt aktive icp_config-Rows aus DB. JSONB-Spalten werden automatisch
 * als JavaScript-Arrays geparst (Neon/postgres-Treiber).
 *
 * Lazy import von lib/db damit die Pure-Funktionen in diesem Modul
 * unabhaengig von DB-Config testbar sind.
 */
export async function loadIcpConfig(): Promise<IcpConfigRow[]> {
  const sqlModule = await import('@/lib/db');
  const sql = sqlModule.default;
  const rows = await sql<IcpConfigRow[]>`
    SELECT id, display_name, nace_codes, industry_keywords, base_score, enabled
    FROM icp_config
    WHERE enabled = true
  `;
  return rows.map(r => ({
    ...r,
    nace_codes: Array.isArray(r.nace_codes) ? r.nace_codes : [],
    industry_keywords: Array.isArray(r.industry_keywords) ? r.industry_keywords : [],
  }));
}

/**
 * End-to-End-Klassifikation: laedt Config, klassifiziert Lead.
 * Cacht die Config-Liste nicht, fuer Ingestor-Batches siehe classifyBatch.
 */
export async function classifyLead(lead: LeadInput): Promise<IcpClassification> {
  const configs = await loadIcpConfig();
  return classifyLeadPure(lead, configs);
}

/**
 * Batch-Klassifikation: laedt Config einmal, wendet auf viele Leads an.
 * Verwendung im Ingestor nach Apollo-Sync.
 */
export async function classifyBatch(leads: LeadInput[]): Promise<IcpClassification[]> {
  const configs = await loadIcpConfig();
  return leads.map(l => classifyLeadPure(l, configs));
}

/**
 * Klassifiziert alle Leads ohne icp_tag und updated sie in Batch.
 * Aufrufbar am Ende eines Ingestor-Runs (Apollo-Sync, Inbound-Webhook).
 *
 * Returns: Anzahl geupdateter Leads.
 */
export async function scoreUnclassifiedLeads(limit = 500): Promise<number> {
  const sqlModule = await import('@/lib/db');
  const sql = sqlModule.default;
  const configs = await loadIcpConfig();

  const rows = await sql<Array<{
    id: number;
    nace_code: string | null;
    industry: string | null;
    sequence_type: string | null;
  }>>`
    SELECT id, nace_code, industry, sequence_type
    FROM leads
    WHERE icp_tag IS NULL
      AND icp_score = 50
    ORDER BY id DESC
    LIMIT ${limit}
  `;

  let updated = 0;
  for (const row of rows) {
    const c = classifyLeadPure(
      { nace_code: row.nace_code, industry: row.industry, sequence_type: row.sequence_type },
      configs
    );
    await sql`
      UPDATE leads
      SET
        icp_tag = ${c.icp_tag},
        icp_score = ${c.icp_score},
        ready_to_contact = ${c.ready_to_contact},
        triage_reason = ${c.triage_reason}
      WHERE id = ${row.id}
    `;
    updated++;
  }
  return updated;
}

export const _testing = {
  READY_THRESHOLD,
  DEFAULT_SCORE,
  HARDCODED_FALLBACK,
};
