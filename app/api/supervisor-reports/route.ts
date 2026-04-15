import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100);
  const rows = await sql`
    SELECT id, supervisor_name, report_time, metrics_json, alerts_json, status
    FROM supervisor_reports
    ORDER BY report_time DESC
    LIMIT ${limit}
  `;
  return NextResponse.json({ reports: rows });
}
