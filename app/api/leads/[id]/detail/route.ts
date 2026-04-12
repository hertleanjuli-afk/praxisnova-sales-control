import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  description: string | null;
  metadata?: Record<string, unknown>;
}

const callDispositionLabels: Record<string, string> = {
  termin_gebucht: 'Termin gebucht',
  interesse: 'Interesse signalisiert',
  kein_interesse: 'Kein Interesse',
  falscher_ansprechpartner: 'Falscher Ansprechpartner',
  nicht_erreicht: 'Nicht erreicht',
  mailbox: 'Mailbox hinterlassen',
  rueckruf: 'Rückruf vereinbart',
  weiterleitung: 'Weiterleitung',
  besetzt: 'Besetzt',
};

// GET /api/leads/[id]/detail
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const leadId = parseInt(params.id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Ungueltige Lead-ID' }, { status: 400 });
    }

    // Fetch lead data
    const [lead] = await sql`
      SELECT * FROM leads WHERE id = ${leadId}
    `;

    if (!lead) {
      return NextResponse.json({ error: 'Lead nicht gefunden' }, { status: 404 });
    }

    // Build timeline by aggregating from multiple sources
    const timelineEvents: TimelineEvent[] = [];

    // 1. Lead created event
    if (lead.created_at) {
      timelineEvents.push({
        id: `lead_created_${leadId}`,
        type: 'lead_created',
        timestamp: new Date(lead.created_at).toISOString(),
        title: 'Lead erstellt',
        description: lead.source || null,
      });
    }

    // 2. Email events
    // email_events schema: id, lead_id, sequence_type, step_number,
    // event_type, brevo_message_id, sender_used, created_at, sentiment
    const emailEvents = await sql`
      SELECT id, event_type, sequence_type, step_number, created_at
      FROM email_events
      WHERE lead_id = ${leadId}
      ORDER BY created_at DESC
    `;

    for (const event of emailEvents) {
      const eventMap: Record<string, string> = {
        opened: 'Email geoffnet',
        clicked: 'Link geklickt',
        replied: 'Email beantwortet',
        bounced: 'Email verursacht Bounce',
        sent: 'Email gesendet',
      };

      timelineEvents.push({
        id: `email_${event.id}`,
        type: event.event_type === 'sent' ? 'email_sent' : event.event_type,
        timestamp: new Date(event.created_at).toISOString(),
        title: eventMap[event.event_type] || event.event_type,
        description: event.sequence_type ? `${event.sequence_type} Schritt ${event.step_number}` : null,
      });
    }

    // 3. Agent decisions (outreach sent)
    const agentDecisions = await sql`
      SELECT id, decision_type, created_at, data_payload
      FROM agent_decisions
      WHERE lead_id = ${leadId}
      AND decision_type = 'outreach_sent'
      ORDER BY created_at DESC
    `;

    for (const decision of agentDecisions) {
      const payload = typeof decision.data_payload === 'string'
        ? JSON.parse(decision.data_payload)
        : decision.data_payload;

      timelineEvents.push({
        id: `agent_decision_${decision.id}`,
        type: 'email_sent',
        timestamp: new Date(decision.created_at).toISOString(),
        title: payload?.subject || 'Email gesendet',
        description: lead.company || null,
        metadata: { subject: payload?.subject },
      });
    }

    // 4. Call dispositions (table may not exist on all installs)
    try {
      const callDispositions = await sql`
        SELECT id, outcome, call_notes, created_at
        FROM call_dispositions
        WHERE lead_id = ${leadId}
        ORDER BY created_at DESC
      `;

      for (const disposition of callDispositions) {
        const outcomeLabel = callDispositionLabels[disposition.outcome] || disposition.outcome;

        timelineEvents.push({
          id: `call_disposition_${disposition.id}`,
          type: 'call_result',
          timestamp: new Date(disposition.created_at).toISOString(),
          title: outcomeLabel,
          description: disposition.call_notes || null,
        });
      }
    } catch { /* call_dispositions table may not exist yet */ }

    // 5. Call queue (call attempts)
    const callQueueEntries = await sql`
      SELECT id, status, created_at
      FROM call_queue
      WHERE lead_id = ${leadId}
      AND status = 'called'
      ORDER BY created_at DESC
    `;

    for (const entry of callQueueEntries) {
      timelineEvents.push({
        id: `call_queue_${entry.id}`,
        type: 'call_made',
        timestamp: new Date(entry.created_at).toISOString(),
        title: 'Anruf versucht',
        description: null,
      });
    }

    // 6. Sequence entries (table may not exist on older installs)
    try {
      const sequenceEntries = await sql`
        SELECT id, sequence_id, status, started_at, stopped_at, paused_at
        FROM sequence_entries
        WHERE lead_id = ${leadId}
        ORDER BY started_at DESC
      `;

      for (const entry of sequenceEntries) {
        if (entry.started_at) {
          timelineEvents.push({
            id: `seq_start_${entry.id}`,
            type: 'sequence_started',
            timestamp: new Date(entry.started_at).toISOString(),
            title: 'Sequenz gestartet',
            description: `Sequence ID: ${entry.sequence_id}`,
          });
        }

        if (entry.stopped_at) {
          timelineEvents.push({
            id: `seq_stopped_${entry.id}`,
            type: 'sequence_stopped',
            timestamp: new Date(entry.stopped_at).toISOString(),
            title: 'Sequenz gestoppt',
            description: null,
          });
        }

        if (entry.paused_at) {
          timelineEvents.push({
            id: `seq_paused_${entry.id}`,
            type: 'sequence_paused',
            timestamp: new Date(entry.paused_at).toISOString(),
            title: 'Sequenz pausiert',
            description: null,
          });
        }
      }
    } catch { /* sequence_entries table may not exist yet */ }

    // 7. LinkedIn tracking events
    const linkedinTracking = await sql`
      SELECT id, connection_status, request_sent_at, connected_at, message_sent_at, reply_received_at
      FROM linkedin_tracking
      WHERE lead_id = ${leadId}
    `;

    if (linkedinTracking.length > 0) {
      const lt = linkedinTracking[0];

      if (lt.request_sent_at) {
        timelineEvents.push({
          id: `linkedin_request_${lt.id}`,
          type: 'linkedin_request',
          timestamp: new Date(lt.request_sent_at).toISOString(),
          title: 'LinkedIn-Anfrage gesendet',
          description: null,
        });
      }

      if (lt.connected_at) {
        timelineEvents.push({
          id: `linkedin_connected_${lt.id}`,
          type: 'linkedin_connected',
          timestamp: new Date(lt.connected_at).toISOString(),
          title: 'LinkedIn-Verbindung hergestellt',
          description: null,
        });
      }

      if (lt.message_sent_at) {
        timelineEvents.push({
          id: `linkedin_message_${lt.id}`,
          type: 'linkedin_message',
          timestamp: new Date(lt.message_sent_at).toISOString(),
          title: 'LinkedIn-Nachricht gesendet',
          description: null,
        });
      }

      if (lt.reply_received_at) {
        timelineEvents.push({
          id: `linkedin_reply_${lt.id}`,
          type: 'linkedin_reply',
          timestamp: new Date(lt.reply_received_at).toISOString(),
          title: 'LinkedIn-Antwort erhalten',
          description: null,
        });
      }
    }

    // Fetch linkedin_tracking row for response
    const [linkedinRow] = await sql`
      SELECT * FROM linkedin_tracking WHERE lead_id = ${leadId}
    `;

    // Sort timeline by timestamp, newest first
    timelineEvents.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      ok: true,
      lead,
      timeline: timelineEvents,
      linkedin: linkedinRow || null,
    });
  } catch (error) {
    console.error('Lead detail error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler beim Abrufen von Lead-Details' },
      { status: 500 }
    );
  }
}

// PATCH /api/leads/[id]/detail
// Update lead_category and mobile_phone
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const leadId = parseInt(params.id, 10);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Ungueltige Lead-ID' }, { status: 400 });
    }

    const body = await req.json();
    const { lead_category, mobile_phone } = body;

    // Validate that at least one field is provided
    if (lead_category === undefined && mobile_phone === undefined) {
      return NextResponse.json(
        { error: 'Mindestens ein Feld (lead_category oder mobile_phone) ist erforderlich' },
        { status: 400 }
      );
    }

    // Build update query dynamically
    let updateQuery = 'UPDATE leads SET ';
    const updates: string[] = [];
    const values: unknown[] = [];

    if (lead_category !== undefined) {
      updates.push(`lead_category = $${values.length + 1}`);
      values.push(lead_category);
    }

    if (mobile_phone !== undefined) {
      updates.push(`mobile_phone = $${values.length + 1}`);
      values.push(mobile_phone);
    }

    updateQuery += updates.join(', ') + ` WHERE id = $${values.length + 1}`;
    values.push(leadId);

    // Execute update using parameterized query
    const result = await sql`
      UPDATE leads
      SET ${sql(Object.entries({ lead_category, mobile_phone })
        .filter(([, v]) => v !== undefined)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}))}
      WHERE id = ${leadId}
      RETURNING id, lead_category, mobile_phone
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Lead nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      updated: result[0],
    });
  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler beim Aktualisieren des Leads' },
      { status: 500 }
    );
  }
}
