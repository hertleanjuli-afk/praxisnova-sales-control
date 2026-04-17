import test from 'node:test';
import assert from 'node:assert/strict';
import { executeFallback, type SkillRunner } from '../../lib/agents/fallback.ts';
import {
  leadIngestor,
  outreachStrategist,
  replyDetector,
} from '../../lib/agents/configs.ts';

// Konsolen-Stille fuer Tests (Logger schreibt nach JSON.stringify, das Output ist OK).
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
function silenceConsole() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function restoreConsole() {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

// Mock-Runner fuer skill-basierten Fallback
function makeRunner(behavior: 'ok' | 'fail'): SkillRunner {
  return {
    async runSkill(skillId: string, _ctx) {
      if (behavior === 'ok') return { skill: skillId, ok: true };
      throw new Error(`skill ${skillId} crashed`);
    },
  };
}

// ─── Lead-Ingestor (Fallback-Type: legacy) ──────────────────────────────────

test('lead_ingestor: primary success, no fallback triggered', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      leadIngestor.name,
      async () => ({ leads_imported: 42 }),
      leadIngestor.fallback,
      { agent: leadIngestor.name, task_type: 'lead_ingest' },
    );
    assert.equal(result.outcome, 'primary');
    assert.deepEqual(result.result, { leads_imported: 42 });
  } finally {
    restoreConsole();
  }
});

test('lead_ingestor: primary fails, legacy-fallback handler returns', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      leadIngestor.name,
      async () => {
        throw new Error('apollo 422');
      },
      leadIngestor.fallback,
      { agent: leadIngestor.name, task_type: 'lead_ingest' },
    );
    assert.equal(result.outcome, 'fallback');
    assert.equal(result.fallback_kind, 'legacy');
    assert.deepEqual(result.result, { leads_imported: 0 });
  } finally {
    restoreConsole();
  }
});

test('lead_ingestor: primary AND legacy-fallback fail, safe-noop returned', async () => {
  silenceConsole();
  try {
    const brokenSpec = {
      type: 'legacy' as const,
      handler: async () => {
        throw new Error('legacy crashed too');
      },
    };
    const result = await executeFallback(
      leadIngestor.name,
      async () => {
        throw new Error('apollo 422');
      },
      brokenSpec,
      { agent: leadIngestor.name, task_type: 'lead_ingest' },
    );
    assert.equal(result.outcome, 'safe-noop');
    assert.equal(result.fallback_kind, 'noop');
    assert.equal(result.result, null);
  } finally {
    restoreConsole();
  }
});

// ─── Outreach-Strategist (Fallback-Type: skill) ─────────────────────────────

test('outreach_strategist: primary success, no fallback triggered', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      outreachStrategist.name,
      async () => ({ draft: 'hi' }),
      outreachStrategist.fallback,
      { agent: outreachStrategist.name, task_type: 'outreach_draft' },
      makeRunner('ok'),
    );
    assert.equal(result.outcome, 'primary');
  } finally {
    restoreConsole();
  }
});

test('outreach_strategist: primary fails, skill-fallback runs', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      outreachStrategist.name,
      async () => {
        throw new Error('brand-voice unavailable');
      },
      outreachStrategist.fallback,
      { agent: outreachStrategist.name, task_type: 'outreach_draft' },
      makeRunner('ok'),
    );
    assert.equal(result.outcome, 'fallback');
    assert.equal(result.fallback_kind, 'skill');
    assert.deepEqual(result.result, {
      skill: 'marketing.draft-content',
      ok: true,
    });
  } finally {
    restoreConsole();
  }
});

test('outreach_strategist: primary fails AND fallback-skill fails -> safe-noop', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      outreachStrategist.name,
      async () => {
        throw new Error('brand-voice unavailable');
      },
      outreachStrategist.fallback,
      { agent: outreachStrategist.name, task_type: 'outreach_draft' },
      makeRunner('fail'),
    );
    assert.equal(result.outcome, 'safe-noop');
    assert.equal(result.result, null);
  } finally {
    restoreConsole();
  }
});

// ─── Reply-Detector (Fallback-Type: noop) ───────────────────────────────────

test('reply_detector: primary success, no fallback triggered', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      replyDetector.name,
      async () => ({ triaged: true }),
      replyDetector.fallback,
      { agent: replyDetector.name, task_type: 'reply_triage' },
    );
    assert.equal(result.outcome, 'primary');
  } finally {
    restoreConsole();
  }
});

test('reply_detector: primary fails, safe-noop returned (no fallback work)', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      replyDetector.name,
      async () => {
        throw new Error('triage skill 500');
      },
      replyDetector.fallback,
      { agent: replyDetector.name, task_type: 'reply_triage' },
    );
    assert.equal(result.outcome, 'safe-noop');
    assert.equal(result.fallback_kind, 'noop');
    assert.equal(result.result, null);
  } finally {
    restoreConsole();
  }
});

test('reply_detector: missing fallback-spec defaults to safe-noop', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      replyDetector.name,
      async () => {
        throw new Error('boom');
      },
      undefined,
      { agent: replyDetector.name, task_type: 'reply_triage' },
    );
    assert.equal(result.outcome, 'safe-noop');
    assert.equal(result.fallback_kind, 'noop');
  } finally {
    restoreConsole();
  }
});

// ─── Edge: skill-fallback ohne Runner ───────────────────────────────────────

test('skill-fallback without runner falls through to safe-noop', async () => {
  silenceConsole();
  try {
    const result = await executeFallback(
      outreachStrategist.name,
      async () => {
        throw new Error('primary fail');
      },
      outreachStrategist.fallback,
      { agent: outreachStrategist.name, task_type: 'outreach_draft' },
      // KEIN Runner uebergeben
    );
    assert.equal(result.outcome, 'safe-noop');
  } finally {
    restoreConsole();
  }
});
