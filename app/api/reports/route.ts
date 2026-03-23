import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const weeklyReports = await sql`
      SELECT * FROM weekly_reports
      ORDER BY week_start DESC
      LIMIT 52
    `;

    const changeLog = await sql`
      SELECT * FROM change_log
      ORDER BY change_date DESC
      LIMIT 50
    `;

    const weeklyFeedback = await sql`
      SELECT * FROM weekly_feedback
      ORDER BY week_start DESC
      LIMIT 20
    `;

    return NextResponse.json({
      weeklyReports,
      changeLog,
      weeklyFeedback,
    });
  } catch (error) {
    console.error('[api/reports] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
