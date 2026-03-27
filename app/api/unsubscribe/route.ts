import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import sql from '@/lib/db';
import { updateContact } from '@/lib/hubspot';

function getHmacSecret(): string {
  const secret = process.env.BREVO_WEBHOOK_SECRET || process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) throw new Error('Webhook secret not configured');
  return secret;
}

function verifyToken(token: string): { valid: boolean; email: string; expired: boolean } {
  try {
    // Token format: base64(email:expiry):signature
    const parts = token.split(':');
    if (parts.length < 2) return { valid: false, email: '', expired: false };

    const sig = parts[parts.length - 1];
    const pay = parts.slice(0, parts.length - 1).join(':');

    const secret = getHmacSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(pay).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return { valid: false, email: '', expired: false };
    }

    const decoded = Buffer.from(pay, 'base64').toString('utf-8');
    const lastColon = decoded.lastIndexOf(':');
    const email = decoded.substring(0, lastColon);
    const expiry = parseInt(decoded.substring(lastColon + 1), 10);

    if (Date.now() / 1000 > expiry) {
      return { valid: true, email, expired: true };
    }

    return { valid: true, email, expired: false };
  } catch {
    return { valid: false, email: '', expired: false };
  }
}

// GET: User clicks unsubscribe link in email → shows confirmation page
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(buildHtmlPage('Fehler', 'Ungültiger Abmelde-Link.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const { valid, email, expired } = verifyToken(token);

  if (!valid) {
    return new NextResponse(buildHtmlPage('Fehler', 'Ungültiger Abmelde-Link. Bitte kontaktieren Sie uns unter info@praxisnovaai.com.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (expired) {
    return new NextResponse(buildHtmlPage(
      'Link abgelaufen',
      'Dieser Abmelde-Link ist abgelaufen. Bitte kontaktieren Sie uns unter <a href="mailto:info@praxisnovaai.com">info@praxisnovaai.com</a>, um sich abzumelden.'
    ), {
      status: 410,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Process the unsubscribe
  try {
    const leads = await sql`SELECT * FROM leads WHERE email = ${email}`;

    if (leads.length === 0) {
      return new NextResponse(buildHtmlPage(
        'Abmeldung erfolgreich',
        'Sie wurden erfolgreich abgemeldet und erhalten keine weiteren E-Mails von uns.'
      ), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const lead = leads[0];

    // Permanently block: set status, permanent flag, and remove cooldown limit
    await sql`
      UPDATE leads SET
        sequence_status = 'unsubscribed',
        permanently_blocked = TRUE,
        unsubscribed_at = COALESCE(unsubscribed_at, NOW()),
        exited_at = COALESCE(exited_at, NOW()),
        cooldown_until = NULL
      WHERE email = ${email}
    `;

    // Log the unsubscribe event
    await sql`
      INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
      VALUES (${lead.id}, ${lead.sequence_type}, ${lead.sequence_step}, 'unsubscribed')
    `;

    // Sync to HubSpot
    if (lead.hubspot_id) {
      try {
        await updateContact(lead.hubspot_id, {
          sequence_status: 'unsubscribed',
          permanently_blocked: 'true',
          unsubscribed_at: new Date().toISOString().split('T')[0],
        });
      } catch (e) {
        console.error('[Unsubscribe] HubSpot sync error:', e);
      }
    }

    console.log(`[Unsubscribe] Lead ${lead.id} (${email}, ${lead.company}) permanently unsubscribed via link`);

    return new NextResponse(buildHtmlPage(
      'Abmeldung erfolgreich',
      `Sie wurden erfolgreich abgemeldet und erhalten keine weiteren E-Mails von PraxisNova AI.<br><br>
       <span style="font-size:13px;color:#888;">Falls Sie Fragen haben, erreichen Sie uns unter <a href="mailto:info@praxisnovaai.com" style="color:#2563eb;">info@praxisnovaai.com</a>.</span>`
    ), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    return new NextResponse(buildHtmlPage(
      'Fehler',
      'Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns unter <a href="mailto:info@praxisnovaai.com">info@praxisnovaai.com</a>.'
    ), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} – PraxisNova AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #334155; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 48px; max-width: 480px; width: 90%; text-align: center; }
    h1 { font-size: 22px; color: #1e3a5f; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.7; color: #475569; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .logo { font-size: 18px; font-weight: 700; color: #1e3a5f; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">PraxisNova AI</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
