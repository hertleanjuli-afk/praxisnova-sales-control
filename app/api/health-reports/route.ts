import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);
  const rows = await sql`
    SELECT id, check_time, agent_statuses, api_statuses, db_stats, overall_status, alerts
    FROM health_reports
    ORDER BY check_time DESC
    LIMIT ${limit}
  `;
  return NextResponse.json({ reports: rows });
}
