/**
 * Manueller Trigger fuer Apollo Sync (2026-04-13)
 *
 * Der Vercel-Cron laeuft 3x taeglich. Fuer Testing und On-Demand-Import
 * brauchen wir einen manuellen Trigger hinter ADMIN_SECRET.
 *
 * Verwendung:
 *   curl -H "x-admin-secret: $ADMIN_SECRET" \
 *     https://praxisnova-sales-control.vercel.app/api/trigger/apollo-sync
 *
 * Oder via Browser:
 *   https://praxisnova-sales-control.vercel.app/api/trigger/apollo-sync?secret=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { GET as apolloSyncHandler } from '@/app/api/cron/apollo-sync/route';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  // Auth: entweder x-admin-secret Header oder ?secret= Query-Param
  const headerSecret = request.headers.get('x-admin-secret');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const secret = headerSecret || querySecret;

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Apollo Sync Cron-Handler aufrufen mit korrektem CRON_SECRET
  const cronUrl = new URL('/api/cron/apollo-sync', request.nextUrl.origin);
  const cronRequest = new NextRequest(cronUrl, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  const result = await apolloSyncHandler(cronRequest);
  const data = await result.json();

  return NextResponse.json({ ok: true, triggered: 'manual', ...data });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
