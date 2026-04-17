import test from 'node:test';
import assert from 'node:assert/strict';
import { observe, notifySlack } from '../../lib/observability/logger.ts';

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalFetch = globalThis.fetch;

function captureConsole(): { logs: string[]; restore: () => void } {
  const logs: string[] = [];
  console.log = (msg: unknown) => logs.push(String(msg));
  console.warn = (msg: unknown) => logs.push(String(msg));
  console.error = (msg: unknown) => logs.push(String(msg));
  return {
    logs,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

// ─── observe.* writes structured JSON ───────────────────────────────────────

test('observe.info writes JSON line with all required fields', () => {
  const c = captureConsole();
  try {
    observe.info({
      agent: 'lead_ingestor',
      skill: 'apollo.prospect',
      message: 'imported 12 leads',
      context: { batch_id: 'b-7' },
      duration_ms: 432,
    });
    assert.equal(c.logs.length, 1);
    const parsed = JSON.parse(c.logs[0]);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.agent, 'lead_ingestor');
    assert.equal(parsed.skill, 'apollo.prospect');
    assert.equal(parsed.message, 'imported 12 leads');
    assert.deepEqual(parsed.context, { batch_id: 'b-7' });
    assert.equal(parsed.duration_ms, 432);
    assert.ok(typeof parsed.timestamp === 'string');
  } finally {
    c.restore();
  }
});

test('observe defaults skill to null and context to empty object', () => {
  const c = captureConsole();
  try {
    observe.warn({ agent: 'health_checker', message: 'lag detected' });
    const parsed = JSON.parse(c.logs[0]);
    assert.equal(parsed.skill, null);
    assert.deepEqual(parsed.context, {});
    assert.equal(parsed.duration_ms, null);
  } finally {
    c.restore();
  }
});

test('observe.warn routes to console.warn', () => {
  const calls: { method: string; msg: string }[] = [];
  console.log = (m) => calls.push({ method: 'log', msg: String(m) });
  console.warn = (m) => calls.push({ method: 'warn', msg: String(m) });
  console.error = (m) => calls.push({ method: 'error', msg: String(m) });
  try {
    observe.warn({ agent: 'a', message: 'm' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'warn');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

// ─── Slack-Notification ─────────────────────────────────────────────────────

test('notifySlack: no webhook env, no fetch call', async () => {
  delete process.env.SLACK_ALERT_WEBHOOK;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response('ok');
  }) as typeof fetch;
  try {
    await notifySlack({
      timestamp: new Date().toISOString(),
      agent: 'a',
      skill: null,
      level: 'error',
      message: 'm',
      context: {},
      duration_ms: null,
    });
    assert.equal(fetchCalls, 0);
  } finally {
    restoreFetch();
  }
});

test('notifySlack: with webhook env, fetch called with POST and body', async () => {
  process.env.SLACK_ALERT_WEBHOOK = 'https://hooks.slack.test/test';
  let captured: { url: string; method: string; body: string } | null = null;
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    const i = init as { method?: string; body?: string };
    captured = {
      url: String(url),
      method: i.method ?? 'GET',
      body: i.body ?? '',
    };
    return new Response('ok');
  }) as typeof fetch;
  try {
    await notifySlack({
      timestamp: '2026-04-18T08:00:00.000Z',
      agent: 'outreach_strategist',
      skill: 'sales.draft-outreach',
      level: 'error',
      message: 'apollo enrichment failed',
      context: { lead_id: 1234 },
      duration_ms: 8421,
    });
    assert.ok(captured);
    assert.equal(captured!.url, 'https://hooks.slack.test/test');
    assert.equal(captured!.method, 'POST');
    assert.ok(captured!.body.includes('outreach_strategist'));
    assert.ok(captured!.body.includes('sales.draft-outreach'));
    assert.ok(captured!.body.includes('apollo enrichment failed'));
  } finally {
    delete process.env.SLACK_ALERT_WEBHOOK;
    restoreFetch();
  }
});

test('notifySlack: webhook returns non-ok, no throw', async () => {
  process.env.SLACK_ALERT_WEBHOOK = 'https://hooks.slack.test/x';
  globalThis.fetch = (async () => new Response('rate limited', { status: 429 })) as typeof fetch;
  const c = captureConsole();
  try {
    // should not throw
    await notifySlack({
      timestamp: new Date().toISOString(),
      agent: 'a',
      skill: null,
      level: 'error',
      message: 'm',
      context: {},
      duration_ms: null,
    });
    // last log should mention slack non-ok
    const found = c.logs.some((l) => l.includes('slack webhook non-ok'));
    assert.equal(found, true);
  } finally {
    delete process.env.SLACK_ALERT_WEBHOOK;
    restoreFetch();
    c.restore();
  }
});

test('notifySlack: webhook throws (network), caught and logged', async () => {
  process.env.SLACK_ALERT_WEBHOOK = 'https://hooks.slack.test/x';
  globalThis.fetch = (async () => {
    throw new Error('network down');
  }) as typeof fetch;
  const c = captureConsole();
  try {
    await notifySlack({
      timestamp: new Date().toISOString(),
      agent: 'a',
      skill: null,
      level: 'error',
      message: 'm',
      context: {},
      duration_ms: null,
    });
    const found = c.logs.some((l) => l.includes('slack webhook threw'));
    assert.equal(found, true);
  } finally {
    delete process.env.SLACK_ALERT_WEBHOOK;
    restoreFetch();
    c.restore();
  }
});

test('observe.error: triggers Slack-Send when webhook env set', async () => {
  process.env.SLACK_ALERT_WEBHOOK = 'https://hooks.slack.test/y';
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response('ok');
  }) as typeof fetch;
  const c = captureConsole();
  try {
    await observe.error({
      agent: 'reply_detector',
      message: 'triage failed',
      context: { msg_id: 'gmail-x' },
    });
    assert.equal(fetchCalls, 1);
    // Auch Console hat den Eintrag bekommen
    const found = c.logs.some((l) => l.includes('triage failed'));
    assert.equal(found, true);
  } finally {
    delete process.env.SLACK_ALERT_WEBHOOK;
    restoreFetch();
    c.restore();
  }
});

test('observe.error: NO Slack-Send when webhook not set, only console', async () => {
  delete process.env.SLACK_ALERT_WEBHOOK;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response('ok');
  }) as typeof fetch;
  const c = captureConsole();
  try {
    await observe.error({
      agent: 'reply_detector',
      message: 'triage failed',
      context: {},
    });
    assert.equal(fetchCalls, 0);
    const found = c.logs.some((l) => l.includes('triage failed'));
    assert.equal(found, true);
  } finally {
    restoreFetch();
    c.restore();
  }
});
