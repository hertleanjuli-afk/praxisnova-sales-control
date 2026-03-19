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
    const errors = await sql`
      SELECT el.*, l.first_name, l.last_name, l.email as lead_email, l.company
      FROM error_logs el
      LEFT JOIN leads l ON l.id = el.lead_id
      WHERE el.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY el.created_at DESC
      LIMIT 100
    `;

    const stats = await sql`
      SELECT error_type, COUNT(*) as count
      FROM error_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY error_type
      ORDER BY count DESC
    `;

    return NextResponse.json({ errors, stats, total: errors.length });
  } catch (error) {
    console.error('Error log fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
