import type { LLMProvider } from './types.ts';

/**
 * Phase 1 Policy: alle Agents stehen auf gemini-paid.
 * Phase 2 und 3 aendern NUR diese Datei, nicht den Agent-Code.
 *
 * pseudonymize=true wird in Phase 3 aktiviert - in Phase 1 funktional no-op.
 *
 * Die Agent-Namen folgen dem geplanten Ziel-Layout aus dem Phase-1-Brief.
 * Einige Eintraege entsprechen noch nicht existierenden Routes im Repo
 * (siehe reports/2026-04-16_llm-migration-phase1.md Open Questions).
 * Das ist gewollt: die Config ist Ziel-Zustand, nicht Ist-Zustand.
 */
export const AGENT_LLM_CONFIG: Record<
  string,
  { provider: LLMProvider; pseudonymize: boolean; model?: string }
> = {
  // SALES - HIGH PII, bleiben in Phase 2 auf Gemini Paid.
  'prospect-researcher': { provider: 'gemini-paid', pseudonymize: false },
  'sales-supervisor': { provider: 'gemini-paid', pseudonymize: false },
  'outreach-strategist': { provider: 'gemini-paid', pseudonymize: false },
  'follow-up-tracker': { provider: 'gemini-paid', pseudonymize: false },
  'partner-researcher': { provider: 'gemini-paid', pseudonymize: false },
  'partner-supervisor': { provider: 'gemini-paid', pseudonymize: false },
  'partner-outreach': { provider: 'gemini-paid', pseudonymize: false },
  'inbound-response': { provider: 'gemini-paid', pseudonymize: false },
  'reply-detection': { provider: 'gemini-paid', pseudonymize: false },
  'linkedin-response-check': { provider: 'gemini-paid', pseudonymize: false },
  'website-inquiry': { provider: 'gemini-paid', pseudonymize: false },
  'call-list-generator': { provider: 'gemini-paid', pseudonymize: false },
  'process-sequences': { provider: 'gemini-paid', pseudonymize: false },
  'gmail-reply-sync': { provider: 'gemini-paid', pseudonymize: false },
  'email-inbox-agent': { provider: 'gemini-paid', pseudonymize: false },

  // SUPERVISOR und MANAGER - Phase 3 Target: Groq + Pseudonym.
  'operations-manager': { provider: 'gemini-paid', pseudonymize: false },
  'marketing-supervisor': { provider: 'gemini-paid', pseudonymize: false },
  'reporting-forecasting': { provider: 'gemini-paid', pseudonymize: false },
  'daily-summary': { provider: 'gemini-paid', pseudonymize: false },
  'fix-agent': { provider: 'gemini-paid', pseudonymize: false },
  'apollo-sync': { provider: 'gemini-paid', pseudonymize: false },

  // ZERO bis LOW PII - Phase 2 Target: Groq.
  'market-intelligence': { provider: 'gemini-paid', pseudonymize: false },
  'content-strategist': { provider: 'gemini-paid', pseudonymize: false },
  'linkedin-post-agent': { provider: 'gemini-paid', pseudonymize: false },
  'brevo-stats-sync': { provider: 'gemini-paid', pseudonymize: false },
  'error-sentinel': { provider: 'gemini-paid', pseudonymize: false },
  'health-monitor': { provider: 'gemini-paid', pseudonymize: false },
  'linkedin-posting-check': { provider: 'gemini-paid', pseudonymize: false },
  'data-integrity': { provider: 'gemini-paid', pseudonymize: false },
};

export function getAgentConfig(
  agentName: string,
): { provider: LLMProvider; pseudonymize: boolean; model?: string } {
  const config = AGENT_LLM_CONFIG[agentName];
  if (config) return config;
  const fallback = (process.env.DEFAULT_LLM_PROVIDER as LLMProvider | undefined) ?? 'gemini-paid';
  return { provider: fallback, pseudonymize: false };
}
