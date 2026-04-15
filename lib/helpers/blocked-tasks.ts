import sql from '../db';
import { logger } from './logger';

interface BlockedTaskInput {
  agent: string;
  task: string;
  reason: string;
}

export async function recordBlockedTask(input: BlockedTaskInput): Promise<void> {
  try {
    await sql`
      INSERT INTO blocked_tasks (task_name, agent_name, reason, attempts, last_attempt)
      VALUES (${input.task}, ${input.agent}, ${input.reason}, 1, NOW())
      ON CONFLICT DO NOTHING
    `;
    await sql`
      UPDATE blocked_tasks
      SET attempts = attempts + 1,
          last_attempt = NOW(),
          reason = ${input.reason}
      WHERE task_name = ${input.task}
        AND agent_name = ${input.agent}
        AND resolved = FALSE
    `;
  } catch (err) {
    logger.warn('blocked_tasks table write failed', {
      err: err instanceof Error ? err.message : String(err),
      agent: input.agent,
      task: input.task,
    });
  }
}

export async function resolveBlockedTask(
  agent: string,
  task: string,
  notes: string,
): Promise<void> {
  try {
    await sql`
      UPDATE blocked_tasks
      SET resolved = TRUE,
          resolved_at = NOW(),
          resolution_notes = ${notes}
      WHERE task_name = ${task}
        AND agent_name = ${agent}
        AND resolved = FALSE
    `;
  } catch (err) {
    logger.warn('blocked_tasks resolve failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
