/**
 * Retry-Helper mit exponentiellem Backoff und Jitter.
 *
 * Default-Setting: 3 Versuche, Wartezeit 1s/2s/4s, Jitter 10 Prozent.
 * API-spezifische Wrapper am Ende der Datei (Apollo 5x, Calendar 3x, OpenAI 3x).
 *
 * Pattern: Caller entscheidet was retryable ist via `shouldRetry`. Default
 * retryt nur HTTP-Status 408/425/429/500/502/503/504 sowie Network-Errors.
 *
 * Wenn der Wrapper aufgibt, wirft er den Original-Error des letzten Versuchs
 * (mit ergaenztem `attempts` Property fuer Logging).
 */

import { logger } from '../helpers/logger.ts';

export interface RetryOptions {
  /** Maximale Versuche (inkl. erstem). Default 3. */
  maxAttempts?: number;
  /** Initialer Wartezeit in ms. Default 1000. */
  baseDelayMs?: number;
  /** Maximaler Cap fuer Wartezeit in ms. Default 30000. */
  maxDelayMs?: number;
  /** Jitter-Anteil [0..1]. Default 0.1. */
  jitterFactor?: number;
  /** Custom Retry-Filter. Default: HTTP 408/425/429/500/502/503/504 + Network-Errors. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Logging-Label fuer Trace. */
  label?: string;
}

const DEFAULT_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Heuristik: erkennt HTTP-Errors mit `.status` oder `.statusCode` Property,
 * Standard-Fetch-`Response`-Wraps via Error-Message-Pattern, und Network-
 * Errors (TypeError "fetch failed", ECONNRESET, ETIMEDOUT, EAI_AGAIN).
 */
export function defaultShouldRetry(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  // HTTP-like
  const status =
    (error as { status?: number }).status ??
    (error as { statusCode?: number }).statusCode;
  if (typeof status === 'number') return DEFAULT_RETRYABLE_STATUS.has(status);

  const msg = (error as { message?: string }).message ?? '';
  // Apollo-Wrapper: throw new Error(`Apollo API Fehler (429): ...`)
  const m = msg.match(/\((\d{3})\)/);
  if (m) {
    const code = parseInt(m[1], 10);
    if (DEFAULT_RETRYABLE_STATUS.has(code)) return true;
  }

  // Network-Errors
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(msg)) {
    return true;
  }
  return false;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(
  attempt: number,
  base: number,
  cap: number,
  jitter: number,
): number {
  const exp = base * Math.pow(2, attempt - 1);
  const capped = Math.min(exp, cap);
  // Symmetrischer Jitter: capped * (1 +/- jitter)
  const jitterDelta = capped * jitter * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitterDelta));
}

export interface RetryError extends Error {
  attempts: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 30000;
  const jitterFactor = options.jitterFactor ?? 0.1;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  const label = options.label ?? 'retry';

  let lastError: unknown = new Error(`${label}: maxAttempts must be >= 1`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const willRetry = attempt < maxAttempts && shouldRetry(err, attempt);
      if (!willRetry) {
        // Letzter Versuch oder nicht retry-bar: weiterwerfen mit Annotation
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error('retry exhausted', {
          label,
          attempts: attempt,
          err: errMsg,
        });
        const finalErr =
          err instanceof Error
            ? Object.assign(err, { attempts: attempt }) as RetryError
            : Object.assign(new Error(String(err)), {
                attempts: attempt,
              }) as RetryError;
        throw finalErr;
      }
      const delay = computeDelay(attempt, baseDelayMs, maxDelayMs, jitterFactor);
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn('retry attempt failed, backing off', {
        label,
        attempt,
        next_delay_ms: delay,
        err: errMsg,
      });
      await wait(delay);
    }
  }
  // unreachable, but TS wants it
  throw lastError;
}

// ─── API-spezifische Wrapper ────────────────────────────────────────────────

export function retryApollo<T>(
  fn: () => Promise<T>,
  override: Partial<RetryOptions> = {},
): Promise<T> {
  // Apollo ist 429-heavy bei Search-Endpoints. Mehr Versuche, gleiches Backoff.
  return retryWithBackoff(fn, {
    maxAttempts: 5,
    baseDelayMs: 1500,
    maxDelayMs: 30000,
    label: 'apollo',
    ...override,
  });
}

export function retryCalendar<T>(
  fn: () => Promise<T>,
  override: Partial<RetryOptions> = {},
): Promise<T> {
  // Google Calendar: meist 401 (Token-Refresh) oder 503. 3 Versuche reichen.
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    label: 'google_calendar',
    ...override,
  });
}

export function retryGmail<T>(
  fn: () => Promise<T>,
  override: Partial<RetryOptions> = {},
): Promise<T> {
  // Gmail-API: 429 selten, 503 nach Throttling moeglich.
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    label: 'gmail',
    ...override,
  });
}

export function retryOpenAI<T>(
  fn: () => Promise<T>,
  override: Partial<RetryOptions> = {},
): Promise<T> {
  // OpenAI/Anthropic SDKs werfen mit `.status` Property, defaultShouldRetry
  // greift. 3 Versuche, basis 2s wegen lange Streams die abreissen koennen.
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelayMs: 2000,
    label: 'openai',
    ...override,
  });
}

export function retryBrevo<T>(
  fn: () => Promise<T>,
  override: Partial<RetryOptions> = {},
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    label: 'brevo',
    ...override,
  });
}
