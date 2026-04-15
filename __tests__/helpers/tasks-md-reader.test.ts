import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getTasks, updateTaskStatus } from '../../lib/helpers/tasks-md-reader.ts';

const FIXTURE = `# Title

## PHASE 1 Fundament
- [x] 1.1 Setup done
- [>] 1.2 Reorg in progress
- [ ] 1.3 Docs open

## PHASE 2 Next
- [!] 2.1 Blocked item
- [ ] 2.2 Second
`;

async function withTempFile(fn: (p: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tasks-'));
  const file = path.join(dir, 'TASKS.md');
  await fs.writeFile(file, FIXTURE, 'utf-8');
  try {
    await fn(file);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('getTasks parses phases and item statuses', async () => {
  await withTempFile(async (file) => {
    const phases = await getTasks(file);
    assert.equal(phases.length, 2);
    assert.equal(phases[0].phase, 'PHASE 1 Fundament');
    assert.equal(phases[0].items.length, 3);
    assert.equal(phases[0].items[0].status, 'done');
    assert.equal(phases[0].items[1].status, 'in_progress');
    assert.equal(phases[0].items[2].status, 'open');
    assert.equal(phases[1].items[0].status, 'blocked');
  });
});

test('updateTaskStatus flips a single item', async () => {
  await withTempFile(async (file) => {
    const updated = await updateTaskStatus('PHASE 1 Fundament', '1.3 Docs open', 'done', file);
    assert.equal(updated, true);
    const phases = await getTasks(file);
    const item = phases[0].items.find((i) => i.text === '1.3 Docs open');
    assert.equal(item?.status, 'done');
  });
});

test('updateTaskStatus returns false for unknown task', async () => {
  await withTempFile(async (file) => {
    const updated = await updateTaskStatus('PHASE 99', 'nope', 'done', file);
    assert.equal(updated, false);
  });
});

test('getTasks returns empty array for missing file', async () => {
  const phases = await getTasks('/nonexistent/path/TASKS.md');
  assert.deepEqual(phases, []);
});
