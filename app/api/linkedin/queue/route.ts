/**
 * Browser-accessible LinkedIn Queue API
 * No agent auth required — protected by NextAuth session via dashboard layout
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'ready';

  try {
    const rows = await sql`
      SELECT lq.*,
        l.first_name AS lead_first_name, l.last_name AS lead_last_name, l.company AS lead_company,
        p.company AS partner_company, p.contact_name AS partner_contact_name
      FROM linkedin_queue lq
      LEFT JOIN leads l ON l.id = lq.lead_id
      LEFT JOIN partners p ON p.id = lq.partner_id
      WHERE lq.status = ${status}
      ORDER BY lq.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ queue: rows, count: rows.length });
  } catch (error) {
    console.error('[linkedin-queue]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
