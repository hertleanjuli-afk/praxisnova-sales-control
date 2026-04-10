/**
 * Error Sentinel — Runtime Health Checker
 *
 * Purpose: detect silent UI/API breakages like the LinkedIn page ReferenceError
 * or the Anrufliste "failed to fetch" bug that happened on 2026-04-10, so
 * problems are surfaced within 30 minutes instead of days.
 *
 * This complements `health-monitor` (which checks AGENT cron scheduling) by
 * checking the RUNTIME health of the dashboard itself:
 *  1. Pings every critical API route, verifies 200 status
 *  2. Sanity-checks the response shape (not empty when DB has data)
 *  3. Sanity-checks core DB tables have expected minimum rows
 *  4. If anything looks wrong, sends a warn-only diagnostic email to Angie
 *
 * Mode: WARN ONLY. It never auto-fixes, never modifies data, never retries
 * failed routes. It only diagnoses and alerts. Auto-fix can bring down more
 * than it saves.
 *
 * Schedule: every 30 minutes between 06:00 and 22:00 Berlin time
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';
import { EMAIL_COLORS } from '@/lib/email-template';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://praxisnova-sales-control.vercel.app';

const ALERT_EMAIL = 'hertle.anjuli@praxisnovaai.com';

// ─── Check definitions ──────────────────────────────────────────────────────

interface RouteCheck {
  name: string;
  path: string;
  method?: 'GET' | 'POST';
  /**
   * Verify the response body passes this predicate. If it returns a string,
   * that string is the failure reason.
   */
  verify?: (body: unknown) => true | string;
  /** When true, send Authorization header with CRON_SECRET */
  requiresAuth?: boolean;
}

const ROUTE_CHECKS: RouteCheck[] = [
  {
    name: 'LinkedIn API',
    path: '/api/linkedin',
    verify: (body) => {
      if (typeof body !== 'object' || body === null) return 'Antwort ist kein Objekt';
      return true;
    },
  },
  {
    name: 'Anrufliste API',
    path: '/api/anrufliste',
    verify: (body) => {
      if (typeof body !== 'object' || body === null) return 'Antwort ist kein Objekt';
      const b = body as { ok?: boolean; items?: unknown };
      if (b.ok === false) return 'ok=false in Antwort';
      if (!Array.isArray(b.items)) return 'items-Feld fehlt oder ist kein Array';
      return true;
    },
  },
  {
    name: 'Sequences Status API',
    path: '/api/sequences/status',
    verify: (body) => {
      if (typeof body !== 'object' || body === null) return 'Antwort ist kein Objekt';
      return true;
    },
  },
  {
    name: 'Inbound Stats API',
    path: '/api/inbound/stats',
    verify: (body) => {
      if (typeof body !== 'object' || body === null) return 'Antwort ist kein Objekt';
      return true;
    },
  },
  {
    name: 'Partners API',
    path: '/api/partners',
    verify: (body) => {
      if (typeof body !== 'object' || body === null) return 'Antwort ist kein Objekt';
      return true;
    },
  },
];

// ─── DB sanity checks ───────────────────────────────────────────────────────

interface DbCheck {
  name: string;
  /** SQL that returns a single column `count` (number) */
  query: () => Promise<number>;
  minExpected: number;
  /** Optional warning threshold; if count < warnAt, raise a warning not an error */
  warnAt?: number;
}

const DB_CHECKS: DbCheck[] = [
  {
    name: 'leads table populated',
    query: async () => {
      const r = await sql`SELECT COUNT(*)::int as count FROM leads`;
      return Number(r[0]?.count ?? 0);
    },
    minExpected: 1,
  },
  {
    name: 'email_events last 24h',
    query: async () => {
      const r = await sql`SELECT COUNT(*)::int as count FROM email_events WHERE created_at > NOW() - INTERVAL '24 hours'`;
      return Number(r[0]?.count ?? 0);
    },
    minExpected: 0,
    warnAt: 1,
  },
  {
    name: 'agent_logs last 2h',
    query: async () => {
      const r = await sql`SELECT COUNT(*)::int as count FROM agent_logs WHERE created_at > NOW() - INTERVAL '2 hours'`;
      return Number(r[0]?.count ?? 0);
    },
    minExpected: 0,
    warnAt: 1,
  },
];

// ─── Issue shape ────────────────────────────────────────────────────────────

interface Issue {
  severity: 'error' | 'warning';
  category: 'route' | 'database' | 'agent';
  name: string;
  detail: string;
  suggestion?: string;
}

// ─── Checks ─────────────────────────────────────────────────────────────────

async function pingRoute(check: RouteCheck): Promise<Issue[]> {
  const issues: Issue[] = [];
  const url = `${BASE_URL}${check.path}`;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (check.requiresAuth && process.env.CRON_SECRET) {
      headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
    }
    const res = await fetch(url, {
      method: check.method || 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      issues.push({
        severity: 'error',
        category: 'route',
        name: check.name,
        detail: `HTTP ${res.status} ${res.statusText} auf ${check.path}`,
        suggestion: res.status >= 500
          ? 'Route wirft einen Server-Fehler. Vercel Runtime Logs pruefen.'
          : 'Route antwortet mit Fehler-Status. Auth oder Pfad checken.',
      });
      return issues;
    }
    if (check.verify) {
      try {
        const body = await res.json();
        const result = check.verify(body);
        if (result !== true) {
          issues.push({
            severity: 'warning',
            category: 'route',
            name: check.name,
            detail: `Antwort verdaechtig: ${result}`,
            suggestion: 'Route antwortet 200, aber die Daten sind unplausibel. Datenbank pruefen ob Tabelle leer oder API-Mapping kaputt ist.',
          });
        }
      } catch {
        issues.push({
          severity: 'error',
          category: 'route',
          name: check.name,
          detail: 'Antwort ist kein valides JSON',
          suggestion: 'Moeglicherweise HTML-Fehlerseite statt API-Response. Route inspizieren.',
        });
      }
    }
  } catch (err) {
    issues.push({
      severity: 'error',
      category: 'route',
      name: check.name,
      detail: `Fetch fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      suggestion: 'Route ist nicht erreichbar. Deployment-Status auf Vercel checken.',
    });
  }
  return issues;
}

async function runDbCheck(check: DbCheck): Promise<Issue[]> {
  const issues: Issue[] = [];
  try {
    const count = await check.query();
    if (count < check.minExpected) {
      issues.push({
        severity: 'error',
        category: 'database',
        name: check.name,
        detail: `Nur ${count} Zeilen gefunden, erwartet >= ${check.minExpected}`,
        suggestion: 'Kern-Tabelle unterbesetzt. Pruefen ob Migration fehlgeschlagen ist oder Daten verloren gegangen sind.',
      });
    } else if (check.warnAt !== undefined && count < check.warnAt) {
      issues.push({
        severity: 'warning',
        category: 'database',
        name: check.name,
        detail: `Nur ${count} Zeilen im Zeitfenster, erwartet >= ${check.warnAt}`,
        suggestion: 'Aktivitaet unter erwartetem Niveau. Cron-Jobs pruefen.',
      });
    }
  } catch (err) {
    issues.push({
      severity: 'error',
      category: 'database',
      name: check.name,
      detail: `DB-Query fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      suggestion: 'Datenbank nicht erreichbar oder Tabelle fehlt.',
    });
  }
  return issues;
}

async function checkRecentAgentErrors(): Promise<Issue[]> {
  const issues: Issue[] = [];
  try {
    const rows = await sql`
      SELECT agent_name, action, details, created_at
      FROM agent_logs
      WHERE status = 'error' AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    for (const r of rows as Array<{ agent_name: string; action: string; details: string | null; created_at: string }>) {
      issues.push({
        severity: 'error',
        category: 'agent',
        name: `${r.agent_name} (${r.action})`,
        detail: r.details || 'Kein Fehler-Detail verfuegbar',
        suggestion: 'Agent-Log inspizieren, ggf. manuell neu triggern.',
      });
    }
  } catch (err) {
    console.error('[error-sentinel] agent_logs query failed:', err);
  }
  return issues;
}

// ─── Email rendering ────────────────────────────────────────────────────────

function renderIssueRow(issue: Issue): string {
  const color = issue.severity === 'error' ? EMAIL_COLORS.danger : EMAIL_COLORS.warning;
  const badge = issue.severity === 'error' ? 'FEHLER' : 'WARNUNG';
  const cat = {
    route: 'API-Route',
    database: 'Datenbank',
    agent: 'Agent',
  }[issue.category];
  return `
<div style="background:${EMAIL_COLORS.cardBg};border:1px solid ${EMAIL_COLORS.border};border-left:3px solid ${color};border-radius:6px;padding:14px 16px;margin-bottom:10px;">
  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
    <span style="color:${EMAIL_COLORS.textPrimary};font-weight:700;font-size:14px;">${issue.name}</span>
    <span style="color:${color};font-weight:700;font-size:11px;letter-spacing:0.5px;">${badge} &middot; ${cat}</span>
  </div>
  <div style="color:${EMAIL_COLORS.textSecondary};font-size:13px;margin-bottom:6px;">${issue.detail}</div>
  ${issue.suggestion ? `<div style="color:${EMAIL_COLORS.textMuted};font-size:12px;font-style:italic;">Vorschlag: ${issue.suggestion}</div>` : ''}
</div>`;
}

async function sendAlertEmail(issues: Issue[]): Promise<void> {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warnCount = issues.filter((i) => i.severity === 'warning').length;
  const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

  const body = `
<div style="margin-bottom:20px;">
  <h2 style="color:${EMAIL_COLORS.textPrimary};margin:0 0 8px;font-size:22px;">Error Sentinel Alarm</h2>
  <p style="color:${EMAIL_COLORS.textMuted};margin:0;font-size:13px;">${timestamp}</p>
</div>

<div style="background:${EMAIL_COLORS.cardBg};border:1px solid ${EMAIL_COLORS.border};border-radius:8px;padding:16px;margin-bottom:20px;">
  <div style="display:flex;gap:24px;">
    <div>
      <div style="color:${EMAIL_COLORS.danger};font-size:32px;font-weight:700;">${errorCount}</div>
      <div style="color:${EMAIL_COLORS.textMuted};font-size:12px;">Fehler</div>
    </div>
    <div>
      <div style="color:${EMAIL_COLORS.warning};font-size:32px;font-weight:700;">${warnCount}</div>
      <div style="color:${EMAIL_COLORS.textMuted};font-size:12px;">Warnungen</div>
    </div>
  </div>
</div>

<div style="margin-bottom:20px;">
  ${issues.map(renderIssueRow).join('')}
</div>

<div style="background:${EMAIL_COLORS.cardBg};border:1px solid ${EMAIL_COLORS.border};border-radius:8px;padding:16px;color:${EMAIL_COLORS.textSecondary};font-size:13px;">
  <strong style="color:${EMAIL_COLORS.textPrimary};">Was jetzt:</strong><br>
  Der Sentinel repariert NICHTS automatisch. Er meldet nur. Schau dir die
  Probleme an und entscheide was zu tun ist, oder starte eine Session mit
  Claude und lass die Fehler konkret fixen. Die Daten in der Datenbank sind
  davon unberuehrt, UI-Bugs sind nur Anzeige-Probleme.
</div>`;

  try {
    await sendTransactionalEmail({
      to: ALERT_EMAIL,
      subject: `[Sentinel] ${errorCount} Fehler, ${warnCount} Warnungen im Sales Control Center`,
      htmlContent: body,
      senderEmail: 'info@praxisnovaai.com',
      senderName: 'PraxisNova Error Sentinel',
      tags: ['error-sentinel'],
      wrapAsInternal: true,
    });
  } catch (err) {
    console.error('[error-sentinel] Alert-Email fehlgeschlagen:', err);
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[error-sentinel] Starte Runtime-Health-Check...');

  const issues: Issue[] = [];

  // 1. Route pings in parallel
  const routeResults = await Promise.all(ROUTE_CHECKS.map(pingRoute));
  for (const r of routeResults) issues.push(...r);

  // 2. DB sanity checks in parallel
  const dbResults = await Promise.all(DB_CHECKS.map(runDbCheck));
  for (const r of dbResults) issues.push(...r);

  // 3. Recent agent errors
  const agentIssues = await checkRecentAgentErrors();
  issues.push(...agentIssues);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warnCount = issues.filter((i) => i.severity === 'warning').length;

  console.log(`[error-sentinel] Fertig in ${elapsed}s: ${errorCount} Fehler, ${warnCount} Warnungen`);

  // Only send email if there are real issues (not just info-level)
  if (errorCount > 0 || warnCount > 2) {
    await sendAlertEmail(issues);
  }

  return NextResponse.json({
    ok: true,
    healthy: errorCount === 0,
    errorCount,
    warnCount,
    issuesFound: issues.length,
    elapsedSeconds: elapsed,
    issues,
  });
}
