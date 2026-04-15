import test from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../../lib/helpers/logger.ts';

function captureConsole(method: 'log' | 'warn' | 'error', fn: () => void): string[] {
  const captured: string[] = [];
  const original = console[method];
  console[method] = (msg: string) => captured.push(msg);
  try {
    fn();
  } finally {
    console[method] = original;
  }
  return captured;
}

test('logger.info emits JSON with level, msg, and ts', () => {
  const out = captureConsole('log', () => logger.info('hello', { userId: 42 }));
  assert.equal(out.length, 1);
  const parsed = JSON.parse(out[0]);
  assert.equal(parsed.level, 'info');
  assert.equal(parsed.msg, 'hello');
  assert.equal(parsed.userId, 42);
  assert.match(parsed.ts, /^\d{4}-\d{2}-\d{2}T/);
});

test('logger.warn and error route to correct console methods', () => {
  const warnOut = captureConsole('warn', () => logger.warn('warn-msg'));
  const errOut = captureConsole('error', () => logger.error('err-msg'));
  assert.equal(JSON.parse(warnOut[0]).level, 'warn');
  assert.equal(JSON.parse(errOut[0]).level, 'error');
});

test('logger works without meta', () => {
  const out = captureConsole('log', () => logger.info('no-meta'));
  const parsed = JSON.parse(out[0]);
  assert.equal(parsed.msg, 'no-meta');
  assert.equal(parsed.level, 'info');
});
