/**
 * Manueller Trigger fuer Google Calendar Sync (Paket B Teil 2, 2026-04-12)
 *
 * Der Vercel-Cron laeuft alle 5 Minuten. Fuer Testing und Debugging will
 * Angie (oder Claude Code) aber nicht immer warten. Dieser Endpoint ruft
 * die gleiche Handler-Funktion wie der Cron, aber hinter ADMIN_SECRET.
 *
 * Verwendung:
 *   curl -X POST "https://praxisnova-sales-control.vercel.app/api/trigger/google-calendar-sync?secret=$ADMIN_SECRET"
 *
 * Oder via Browser:
 *   https://praxisnova-sales-control.vercel.app/api/trigger/google-calendar-sync?secret=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { runGoogleCalendarSync } from '@/app/api/cron/google-calendar-sync/route';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runGoogleCalendarSync();
  return NextResponse.json({ ok: true, triggered: 'manual', ...result });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
