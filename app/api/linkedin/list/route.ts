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
    const leads = await sql`
      SELECT id, first_name, last_name, company, title, email, linkedin_url, industry, created_at,
             source, sequence_status, sequence_type,
             linkedin_status, linkedin_request_date, linkedin_connected_date,
             linkedin_message, linkedin_message_date,
             linkedin_reply, linkedin_reply_date
      FROM leads
      WHERE sequence_status != 'unsubscribed' AND sequence_status != 'bounced'
      ORDER BY source, industry, created_at DESC
    `;

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);

    return NextResponse.json({
      leads,
      week: `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`,
      generated_at: now.toISOString(),
    });
  } catch (error) {
    console.error('LinkedIn list error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
