import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { searchContactByEmail, updateContact } from '@/lib/hubspot';
import { sendTransactionalEmail } from '@/lib/brevo';
import crypto from 'crypto';

function verifyOptinToken(token: string): { valid: boolean; email: string | null } {
  try {
    const secret = process.env.INBOUND_WEBHOOK_SECRET || process.env.BREVO_WEBHOOK_SECRET || '';
    const [payload, signature] = token.split(':');
    if (!payload || !signature) return { valid: false, email: null };

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const [email, expiryStr] = decoded.split(':');
    const expiry = parseInt(expiryStr, 10);

    // Check expiry (24 hours)
    if (Date.now() > expiry) return { valid: false, email: null };

    // Verify HMAC
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false, email: null };
    }

    return { valid: true, email };
  } catch {
    return { valid: false, email: null };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('https://www.praxisnovaai.com?optin=error'));
  }

  const { valid, email } = verifyOptinToken(token);

  if (!valid || !email) {
    return NextResponse.redirect(new URL('https://www.praxisnovaai.com?optin=expired'));
  }

  try {
    // Update lead status in DB
    await sql`
      UPDATE leads SET
        sequence_status = 'active',
        sequence_step = 1,
        enrolled_at = NOW()
      WHERE email = ${email} AND sequence_status = 'pending_optin'
    `;

    // Update HubSpot
    try {
      const hubspotContact = await searchContactByEmail(email);
      if (hubspotContact) {
        await updateContact(hubspotContact.id, {
          sequence_status: 'active',
          sequence_step: '1',
          enrolled_at: new Date().toISOString().split('T')[0],
        });
      }
    } catch (hubspotError) {
      console.error('HubSpot opt-in sync error:', hubspotError);
    }

    // ── Inbound Response Agent — instant personalized reply ─────────
    // Runs inline after opt-in: scores intent from click history,
    // researches company, sends personalized email from Anjuli
    try {
      const leads = await sql`SELECT * FROM leads WHERE email = ${email} LIMIT 1`;
      const lead = leads[0];
      if (lead && !lead.outreach_source) {
        // Score intent from click history
        const clicks = await sql`
          SELECT page, button_id FROM website_clicks
          WHERE lead_id = ${lead.id}
          ORDER BY clicked_at DESC LIMIT 20
        `;
        let intentScore = 0;
        const pagesVisited: string[] = [];
        for (const click of clicks) {
          const p = (click.page || '').toLowerCase();
          pagesVisited.push(p);
          if (p.includes('preis') || p.includes('pricing')) intentScore += 4;
          else if (p.includes('potenzialrechner') || p.includes('kalkulator')) intentScore += 4;
          else if (p.includes('quickcheck') || p.includes('produkt')) intentScore += 3;
          else intentScore += 1;
        }
        if (pagesVisited.length >= 3) intentScore += 2;
        intentScore = Math.min(intentScore, 10);

        // Determine email variant
        const firstName = lead.first_name || '';
        const company = lead.company || '';
        let subject: string;
        let body: string;

        if (intentScore >= 7) {
          subject = `Kurze Frage zu Ihrer Anfrage${company ? ` — ${company}` : ''}`;
          body = `<p>Hallo ${firstName || 'zusammen'},</p>
<p>ich habe gesehen, dass Sie sich ${pagesVisited.includes('/preise') || pagesVisited.some(p => p.includes('preis')) ? 'unsere Preise' : 'unsere KI-Lösungen'} angeschaut haben.</p>
<p>PraxisNova AI hilft Unternehmen in Bau, Handwerk und Immobilien, repetitive Prozesse zu automatisieren — von der Angebotserstellung bis zur Kundenkommunikation.</p>
<p>Ich würde mich über ein kurzes 20-Minuten-Gespräch freuen:<br/>
<a href="https://calendly.com/hertle-anjuli-praxisnovaai/erstgesprach">Termin buchen</a></p>
<p>Herzliche Grüße<br/>Anjuli Hertle<br/>CEO & Head of Sales | PraxisNova AI</p>`;
        } else if (intentScore >= 4) {
          subject = `Danke für Ihr Interesse${company ? ` — ${company}` : ''}`;
          body = `<p>Hallo ${firstName || 'zusammen'},</p>
<p>vielen Dank, dass Sie sich bei PraxisNova AI gemeldet haben.</p>
<p>Wir helfen Unternehmen in Bau, Handwerk und Immobilien, mit KI-Automatisierung bis zu 10 Stunden pro Woche zu sparen.</p>
<p>Darf ich fragen: Gibt es einen konkreten Prozess, den Sie automatisieren möchten?</p>
<p>Herzliche Grüße<br/>Anjuli Hertle<br/>CEO & Head of Sales | PraxisNova AI</p>`;
        } else {
          subject = 'Willkommen bei PraxisNova AI';
          body = `<p>Hallo ${firstName || 'zusammen'},</p>
<p>schön, dass Sie den Weg zu uns gefunden haben!</p>
<p>Unser kostenloser KI-Potenzialrechner zeigt in 2 Minuten die größten Hebel für Ihr Unternehmen:<br/>
<a href="https://praxisnovaai.com/ki-potenzialrechner">Jetzt testen</a></p>
<p>Bei Fragen bin ich direkt erreichbar.</p>
<p>Herzliche Grüße<br/>Anjuli Hertle<br/>CEO & Head of Sales | PraxisNova AI</p>`;
        }

        await sendTransactionalEmail({
          to: email,
          subject,
          htmlContent: body,
          senderEmail: 'hertle.anjuli@praxisnovaai.com',
          senderName: 'Anjuli Hertle',
          tags: ['inbound-response', `intent-${intentScore >= 7 ? 'high' : intentScore >= 4 ? 'medium' : 'low'}`],
        });

        // Mark lead as agent-contacted
        await sql`
          UPDATE leads SET
            outreach_source = 'agent_inbound_response',
            pipeline_stage = 'In Outreach',
            pipeline_stage_updated_at = NOW(),
            pipeline_notes = ${'Inbound Agent: Intent ' + intentScore + '/10, Seiten: ' + pagesVisited.slice(0, 5).join(', ')}
          WHERE id = ${lead.id}
        `;

        // Log the decision
        const runId = crypto.randomUUID();
        await sql`
          INSERT INTO agent_decisions (run_id, agent_name, decision_type, subject_type, subject_id, subject_email, subject_company, score, reasoning, data_payload, status)
          VALUES (
            ${runId}, 'inbound_response_agent', 'inbound_response_sent', 'lead',
            ${lead.id}, ${email}, ${company},
            ${intentScore},
            ${'Inbound-Lead reagiert — Intent ' + intentScore + '/10, ' + (intentScore >= 7 ? 'Meeting-Anfrage' : intentScore >= 4 ? 'Wertfrage' : 'Edukativ') + ' gesendet'},
            ${JSON.stringify({ intent_score: intentScore, pages_visited: pagesVisited.slice(0, 10), email_variant: intentScore >= 7 ? 'high' : intentScore >= 4 ? 'medium' : 'low', response_type: 'instant_webhook' })},
            'completed'
          )
        `;
        console.log(`[Inbound Response] Sent personalized email to ${email}, intent=${intentScore}`);
      }
    } catch (inboundError) {
      console.error('[Inbound Response] Error (non-blocking):', inboundError);
    }

    return NextResponse.redirect(new URL('https://www.praxisnovaai.com?optin=confirmed'));
  } catch (error) {
    console.error('Confirm opt-in error:', error);
    return NextResponse.redirect(new URL('https://www.praxisnovaai.com?optin=error'));
  }
}
