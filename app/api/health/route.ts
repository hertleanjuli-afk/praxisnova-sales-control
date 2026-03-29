import { NextResponse } from 'next/server';
import { checkConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await checkConnection();

  const status = db.ok ? 200 : 503;

  return NextResponse.json(
    {
      status: db.ok ? 'healthy' : 'unhealthy',
      database: {
        connected: db.ok,
        latencyMs: db.latencyMs,
        ...(db.error && { error: db.error }),
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
