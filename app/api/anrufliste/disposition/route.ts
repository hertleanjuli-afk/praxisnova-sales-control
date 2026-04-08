// ============================================================
// POST /api/anrufliste/disposition
// Speichert Anruf-Ergebnis und triggert alle Folge-Aktionen:
// - Lead-Status Update
// - Sequenz stoppen/pausieren
// - Rueckruf planen
// - Neuen Kontakt anlegen (bei Weiterleitung)
// - HubSpot Sync
// - call_attempt_number erhoehen
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { syncContactToHubSpot, logActivityToHubSpot } from '@/lib/hubspot';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      call_queue_id,
      lead_id,
      // Anruf-Basis
      answered = false,
      answered_by,
      call_quality,
      // Ergebnis
      outcome,
      // Kontakt schliessen
      close_contact = false,
      close_reason,
      close_duration_months,
      // Rueckruf
      callback_requested = false,
      callback_date,
      callback_time,
      callback_notes,
      // Weiterleitung
      referred_to_name,
      referred_to_phone,
      referred_to_mobile,
      referred_to_email,
      referred_to_position,
      referred_to_company,
      referred_to_notes,
      // Notizen
      call_notes,
      call_duration_seconds,
      // Sequenz
      sequence_action = 'keep_running',
    } = body;

    if (!call_queue_id || !lead_id || !outcome) {
      return NextResponse.json(
        { ok: false, error: 'call_queue_id, lead_id und outcome sind Pflichtfelder' },
        { status: 400 }
      );
    }

    // Valide Outcomes
    const validOutcomes = [
      'termin_gebucht', 'interesse', 'kein_interesse',
      'falscher_ansprechpartner', 'nicht_erreicht', 'mailbox',
      'rueckruf', 'weiterleitung', 'besetzt', 'sonstiges'
    ];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { ok: false, error: `Ungueltiges Outcome: ${outcome}` },
        { status: 400 }
      );
    }

    // ============================================================
    // 1. Disposition speichern
    // ============================================================
    const [disposition] = await sql`
      INSERT INTO call_dispositions (
        call_queue_id, lead_id, answered, answered_by, call_quality,
        outcome, close_contact, close_reason, close_duration_months,
        callback_requested, callback_date, callback_time, callback_notes,
        referred_to_name, referred_to_phone, referred_to_mobile,
        referred_to_email, referred_to_position, referred_to_company,
        referred_to_notes, call_notes, call_duration_seconds, sequence_action
      ) VALUES (
        ${call_queue_id}, ${lead_id}, ${answered}, ${answered_by || null},
        ${call_quality || null}, ${outcome}, ${close_contact},
        ${close_reason || null}, ${close_duration_months || null},
        ${callback_requested}, ${callback_date || null},
        ${callback_time || null}, ${callback_notes || null},
        ${referred_to_name || null}, ${referred_to_phone || null},
        ${referred_to_mobile || null}, ${referred_to_email || null},
        ${referred_to_position || null}, ${referred_to_company || null},
        ${referred_to_notes || null}, ${call_notes || null},
        ${call_duration_seconds || null}, ${sequence_action}
      )
      RETURNING id
    `;

    // ============================================================
    // 2. Call Queue aktualisieren
    // ============================================================
    await sql`
      UPDATE call_queue
      SET status = 'called',
          called_at = NOW(),
          call_result = ${mapOutcomeToResult(outcome)},
          call_notes = ${call_notes || null}
      WHERE id = ${call_queue_id}
    `;

    // ============================================================
    // 3. Lead total_call_attempts erhoehen
    // ============================================================
    await sql`
      UPDATE leads
      SET total_call_attempts = COALESCE(total_call_attempts, 0) + 1,
          updated_at = NOW()
      WHERE id = ${lead_id}
    `;

    // ============================================================
    // 4. OUTCOME-BASIERTE FOLGE-AKTIONEN
    // ============================================================
    const actions: string[] = [];

    // --- TERMIN GEBUCHT ---
    if (outcome === 'termin_gebucht') {
      await sql`
        UPDATE leads
        SET pipeline_stage = 'Booked',
            outreach_step = 'booked',
            pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] Termin per Telefon gebucht. ' || COALESCE(${call_notes}, '')
        WHERE id = ${lead_id}
      `;
      // Alle aktiven Sequenzen stoppen
      await sql`
        UPDATE sequence_entries
        SET status = 'completed', stopped_at = NOW()
        WHERE lead_id = ${lead_id} AND status IN ('active', 'pending', 'paused')
      `;
      actions.push('Lead -> Booked', 'Sequenzen gestoppt');
    }

    // --- KEIN INTERESSE / ABSAGE ---
    if (outcome === 'kein_interesse' && close_contact) {
      const months = close_duration_months || 9;
      await sql`
        UPDATE leads
        SET pipeline_stage = 'Blocked',
            outreach_step = 'blocked',
            blocked_until = NOW() + (${months} || ' months')::INTERVAL,
            block_reason = ${close_reason || 'kein_interesse'},
            pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] Absage per Telefon: ' || COALESCE(${close_reason}, 'kein Interesse') || '. Gesperrt fuer ' || ${months} || ' Monate.'
        WHERE id = ${lead_id}
      `;
      // Sequenzen stoppen
      await sql`
        UPDATE sequence_entries
        SET status = 'blocked', stopped_at = NOW()
        WHERE lead_id = ${lead_id} AND status IN ('active', 'pending', 'paused')
      `;
      actions.push(`Lead blockiert (${months} Monate)`, 'Sequenzen gestoppt');
    }

    // --- INTERESSE (aber kein Termin) ---
    if (outcome === 'interesse') {
      await sql`
        UPDATE leads
        SET outreach_step = 'call_completed',
            pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] Interesse per Telefon signalisiert. ' || COALESCE(${call_notes}, '')
        WHERE id = ${lead_id}
      `;
      actions.push('Lead markiert: Interesse');
    }

    // --- FALSCHER ANSPRECHPARTNER ---
    if (outcome === 'falscher_ansprechpartner') {
      await sql`
        UPDATE leads
        SET pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] Falscher Ansprechpartner. ' || COALESCE(${call_notes}, '')
        WHERE id = ${lead_id}
      `;
      // Wenn close_contact, dann blockieren
      if (close_contact) {
        await sql`
          UPDATE leads
          SET pipeline_stage = 'Blocked',
              outreach_step = 'blocked',
              blocked_until = NOW() + '9 months'::INTERVAL,
              block_reason = 'falscher_ansprechpartner'
          WHERE id = ${lead_id}
        `;
        await sql`
          UPDATE sequence_entries
          SET status = 'blocked', stopped_at = NOW()
          WHERE lead_id = ${lead_id} AND status IN ('active', 'pending', 'paused')
        `;
        actions.push('Lead blockiert (falscher AP)', 'Sequenzen gestoppt');
      }
    }

    // --- RUECKRUF ---
    if (outcome === 'rueckruf' && callback_requested && callback_date) {
      await sql`
        UPDATE leads
        SET outreach_step = 'call_completed',
            pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] Rueckruf vereinbart fuer ' || ${callback_date} || '. ' || COALESCE(${callback_notes}, '')
        WHERE id = ${lead_id}
      `;
      actions.push(`Rueckruf geplant: ${callback_date}`);
    }

    // --- WEITERLEITUNG (neuen Kontakt anlegen) ---
    let newLeadId: number | null = null;
    if (outcome === 'weiterleitung' && referred_to_name) {
      const [newLead] = await sql`
        INSERT INTO leads (
          first_name, last_name, email, phone, mobile_phone,
          company, title, lead_category,
          manual_entry, exclude_from_sequences,
          referred_by_lead_id, referral_reason,
          pipeline_stage, outreach_step, source,
          pipeline_notes
        ) VALUES (
          ${referred_to_name.split(' ')[0] || referred_to_name},
          ${referred_to_name.split(' ').slice(1).join(' ') || ''},
          ${referred_to_email || null},
          ${referred_to_phone || null},
          ${referred_to_mobile || null},
          ${referred_to_company || null},
          ${referred_to_position || null},
          ${null},
          true,
          true,
          ${lead_id},
          ${'Verweis von Anruf: ' + (referred_to_notes || '')},
          'Neu',
          'new',
          'referral',
          '[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] Verweis von Lead #' || ${lead_id} || '. ' || COALESCE(${referred_to_notes}, '')
        )
        RETURNING id
      `;
      newLeadId = newLead?.id || null;
      actions.push(`Neuer Kontakt angelegt: ${referred_to_name} (ID: ${newLeadId})`);
    }

    // --- NICHT ERREICHT / MAILBOX / BESETZT ---
    if (['nicht_erreicht', 'mailbox', 'besetzt'].includes(outcome)) {
      // Pruefen ob 3 Versuche erreicht
      const [leadData] = await sql`
        SELECT total_call_attempts FROM leads WHERE id = ${lead_id}
      `;
      const attempts = leadData?.total_call_attempts || 0;

      if (attempts >= 3) {
        await sql`
          UPDATE leads
          SET outreach_step = 'call_completed',
              pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] 3 Anrufversuche ohne Erfolg. Lead wird pausiert.'
          WHERE id = ${lead_id}
        `;
        actions.push('3 Versuche erreicht - Lead pausiert');
      } else {
        await sql`
          UPDATE leads
          SET pipeline_notes = COALESCE(pipeline_notes, '') || E'\n[' || TO_CHAR(NOW(), 'DD.MM.YYYY') || '] Anrufversuch ' || ${attempts} || '/3: ' || ${outcome} || '. ' || COALESCE(${call_notes}, '')
          WHERE id = ${lead_id}
        `;
        actions.push(`Versuch ${attempts}/3: ${outcome}`);
      }
    }

    // ============================================================
    // 5. Sequenz-Aktion ausfuehren
    // ============================================================
    if (sequence_action === 'stop') {
      await sql`
        UPDATE sequence_entries
        SET status = 'blocked', stopped_at = NOW()
        WHERE lead_id = ${lead_id} AND status IN ('active', 'pending', 'paused')
      `;
      actions.push('Sequenz manuell gestoppt');
    } else if (sequence_action === 'pause') {
      await sql`
        UPDATE sequence_entries
        SET paused_at = NOW(), pause_reason = 'call_disposition'
        WHERE lead_id = ${lead_id} AND status IN ('active', 'pending')
      `;
      actions.push('Sequenz pausiert');
    }

    // ============================================================
    // 6. HubSpot Sync (async, blockiert nicht)
    // ============================================================
    try {
      const [lead] = await sql`
        SELECT hubspot_contact_id FROM leads WHERE id = ${lead_id}
      `;
      if (lead?.hubspot_contact_id) {
        const activityContent = `Anruf: ${outcome}${answered ? ' (erreicht)' : ' (nicht erreicht)'}${call_notes ? '. Notizen: ' + call_notes : ''}`;
        await logActivityToHubSpot(lead.hubspot_contact_id, 'call', activityContent);
      }
    } catch (e) {
      console.warn('[disposition] HubSpot Sync fehlgeschlagen:', e);
    }

    // ============================================================
    // RESPONSE
    // ============================================================
    return NextResponse.json({
      ok: true,
      disposition_id: disposition.id,
      lead_id,
      outcome,
      actions_triggered: actions,
      new_lead_id: newLeadId,
    });

  } catch (error) {
    console.error('[disposition] Fehler:', error);
    return NextResponse.json(
      { ok: false, error: 'Interner Fehler beim Speichern der Disposition' },
      { status: 500 }
    );
  }
}

// Outcome auf einfachen call_result mappen (fuer call_queue Kompatibilitaet)
function mapOutcomeToResult(outcome: string): string {
  const map: Record<string, string> = {
    'termin_gebucht': 'booked',
    'interesse': 'reached',
    'kein_interesse': 'reached',
    'falscher_ansprechpartner': 'reached',
    'nicht_erreicht': 'not_reached',
    'mailbox': 'mailbox',
    'rueckruf': 'reached',
    'weiterleitung': 'reached',
    'besetzt': 'not_reached',
    'sonstiges': 'reached',
  };
  return map[outcome] || 'reached';
}
