/**
 * SQL-Aggregationen fuer Dashboard-V2 (Track 1, T1.2).
 *
 * Jede Metrik-Gruppe ist eine async-Funktion mit einem einzelnen Query,
 * damit Parallel-Ausfuehrung trivial ist und EXPLAIN-Runs pro Gruppe
 * isoliert moeglich sind.
 *
 * Gate 5 (PLATFORM-STANDARDS 2.1 Cost): rein SQL-Aggregation, kein LLM.
 * Gate 6 (PS 2.2 Scale): nutzt v9-Indexe idx_leads_linkedin_state,
 *   idx_leads_blocked_until, idx_linkedin_events_created,
 *   idx_linkedin_messages_direction, idx_company_blocks_until,
 *   idx_call_queue_scheduled_for. Zusaetzlich wird idx_leads_created_at
 *   in Migration v10 eingefuehrt.
 * Gate 7 (PS 2.3 Extensibility): Sequenz-Typen kommen aus
 *   SEQUENCE_MAX_STEPS (lib/metrics.ts), Max-Step-Check im SQL ist ein
 *   statisches OR ueber alle bekannten Typen. Bei neuen Sequence-Types
 *   muss sowohl lib/metrics.ts als auch die Query unten ergaenzt werden,
 *   bis icp_config-Tabelle als dynamische Quelle existiert.
 *
 * Pure Helper-Funktionen (Datum, Rate, Konsistenz) liegen in lib/metrics.ts.
 */

import sql from './db';
import { type SectorCount, type TimeWindows } from './metrics';

// ---------------------------------------------------------------------------
// 1.1 Lead-Metriken
// ---------------------------------------------------------------------------

export interface LeadMetrics {
  today: number;
  thisWeek: number;
  lastWeek: number;
  month: number;
}

export async function getLeadMetrics(w: TimeWindows): Promise<LeadMetrics> {
  const [row] = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= ${w.today}::timestamptz)         AS today,
      COUNT(*) FILTER (WHERE created_at >= ${w.thisWeek}::timestamptz)      AS this_week,
      COUNT(*) FILTER (
        WHERE created_at >= ${w.lastWeekStart}::timestamptz
          AND created_at <  ${w.lastWeekEnd}::timestamptz
      )                                                                     AS last_week,
      COUNT(*) FILTER (WHERE created_at >= ${w.monthStart}::timestamptz)    AS month
    FROM leads
  `) as Array<{ today: number; this_week: number; last_week: number; month: number }>;
  return {
    today: Number(row.today),
    thisWeek: Number(row.this_week),
    lastWeek: Number(row.last_week),
    month: Number(row.month),
  };
}

// ---------------------------------------------------------------------------
// 1.2 Sequenz-Metriken
// ---------------------------------------------------------------------------

export interface SequenceMetrics {
  startedToday: number;
  startedThisWeek: number;
  startedLastWeek: number;
  activeTotal: number;
  onLastStep: number;
  paused: number;
  endedWithoutReply: number;
}

/**
 * Max-Step-Check pro Sequenz-Typ als statische OR-Kette. Muss synchron zu
 * SEQUENCE_MAX_STEPS in lib/metrics.ts gepflegt werden, bis icp_config-
 * Tabelle aktiv ist (PLATFORM-STANDARDS 3.5).
 */
export async function getSequenceMetrics(
  w: TimeWindows
): Promise<SequenceMetrics> {
  const [row] = (await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE enrolled_at >= ${w.today}::timestamptz
      ) AS started_today,
      COUNT(*) FILTER (
        WHERE enrolled_at >= ${w.thisWeek}::timestamptz
      ) AS started_this_week,
      COUNT(*) FILTER (
        WHERE enrolled_at >= ${w.lastWeekStart}::timestamptz
          AND enrolled_at <  ${w.lastWeekEnd}::timestamptz
      ) AS started_last_week,
      COUNT(*) FILTER (
        WHERE sequence_status = 'active'
      ) AS active_total,
      COUNT(*) FILTER (
        WHERE sequence_status = 'active'
          AND (
            (sequence_type = 'allgemein'      AND sequence_step >= 7) OR
            (sequence_type = 'bauunternehmen' AND sequence_step >= 6) OR
            (sequence_type = 'handwerk'       AND sequence_step >= 6) OR
            (sequence_type = 'immobilien'     AND sequence_step >= 6) OR
            (sequence_type = 'inbound'        AND sequence_step >= 6)
          )
      ) AS on_last_step,
      COUNT(*) FILTER (
        WHERE sequence_status = 'paused'
      ) AS paused,
      COUNT(*) FILTER (
        WHERE sequence_status IN ('completed', 'stopped_manual')
          AND NOT EXISTS (
            SELECT 1 FROM email_events e
            WHERE e.lead_id = leads.id AND e.event_type = 'replied'
          )
      ) AS ended_without_reply
    FROM leads
  `) as Array<{
    started_today: number;
    started_this_week: number;
    started_last_week: number;
    active_total: number;
    on_last_step: number;
    paused: number;
    ended_without_reply: number;
  }>;
  return {
    startedToday: Number(row.started_today),
    startedThisWeek: Number(row.started_this_week),
    startedLastWeek: Number(row.started_last_week),
    activeTotal: Number(row.active_total),
    onLastStep: Number(row.on_last_step),
    paused: Number(row.paused),
    endedWithoutReply: Number(row.ended_without_reply),
  };
}

// ---------------------------------------------------------------------------
// 1.3 LinkedIn-Metriken
// ---------------------------------------------------------------------------

export interface LinkedInTimeWindowCounts {
  today: number;
  thisWeek: number;
  lastWeek: number;
  month: number;
}

export interface LinkedInMetrics {
  requestsSent: LinkedInTimeWindowCounts;
  requestsAccepted: LinkedInTimeWindowCounts;
  messagesSent: LinkedInTimeWindowCounts;
  messagesReceived: LinkedInTimeWindowCounts;
}

export async function getLinkedInMetrics(
  w: TimeWindows
): Promise<LinkedInMetrics> {
  const [row] = (await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE kind = 'event_request' AND ts >= ${w.today}::timestamptz
      ) AS req_sent_today,
      COUNT(*) FILTER (
        WHERE kind = 'event_request' AND ts >= ${w.thisWeek}::timestamptz
      ) AS req_sent_week,
      COUNT(*) FILTER (
        WHERE kind = 'event_request'
          AND ts >= ${w.lastWeekStart}::timestamptz
          AND ts <  ${w.lastWeekEnd}::timestamptz
      ) AS req_sent_last_week,
      COUNT(*) FILTER (
        WHERE kind = 'event_request' AND ts >= ${w.monthStart}::timestamptz
      ) AS req_sent_month,
      COUNT(*) FILTER (
        WHERE kind = 'event_connected' AND ts >= ${w.today}::timestamptz
      ) AS req_acc_today,
      COUNT(*) FILTER (
        WHERE kind = 'event_connected' AND ts >= ${w.thisWeek}::timestamptz
      ) AS req_acc_week,
      COUNT(*) FILTER (
        WHERE kind = 'event_connected'
          AND ts >= ${w.lastWeekStart}::timestamptz
          AND ts <  ${w.lastWeekEnd}::timestamptz
      ) AS req_acc_last_week,
      COUNT(*) FILTER (
        WHERE kind = 'event_connected' AND ts >= ${w.monthStart}::timestamptz
      ) AS req_acc_month,
      COUNT(*) FILTER (
        WHERE kind = 'msg_sent' AND ts >= ${w.today}::timestamptz
      ) AS msg_sent_today,
      COUNT(*) FILTER (
        WHERE kind = 'msg_sent' AND ts >= ${w.thisWeek}::timestamptz
      ) AS msg_sent_week,
      COUNT(*) FILTER (
        WHERE kind = 'msg_sent'
          AND ts >= ${w.lastWeekStart}::timestamptz
          AND ts <  ${w.lastWeekEnd}::timestamptz
      ) AS msg_sent_last_week,
      COUNT(*) FILTER (
        WHERE kind = 'msg_sent' AND ts >= ${w.monthStart}::timestamptz
      ) AS msg_sent_month,
      COUNT(*) FILTER (
        WHERE kind = 'msg_received' AND ts >= ${w.today}::timestamptz
      ) AS msg_rcv_today,
      COUNT(*) FILTER (
        WHERE kind = 'msg_received' AND ts >= ${w.thisWeek}::timestamptz
      ) AS msg_rcv_week,
      COUNT(*) FILTER (
        WHERE kind = 'msg_received'
          AND ts >= ${w.lastWeekStart}::timestamptz
          AND ts <  ${w.lastWeekEnd}::timestamptz
      ) AS msg_rcv_last_week,
      COUNT(*) FILTER (
        WHERE kind = 'msg_received' AND ts >= ${w.monthStart}::timestamptz
      ) AS msg_rcv_month
    FROM (
      SELECT 'event_request'::text   AS kind, created_at AS ts
        FROM linkedin_events WHERE to_state = 'request_sent'::linkedin_state_enum
      UNION ALL
      SELECT 'event_connected'::text AS kind, created_at AS ts
        FROM linkedin_events WHERE to_state = 'connected'::linkedin_state_enum
      UNION ALL
      SELECT 'msg_sent'::text        AS kind,
             COALESCE(sent_at, created_at) AS ts
        FROM linkedin_messages WHERE direction = 'sent'
      UNION ALL
      SELECT 'msg_received'::text    AS kind,
             COALESCE(received_at, created_at) AS ts
        FROM linkedin_messages WHERE direction = 'received'
    ) events
  `) as Array<Record<string, number>>;

  const toInt = (key: string) => Number(row[key] ?? 0);

  return {
    requestsSent: {
      today: toInt('req_sent_today'),
      thisWeek: toInt('req_sent_week'),
      lastWeek: toInt('req_sent_last_week'),
      month: toInt('req_sent_month'),
    },
    requestsAccepted: {
      today: toInt('req_acc_today'),
      thisWeek: toInt('req_acc_week'),
      lastWeek: toInt('req_acc_last_week'),
      month: toInt('req_acc_month'),
    },
    messagesSent: {
      today: toInt('msg_sent_today'),
      thisWeek: toInt('msg_sent_week'),
      lastWeek: toInt('msg_sent_last_week'),
      month: toInt('msg_sent_month'),
    },
    messagesReceived: {
      today: toInt('msg_rcv_today'),
      thisWeek: toInt('msg_rcv_week'),
      lastWeek: toInt('msg_rcv_last_week'),
      month: toInt('msg_rcv_month'),
    },
  };
}

// ---------------------------------------------------------------------------
// 1.4 Anruf-Metriken (Tabelle heisst call_queue, siehe NAMING-INCONSISTENCIES)
// ---------------------------------------------------------------------------

export interface CallMetrics {
  openToday: number;
  doneToday: number;
  callbacksOpen: number;
}

export async function getCallMetrics(w: TimeWindows): Promise<CallMetrics> {
  const endOfToday = new Date(
    new Date(w.today).getTime() + 86400000
  ).toISOString();
  // Offen "heute" = call_queue.status = 'ready' und fuer heute geplant.
  //   Bestands-Rows haben keinen scheduled_for, deshalb COALESCE auf queue_date.
  // Erledigt = call_logs.call_date::date heute (tatsaechlicher Anruf).
  // Callbacks offen = status = 'ready' + scheduled_for in der Zukunft.
  const [row] = (await sql`
    SELECT
      (SELECT COUNT(*) FROM call_queue
        WHERE status = 'ready'
          AND COALESCE(scheduled_for::date, queue_date) = ${w.today}::date
      ) AS open_today,
      (SELECT COUNT(*) FROM call_logs
        WHERE call_date >= ${w.today}::timestamptz
          AND call_date <  ${endOfToday}::timestamptz
      ) AS done_today,
      (SELECT COUNT(*) FROM call_queue
        WHERE status = 'ready'
          AND scheduled_for > ${w.now}::timestamptz
      ) AS callbacks_open
  `) as Array<{
    open_today: number;
    done_today: number;
    callbacks_open: number;
  }>;
  return {
    openToday: Number(row.open_today),
    doneToday: Number(row.done_today),
    callbacksOpen: Number(row.callbacks_open),
  };
}

// ---------------------------------------------------------------------------
// 1.5 Block-Metriken
// ---------------------------------------------------------------------------

export interface BlockMetrics {
  personsBlocked: number;
  companiesBlocked: number;
  expiringIn30Days: number;
}

export async function getBlockMetrics(w: TimeWindows): Promise<BlockMetrics> {
  const in30 = new Date(
    new Date(w.now).getTime() + 30 * 86400000
  ).toISOString();
  const [row] = (await sql`
    SELECT
      (SELECT COUNT(*) FROM leads
        WHERE linkedin_state = 'blocked_person'::linkedin_state_enum
          AND blocked_until > ${w.now}::timestamptz
      ) AS persons_blocked,
      (SELECT COUNT(*) FROM company_blocks
        WHERE blocked_until > ${w.now}::timestamptz
      ) AS companies_blocked,
      (
        (SELECT COUNT(*) FROM leads
          WHERE linkedin_state IN (
            'blocked_person'::linkedin_state_enum,
            'blocked_company'::linkedin_state_enum
          )
            AND blocked_until >  ${w.now}::timestamptz
            AND blocked_until <= ${in30}::timestamptz
        )
        +
        (SELECT COUNT(*) FROM company_blocks
          WHERE blocked_until >  ${w.now}::timestamptz
            AND blocked_until <= ${in30}::timestamptz
        )
      ) AS expiring_in_30_days
  `) as Array<{
    persons_blocked: number;
    companies_blocked: number;
    expiring_in_30_days: number;
  }>;
  return {
    personsBlocked: Number(row.persons_blocked),
    companiesBlocked: Number(row.companies_blocked),
    expiringIn30Days: Number(row.expiring_in_30_days),
  };
}

// ---------------------------------------------------------------------------
// Konsistenz-Query (Track-1-Prompt T1.2): Summe Branchen = Gesamt
// ---------------------------------------------------------------------------

export interface ConsistencyInput {
  totalLeads: number;
  sectorBreakdown: SectorCount[];
}

export async function getConsistencyInput(): Promise<ConsistencyInput> {
  const [total] = (await sql`SELECT COUNT(*) AS total FROM leads`) as Array<{
    total: number;
  }>;
  const rows = (await sql`
    SELECT COALESCE(sequence_type, 'allgemein') AS sector, COUNT(*) AS count
    FROM leads
    GROUP BY COALESCE(sequence_type, 'allgemein')
    ORDER BY count DESC
  `) as Array<{ sector: string; count: number }>;
  return {
    totalLeads: Number(total.total),
    sectorBreakdown: rows.map((r) => ({
      sector: r.sector,
      count: Number(r.count),
    })),
  };
}
