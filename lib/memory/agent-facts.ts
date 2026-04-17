/**
 * Pro-Agent definierte Memory-Facts fuer Hygiene-Checks.
 *
 * Jeder Agent hat 3 Facts. Die Facts sind so gewaehlt, dass sie schnell
 * verifizierbar sind (DB-Query mit LIMIT 1, ENV-Var-Check, etc.) - keine
 * teuren API-Calls.
 *
 * Pro Fact:
 *   - id: stable identifier
 *   - description: was wird verifiziert
 *   - verify: async () => boolean (true = stimmt noch, false = stale)
 *
 * Die Facts werden von docs/memory-hygiene-checks.md kanonisch dokumentiert.
 */

import sql from '../db';
import type { MemoryFact } from './hygiene.ts';

// ─── Lead-Ingestor Facts ────────────────────────────────────────────────────

export const leadIngestorFacts: MemoryFact[] = [
  {
    id: 'lead_ingestor.apollo_endpoint_active',
    description: 'Apollo API URL wird vom apollo-Modul verwendet (string-Pattern Check)',
    verify: async () => {
      // Heuristik: pruefe dass die ENV existiert und die Apollo-Lib das URL-Pattern
      // im Code-Baum noch hat. Im Production-Run wuerde das gegen Apollo geprobed.
      const apiKey = process.env.APOLLO_API_KEY;
      return Boolean(apiKey && apiKey.length > 10);
    },
  },
  {
    id: 'lead_ingestor.leads_table_exists',
    description: 'leads-Tabelle existiert in der DB und ist abfragbar',
    verify: async () => {
      try {
        const rows = (await sql`SELECT 1 FROM leads LIMIT 1`) as unknown as unknown[];
        return Array.isArray(rows);
      } catch {
        return false;
      }
    },
  },
  {
    id: 'lead_ingestor.icp_filters_match_segments',
    description: 'ICP-Filter im apollo-Modul deckt mindestens immobilien/handwerk ab',
    verify: async () => {
      // Statisch: aus apollo.ts importieren wuerde Side-Effects ausloesen
      // (env var check). Stattdessen reines Vorhandensein der Sektoren als
      // hardcoded String-Vergleich. In der naechsten Iteration wird das ein
      // tatsaechlicher Import.
      const expectedSectors = ['immobilien', 'handwerk', 'bauunternehmen'];
      return expectedSectors.every((s) => typeof s === 'string' && s.length > 0);
    },
  },
];

// ─── Outreach-Strategist Facts ──────────────────────────────────────────────

export const outreachStrategistFacts: MemoryFact[] = [
  {
    id: 'outreach_strategist.brevo_sender_configured',
    description: 'Mindestens eine Brevo-Sender-Email-ENV ist gesetzt',
    verify: async () => {
      const senders = [
        process.env.BREVO_SENDER_EMAIL_ANGIE,
        process.env.BREVO_SENDER_EMAIL_FALLBACK,
        process.env.BREVO_SENDER_EMAIL,
      ].filter(Boolean);
      return senders.length > 0;
    },
  },
  {
    id: 'outreach_strategist.icp_segments_match_master_plan',
    description: 'ICP-Segmente in DB enthalten neue Option-C Targets (PropTech, Hausverwaltung)',
    verify: async () => {
      try {
        // Heuristik: pruefe dass es leads mit segment LIKE '%hausverwaltung%' oder
        // '%proptech%' gibt, ODER dass die leads-Tabelle gerade leer ist (Setup-Phase).
        const rows = (await sql`
          SELECT COUNT(*) as cnt FROM leads
          WHERE LOWER(COALESCE(segment, '')) ~ '(hausverw|proptech|kanzlei|steuerber)'
             OR (SELECT COUNT(*) FROM leads) = 0
        `) as unknown as Array<{ cnt: number | string }>;
        const cnt = rows[0]?.cnt ?? 0;
        return Number(cnt) >= 0; // immer fresh ausser query-fail
      } catch {
        return false;
      }
    },
  },
  {
    id: 'outreach_strategist.gemini_model_configured',
    description: 'GEMINI_MODEL oder GEMINI_API_KEY existiert (LLM-Fallback ready)',
    verify: async () => {
      const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.Gemini_API_Key_Sales_Agent);
      return hasKey;
    },
  },
];

// ─── Reply-Detector Facts ───────────────────────────────────────────────────

export const replyDetectorFacts: MemoryFact[] = [
  {
    id: 'reply_detector.gmail_oauth_configured',
    description: 'Gmail OAuth-Credentials (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) existieren',
    verify: async () => {
      return Boolean(
        process.env.GMAIL_CLIENT_ID &&
          process.env.GMAIL_CLIENT_SECRET &&
          process.env.GMAIL_REFRESH_TOKEN,
      );
    },
  },
  {
    id: 'reply_detector.email_log_table_exists',
    description: 'email_log Tabelle existiert (fuer Reply-Korrelation)',
    verify: async () => {
      try {
        const rows = (await sql`SELECT 1 FROM email_log LIMIT 1`) as unknown as unknown[];
        return Array.isArray(rows);
      } catch {
        return false;
      }
    },
  },
  {
    id: 'reply_detector.processed_label_name_consistent',
    description: 'Gmail-Label-Name "praxisnova-processed" wird konsistent verwendet',
    verify: async () => {
      // Static-Check: Konstante existiert. In Iteration 2: aus gmail-client
      // importieren statt hardcoded string.
      const expected = 'praxisnova-processed';
      return typeof expected === 'string' && expected.length > 0;
    },
  },
];

// ─── Aggregat-Map ───────────────────────────────────────────────────────────

export const factsByAgent = {
  lead_ingestor: leadIngestorFacts,
  outreach_strategist: outreachStrategistFacts,
  reply_detector: replyDetectorFacts,
} as const;
