import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthError } from '../../lib/llm/types.ts';
import { callLLM, callLLMForAgent } from '../../lib/llm/index.ts';

test('callLLM throws AuthError for gemini-paid without GEMINI_API_KEY', async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(
      async () => callLLM({ prompt: 'hi' }, 'gemini-paid'),
      (err: unknown) => err instanceof AuthError && (err as AuthError).provider === 'gemini-paid',
    );
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
  }
});

test('callLLM throws AuthError for gemini-free without GEMINI_FREE_API_KEY', async () => {
  const original = process.env.GEMINI_FREE_API_KEY;
  delete process.env.GEMINI_FREE_API_KEY;
  try {
    await assert.rejects(
      async () => callLLM({ prompt: 'hi' }, 'gemini-free'),
      (err: unknown) => err instanceof AuthError && (err as AuthError).provider === 'gemini-free',
    );
  } finally {
    if (original !== undefined) process.env.GEMINI_FREE_API_KEY = original;
  }
});

test('callLLM throws AuthError for groq without GROQ_API_KEY', async () => {
  const original = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    await assert.rejects(
      async () => callLLM({ prompt: 'hi' }, 'groq'),
      (err: unknown) => err instanceof AuthError && (err as AuthError).provider === 'groq',
    );
  } finally {
    if (original !== undefined) process.env.GROQ_API_KEY = original;
  }
});

test('callLLM uses DEFAULT_LLM_PROVIDER env when no provider given', async () => {
  const originalDefault = process.env.DEFAULT_LLM_PROVIDER;
  const originalGroq = process.env.GROQ_API_KEY;
  process.env.DEFAULT_LLM_PROVIDER = 'groq';
  delete process.env.GROQ_API_KEY;
  try {
    await assert.rejects(
      async () => callLLM({ prompt: 'hi' }),
      (err: unknown) => err instanceof AuthError && (err as AuthError).provider === 'groq',
    );
  } finally {
    if (originalDefault === undefined) delete process.env.DEFAULT_LLM_PROVIDER;
    else process.env.DEFAULT_LLM_PROVIDER = originalDefault;
    if (originalGroq !== undefined) process.env.GROQ_API_KEY = originalGroq;
  }
});

test('callLLMForAgent resolves provider from AGENT_LLM_CONFIG', async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(
      async () => callLLMForAgent('prospect-researcher', { prompt: 'hi' }),
      (err: unknown) => err instanceof AuthError && (err as AuthError).provider === 'gemini-paid',
    );
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
  }
});
