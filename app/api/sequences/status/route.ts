import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const status = searchParams.get('status');

  let leads;

  if (sector && status) {
    leads = await sql`
      SELECT * FROM leads
      WHERE sequence_type = ${sector} AND sequence_status = ${status}
      ORDER BY enrolled_at DESC
    `;
  } else if (sector) {
    leads = await sql`
      SELECT * FROM leads
      WHERE sequence_type = ${sector} AND sequence_status = 'active'
      ORDER BY enrolled_at DESC
    `;
  } else if (status) {
    leads = await sql`
      SELECT * FROM leads
      WHERE sequence_status = ${status}
      ORDER BY enrolled_at DESC
    `;
  } else {
    leads = await sql`
      SELECT * FROM leads
      WHERE sequence_status = 'active'
      ORDER BY enrolled_at DESC
    `;
  }

  // Get latest email event for each lead
  const leadIds = leads.map((l) => l.id);
  const events: Record<number, { event_type: string; step_number: number; created_at: string }> = {};

  if (leadIds.length > 0) {
    const latestEvents = await sql`
      SELECT DISTINCT ON (lead_id) lead_id, event_type, step_number, created_at
      FROM email_events
      WHERE lead_id = ANY(${leadIds})
      ORDER BY lead_id, created_at DESC
    `;
    for (const e of latestEvents) {
      events[e.lead_id] = { event_type: e.event_type, step_number: e.step_number, created_at: e.created_at };
    }
  }

  const enrichedLeads = leads.map((lead) => ({
    ...lead,
    last_event: events[lead.id] || null,
  }));

  return NextResponse.json({ leads: enrichedLeads });
}
