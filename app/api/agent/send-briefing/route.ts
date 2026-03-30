/**
 * Agent Briefing Email Sender
 *
 * Accepts HTML briefing content from the Operations Manager agent
 * and sends it via Brevo transactional email to Angie.
 *
 * POST /api/agent/send-briefing
 * Headers: x-agent-secret: <CRON_SECRET>
 * Body: { subject: string, html: string, recipient?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/brevo';

const DEFAULT_RECIPIENT = 'hertle.anjuli@praxisnovaai.com';
const SENDER_EMAIL = 'info@praxisnovaai.com';
const SENDER_NAME = 'PraxisNova AI Ops Manager';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-agent-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subject, html, recipient } = body as {
      subject: string;
      html: string;
      recipient?: string;
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
      senderEmail: SENDER_EMAIL,
      senderName: SENDER_NAME,
      tags: ['ops-briefing'],
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
