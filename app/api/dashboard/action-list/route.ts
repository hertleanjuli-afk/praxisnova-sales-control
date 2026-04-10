import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Anrufe faellig (Anrufliste heute)
    const callsResult = await sql`
      SELECT COUNT(*) as count FROM call_queue
      WHERE status = 'pending'
        AND EXTRACT(WEEK FROM created_at) = EXTRACT(WEEK FROM NOW())
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    `;
    const callsDue = parseInt(callsResult[0]?.count || '0');

    // 2. LinkedIn-Aktionen faellig
    const linkedinResult = await sql`
      SELECT COUNT(*) as count FROM linkedin_tracking
      WHERE connection_status = 'none'
        AND created_at <= NOW() - INTERVAL '1 day'
    `;
    const linkedinDue = parseInt(linkedinResult[0]?.count || '0');

    // 3. LinkedIn Post-Entwuerfe bereit (falls Tabelle existiert)
    let postDraftsReady = 0;
    try {
      const draftsResult = await sql`
        SELECT COUNT(*) as count FROM linkedin_post_drafts
        WHERE draft_date = CURRENT_DATE AND status = 'draft'
      `;
      postDraftsReady = parseInt(draftsResult[0]?.count || '0');
    } catch { /* Tabelle existiert noch nicht */ }

    // 4. Hot Leads (Email geoeffnet, keine Antwort)
    const hotResult = await sql`
      SELECT COUNT(DISTINCT l.id) as count
      FROM leads l
      JOIN email_events ee ON ee.lead_id = l.id AND ee.event_type = 'opened'
      WHERE l.pipeline_stage = 'In Outreach'
        AND l.signal_email_reply = false
        AND ee.created_at >= NOW() - INTERVAL '3 days'
    `;
    const hotLeads = parseInt(hotResult[0]?.count || '0');

    // 5. Wochenende-Check
    const dayOfWeek = new Date().getDay(); // 0=Sonntag, 6=Samstag
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFriday = dayOfWeek === 5;

    // 6. System Health (schnelle Checks aus agent_logs)
    const errorCheck = await sql`
      SELECT COUNT(*) as count FROM agent_logs
      WHERE level = 'error' AND created_at >= NOW() - INTERVAL '2 hours'
    `;
    const recentErrors = parseInt(errorCheck[0]?.count || '0');

    return NextResponse.json({
      callsDue,
      linkedinDue,
      postDraftsReady,
      hotLeads,
      isWeekend,
      isFriday,
      systemOk: recentErrors === 0,
      recentErrors,
    });
  } catch (error) {
    console.error('[action-list] Fehler:', error);
    return NextResponse.json({
      callsDue: 0, linkedinDue: 0, postDraftsReady: 0,
      hotLeads: 0, isWeekend: false, isFriday: false,
      systemOk: true, recentErrors: 0,
    });
  }
}
