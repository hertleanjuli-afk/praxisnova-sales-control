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
    'operations-manager', 'news-agent', 'health-monitor',
  ];
  for (const name of expected) {
    assert.ok(AGENT_LLM_CONFIG[name], `missing ${name}`);
  }
});

test('AGENT_LLM_CONFIG has exactly 24 agents after cleanup', () => {
  assert.equal(Object.keys(AGENT_LLM_CONFIG).length, 24);
});

test('AGENT_LLM_CONFIG contains no non-LLM agents', () => {
  const forbidden = ['apollo-sync', 'google-calendar-sync', 'daily-backup'];
  for (const name of forbidden) {
    assert.equal(AGENT_LLM_CONFIG[name], undefined, `${name} should not be in AGENT_LLM_CONFIG (no LLM calls)`);
  }
});

test('AGENT_LLM_CONFIG contains no non-existent routes', () => {
  const nonExistent = [
    'reply-detection', 'website-inquiry', 'email-inbox-agent',
    'marketing-supervisor', 'reporting-forecasting', 'fix-agent',
    'content-strategist', 'data-integrity', 'process-sequences-late',
    'apollo-sync-1', 'apollo-sync-2', 'apollo-sync-3',
  ];
  for (const name of nonExistent) {
    assert.equal(AGENT_LLM_CONFIG[name], undefined, `${name} has no corresponding cron route`);
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
