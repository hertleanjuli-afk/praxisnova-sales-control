import Groq from 'groq-sdk';
import type { LLMRequest, LLMResponse } from './types.ts';
import { AuthError, ModelError } from './types.ts';
import { withRetry, classifyHttpError } from './retry.ts';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

let client: Groq | null = null;

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AuthError('groq');
  if (!client) client = new Groq({ apiKey });
  return client;
}

export async function call(request: LLMRequest): Promise<LLMResponse> {
  const model = request.model ?? process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  return withRetry(async () => {
    const start = Date.now();
    const groq = getClient();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
    messages.push({ role: 'user', content: request.prompt });

    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
      });

      const text = completion.choices?.[0]?.message?.content ?? '';
      if (!text) throw new ModelError('groq', 'empty response');

      return {
        text,
        tokensIn: completion.usage?.prompt_tokens ?? 0,
        tokensOut: completion.usage?.completion_tokens ?? 0,
        provider: 'groq',
        model,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (typeof status === 'number') {
        throw classifyHttpError(status, err instanceof Error ? err.message : String(err), 'groq');
      }
      throw err;
    }
  }, 'groq');
}
