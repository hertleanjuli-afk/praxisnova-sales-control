import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_PATH =
  process.env.TASKS_MD_PATH ??
  path.join(
    process.env.HOME ?? '',
    'Desktop/PraxisNovaAI/Agent build/TASKS.md',
  );

export interface TaskItem {
  status: 'open' | 'in_progress' | 'done' | 'blocked';
  text: string;
  raw: string;
}

export interface TaskPhase {
  phase: string;
  items: TaskItem[];
}

const STATUS_MAP: Record<string, TaskItem['status']> = {
  ' ': 'open',
  '>': 'in_progress',
  x: 'done',
  '!': 'blocked',
};

const REVERSE_STATUS: Record<TaskItem['status'], string> = {
  open: ' ',
  in_progress: '>',
  done: 'x',
  blocked: '!',
};

function parseLine(line: string): TaskItem | null {
  const match = line.match(/^- \[([ x>!])\]\s+(.+)$/);
  if (!match) return null;
  const status = STATUS_MAP[match[1]] ?? 'open';
  return { status, text: match[2].trim(), raw: line };
}

export async function getTasks(filePath: string = DEFAULT_PATH): Promise<TaskPhase[]> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    console.warn(JSON.stringify({ level: 'warn', msg: 'tasks.md not found', filePath, ts: new Date().toISOString() }));
    return [];
  }

  const phases: TaskPhase[] = [];
  let current: TaskPhase | null = null;

  for (const line of content.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) phases.push(current);
      current = { phase: line.slice(3).trim(), items: [] };
      continue;
    }
    if (!current) continue;
    const item = parseLine(line);
    if (item) current.items.push(item);
  }
  if (current) phases.push(current);
  return phases;
}

export async function updateTaskStatus(
  phase: string,
  taskText: string,
  status: TaskItem['status'],
  filePath: string = DEFAULT_PATH,
): Promise<boolean> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return false;
  }

  const lines = content.split('\n');
  let inPhase = false;
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      inPhase = line.slice(3).trim() === phase;
      continue;
    }
    if (!inPhase) continue;
    const item = parseLine(line);
    if (item && item.text === taskText) {
      const mark = REVERSE_STATUS[status];
      lines[i] = line.replace(/^- \[[ x>!]\]/, `- [${mark}]`);
      updated = true;
      break;
    }
  }

  if (updated) await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
  return updated;
}
