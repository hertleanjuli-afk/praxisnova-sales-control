/**
 * Strukturierter Observability-Logger fuer Agenten und Skill-Calls.
 *
 * Liefert pro Log-Eintrag: timestamp, agent, skill, level, message, context,
 * duration_ms. Output ist JSON Lines (eine Zeile pro Eintrag) damit Vercel
 * Log-Drains und externe Tools (Datadog, BetterStack) das ohne Parser
 * konsumieren koennen.
 *
 * Error-Level-Logs werden zusaetzlich an einen Slack-Webhook geposted, wenn
 * SLACK_ALERT_WEBHOOK gesetzt ist. Ohne Env-Var wird kein Network-Call
 * gemacht (Test-/Dev-frei). Slack-Versand ist fire-and-forget: Fehler beim
 * Slack-Send killen nicht den Agent-Run.
 *
 * Verhaeltnis zu lib/helpers/logger.ts: dieser hier ist ein Superset mit
 * agent/skill-Pflichtfeldern und Slack. Der bestehende `lib/helpers/logger.ts`
 * bleibt fuer untypisierte Lib-Code-Calls (die kein agent-Konzept haben).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  agent: string;
  skill: string | null;
  level: LogLevel;
  message: string;
  context: Record<string, unknown>;
  duration_ms: number | null;
}

export interface LogInput {
  agent: string;
  skill?: string | null;
  message: string;
  context?: Record<string, unknown>;
  duration_ms?: number | null;
}

const SLACK_TIMEOUT_MS = 4000;

function buildEntry(level: LogLevel, input: LogInput): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    agent: input.agent,
    skill: input.skill ?? null,
    level,
    message: input.message,
    context: input.context ?? {},
    duration_ms: input.duration_ms ?? null,
  };
}

function emitConsole(entry: LogEntry): void {
  const json = JSON.stringify(entry);
  if (entry.level === 'error') console.error(json);
  else if (entry.level === 'warn') console.warn(json);
  else console.log(json);
}

/**
 * Fire-and-forget Slack-Notification. Returns the promise so Tests
 * await koennen, in Production wird sie mit `void` discardet damit
 * der Agent-Pfad nicht blockiert wird.
 */
export async function notifySlack(entry: LogEntry): Promise<void> {
  const webhook = process.env.SLACK_ALERT_WEBHOOK;
  if (!webhook) return;

  const text =
    `🚨 *${entry.agent}*` +
    (entry.skill ? ` :: \`${entry.skill}\`` : '') +
    `\n${entry.message}` +
    (Object.keys(entry.context).length > 0
      ? `\n\`\`\`${JSON.stringify(entry.context, null, 2).slice(0, 800)}\`\`\``
      : '');

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // bewusst nur console, sonst Endless-Recursion
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'slack webhook non-ok',
          status: res.status,
          slack_text_preview: text.slice(0, 200),
          ts: new Date().toISOString(),
        }),
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'slack webhook threw',
        err: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      }),
    );
  } finally {
    clearTimeout(t);
  }
}

/**
 * Hauptschnittstelle fuer Agenten-Code.
 *
 * Beispiel:
 *   await observe.error({
 *     agent: 'outreach_strategist',
 *     skill: 'sales.draft-outreach',
 *     message: 'apollo enrichment failed after retries',
 *     context: { lead_id: 1234, attempts: 5 },
 *     duration_ms: 8421,
 *   });
 *
 * .error wartet bewusst auf den Slack-Send (await-able), .info/.warn/.debug
 * geben sofort zurueck. Im Production-Code wird .error oft mit `void` geprefixed
 * damit der Agent-Pfad nicht blockiert.
 */
export const observe = {
  debug(input: LogInput): void {
    emitConsole(buildEntry('debug', input));
  },
  info(input: LogInput): void {
    emitConsole(buildEntry('info', input));
  },
  warn(input: LogInput): void {
    emitConsole(buildEntry('warn', input));
  },
  async error(input: LogInput): Promise<void> {
    const entry = buildEntry('error', input);
    emitConsole(entry);
    await notifySlack(entry);
  },
  /** Synchrone Variante wenn der Caller nicht awaiten kann/will. */
  errorSync(input: LogInput): void {
    const entry = buildEntry('error', input);
    emitConsole(entry);
    void notifySlack(entry);
  },
};
