/**
 * Daily Backup — CSV exports of core tables to Vercel Blob
 *
 * Purpose: belt-and-suspenders data protection. Neon already has continuous
 * point-in-time recovery, but this adds a second independent layer of
 * human-readable CSV backups that can be downloaded anytime from Vercel Blob.
 *
 * What it backs up:
 *  - leads (full table)
 *  - linkedin_tracking
 *  - call_queue
 *  - email_events (last 30 days, full history would be huge)
 *  - sequences
 *  - agent_logs (last 7 days)
 *  - error_logs (last 30 days)
 *
 * Output:
 *  - praxisnova-backup/YYYY-MM-DD/{tablename}.csv
 *  - Retention: Vercel Blob holds blobs indefinitely; we list and prune
 *    anything older than 30 days on each run.
 *
 * Requirements:
 *  - BLOB_READ_WRITE_TOKEN env var (set automatically when you enable Blob
 *    in the Vercel project settings)
 *
 * Schedule: daily at 02:00 UTC (03:00 Berlin winter, 04:00 summer)
 *
 * Recovery: download any CSV from Vercel Blob dashboard. Re-import via
 *  psql \copy or a custom import script.
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { put, list, del } from '@vercel/blob';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

interface BackupTable {
  name: string;
  query: () => Promise<Record<string, unknown>[]>;
}

const BACKUP_TABLES: BackupTable[] = [
  {
    name: 'leads',
    query: async () => {
      const rows = await sql`SELECT * FROM leads ORDER BY id`;
      return rows as Record<string, unknown>[];
    },
  },
  {
    name: 'linkedin_tracking',
    query: async () => {
      try {
        const rows = await sql`SELECT * FROM linkedin_tracking ORDER BY id`;
        return rows as Record<string, unknown>[];
      } catch {
        return [];
      }
    },
  },
  {
    name: 'call_queue',
    query: async () => {
      try {
        const rows = await sql`SELECT * FROM call_queue ORDER BY id`;
        return rows as Record<string, unknown>[];
      } catch {
        return [];
      }
    },
  },
  {
    name: 'email_events_30d',
    query: async () => {
      try {
        const rows = await sql`
          SELECT * FROM email_events
          WHERE created_at > NOW() - INTERVAL '30 days'
          ORDER BY id
        `;
        return rows as Record<string, unknown>[];
      } catch {
        return [];
      }
    },
  },
  {
    name: 'sequences',
    query: async () => {
      try {
        const rows = await sql`SELECT * FROM sequences ORDER BY id`;
        return rows as Record<string, unknown>[];
      } catch {
        return [];
      }
    },
  },
  {
    name: 'agent_logs_7d',
    query: async () => {
      try {
        const rows = await sql`
          SELECT * FROM agent_logs
          WHERE created_at > NOW() - INTERVAL '7 days'
          ORDER BY id
        `;
        return rows as Record<string, unknown>[];
      } catch {
        return [];
      }
    },
  },
  {
    name: 'error_logs_30d',
    query: async () => {
      try {
        const rows = await sql`
          SELECT * FROM error_logs
          WHERE created_at > NOW() - INTERVAL '30 days'
          ORDER BY id
        `;
        return rows as Record<string, unknown>[];
      } catch {
        return [];
      }
    },
  },
  {
    name: 'partners',
    query: async () => {
      try {
        const rows = await sql`SELECT * FROM partners ORDER BY id`;
        return rows as Record<string, unknown>[];
      } catch {
        return [];
      }
    },
  },
];

/**
 * Escape a single CSV field per RFC 4180.
 * Values containing commas, quotes, or newlines are quoted;
 * internal quotes are doubled.
 */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === 'object') {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }
  const headers = Object.keys(rows[0]);
  const headerRow = headers.join(',');
  const dataRows = rows.map((row) =>
    headers.map((h) => csvField(row[h])).join(','),
  );
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Format a Date as YYYY-MM-DD in UTC.
 */
function dateSlug(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({
      ok: false,
      error: 'BLOB_READ_WRITE_TOKEN nicht konfiguriert. Vercel Blob Storage aktivieren im Projekt.',
    }, { status: 500 });
  }

  const startTime = Date.now();
  const today = dateSlug(new Date());
  console.log(`[daily-backup] Starte Backup fuer ${today}...`);

  const results: Array<{ table: string; rowCount: number; size: number; url?: string; error?: string }> = [];

  for (const table of BACKUP_TABLES) {
    try {
      const rows = await table.query();
      const csv = rowsToCsv(rows);
      const key = `praxisnova-backup/${today}/${table.name}.csv`;
      const blob = await put(key, csv, {
        access: 'public',
        contentType: 'text/csv; charset=utf-8',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      results.push({
        table: table.name,
        rowCount: rows.length,
        size: csv.length,
        url: blob.url,
      });
      console.log(`[daily-backup] ${table.name}: ${rows.length} rows, ${csv.length} bytes`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[daily-backup] Fehler bei ${table.name}:`, msg);
      results.push({
        table: table.name,
        rowCount: 0,
        size: 0,
        error: msg,
      });
    }
  }

  // Prune: delete backups older than 30 days
  let pruned = 0;
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cutoffSlug = dateSlug(cutoff);
    const { blobs } = await list({ prefix: 'praxisnova-backup/' });
    for (const b of blobs) {
      // Extract date from path: praxisnova-backup/YYYY-MM-DD/...
      const match = b.pathname.match(/praxisnova-backup\/(\d{4}-\d{2}-\d{2})\//);
      if (match && match[1] < cutoffSlug) {
        await del(b.url);
        pruned++;
      }
    }
  } catch (err) {
    console.error('[daily-backup] Prune fehlgeschlagen:', err);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const errorCount = results.filter((r) => r.error).length;

  console.log(`[daily-backup] Fertig in ${elapsed}s: ${totalRows} Zeilen, ${Math.round(totalSize / 1024)} KB, ${pruned} alte Backups geloescht`);

  return NextResponse.json({
    ok: errorCount === 0,
    date: today,
    elapsedSeconds: elapsed,
    totalRows,
    totalSizeBytes: totalSize,
    tablesBackedUp: results.length - errorCount,
    errorCount,
    prunedOldBackups: pruned,
    results,
  });
}
