import type { LLMRequest, LLMResponse, LLMProvider } from './types.ts';
import { ModelError } from './types.ts';
import * as geminiPaid from './gemini-paid.ts';
import * as geminiFree from './gemini-free.ts';
import * as groq from './groq.ts';
import { getAgentConfig } from './config.ts';

export type { LLMProvider, LLMRequest, LLMResponse };
export { LLMError, RateLimitError, AuthError, ModelError } from './types.ts';
export { AGENT_LLM_CONFIG, getAgentConfig } from './config.ts';

/**
 * Zentraler Entry-Point fuer LLM-Calls.
 *
 * Aufloesungs-Reihenfolge fuer provider:
 * 1. Explizit uebergebener provider-Parameter
 * 2. DEFAULT_LLM_PROVIDER env var
 * 3. 'gemini-paid' als Fallback
 *
 * Phase 1: niemand ruft callLLM noch auf. Phase 2+ Migration wird
 * Agent-Code umstellen auf callLLM(req, getAgentConfig(name).provider).
 */
export async function callLLM(
  request: LLMRequest,
  provider?: LLMProvider,
): Promise<LLMResponse> {
  const resolved =
    provider ??
    (process.env.DEFAULT_LLM_PROVIDER as LLMProvider | undefined) ??
    'gemini-paid';

  switch (resolved) {
    case 'gemini-paid':
      return geminiPaid.call(request);
    case 'gemini-free':
      return geminiFree.call(request);
    case 'groq':
      return groq.call(request);
    default:
      throw new ModelError(resolved as LLMProvider, `unknown provider: ${resolved}`);
  }
}

/**
 * Convenience: Ruft LLM fuer einen benannten Agent auf. Provider kommt aus
 * AGENT_LLM_CONFIG, oder Fallback wie bei callLLM.
 */
export async function callLLMForAgent(
  agentName: string,
  request: LLMRequest,
): Promise<LLMResponse> {
  const config = getAgentConfig(agentName);
  const merged: LLMRequest = { ...request, model: request.model ?? config.model };
  return callLLM(merged, config.provider);
}
