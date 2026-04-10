import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

// Auto-migrate: ensure pause/block columns exist (runs once per cold start)
let _migrated = false;
async function ensureSequenceColumns() {
  if (_migrated) return;
  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pause_reason TEXT`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS block_reason TEXT`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_notes TEXT`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'Neu'`;
    _migrated = true;
    console.log('ensureSequenceColumns: all columns ready');
  } catch (e) {
    console.error('ensureSequenceColumns error:', e);
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run migration on page load
  await ensureSequenceColumns();

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const status = searchParams.get('status');

  // Status filter mapping
  const statusesToQuery: string[] =
    status === 'completed'
      ? ['completed', 'replied', 'booked', 'stopped', 'unsubscribed']
      : status === 'paused'
      ? ['paused']
      : status === 'blocked'
      ? ['blocked']
      : status === 'all'
      ? ['active', 'paused', 'blocked', 'completed', 'replied', 'booked', 'stopped', 'unsubscribed', 'bounced', 'cooldown']
      : status
      ? [status]
      : ['active', 'paused', 'blocked'];

  let leads;

  if (sector && sector !== 'all') {
    leads = await sql`
      SELECT * FROM leads
      WHERE sequence_type = ${sector}
        AND sequence_status = ANY(${statusesToQuery})
      ORDER BY enrolled_at DESC
    `;
  } else {
    leads = await sql`
      SELECT * FROM leads
      WHERE sequence_status = ANY(${statusesToQuery})
      ORDER BY enrolled_at DESC
    `;
  }

  // Get latest email event for each lead
  const leadIds = leads.map((l) => l.id);
  const events: Record<number, { event_type: string; step_number: number; created_at: string }> = {};
  // Track which leads have at least one "opened" event
  const opened: Record<number, boolean> = {};
  // Track LinkedIn connection status per lead
  const linkedinConnected: Record<number, boolean> = {};

  if (leadIds.length > 0) {
    const latestEvents = await sql`
      SELECT DISTINCT ON (lead_id)
        lead_id, event_type, step_number, created_at
      FROM email_events
      WHERE lead_id = ANY(${leadIds})
      ORDER BY lead_id, created_at DESC
    `;
    for (const e of latestEvents) {
      events[e.lead_id] = {
        event_type: e.event_type,
        step_number: e.step_number,
        created_at: e.created_at,
      };
    }

    // Has-opened aggregate (any opened event across the lead's history)
    try {
      const openedRows = await sql`
        SELECT DISTINCT lead_id FROM email_events
        WHERE lead_id = ANY(${leadIds}) AND event_type = 'opened'
      `;
      for (const r of openedRows) opened[r.lead_id] = true;
    } catch (e) {
      console.warn('[sequences/status] opened aggregate failed:', e);
    }

    // LinkedIn connected (from linkedin_tracking OR from leads.linkedin_status)
    try {
      const ltRows = await sql`
        SELECT lead_id, connection_status FROM linkedin_tracking
        WHERE lead_id = ANY(${leadIds})
          AND connection_status IN ('connected', 'replied')
      `;
      for (const r of ltRows) linkedinConnected[r.lead_id] = true;
    } catch (e) {
      // linkedin_tracking might not exist on older DBs
      console.warn('[sequences/status] linkedin_tracking lookup failed:', e);
    }
    // Fallback: leads table has its own linkedin_status field
    for (const l of leads) {
      if (l.linkedin_status === 'connected' || l.linkedin_connected_date) {
        linkedinConnected[l.id] = true;
      }
    }
  }

  const enrichedLeads = leads.map((lead) => ({
    ...lead,
    last_event: events[lead.id] || null,
    has_opened: !!opened[lead.id],
    linkedin_connected: !!linkedinConnected[lead.id],
  }));

  return NextResponse.json({ leads: enrichedLeads });
}
