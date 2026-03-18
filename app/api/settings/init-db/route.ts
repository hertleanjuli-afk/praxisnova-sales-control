import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializeDatabase } from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    return NextResponse.json({ ok: true, message: 'Datenbank-Tabellen erfolgreich erstellt' });
  } catch (error) {
    console.error('DB init error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
