import type { LLMProvider } from './types.ts';
import { RateLimitError, AuthError, ModelError, LLMError } from './types.ts';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

export function classifyHttpError(
  status: number,
  body: string,
  provider: LLMProvider,
): LLMError {
  if (status === 401 || status === 403) return new AuthError(provider, body);
  if (status === 429) return new RateLimitError(provider, body);
  return new ModelError(provider, `HTTP ${status}: ${body.slice(0, 200)}`);
}

function isRetryable(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof ModelError) {
    const msg = err.message;
    if (msg.includes('HTTP 5')) return true;
    if (msg.includes('HTTP 408')) return true;
    if (msg.includes('HTTP 502') || msg.includes('HTTP 503') || msg.includes('HTTP 504')) return true;
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError') return true;
    if (err.message.includes('fetch failed') || err.message.includes('ECONN')) return true;
  }
  return false;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  provider: LLMProvider,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS) break;
      if (!isRetryable(err)) break;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await wait(delay);
    }
  }
  if (lastError instanceof LLMError) throw lastError;
  throw new ModelError(provider, lastError instanceof Error ? lastError.message : String(lastError), lastError);
}
