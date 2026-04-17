/**
 * GET /api/observability/recent-errors
 *
 * Liefert die letzten 50 Eintraege aus der `error_logs` Tabelle als JSON.
 * Auth: Bearer CRON_SECRET im Authorization-Header (gleicher Mechanismus
 * wie health-monitor, kein separates Secret noetig).
 *
 * Optionale Query-Params:
 *   - limit: Anzahl (max 200, default 50)
 *   - error_type: filter auf einen spezifischen error_type
 *
 * Wird vom Health-Checker-Agent und ggf. von einem zukuenftigen
 * /api/observability Dashboard-Page konsumiert.
 */

import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ErrorLogRow {
  id: number;
  error_type: string;
  lead_id: number | null;
  sequence_type: string | null;
  step_number: number | null;
  error_message: string;
  context: string | null;
  notified: boolean;
  created_at: string;
}

export async function GET(request: Request) {
  // Auth-Check: gleiches Pattern wie health-monitor
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const errorTypeFilter = url.searchParams.get('error_type');

  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 200);
    }
  }

  try {
    const raw = errorTypeFilter
      ? await sql`
          SELECT id, error_type, lead_id, sequence_type, step_number,
                 error_message, context, notified, created_at
          FROM error_logs
          WHERE error_type = ${errorTypeFilter}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, error_type, lead_id, sequence_type, step_number,
                 error_message, context, notified, created_at
          FROM error_logs
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
    const rows = raw as unknown as ErrorLogRow[];

    return NextResponse.json({
      ok: true,
      count: rows.length,
      limit,
      ...(errorTypeFilter && { error_type: errorTypeFilter }),
      errors: rows,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[observability/recent-errors] db query failed', msg);
    return NextResponse.json(
      { ok: false, error: 'db query failed', detail: msg },
      { status: 500 },
    );
  }
}
