/**
 * Agent-Konfigurationen mit Fallback-Spec.
 *
 * Diese Datei spiegelt das primary/optional/fallback-Mapping aus
 * SKILL-ARCHITECTURE-2026-04-17.md Sektion 6.3 in TypeScript wider.
 *
 * Stand: nur die 3 Pilot-Agenten (Lead-Ingestor, Outreach-Strategist,
 * Reply-Detector) sind hier verdrahtet. Die uebrigen 5 folgen in Batch C.
 *
 * Die `legacy_handler` sind Stubs, die in der Adoption-Phase durch echte
 * Funktionen aus den jeweiligen Cron-Routes ersetzt werden. Sie existieren,
 * damit die Tests den Fallback-Pfad realistisch ausueben koennen.
 */

import type { FallbackSpec } from './fallback';

export interface AgentConfig {
  name: string;
  primary_skills: string[];
  optional_skills: string[];
  fallback: FallbackSpec;
}

// ─── Lead-Ingestor ──────────────────────────────────────────────────────────

async function leadIngestorLegacy(_ctx: unknown): Promise<{ leads_imported: number }> {
  // Platzhalter: in der Produktions-Adoption verweist das auf den
  // bestehenden Apollo-Sync-Code in app/api/cron/apollo-sync/route.ts.
  return { leads_imported: 0 };
}

export const leadIngestor: AgentConfig = {
  name: 'lead_ingestor',
  primary_skills: ['apollo.prospect', 'apollo.enrich-lead', 'data.validate-data'],
  optional_skills: ['common-room.account-research'],
  fallback: { type: 'legacy', handler: leadIngestorLegacy },
};

// ─── Outreach-Strategist ────────────────────────────────────────────────────

export const outreachStrategist: AgentConfig = {
  name: 'outreach_strategist',
  primary_skills: [
    'sales.draft-outreach',
    'brand-voice.brand-voice-enforcement',
    'marketing.email-sequence',
  ],
  optional_skills: ['sales.account-research', 'apollo.sequence-load'],
  // Sekundaere Skill als Fallback (Template-basiertes Fallback aus
  // dem Marketing-Plugin, weniger personalisiert aber stabil).
  fallback: { type: 'skill', skillId: 'marketing.draft-content' },
};

// ─── Reply-Detector ─────────────────────────────────────────────────────────

export const replyDetector: AgentConfig = {
  name: 'reply_detector',
  primary_skills: ['customer-support.ticket-triage', 'sales.call-summary'],
  optional_skills: ['customer-support.customer-research'],
  // Bewusster Safe-NoOp: bei Triage-Fehler nichts tun und den Reply
  // in den manuellen Review-Pfad routen, statt mit Keyword-Matching
  // falsch zu klassifizieren.
  fallback: { type: 'noop' },
};

export const allAgentConfigs = {
  lead_ingestor: leadIngestor,
  outreach_strategist: outreachStrategist,
  reply_detector: replyDetector,
} as const;
