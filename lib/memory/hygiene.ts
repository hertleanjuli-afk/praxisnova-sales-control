/**
 * Memory-Hygiene-Check fuer LLM-Agenten.
 *
 * Vor jedem Agent-Run wird eine Schnell-Verifikation der wichtigsten Facts
 * ausgefuehrt. Wenn ein Fact nicht mehr stimmt:
 *   - Fact wird als "stale" markiert (in-memory Status)
 *   - Warnung wird strukturiert geloggt
 *   - Agent laeuft weiter, der Verifier-Caller entscheidet ob Fallback
 *     verwendet werden soll
 *
 * Pattern: jeder Fact ist eine kleine asynchrone Funktion die einen Boolean
 * zurueckgibt (true = noch valide). So bleibt die Verifikation testbar
 * und Mock-bar, ohne Memory-File-Format zu kennen.
 *
 * Dokumentation der pro-Agent definierten Facts: docs/memory-hygiene-checks.md
 */

import { logger } from '../helpers/logger.ts';

// Hinweis: dieses Modul nutzt den bestehenden lib/helpers/logger fuer
// Stale-Warnings. Sobald T3 (lib/observability/logger.ts mit Slack-Send)
// gemerged ist, kann der Caller hier auf observe.warn / observe.error
// umstellen damit Slack-Alerts greifen.

export interface MemoryFact {
  /** Stabile ID, z.B. "lead_ingestor.apollo_endpoint_path" */
  id: string;
  /** Lesbarer Name fuer Log/Slack */
  description: string;
  /**
   * Gibt true zurueck wenn der Fact noch stimmt, false wenn er stale ist.
   * Sollte schnell sein (max 2s), darf werfen.
   */
  verify: () => Promise<boolean>;
}

export type FactStatus = 'fresh' | 'stale' | 'verify_failed';

export interface VerifyResult {
  fact_id: string;
  description: string;
  status: FactStatus;
  duration_ms: number;
  error?: string;
}

export interface VerifyMemoryFactsOptions {
  /** Timeout pro Fact in ms. Default 2000. */
  timeoutMs?: number;
  /**
   * Limit auf die wichtigsten N Facts. Default 3 (gemaess Tech-Gaps T4).
   * Setze auf 0 um alle Facts zu verifizieren.
   */
  topN?: number;
}

export interface VerifyMemoryFactsContext {
  agent: string;
  /** Optional: Run-ID fuer Trace-Korrelation. */
  run_id?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`fact-verify timeout after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Verifiziert die wichtigsten N Facts. Returns ein Array mit Status pro Fact.
 * Throws NIE: ein Fact-Fehler oder Fact-Stale ist ein Warnung-Signal, kein
 * Crash-Signal.
 *
 * Stale- und Verify-Failed-Facts werden mit observe.warn geloggt und (falls
 * SLACK_ALERT_WEBHOOK gesetzt) zusaetzlich an Slack gemeldet via observe.error.
 */
export async function verifyMemoryFacts(
  facts: MemoryFact[],
  context: VerifyMemoryFactsContext,
  options: VerifyMemoryFactsOptions = {},
): Promise<VerifyResult[]> {
  const timeoutMs = options.timeoutMs ?? 2000;
  const topN = options.topN ?? 3;
  const checked = topN > 0 ? facts.slice(0, topN) : facts;

  const results: VerifyResult[] = [];

  for (const fact of checked) {
    const start = Date.now();
    let status: FactStatus = 'fresh';
    let errorMsg: string | undefined;

    try {
      const ok = await withTimeout(fact.verify(), timeoutMs);
      status = ok ? 'fresh' : 'stale';
    } catch (err) {
      status = 'verify_failed';
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    const duration_ms = Date.now() - start;
    const r: VerifyResult = {
      fact_id: fact.id,
      description: fact.description,
      status,
      duration_ms,
      ...(errorMsg && { error: errorMsg }),
    };
    results.push(r);

    if (status === 'stale') {
      logger.warn('memory fact stale', {
        agent: context.agent,
        fact_id: fact.id,
        description: fact.description,
        run_id: context.run_id,
        duration_ms,
      });
    } else if (status === 'verify_failed') {
      // verify-failed ist haerter als stale: wir wissen NICHT ob der Fact
      // stimmt. Default-Behandlung wie stale + escalate via error-level.
      logger.error('memory fact verify failed', {
        agent: context.agent,
        fact_id: fact.id,
        description: fact.description,
        err: errorMsg,
        run_id: context.run_id,
        duration_ms,
      });
    }
  }

  return results;
}

/**
 * Praktisch-Helper: filtert die stale + verify-failed Facts.
 */
export function getStaleFacts(results: VerifyResult[]): VerifyResult[] {
  return results.filter((r) => r.status !== 'fresh');
}
