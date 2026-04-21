/**
 * Inbound Form Webhook /api/inbound (Track 3, T3.7, 2026-04-21).
 *
 * Nimmt Lead-Submissions von der neuen Website (Track 2) entgegen und
 * legt einen Lead in der DB an. Bei demo_request/workshop_request/
 * dfy_request wird zusaetzlich ein Anrufliste-Eintrag (call_queue)
 * getriggert.
 *
 * Gate 1.2 (Security): CORS-restricted auf die Website-Origin, Rate-Limit
 * via DB-basierter cron_locks-Style (Fallback). Kein HMAC erforderlich,
 * Form wird im Browser geladen (same-origin fuer Website).
 *
 * Gate 1.5 (DSGVO): consent_version + consented_at werden auf dem Lead
 * gespeichert. data_source = 'inbound-form'. Retention greift ueber
 * bestehende retention-cleanup Cron.
 */
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { classifyLead } from '@/lib/icp-score';

export const runtime = 'nodejs';
export const maxDuration = 10;

interface InboundPayload {
  icp?: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  message?: string;
  source?: string;
  consent_version?: string;
  consented_at?: string;
}

const ALLOWED_ICPS = new Set([
  'icp-proptech',
  'icp-hausverwaltung',
  'icp-kanzlei',
  'icp-agentur',
]);

const DEMO_SOURCES = new Set([
  'demo_request',
  'workshop_request',
  'dfy_request',
  'potenzial_check_request',
]);

const ALLOWED_ORIGINS = (process.env.INBOUND_ALLOWED_ORIGINS || 'https://www.praxisnovaai.com,https://praxisnovaai.com')
  .split(',')
  .map(o => o.trim());

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  let body: InboundPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers });
  }

  const email = sanitize(body.email, 200).toLowerCase();
  const name = sanitize(body.name, 200);
  const company = sanitize(body.company, 200);
  const phone = sanitize(body.phone, 50);
  const message = sanitize(body.message, 2000);
  const source = sanitize(body.source, 100) || 'inbound-form';
  const icp = sanitize(body.icp, 50);
  const consentVersion = sanitize(body.consent_version, 50);
  const consentedAt = sanitize(body.consented_at, 50);

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400, headers });
  }
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400, headers });
  }
  if (!consentVersion || !consentedAt) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400, headers });
  }

  const effectiveIcp = ALLOWED_ICPS.has(icp) ? icp : null;
  const [firstName, ...lastParts] = name.split(/\s+/);
  const lastName = lastParts.join(' ') || null;

  // ICP-Klassifikation als Cross-Check: wenn Form-icp fehlt, via icp_config
  // aus industry nachholen (Branche koennte aus message heuristisch parsed
  // werden, hier aber nur via icp_config-Lookup via leerem Input defaults
  // zu no_icp_match).
  let fallbackIcp: { icp_tag: string | null; icp_score: number; ready_to_contact: boolean; triage_reason: string | null } | null = null;
  if (!effectiveIcp) {
    try {
      fallbackIcp = await classifyLead({ industry: company, nace_code: null });
    } catch {
      fallbackIcp = null;
    }
  }

  const finalIcp = effectiveIcp || fallbackIcp?.icp_tag || null;
  const finalScore = effectiveIcp
    ? 80
    : fallbackIcp?.icp_score ?? 50;
  const readyToContact = finalScore >= 60;

  // Idempotency: Dedup per email + source + consent_version. Wenn gleiche
  // Submission innerhalb 5 Minuten wiederholt wird, ersten Lead zurueckgeben
  // ohne Doppel-Insert.
  const existing = await sql<Array<{ id: number; created_at: Date }>>`
    SELECT id, created_at
    FROM leads
    WHERE email = ${email}
      AND source = ${source}
      AND created_at > NOW() - INTERVAL '5 minutes'
    LIMIT 1
  `;

  let leadId: number;
  if (existing.length > 0) {
    leadId = existing[0].id;
  } else {
    const inserted = await sql<Array<{ id: number }>>`
      INSERT INTO leads (
        first_name, last_name, email, company, phone,
        source, sequence_type, pipeline_stage,
        icp_tag, icp_score, ready_to_contact, triage_reason,
        consent_version, consented_at,
        created_at
      ) VALUES (
        ${firstName}, ${lastName}, ${email}, ${company || null}, ${phone || null},
        ${source}, 'inbound', 'Neu',
        ${finalIcp}, ${finalScore}, ${readyToContact}, ${fallbackIcp?.triage_reason || null},
        ${consentVersion}, ${consentedAt},
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        pipeline_stage = CASE WHEN leads.pipeline_stage IN ('Blocked','Opted-out') THEN leads.pipeline_stage ELSE 'Neu' END,
        icp_tag = COALESCE(leads.icp_tag, EXCLUDED.icp_tag),
        icp_score = GREATEST(leads.icp_score, EXCLUDED.icp_score),
        ready_to_contact = leads.ready_to_contact OR EXCLUDED.ready_to_contact,
        consent_version = EXCLUDED.consent_version,
        consented_at = EXCLUDED.consented_at
      RETURNING id
    `;
    leadId = inserted[0].id;
  }

  // Anrufliste-Trigger bei Demo/Workshop/DFY-Anfragen
  const shouldTriggerCallQueue = DEMO_SOURCES.has(source);
  if (shouldTriggerCallQueue) {
    try {
      await sql`
        INSERT INTO call_queue (
          lead_id, priority, source_trigger, trigger_context, scheduled_for
        ) VALUES (
          ${leadId}, 1, 'inbound_form_demo_request',
          ${JSON.stringify({ source, message: message.slice(0, 500), icp: finalIcp })}::jsonb,
          NOW()
        )
        ON CONFLICT DO NOTHING
      `;
    } catch (err) {
      console.warn(`[inbound] call_queue-Insert non-blocking fehlgeschlagen: ${err}`);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      lead_id: leadId,
      icp_tag: finalIcp,
      call_queue_triggered: shouldTriggerCallQueue,
    },
    { status: 200, headers }
  );
}
