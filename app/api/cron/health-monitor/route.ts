import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const AGENT_SCHEDULES: Record<string, { times: string[]; errorIfMissing: boolean }> = {
  apollo_sync: { times: ['05:00', '12:00'], errorIfMissing: true },
  prospect_researcher: { times: ['05:30', '08:30', '11:30', '14:30'], errorIfMissing: true },
  outreach_strategist: { times: ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00'], errorIfMissing: false },
  process_sequences: { times: ['07:30', '10:30', '13:30', '16:30'], errorIfMissing: false },
  call_list_generator: { times: ['07:00'], errorIfMissing: true },
  operations_manager: { times: ['07:15'], errorIfMissing: true },
};

interface HealthIssue {
  agent_name: string;
  issue_type: 'error' | 'timeout' | 'missing_run';
  expected_time: string;
  actual_status: string;
  error_details: string;
  severity: 'error' | 'warning';
}

interface HealthCheckResult {
  ok: boolean;
  healthy: boolean;
  issues_found: number;
  timestamp: string;
  issues?: HealthIssue[];
}

async function checkRecentErrors(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  try {
    const result = await sql`
      SELECT agent_name, action, status, details, created_at
      FROM agent_logs
      WHERE created_at > ${twoHoursAgo} AND status = 'error'
      ORDER BY created_at DESC
    `;
    const logs = result.rows as Array<{ agent_name: string; action: string; status: string; details: string | null; created_at: string }>;
    for (const log of logs) {
      issues.push({
        agent_name: log.agent_name,
        issue_type: 'error',
        expected_time: new Date(log.created_at).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }),
        actual_status: `${log.action} - ${log.status}`,
        error_details: log.details || 'Keine Details verfuegbar',
        severity: 'error',
      });
    }
  } catch (err) {
    console.error('[health-monitor] Fehler beim Abrufen von Fehlern:', err);
  }
  return issues;
}

async function checkIncompleteRuns(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  try {
    const result = await sql`
      SELECT DISTINCT agent_name, run_id,
        MAX(CASE WHEN action = 'started' THEN created_at END) as started_at,
        MAX(CASE WHEN action = 'completed' THEN created_at END) as completed_at
      FROM agent_logs
      WHERE created_at > ${twoHoursAgo}
      GROUP BY agent_name, run_id
      HAVING MAX(CASE WHEN action = 'started' THEN 1 ELSE 0 END) = 1
        AND MAX(CASE WHEN action = 'completed' THEN 1 ELSE 0 END) = 0
    `;
    const incompletes = result.rows as Array<{ agent_name: string; run_id: string; started_at: string; completed_at: string | null }>;
    for (const inc of incompletes) {
      const startedTime = new Date(inc.started_at);
      const timeoutThreshold = new Date(startedTime.getTime() + 10 * 60 * 1000);
      if (Date.now() > timeoutThreshold.getTime()) {
        issues.push({
          agent_name: inc.agent_name,
          issue_type: 'timeout',
          expected_time: startedTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }),
          actual_status: 'started, aber nicht abgeschlossen',
          error_details: `Run ID: ${inc.run_id}. Gestartet vor mehr als 10 Minuten.`,
          severity: 'error',
        });
      }
    }
  } catch (err) {
    console.error('[health-monitor] Fehler bei unvollstaendigen Laeufen:', err);
  }
  return issues;
}

async function checkMissingRuns(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const now = new Date();
  const berlinTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  try {
    for (const [agentName, config] of Object.entries(AGENT_SCHEDULES)) {
      if (!config.errorIfMissing) continue;
      for (const scheduledTime of config.times) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduleDate = new Date(berlinTime);
        scheduleDate.setHours(hours, minutes, 0, 0);
        const windowStart = new Date(scheduleDate.getTime() - 90 * 60 * 1000).toISOString();
        const windowEnd = new Date(scheduleDate.getTime() + 15 * 60 * 1000).toISOString();
        if (new Date(windowEnd) < now) {
          const result = await sql`
            SELECT COUNT(*) as count FROM agent_logs
            WHERE agent_name = ${agentName} AND action = 'started'
              AND created_at >= ${windowStart} AND created_at <= ${windowEnd}
          `;
          const count = (result.rows[0] as { count: number }).count;
          if (count === 0) {
            issues.push({
              agent_name: agentName,
              issue_type: 'missing_run',
              expected_time: scheduledTime,
              actual_status: 'kein Log-Eintrag',
              error_details: `Erwartet um ${scheduledTime} UTC, aber keine Log innerhalb des Fensters.`,
              severity: 'warning',
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[health-monitor] Fehler bei fehlenden Laeufen:', err);
  }
  return issues;
}

async function sendAlertEmail(issues: HealthIssue[]): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL || 'hertle.anjuli@praxisnovaai.com';
  const senderEmail = process.env.SENDER_EMAIL || 'noreply@praxisnova-sales-control.vercel.app';
  if (!brevoApiKey) {
    console.error('[health-monitor] BREVO_API_KEY nicht konfiguriert');
    return;
  }
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const issueRows = issues.map((issue) => {
    const bgColor = issue.severity === 'error' ? '#fef2f2' : '#fffbeb';
    const borderColor = issue.severity === 'error' ? '#fecaca' : '#fcd34d';
    return `<tr style="border-bottom: 1px solid ${borderColor};"><td style="padding: 12px; background-color: ${bgColor}; color: #1e3a5f; font-weight: 500;">${issue.agent_name}</td><td style="padding: 12px; background-color: ${bgColor}; color: #1e3a5f;">${issue.issue_type}</td><td style="padding: 12px; background-color: ${bgColor}; color: #1e3a5f;">${issue.expected_time}</td><td style="padding: 12px; background-color: ${bgColor}; color: #1e3a5f;">${issue.actual_status}</td><td style="padding: 12px; background-color: ${bgColor}; color: #1e3a5f; font-size: 12px;">${issue.error_details}</td></tr>`;
  }).join('');
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e3a5f}.header{background-color:#1e3a5f;color:white;padding:20px;margin:0}.header h2{margin:0;font-size:20px}.content{padding:20px}table{width:100%;border-collapse:collapse;margin:15px 0}th{background-color:#1e3a5f;color:white;padding:12px;text-align:left;font-weight:600}td{padding:12px}.footer{color:#999;font-size:12px;padding:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h2>Agent Alert: ${errorCount + warningCount} Probleme erkannt</h2></div><div class="content"><p>Das Health Monitor System hat ${errorCount} Fehler und ${warningCount} Warnungen erkannt.</p><table><thead><tr><th>Agent</th><th>Problemtyp</th><th>Erwartete Zeit</th><th>Status</th><th>Details</th></tr></thead><tbody>${issueRows}</tbody></table><p style="color:#666;font-size:14px;">Bitte ueberpruefen Sie diese Agenten.</p></div><div class="footer"><p>Sales Control Center - Health Monitor<br>Gesendet: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p></div></body></html>`;
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Sales Control Center', email: senderEmail },
        to: [{ email: alertEmail, name: 'Alert Recipient' }],
        subject: `Agent Alert: ${errorCount + warningCount} Probleme erkannt`,
        htmlContent,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[health-monitor] Brevo API Fehler ${response.status}:`, text);
    } else {
      console.log('[health-monitor] Alert-Email erfolgreich gesendet');
    }
  } catch (err) {
    console.error('[health-monitor] Fehler beim Senden der Alert-Email:', err);
  }
}

export async function GET(request: Request): Promise<NextResponse<HealthCheckResult>> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[health-monitor] Unauthorized request');
    return NextResponse.json({ ok: false, healthy: false, issues_found: 0, timestamp: new Date().toISOString() }, { status: 401 });
  }
  const startTime = Date.now();
  const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  console.log(`[health-monitor] Starte Health Check um ${timestamp}...`);
  try {
    const errorIssues = await checkRecentErrors();
    const timeoutIssues = await checkIncompleteRuns();
    const missingIssues = await checkMissingRuns();
    const allIssues = [...errorIssues, ...timeoutIssues, ...missingIssues];
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (allIssues.length > 0) {
      console.log(`[health-monitor] ${allIssues.length} Probleme gefunden in ${elapsed}s`);
      await sendAlertEmail(allIssues);
      return NextResponse.json({ ok: true, healthy: false, issues_found: allIssues.length, timestamp: new Date().toISOString(), issues: allIssues });
    } else {
      console.log(`[health-monitor] Alle Agenten sind gesund (${elapsed}s)`);
      return NextResponse.json({ ok: true, healthy: true, issues_found: 0, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[health-monitor] Unerwarteter Fehler:', err);
    return NextResponse.json({ ok: false, healthy: false, issues_found: 0, timestamp: new Date().toISOString() }, { status: 500 });
  }
}
