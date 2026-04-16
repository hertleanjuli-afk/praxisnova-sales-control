import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_LLM_CONFIG, getAgentConfig } from '../../lib/llm/config.ts';

test('AGENT_LLM_CONFIG has all Phase-1 agents on gemini-paid', () => {
  for (const [name, cfg] of Object.entries(AGENT_LLM_CONFIG)) {
    assert.equal(cfg.provider, 'gemini-paid', `${name} should be gemini-paid in Phase 1`);
    assert.equal(cfg.pseudonymize, false, `${name} should not pseudonymize in Phase 1`);
  }
});

test('AGENT_LLM_CONFIG has expected core agents', () => {
  const expected = [
    'prospect-researcher', 'sales-supervisor', 'outreach-strategist',
    'operations-manager', 'apollo-sync', 'health-monitor',
  ];
  for (const name of expected) {
    assert.ok(AGENT_LLM_CONFIG[name], `missing ${name}`);
  }
});

test('getAgentConfig returns config for known agent', () => {
  const cfg = getAgentConfig('prospect-researcher');
  assert.equal(cfg.provider, 'gemini-paid');
  assert.equal(cfg.pseudonymize, false);
});

test('getAgentConfig falls back to DEFAULT_LLM_PROVIDER for unknown agent', () => {
  const originalEnv = process.env.DEFAULT_LLM_PROVIDER;
  process.env.DEFAULT_LLM_PROVIDER = 'groq';
  try {
    const cfg = getAgentConfig('non-existent-agent');
    assert.equal(cfg.provider, 'groq');
    assert.equal(cfg.pseudonymize, false);
  } finally {
    if (originalEnv === undefined) delete process.env.DEFAULT_LLM_PROVIDER;
    else process.env.DEFAULT_LLM_PROVIDER = originalEnv;
  }
});

test('getAgentConfig falls back to gemini-paid when no default set', () => {
  const originalEnv = process.env.DEFAULT_LLM_PROVIDER;
  delete process.env.DEFAULT_LLM_PROVIDER;
  try {
    const cfg = getAgentConfig('another-non-existent');
    assert.equal(cfg.provider, 'gemini-paid');
  } finally {
    if (originalEnv !== undefined) process.env.DEFAULT_LLM_PROVIDER = originalEnv;
  }
});
