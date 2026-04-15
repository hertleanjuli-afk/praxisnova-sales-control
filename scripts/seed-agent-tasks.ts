/**
 * Seed-Script: liest Agent build/TASKS.md und synct nach agent_tasks DB-Tabelle.
 *
 * Run (local): npx tsx scripts/seed-agent-tasks.ts
 * Oder via Node 24: node --experimental-strip-types scripts/seed-agent-tasks.ts
 *
 * Env: DATABASE_URL Pflicht, TASKS_MD_PATH optional (default ~/Desktop/PraxisNovaAI/Agent build/TASKS.md)
 */

import { getTasks } from '../lib/helpers/tasks-md-reader';
import sql from '../lib/db';

type Priority = 'low' | 'medium' | 'high' | 'critical';

function inferPriority(phase: string, title: string): Priority {
  const lower = (phase + ' ' + title).toLowerCase();
  if (lower.includes('critical') || lower.includes('p0')) return 'critical';
  if (lower.includes('high') || lower.includes('p1') || lower.includes('dringend')) return 'high';
  if (lower.includes('tier 4') || lower.includes('nice-to-have') || lower.includes('spaeter')) return 'low';
  return 'medium';
}

function extractTaskCode(title: string): string | null {
  const match = title.match(/^(\d+(?:\.\d+)*)\s/);
  return match ? match[1] : null;
}

function mapStatus(s: string): 'open' | 'in_progress' | 'done' | 'blocked' {
  switch (s) {
    case 'done':
      return 'done';
    case 'in_progress':
      return 'in_progress';
    case 'blocked':
      return 'blocked';
    default:
      return 'open';
  }
}

async function main() {
  const phases = await getTasks();
  if (phases.length === 0) {
    console.error('TASKS.md leer oder nicht lesbar.');
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;

  for (const phase of phases) {
    for (const item of phase.items) {
      const taskCode = extractTaskCode(item.text);
      const status = mapStatus(item.status);
      const priority = inferPriority(phase.phase, item.text);

      const result = await sql`
        INSERT INTO agent_tasks (phase, task_code, title, status, priority, updated_at)
        VALUES (${phase.phase}, ${taskCode}, ${item.text}, ${status}, ${priority}, NOW())
        ON CONFLICT (phase, task_code) DO UPDATE
        SET title = EXCLUDED.title,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            updated_at = NOW(),
            completed_at = CASE WHEN EXCLUDED.status = 'done' THEN NOW() ELSE agent_tasks.completed_at END
        RETURNING (xmax = 0) as inserted
      `;
      if (result[0]?.inserted) inserted++;
      else updated++;
    }
  }

  console.log(JSON.stringify({ inserted, updated, phases: phases.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
