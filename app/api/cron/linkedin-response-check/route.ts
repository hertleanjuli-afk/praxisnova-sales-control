// ============================================================
// CRON: LinkedIn Response Checker
// Schedule: 08:00 UTC (10:00 Berlin) taeglich
// Prueft LinkedIn-Tracking auf 3-Tage-Timeouts
// Setzt Leads automatisch auf die Anrufliste wenn:
// - Anfrage nicht akzeptiert nach 3 Tagen
// - Nachricht nicht beantwortet nach 3 Tagen
// - Kein LinkedIn vorhanden
// ============================================================

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { writeStartLog, writeEndLog } from '@/lib/agent-runtime';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = crypto.randomUUID();
  await writeStartLog(runId, 'linkedin_response_check');

  try {
    const results = {
      request_timeout: 0,
      message_timeout: 0,
      no_linkedin: 0,
      rejected: 0,
      already_on_list: 0,
      errors: [] as string[],
    };

    // ============================================================
    // 1. LinkedIn-Anfragen die > 3 Tage ohne Akzeptierung sind
    // ============================================================
    const requestTimeouts = await sql`
      SELECT lt.lead_id, l.first_name, l.last_name, l.company, l.phone, l.agent_score
      FROM linkedin_tracking lt
      JOIN leads l ON lt.lead_id = l.id
      WHERE lt.connection_status = 'request_sent'
      AND lt.request_sent_at < NOW() - INTERVAL '3 days'
      AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
      AND l.phone IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM call_queue cq
        WHERE cq.lead_id = lt.lead_id
        AND cq.status = 'ready'
      )
    `;

    for (const lead of requestTimeouts) {
      try {
        await addToCallList(lead.lead_id, 'linkedin_no_response',
          `LinkedIn-Anfrage seit 3+ Tagen ohne Akzeptierung. Lead ${lead.first_name} ${lead.last_name} (${lead.company}) telefonisch kontaktieren.`
        );
        // Status aktualisieren
        await sql`
          UPDATE linkedin_tracking
          SET connection_status = 'ignored', updated_at = NOW()
          WHERE lead_id = ${lead.lead_id}
        `;
        await sql`
          UPDATE leads SET outreach_step = 'on_call_list' WHERE id = ${lead.lead_id}
        `;
        results.request_timeout++;
      } catch (e) {
        results.errors.push(`Lead ${lead.lead_id}: ${String(e)}`);
      }
    }

    // ============================================================
    // 2. LinkedIn-Nachrichten die > 3 Tage ohne Antwort sind
    // ============================================================
    const messageTimeouts = await sql`
      SELECT lt.lead_id, l.first_name, l.last_name, l.company, l.phone, l.agent_score
      FROM linkedin_tracking lt
      JOIN leads l ON lt.lead_id = l.id
      WHERE lt.connection_status = 'connected'
      AND lt.message_sent = true
      AND lt.reply_received = false
      AND lt.message_sent_at < NOW() - INTERVAL '3 days'
      AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
      AND l.phone IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM call_queue cq
        WHERE cq.lead_id = lt.lead_id
        AND cq.status = 'ready'
      )
    `;

    for (const lead of messageTimeouts) {
      try {
        await addToCallList(lead.lead_id, 'linkedin_no_response',
          `LinkedIn-Nachricht seit 3+ Tagen ohne Antwort. Lead ist verbunden aber reagiert nicht. Telefonisch nachfassen.`
        );
        await sql`
          UPDATE leads SET outreach_step = 'on_call_list' WHERE id = ${lead.lead_id}
        `;
        results.message_timeout++;
      } catch (e) {
        results.errors.push(`Lead ${lead.lead_id}: ${String(e)}`);
      }
    }

    // ============================================================
    // 3. Leads mit Kein-LinkedIn oder Abgelehnt-Status
    // ============================================================
    const noLinkedin = await sql`
      SELECT lt.lead_id, l.first_name, l.last_name, l.company, l.phone
      FROM linkedin_tracking lt
      JOIN leads l ON lt.lead_id = l.id
      WHERE lt.connection_status IN ('no_linkedin', 'rejected')
      AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
      AND l.phone IS NOT NULL
      AND l.outreach_step NOT IN ('on_call_list', 'in_calls', 'call_completed', 'booked', 'blocked')
      AND NOT EXISTS (
        SELECT 1 FROM call_queue cq
        WHERE cq.lead_id = lt.lead_id
        AND cq.status = 'ready'
      )
    `;

    for (const lead of noLinkedin) {
      try {
        const reason = lead.connection_status === 'no_linkedin'
          ? 'Lead hat kein LinkedIn-Profil. Direkter telefonischer Kontakt.'
          : 'LinkedIn-Anfrage abgelehnt. Telefonisch kontaktieren.';
        await addToCallList(lead.lead_id, 'linkedin_no_response', reason);
        await sql`
          UPDATE leads SET outreach_step = 'on_call_list' WHERE id = ${lead.lead_id}
        `;
        results.no_linkedin++;
      } catch (e) {
        results.errors.push(`Lead ${lead.lead_id}: ${String(e)}`);
      }
    }

    const totalQueued = results.request_timeout + results.message_timeout + results.no_linkedin;
    await writeEndLog(runId, 'linkedin_response_check', 'completed', {
      request_timeout: results.request_timeout,
      message_timeout: results.message_timeout,
      no_linkedin: results.no_linkedin,
      total_queued: totalQueued,
      errors: results.errors.length,
      summary: `${totalQueued} Leads auf Anrufliste gesetzt`,
    });

    return NextResponse.json({
      ok: true,
      summary: `${totalQueued} Leads auf Anrufliste gesetzt`,
      details: results,
    });

  } catch (error) {
    console.error('[linkedin-response-check] Fehler:', error);
    await writeEndLog(runId, 'linkedin_response_check', 'error', { error: String(error) });
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

// ============================================================
// Helper: Lead zur Anrufliste hinzufuegen
// ============================================================
async function addToCallList(leadId: number, source: string, reason: string) {
  // Pruefen wie oft der Lead schon angerufen wurde
  const [leadData] = await sql`
    SELECT total_call_attempts FROM leads WHERE id = ${leadId}
  `;
  const attempts = leadData?.total_call_attempts || 0;

  if (attempts >= 3) {
    // Lead wurde schon 3x angerufen, nicht nochmal auf die Liste
    return;
  }

  // KW und Jahr bestimmen
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const weekYear = now.getFullYear();

  await sql`
    INSERT INTO call_queue (
      lead_id, queue_date, rank, priority_score,
      reason_to_call, status, source, linkedin_trigger,
      call_attempt_number, week_number, week_year
    ) VALUES (
      ${leadId}, CURRENT_DATE, 0, 50,
      ${reason}, 'ready', ${source}, true,
      ${attempts + 1}, ${weekNumber}, ${weekYear}
    )
    ON CONFLICT (lead_id, queue_date) DO NOTHING
  `;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
