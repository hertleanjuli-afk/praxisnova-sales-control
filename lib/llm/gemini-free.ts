import type { LLMRequest, LLMResponse } from './types.ts';
import { AuthError, ModelError } from './types.ts';
import { withRetry, classifyHttpError } from './retry.ts';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function call(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_FREE_API_KEY;
  if (!apiKey) throw new AuthError('gemini-free');

  const model = request.model ?? process.env.GEMINI_FREE_MODEL ?? DEFAULT_MODEL;

  return withRetry(async () => {
    const start = Date.now();
    const body = {
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      ...(request.systemPrompt
        ? { systemInstruction: { parts: [{ text: request.systemPrompt }] } }
        : {}),
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
      },
    };

    const res = await fetch(`${BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw classifyHttpError(res.status, text, 'gemini-free');
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new ModelError('gemini-free', 'empty response');

    return {
      text,
      tokensIn: json.usageMetadata?.promptTokenCount ?? 0,
      tokensOut: json.usageMetadata?.candidatesTokenCount ?? 0,
      provider: 'gemini-free',
      model,
      latencyMs: Date.now() - start,
    };
  }, 'gemini-free');
}
