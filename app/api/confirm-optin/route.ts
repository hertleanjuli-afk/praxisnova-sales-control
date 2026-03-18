import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { searchContactByEmail, updateContact } from '@/lib/hubspot';
import crypto from 'crypto';

function verifyOptinToken(token: string): { valid: boolean; email: string | null } {
  try {
    const secret = process.env.INBOUND_WEBHOOK_SECRET || process.env.BREVO_WEBHOOK_SECRET || '';
    const [payload, signature] = token.split(':');
    if (!payload || !signature) return { valid: false, email: null };

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const [email, expiryStr] = decoded.split('|');
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
      WHERE email = ${email} AND sequence_type = 'inbound'
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

    return NextResponse.redirect(new URL('https://www.praxisnovaai.com?optin=confirmed'));
  } catch (error) {
    console.error('Confirm opt-in error:', error);
    return NextResponse.redirect(new URL('https://www.praxisnovaai.com?optin=error'));
  }
}
