/**
 * Fallback executor fuer skill-aware Agenten.
 *
 * Jeder Agent kann in seiner Konfiguration einen Fallback definieren:
 *   (a) legacy   - ruft eine bestehende, konventionelle Funktion auf
 *   (b) skill    - probiert eine sekundaere Skill-ID
 *   (c) noop     - tut nichts, loggt aber den Skip (Default)
 *
 * Der Executor ist skill-router-agnostisch: er weiss nicht, wie
 * Skills resolved werden, sondern delegiert das an den uebergebenen
 * SkillRunner. Das macht Tests einfach (Runner mockbar) und entkoppelt
 * Fallback-Logik von Skill-Discovery.
 *
 * Siehe Agent build/SKILL-ARCHITECTURE-2026-04-17.md Sektion 4.2 fuer
 * den groesseren Router-Kontext.
 */

import { logger } from '../helpers/logger.ts';

export type FallbackSpec =
  | { type: 'legacy'; handler: (context: unknown) => Promise<unknown> }
  | { type: 'skill'; skillId: string }
  | { type: 'noop' };

export interface AgentContext {
  agent: string;
  task_type?: string;
  [key: string]: unknown;
}

export interface SkillRunner {
  runSkill(skillId: string, context: AgentContext): Promise<unknown>;
}

export interface FallbackResult {
  outcome: 'primary' | 'fallback' | 'safe-noop';
  result: unknown;
  fallback_kind?: FallbackSpec['type'];
  duration_ms: number;
}

/**
 * Fuehrt die Primaer-Operation aus, faellt bei Error auf den Fallback zurueck.
 * Wenn der Fallback ebenfalls fehlschlaegt, wird Safe-NoOp zurueckgegeben
 * (loggt das Versagen, wirft NICHT, damit der Agent-Run nicht crasht).
 */
export async function executeFallback<T = unknown>(
  agent: string,
  primary: () => Promise<T>,
  spec: FallbackSpec | undefined,
  context: AgentContext,
  runner?: SkillRunner,
): Promise<FallbackResult> {
  const start = Date.now();
  const fallback: FallbackSpec = spec ?? { type: 'noop' };

  try {
    const result = await primary();
    return {
      outcome: 'primary',
      result,
      duration_ms: Date.now() - start,
    };
  } catch (primaryErr) {
    const primaryMsg =
      primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    logger.warn('agent.primary failed, attempting fallback', {
      agent,
      task_type: context.task_type,
      fallback_kind: fallback.type,
      err: primaryMsg,
    });

    try {
      let fallbackResult: unknown;
      if (fallback.type === 'legacy') {
        fallbackResult = await fallback.handler(context);
      } else if (fallback.type === 'skill') {
        if (!runner) {
          throw new Error(
            `fallback type=skill requires SkillRunner (skillId=${fallback.skillId})`,
          );
        }
        fallbackResult = await runner.runSkill(fallback.skillId, context);
      } else {
        // noop
        logger.info('agent.fallback safe-noop triggered', {
          agent,
          task_type: context.task_type,
          err: primaryMsg,
        });
        return {
          outcome: 'safe-noop',
          result: null,
          fallback_kind: 'noop',
          duration_ms: Date.now() - start,
        };
      }

      return {
        outcome: 'fallback',
        result: fallbackResult,
        fallback_kind: fallback.type,
        duration_ms: Date.now() - start,
      };
    } catch (fallbackErr) {
      const fallbackMsg =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : String(fallbackErr);
      logger.error('agent.fallback failed, returning safe-noop', {
        agent,
        task_type: context.task_type,
        fallback_kind: fallback.type,
        primary_err: primaryMsg,
        fallback_err: fallbackMsg,
      });
      return {
        outcome: 'safe-noop',
        result: null,
        fallback_kind: 'noop',
        duration_ms: Date.now() - start,
      };
    }
  }
}
