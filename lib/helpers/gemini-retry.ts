import { logger } from './logger';

interface GeminiOptions {
  maxTokens?: number;
  retries?: number;
  model?: string;
  temperature?: number;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3-flash-preview';
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function geminiCall(
  prompt: string,
  options: GeminiOptions = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const model = options.model ?? DEFAULT_MODEL;
  const maxRetries = options.retries ?? 3;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.7,
    },
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return text;
      }

      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxRetries) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
      }

      logger.warn('gemini retryable error', { status: res.status, attempt, model });
      await wait(25_000);
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === maxRetries) throw err;
      logger.warn('gemini call threw, retrying', {
        attempt,
        err: err instanceof Error ? err.message : String(err),
      });
      await wait(25_000);
    }
  }
  throw new Error('gemini: exhausted retries');
}
