import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHttpError, withRetry } from '../../lib/llm/retry.ts';
import { RateLimitError, AuthError, ModelError } from '../../lib/llm/types.ts';

test('classifyHttpError maps 429 to RateLimitError', () => {
  const err = classifyHttpError(429, 'rate limit', 'groq');
  assert.ok(err instanceof RateLimitError);
  assert.equal(err.provider, 'groq');
});

test('classifyHttpError maps 401 and 403 to AuthError', () => {
  assert.ok(classifyHttpError(401, 'x', 'gemini-paid') instanceof AuthError);
  assert.ok(classifyHttpError(403, 'y', 'gemini-paid') instanceof AuthError);
});

test('classifyHttpError maps 500 to ModelError', () => {
  const err = classifyHttpError(500, 'internal', 'gemini-free');
  assert.ok(err instanceof ModelError);
  assert.equal(err.provider, 'gemini-free');
});

test('withRetry returns result on first success', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return 'ok';
  }, 'groq');
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('withRetry retries on RateLimitError and eventually succeeds', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 2) throw new RateLimitError('groq');
    return 'ok';
  }, 'groq');
  assert.equal(result, 'ok');
  assert.equal(calls, 2);
});

test('withRetry does NOT retry on AuthError', async () => {
  let calls = 0;
  await assert.rejects(
    async () =>
      withRetry(async () => {
        calls++;
        throw new AuthError('gemini-paid');
      }, 'gemini-paid'),
    (err: unknown) => err instanceof AuthError,
  );
  assert.equal(calls, 1);
});

test('withRetry exhausts 3 attempts and rethrows', async () => {
  let calls = 0;
  await assert.rejects(
    async () =>
      withRetry(async () => {
        calls++;
        throw new RateLimitError('groq');
      }, 'groq'),
    (err: unknown) => err instanceof RateLimitError,
  );
  assert.equal(calls, 3);
});
