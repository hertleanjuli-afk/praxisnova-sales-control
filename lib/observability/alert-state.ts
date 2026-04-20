/**
 * State-basiertes Alerting fuer Push-Channel-Dedup.
 *
 * Problem-Hintergrund: `observe.error({ critical: true })` triggert
 * ntfy + Slack. Wenn ein Agent-Run jede Minute failed (wie Calendar-OAuth
 * im LECK-17), bekommt Angie Spam.
 *
 * Pattern:
 *   - reportAgentFailure(agent, message)
 *       -> schreibt State-Row, erhoeht consecutive_failures,
 *       -> feuert EINEN observe.error erst beim 3. failure in Folge,
 *       -> danach alle `cooldownMinutes` nochmal einen (damit Angie
 *          nicht vergisst, aber nicht alle 5 Min gespammed wird)
 *
 *   - reportAgentSuccess(agent)
 *       -> wenn consecutive_failures > 0 war und ein Alert gefeuert
 *          wurde: EINEN observe.info "recovery" Push
 *       -> setzt Counter zurueck
 *
 * Die Entscheidung "fire-push-yes-no" basiert auf Row-State, nicht auf
 * In-Memory-Flag. Damit funktioniert das auch ueber Cron-Restarts hinweg.
 */

import sql from '../db';
import { observe } from './logger';

const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MINUTES = 60;

export interface AlertStateOptions {
  /** Erst nach diesen consecutive failures einen Alert feuern. Default 3. */
  failureThreshold?: number;
  /** Mindest-Abstand in Minuten zwischen zwei Error-Alerts fuer denselben Agent. Default 60. */
  cooldownMinutes?: number;
}

interface StateRow {
  agent_name: string;
  consecutive_failures: number;
  last_alerted_at: string | null;
  last_alert_level: 'error' | 'recovery' | null;
}

async function readState(agent: string): Promise<StateRow | null> {
  const rows = (await sql`
    SELECT agent_name, consecutive_failures, last_alerted_at, last_alert_level
    FROM agent_error_state
    WHERE agent_name = ${agent}
    LIMIT 1
  `) as unknown as StateRow[];
  return rows[0] ?? null;
}

async function upsertFailure(agent: string, message: string): Promise<StateRow> {
  const rows = (await sql`
    INSERT INTO agent_error_state (agent_name, consecutive_failures, last_failure_at, last_error_message)
    VALUES (${agent}, 1, NOW(), ${message})
    ON CONFLICT (agent_name) DO UPDATE
      SET consecutive_failures = agent_error_state.consecutive_failures + 1,
          last_failure_at = NOW(),
          last_error_message = EXCLUDED.last_error_message
    RETURNING agent_name, consecutive_failures, last_alerted_at, last_alert_level
  `) as unknown as StateRow[];
  return rows[0];
}

async function markSuccess(agent: string): Promise<void> {
  await sql`
    INSERT INTO agent_error_state (agent_name, consecutive_failures, last_success_at)
    VALUES (${agent}, 0, NOW())
    ON CONFLICT (agent_name) DO UPDATE
      SET consecutive_failures = 0,
          last_success_at = NOW()
  `;
}

async function markAlerted(agent: string, level: 'error' | 'recovery'): Promise<void> {
  await sql`
    UPDATE agent_error_state
    SET last_alerted_at = NOW(), last_alert_level = ${level}
    WHERE agent_name = ${agent}
  `;
}

/**
 * Meldet einen Failure fuer einen Agent. Entscheidet intern ob ein Push
 * gefeuert wird oder nicht (nur bei failure_threshold erreicht und
 * cooldown abgelaufen).
 *
 * @returns true wenn Push gefeuert wurde, false wenn unterdrueckt
 */
export async function reportAgentFailure(
  agent: string,
  message: string,
  context: Record<string, unknown> = {},
  options: AlertStateOptions = {},
): Promise<boolean> {
  const threshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const cooldownMs = (options.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES) * 60 * 1000;

  let state: StateRow | null = null;
  try {
    state = await upsertFailure(agent, message.slice(0, 500));
  } catch (dbErr) {
    // DB down = wir koennen State nicht tracken. Fallback: direkten observe.error
    // damit Incidents nicht im stillen verschwinden.
    console.error('[alert-state] db upsert failed, falling back to direct alert:', dbErr);
    await observe.error({
      agent,
      message: `${message} (alert-state db unavailable)`,
      context: { ...context, alert_state_db_failed: true, critical: true },
    });
    return true;
  }

  if (state.consecutive_failures < threshold) {
    // Noch nicht oft genug failed, nur stilles log
    observe.warn({
      agent,
      message: 'agent failure suppressed until threshold',
      context: {
        ...context,
        consecutive_failures: state.consecutive_failures,
        threshold,
      },
    });
    return false;
  }

  // Threshold erreicht. Prueft Cooldown.
  if (state.last_alerted_at) {
    const lastAlertMs = new Date(state.last_alerted_at).getTime();
    const sinceLastMs = Date.now() - lastAlertMs;
    if (sinceLastMs < cooldownMs && state.last_alert_level === 'error') {
      observe.warn({
        agent,
        message: 'agent failure suppressed by cooldown',
        context: {
          ...context,
          consecutive_failures: state.consecutive_failures,
          cooldown_minutes: options.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES,
          since_last_alert_ms: sinceLastMs,
        },
      });
      return false;
    }
  }

  // Fire push + mark alerted
  await observe.error({
    agent,
    message,
    context: {
      ...context,
      consecutive_failures: state.consecutive_failures,
      critical: true,
    },
  });
  try {
    await markAlerted(agent, 'error');
  } catch (dbErr) {
    console.warn('[alert-state] could not mark alerted (non-fatal):', dbErr);
  }
  return true;
}

/**
 * Meldet einen Success. Wenn zuvor Alerts gefeuert wurden, sendet EINEN
 * "recovery" Push (Priority=default, kein Sound).
 *
 * @returns true wenn Recovery-Push gefeuert wurde
 */
export async function reportAgentSuccess(
  agent: string,
  context: Record<string, unknown> = {},
): Promise<boolean> {
  let previousState: StateRow | null = null;
  try {
    previousState = await readState(agent);
  } catch {
    // Fallback: keine recovery-Push, aber mark success
  }

  try {
    await markSuccess(agent);
  } catch (dbErr) {
    console.warn('[alert-state] markSuccess failed (non-fatal):', dbErr);
  }

  if (
    previousState &&
    previousState.consecutive_failures > 0 &&
    previousState.last_alert_level === 'error'
  ) {
    observe.info({
      agent,
      message: 'agent recovered',
      context: { ...context, previous_failures: previousState.consecutive_failures },
    });
    try {
      await markAlerted(agent, 'recovery');
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}
