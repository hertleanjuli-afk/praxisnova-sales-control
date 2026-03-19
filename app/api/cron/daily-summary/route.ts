import { NextRequest, NextResponse } from 'next/server';
import { sendDailySummary } from '@/lib/error-notify';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await sendDailySummary();
    return NextResponse.json({ ok: true, message: 'Daily summary sent' });
  } catch (error) {
    console.error('Daily summary cron error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
