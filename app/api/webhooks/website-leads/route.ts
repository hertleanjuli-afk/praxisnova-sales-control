/**
 * Website Leads Webhook (Paket B Teil 3, 2026-04-12)
 *
 * Empfaengt Leads aus dem Email-Popup auf praxisnovaai.com. Legt den Lead
 * im Sales-Tool an, schickt eine Benachrichtigung an Angie per Brevo,
 * und gibt dem Browser ein 200 zurueck damit das Popup "Danke, wir
 * melden uns innerhalb von 2 Stunden" anzeigen kann.
 *
 * Auth: Origin-basiert wie der website-clicks Webhook. Kein Secret in
 * public JS. Nur POSTs von praxisnovaai.com und www.praxisnovaai.com
 * werden akzeptiert.
 *
 * Rate-Limit: 5 POSTs pro IP pro 10 Minuten (enger als website-clicks
 * weil Leads teurer sind als Pageviews, Spam-Prevention).
 *
 * Body-Schema:
 *   email      (required, gueltige Email-Adresse)
 *   company    (optional, string)
 *   sector     (optional, enum: bau, handwerk, immobilien, unknown)
 *   source     (optional, enum: popup, tracking_form, calendar_booking,
 *               default: popup)
 *   utm_source, utm_medium, utm_campaign, utm_content (optional)
 *   page_url   (optional, volle URL wo das Popup getriggert wurde)
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';

const ALLOWED_ORIGINS = new Set<string>([
  'https://praxisnovaai.com',
  'https://www.praxisnovaai.com',
]);

const RATE_LIMIT_WINDOW_MS = 10 * 60_000; // 10 Minuten
const RATE_LIMIT_MAX_POSTS = 5;
const rateLimitState = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitState.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitState.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_POSTS) return false;
  entry.count++;
  return true;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// Simple RFC-5322 aehnlicher Email-Check. Nicht perfekt, aber gut genug
// um offensichtlich kaputte Eingaben auszusortieren. Echte Validierung
// passiert spaeter beim ersten Mail-Versand.
function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// CORS Preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  // 1) Origin-Check
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json(
      { error: 'Disallowed origin' },
      { status: 401, headers: corsHeaders(origin) },
    );
  }

  // 2) Rate-Limit
  const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown';
  const ip = forwardedFor.split(',')[0].trim();
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: corsHeaders(origin) },
    );
  }

  // 3) Body parsen
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const { email, company, sector, source, utm_source, utm_medium, utm_campaign, utm_content, page_url } = body;

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Valid email is required' },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCompany = typeof company === 'string' && company.trim() ? company.trim() : null;
  const allowedSectors = new Set(['bau', 'handwerk', 'immobilien', 'unknown']);
  const normalizedSector = typeof sector === 'string' && allowedSectors.has(sector.toLowerCase())
    ? sector.toLowerCase()
    : 'unknown';
  const allowedSources = new Set(['popup', 'tracking_form', 'calendar_booking']);
  const normalizedSource = typeof source === 'string' && allowedSources.has(source)
    ? source
    : 'popup';

  try {
    // 4) Bestehenden Lead pruefen
    const existing = await sql`
      SELECT id, pipeline_stage FROM leads WHERE LOWER(email) = ${normalizedEmail} LIMIT 1
    `;

    let leadId: number;
    let isNew = false;

    if (existing.length > 0) {
      leadId = existing[0].id as number;
      // Lead existiert bereits - ergaenzen wenn die neue Info etwas bringt
      await sql`
        UPDATE leads SET
          pipeline_notes = CONCAT(
            COALESCE(pipeline_notes, ''),
            ' | Erneut via Popup am ', NOW()::text,
            ${normalizedCompany ? `, Firma: ${normalizedCompany}` : ''},
            ${page_url ? `, Seite: ${page_url}` : ''}
          ),
          updated_at = NOW()
        WHERE id = ${leadId}
      `;
    } else {
      // Neuer Lead
      const inserted = await sql`
        INSERT INTO leads (
          email, company, industry, pipeline_stage,
          source, utm_source, utm_medium, utm_campaign, utm_content,
          pipeline_notes, created_at
        ) VALUES (
          ${normalizedEmail},
          ${normalizedCompany},
          ${normalizedSector === 'unknown' ? null : normalizedSector},
          'Neu',
          ${`website_${normalizedSource}`},
          ${utm_source || null},
          ${utm_medium || null},
          ${utm_campaign || null},
          ${utm_content || null},
          ${page_url ? `Popup submit auf ${page_url}` : 'Popup submit'},
          NOW()
        )
        RETURNING id
      `;
      leadId = inserted[0].id as number;
      isNew = true;
    }

    // 5) Angie-Notification via Brevo (non-blocking)
    const angieEmail = process.env.USER_1_EMAIL || 'hertle.anjuli@praxisnovaai.com';
    const leadUrl = `https://praxisnova-sales-control.vercel.app/lead/${leadId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #F0F0F5; padding: 24px; max-width: 640px;">
        <h2 style="color: #E8472A; margin: 0 0 8px;">${isNew ? 'Neuer Lead' : 'Erneuter Kontakt'} via Website-Popup</h2>
        <p style="color: #ccc; margin: 0 0 20px; font-size: 14px;">
          ${isNew ? 'Ein neuer Besucher hat seine Email im Popup auf praxisnovaai.com hinterlassen.' : 'Ein bestehender Lead hat sich erneut via Popup gemeldet.'}
        </p>

        <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Email</div>
          <div style="color: #F0F0F5; font-size: 14px; margin-bottom: 12px;">${normalizedEmail}</div>

          ${normalizedCompany ? `
          <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Firma</div>
          <div style="color: #F0F0F5; font-size: 14px; margin-bottom: 12px;">${normalizedCompany}</div>
          ` : ''}

          <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Branche</div>
          <div style="color: #F0F0F5; font-size: 14px; margin-bottom: 12px;">${normalizedSector}</div>

          ${page_url ? `
          <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Getriggert auf</div>
          <div style="color: #F0F0F5; font-size: 13px; margin-bottom: 12px;">${String(page_url).substring(0, 200)}</div>
          ` : ''}
        </div>

        <a href="${leadUrl}" style="display: inline-block; background: #E8472A; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Lead im Sales-Tool oeffnen
        </a>

        <p style="color: #666; margin: 20px 0 0; font-size: 11px;">
          Automatisch erkannt durch website-leads Webhook um ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} Berlin-Zeit. Der Welcome-Agent wird in den naechsten 2 Stunden antworten.
        </p>
      </div>
    `;

    sendTransactionalEmail({
      to: angieEmail,
      subject: isNew
        ? `Neuer Lead: ${normalizedEmail}${normalizedCompany ? ' (' + normalizedCompany + ')' : ''}`
        : `Erneuter Kontakt: ${normalizedEmail}`,
      htmlContent: html,
      wrapAsInternal: true,
    }).catch(err =>
      console.warn('[website-leads] Brevo notification failed (non-critical):', err),
    );

    return NextResponse.json(
      { ok: true, leadId, isNew, source: normalizedSource },
      { headers: corsHeaders(origin) },
    );
  } catch (err) {
    console.error('[website-leads] Fatal error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}
