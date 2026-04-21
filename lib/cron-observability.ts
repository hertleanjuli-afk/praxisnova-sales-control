/**
 * Cron-Observability Helpers (Track 1, T1.3).
 *
 * Kombiniert cron_locks (v9, Concurrent-Run-Guard) mit cron_runs (v11,
 * Run-History). Nutzbar aus jeder Cron-Route:
 *
 *   const ob = await beginCronRun('linkedin-feed');
 *   if (!ob) return { status: 'skipped' };
 *   try {
 *     // ...Work...
 *     await endCronRun(ob, 'success', { items: 42 });
 *   } catch (e) {
 *     await endCronRun(ob, 'failed', {}, String(e));
 *     throw e;
 *   }
 *
 * Gate 4 (PS 1.4 Agent-Safety): Idempotenz ueber cron_locks TTL, strukturiertes
 * Log pro Run, Status-Field erlaubt Alerts/Dashboards.
 */

import crypto from 'crypto';
import sql from './db';

export interface CronRunHandle {
  cronName: string;
  runId: string;
  rowId: number;
  startedAt: Date;
}

export interface CronBeginOptions {
  /** Lock-TTL in Sekunden. Default 300. */
  ttlSeconds?: number;
  /** Metadaten die in cron_runs.metadata landen. */
  metadata?: Record<string, unknown>;
}

/**
 * Startet einen Cron-Run. Versucht Lock in cron_locks zu akquirieren.
 * Wenn ein gueltiger (nicht abgelaufener) Lock existiert, wird null
 * zurueckgegeben = skip. Sonst wird Lock + cron_runs-Row geschrieben.
 */
export async function beginCronRun(
  cronName: string,
  options: CronBeginOptions = {}
): Promise<CronRunHandle | null> {
  const ttlSeconds = options.ttlSeconds ?? 300;
  const runId = crypto.randomUUID();
  const startedAt = new Date();

  // Lock akquirieren: INSERT, oder UPDATE wenn alter Lock ueber TTL hinaus ist.
  // Wir koennen nicht nur INSERT ... ON CONFLICT DO NOTHING machen, weil wir
  // abgelaufene Locks uebernehmen muessen.
  try {
    const lockRows = (await sql`
      INSERT INTO cron_locks (lock_name, acquired_at, released_at, ttl_seconds)
      VALUES (${cronName}, NOW(), NULL, ${ttlSeconds})
      ON CONFLICT (lock_name) DO UPDATE
        SET acquired_at = EXCLUDED.acquired_at,
            released_at = NULL,
            ttl_seconds = EXCLUDED.ttl_seconds
        WHERE cron_locks.released_at IS NOT NULL
           OR cron_locks.acquired_at < NOW() - (cron_locks.ttl_seconds || ' seconds')::interval
      RETURNING lock_name
    `) as Array<{ lock_name: string }>;

    if (lockRows.length === 0) {
      console.info(
        JSON.stringify({
          level: 'info',
          msg: 'cron-observability: lock busy, skipping run',
          cron: cronName,
          runId,
          ts: startedAt.toISOString(),
        })
      );
      return null;
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'cron-observability: lock acquire failed',
        cron: cronName,
        error: error instanceof Error ? error.message : String(error),
        ts: startedAt.toISOString(),
      })
    );
    // On lock failure, do not block the run, but report no handle back.
    return null;
  }

  const [runRow] = (await sql`
    INSERT INTO cron_runs (cron_name, run_id, started_at, status, metadata)
    VALUES (
      ${cronName},
      ${runId},
      ${startedAt.toISOString()},
      'running',
      ${options.metadata ? JSON.stringify(options.metadata) : null}
    )
    RETURNING id
  `) as Array<{ id: number }>;

  return { cronName, runId, rowId: runRow.id, startedAt };
}

export async function endCronRun(
  handle: CronRunHandle,
  status: 'success' | 'failed' | 'skipped',
  extras: { itemsProcessed?: number; metadata?: Record<string, unknown> } = {},
  errorMessage?: string
): Promise<void> {
  const finishedAt = new Date();
  try {
    await sql`
      UPDATE cron_runs
      SET finished_at = ${finishedAt.toISOString()},
          status = ${status},
          items_processed = ${extras.itemsProcessed ?? 0},
          error_message = ${errorMessage ?? null},
          metadata = COALESCE(${extras.metadata ? JSON.stringify(extras.metadata) : null}, metadata)
      WHERE id = ${handle.rowId}
    `;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'cron-observability: end-run write failed',
        cron: handle.cronName,
        runId: handle.runId,
        error: error instanceof Error ? error.message : String(error),
        ts: finishedAt.toISOString(),
      })
    );
  }
  try {
    await sql`
      UPDATE cron_locks
      SET released_at = ${finishedAt.toISOString()}
      WHERE lock_name = ${handle.cronName}
    `;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'cron-observability: lock release failed',
        cron: handle.cronName,
        error: error instanceof Error ? error.message : String(error),
        ts: finishedAt.toISOString(),
      })
    );
  }
}
