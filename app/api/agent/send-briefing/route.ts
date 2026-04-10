/**
 * Agent Email Sender — unified endpoint for all agent-sent emails
 *
 * POST /api/agent/send-briefing
 * Headers: x-agent-secret: <CRON_SECRET>
 * Body: { subject, html, recipient?, sender_email?, sender_name?, tags? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/brevo';

const DEFAULT_RECIPIENT = 'hertle.anjuli@praxisnovaai.com';
const DEFAULT_SENDER_EMAIL = 'info@praxisnovaai.com';
const DEFAULT_SENDER_NAME = 'PraxisNova AI';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-agent-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subject, html, recipient, sender_email, sender_name, tags } = body as {
      subject: string;
      html: string;
      recipient?: string;
      sender_email?: string;
      sender_name?: string;
      tags?: string[];
    };

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'subject and html are required' },
        { status: 400 }
      );
    }

    const result = await sendTransactionalEmail({
      to: recipient || DEFAULT_RECIPIENT,
      subject,
      htmlContent: html,
      senderEmail: sender_email || DEFAULT_SENDER_EMAIL,
      senderName: sender_name || DEFAULT_SENDER_NAME,
      tags: tags || ['agent-email'],
      wrapAsInternal: true,
    });

    if (result.success) {
      return NextResponse.json({
        ok: true,
        messageId: result.messageId,
        recipient: recipient || DEFAULT_RECIPIENT,
      });
    }

    return NextResponse.json(
      { error: result.error || 'Failed to send email', senderUsed: result.senderUsed },
      { status: 500 }
    );
  } catch (error) {
    console.error('[send-briefing]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
