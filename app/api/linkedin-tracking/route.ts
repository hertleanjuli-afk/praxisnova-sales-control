// ============================================================
// GET/POST /api/linkedin-tracking
// LinkedIn Verbindungs- und Nachrichten-Tracking
// Manuell von Angie/Samantha befuellt
// Triggert automatisch: Sequenz-Stopp bei Reply, Call-List bei Timeout
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { logActivityToHubSpot } from '@/lib/hubspot';

export const dynamic = 'force-dynamic';

// ============================================================
// GET: LinkedIn Tracking laden
// Query: ?status=request_sent&due_today=true&lead_id=123
// ============================================================
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const dueToday = searchParams.get('due_today');
  const leadId = searchParams.get('lead_id');
  const actionsDue = searchParams.get('actions_due');
  try {
    let items;

    if (leadId) {
      // Einzelner Lead
      items = await sql`
        SELECT lt.*, l.first_name, l.last_name, l.company, l.title,
               l.email, l.phone, l.agent_score, l.lead_category,
               l.pipeline_stage, l.outreach_step, l.industry,
               l.linkedin_url
        FROM linkedin_tracking lt
        JOIN leads l ON lt.lead_id = l.id
        WHERE lt.lead_id = ${Number(leadId)}
      `;
    } else if (actionsDue === 'true') {
      // Alle faelligen LinkedIn-Aktionen (View nutzen)
      items = await sql`
        SELECT lt.*, l.first_name, l.last_name, l.company, l.title,
               l.email, l.phone, l.agent_score, l.lead_category,
               l.pipeline_stage, l.outreach_step, l.industry,
               l.linkedin_url,
               CASE
                 WHEN lt.connection_status = 'pending_request' AND lt.request_due_date <= CURRENT_DATE
                   THEN 'anfrage_senden'
                 WHEN lt.connection_status = 'request_sent' AND lt.request_sent_at < NOW() - INTERVAL '3 days'
                   THEN 'timeout_keine_akzeptierung'
                 WHEN lt.connection_status = 'connected' AND lt.message_sent = false
                   THEN 'nachricht_senden'
                 WHEN lt.connection_status = 'connected' AND lt.message_sent = true
                   AND lt.reply_received = false AND lt.message_sent_at < NOW() - INTERVAL '3 days'
                   THEN 'timeout_keine_antwort'
                 ELSE 'keine_aktion'
               END as action_required
        FROM linkedin_tracking lt
        JOIN leads l ON lt.lead_id = l.id
        WHERE l.pipeline_stage NOT IN ('Blocked', 'Booked')
        AND (
          (lt.connection_status = 'pending_request' AND lt.request_due_date <= CURRENT_DATE)
          OR (lt.connection_status = 'request_sent' AND lt.request_sent_at < NOW() - INTERVAL '3 days')
          OR (lt.connection_status = 'connected' AND lt.message_sent = false)
          OR (lt.connection_status = 'connected' AND lt.message_sent = true
              AND lt.reply_received = false AND lt.message_sent_at < NOW() - INTERVAL '3 days')
        )
        ORDER BY
          CASE
            WHEN lt.connection_status = 'pending_request' THEN 1
            WHEN lt.connection_status = 'connected' AND lt.message_sent = false THEN 2
            WHEN lt.connection_status = 'request_sent' THEN 3
            ELSE 4
          END,
          lt.created_at ASC
      `;
    } else if (status) {
      // Nach Status filtern
      items = await sql`
        SELECT lt.*, l.first_name, l.last_name, l.company, l.title,
               l.email, l.phone, l.agent_score, l.lead_category,
               l.pipeline_stage, l.outreach_step, l.linkedin_url
        FROM linkedin_tracking lt
        JOIN leads l ON lt.lead_id = l.id
        WHERE lt.connection_status = ${status}
        AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
        ORDER BY lt.updated_at DESC
      `;
    } else if (dueToday === 'true') {
      // Heute faellige Anfragen
      items = await sql`
        SELECT lt.*, l.first_name, l.last_name, l.company, l.title,
               l.email, l.phone, l.agent_score, l.lead_category,
               l.linkedin_url
        FROM linkedin_tracking lt
        JOIN leads l ON lt.lead_id = l.id
        WHERE lt.connection_status = 'pending_request'
        AND lt.request_due_date <= CURRENT_DATE
        AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
        ORDER BY lt.request_due_date ASC
      `;
    } else {
      // Alle Leads in aktiven Sequenzen (mit LinkedIn-Tracking wenn vorhanden)
      items = await sql`
        SELECT
          COALESCE(lt.id, 0) as id,
          l.id as lead_id,
          l.first_name, l.last_name, l.company, l.title,
          l.email, l.phone, l.agent_score, l.lead_category,
          l.pipeline_stage, l.outreach_step, l.industry,
          COALESCE(l.linkedin_url, lt.linkedin_url) as linkedin_url,
          COALESCE(lt.connection_status, 'none') as connection_status,
          lt.request_due_date, lt.request_sent_at, lt.connected_at,
          COALESCE(lt.message_sent, false) as message_sent,
          lt.message_sent_at, lt.message_content,
          COALESCE(lt.reply_received, false) as reply_received,
          lt.reply_received_at, lt.reply_content,
          lt.notes
        FROM leads l
        LEFT JOIN linkedin_tracking lt ON lt.lead_id = l.id
        WHERE l.pipeline_stage NOT IN ('Blocked', 'Booked')
          AND l.sequence_status IN ('active', 'paused', 'none')
        ORDER BY l.agent_score DESC NULLS LAST, l.created_at DESC
        LIMIT 200
      `;
    }

    // Stats berechnen (LEFT JOIN so dass auch Leads ohne Tracking gezaehlt werden)
    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE lt.connection_status = 'pending_request') as pending,
        COUNT(*) FILTER (WHERE lt.connection_status = 'request_sent') as request_sent,
        COUNT(*) FILTER (WHERE lt.connection_status = 'connected' AND lt.message_sent = false) as connected_no_msg,
        COUNT(*) FILTER (WHERE lt.connection_status = 'connected' AND lt.message_sent = true AND lt.reply_received = false) as message_sent,
        COUNT(*) FILTER (WHERE lt.reply_received = true) as replied,
        COUNT(*) FILTER (WHERE lt.connection_status = 'no_linkedin') as no_linkedin,
        COUNT(*) FILTER (WHERE lt.connection_status = 'ignored') as ignored,
        COUNT(*) as total
      FROM leads l
      LEFT JOIN linkedin_tracking lt ON lt.lead_id = l.id
      WHERE l.pipeline_stage NOT IN ('Blocked', 'Booked')
        AND l.sequence_status IN ('active', 'paused', 'none')
    `;

    // Normalize null fields from LEFT JOIN for frontend safety
    const safeItems = items.map((item: Record<string, unknown>) => ({
      ...item,
      connection_status: item.connection_status || 'none',
      message_sent: item.message_sent ?? false,
      reply_received: item.reply_received ?? false,
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      company: item.company || '',
      title: item.title || '',
    }));

    return NextResponse.json({
      ok: true,
      stats,
      items: safeItems,
      count: safeItems.length,
    });

  } catch (error) {
    console.error('[linkedin-tracking] GET Fehler:', error);
    return NextResponse.json({ ok: false, error: 'Interner Fehler' }, { status: 500 });
  }
}

// ============================================================
// POST: LinkedIn Tracking erstellen (normalerweise vom Outreach Strategist)
// ============================================================
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lead_id, linkedin_url } = body;

    if (!lead_id) {
      return NextResponse.json({ ok: false, error: 'lead_id ist Pflichtfeld' }, { status: 400 });
    }

    // Pruefen ob schon existiert
    const [existing] = await sql`
      SELECT id FROM linkedin_tracking WHERE lead_id = ${lead_id}
    `;

    if (existing) {
      return NextResponse.json({ ok: false, error: 'LinkedIn Tracking existiert bereits', id: existing.id });
    }

    const [entry] = await sql`
      INSERT INTO linkedin_tracking (lead_id, connection_status, request_due_date, linkedin_url)
      VALUES (
        ${lead_id},
        'pending_request',
        CURRENT_DATE + INTERVAL '1 day',
        ${linkedin_url || null}
      )
      RETURNING id, lead_id, connection_status, request_due_date
    `;

    // Lead outreach_step aktualisieren
    await sql`
      UPDATE leads
      SET outreach_step = 'linkedin_pending'
      WHERE id = ${lead_id}
    `;

    return NextResponse.json({ ok: true, ...entry });

  } catch (error) {
    console.error('[linkedin-tracking] POST Fehler:', error);
    return NextResponse.json({ ok: false, error: 'Interner Fehler' }, { status: 500 });
  }
}

// ============================================================
// PATCH: Status aktualisieren (manuell von Angie/Samantha)
// ============================================================
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      lead_id,
      action, // request_sent, connected, no_linkedin, rejected, ignored,
              // message_sent, reply_received
      message_content,
      reply_content,
      notes,
    } = body;

    if (!lead_id || !action) {
      return NextResponse.json({ ok: false, error: 'lead_id und action sind Pflichtfelder' }, { status: 400 });
    }

    const validActions = [
      'request_sent', 'connected', 'no_linkedin', 'rejected', 'ignored',
      'message_sent', 'reply_received',
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json({ ok: false, error: `Ungueltige Action: ${action}` }, { status: 400 });
    }

    let result;
    const triggeredActions: string[] = [];

    switch (action) {
      case 'request_sent':
        result = await sql`
          UPDATE linkedin_tracking
          SET connection_status = 'request_sent',
              request_sent_at = NOW(),
              notes = COALESCE(${notes}, notes),
              updated_at = NOW()
          WHERE lead_id = ${lead_id}
          RETURNING *
        `;
        await sql`
          UPDATE leads SET outreach_step = 'linkedin_request_sent' WHERE id = ${lead_id}
        `;
        triggeredActions.push('Status -> request_sent', 'Lead Step -> linkedin_request_sent');
        break;

      case 'connected':
        result = await sql`
          UPDATE linkedin_tracking
          SET connection_status = 'connected',
              connected_at = NOW(),
              notes = COALESCE(${notes}, notes),
              updated_at = NOW()
          WHERE lead_id = ${lead_id}
          RETURNING *
        `;
        await sql`
          UPDATE leads SET outreach_step = 'linkedin_connected' WHERE id = ${lead_id}
        `;
        triggeredActions.push('Status -> connected', 'Lead Step -> linkedin_connected');
        break;

      case 'message_sent':
        result = await sql`
          UPDATE linkedin_tracking
          SET message_sent = true,
              message_sent_at = NOW(),
              message_content = ${message_content || null},
              notes = COALESCE(${notes}, notes),
              updated_at = NOW()
          WHERE lead_id = ${lead_id}
          RETURNING *
        `;
        await sql`
          UPDATE leads SET outreach_step = 'linkedin_message_sent' WHERE id = ${lead_id}
        `;
        triggeredActions.push('Nachricht gespeichert', 'Lead Step -> linkedin_message_sent');
        break;

      case 'reply_received':
        // TRIGGER: Email-Sequenz stoppen!
        result = await sql`
          UPDATE linkedin_tracking
          SET reply_received = true,
              reply_received_at = NOW(),
              reply_content = ${reply_content || null},
              notes = COALESCE(${notes}, notes),
              updated_at = NOW()
          WHERE lead_id = ${lead_id}
          RETURNING *
        `;
        // Lead aktualisieren
        await sql`
          UPDATE leads
          SET outreach_step = 'linkedin_replied',
              pipeline_stage = 'Replied',
              signal_linkedin_interest = true,
              pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] LinkedIn Nachricht beantwortet.'
          WHERE id = ${lead_id}
        `;
        // SEQUENZ STOPPEN
        const stoppedSeqs = await sql`
          UPDATE sequence_entries
          SET status = 'replied', stopped_at = NOW()
          WHERE lead_id = ${lead_id} AND status IN ('active', 'pending', 'paused')
          RETURNING id
        `;
        triggeredActions.push(
          'Antwort gespeichert',
          'Lead -> Replied',
          `${stoppedSeqs.length} Sequenz(en) gestoppt`,
          'signal_linkedin_interest = true'
        );

        // HubSpot Sync
        try {
          const [lead] = await sql`SELECT hubspot_contact_id FROM leads WHERE id = ${lead_id}`;
          if (lead?.hubspot_contact_id) {
            await logActivityToHubSpot(
              lead.hubspot_contact_id, 'linkedin',
              `LinkedIn Nachricht beantwortet: ${reply_content || 'Keine Details'}`
            );
          }
        } catch (e) {
          console.warn('[linkedin-tracking] HubSpot Sync fehlgeschlagen:', e);
        }
        break;

      case 'no_linkedin':
        result = await sql`
          UPDATE linkedin_tracking
          SET connection_status = 'no_linkedin',
              notes = COALESCE(${notes}, notes),
              updated_at = NOW()
          WHERE lead_id = ${lead_id}
          RETURNING *
        `;
        // Direkt auf Anrufliste setzen (kein LinkedIn moeglich)
        triggeredActions.push('Status -> no_linkedin', 'Lead kommt direkt auf Anrufliste');
        break;

      case 'rejected':
        result = await sql`
          UPDATE linkedin_tracking
          SET connection_status = 'rejected',
              notes = COALESCE(${notes}, notes),
              updated_at = NOW()
          WHERE lead_id = ${lead_id}
          RETURNING *
        `;
        triggeredActions.push('Status -> rejected', 'Lead kommt auf Anrufliste');
        break;

      case 'ignored':
        result = await sql`
          UPDATE linkedin_tracking
          SET connection_status = 'ignored',
              notes = COALESCE(${notes}, notes),
              updated_at = NOW()
          WHERE lead_id = ${lead_id}
          RETURNING *
        `;
        triggeredActions.push('Status -> ignored', 'Lead kommt auf Anrufliste');
        break;
    }

    return NextResponse.json({
      ok: true,
      lead_id,
      action,
      triggered_actions: triggeredActions,
      entry: result?.[0] || null,
    });

  } catch (error) {
    console.error('[linkedin-tracking] PATCH Fehler:', error);
    return NextResponse.json({ ok: false, error: 'Interner Fehler' }, { status: 500 });
  }
}
