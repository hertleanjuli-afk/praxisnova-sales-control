import { NextRequest, NextResponse } from 'next/server';

/**
 * One-time admin endpoint to register/update Brevo webhooks.
 * Call: POST /api/admin/setup-webhooks?secret=<ADMIN_SECRET>
 *
 * This ensures the "opened" event (and all other required events)
 * are forwarded from Brevo to our webhook handler.
 */

const REQUIRED_EVENTS = [
  'delivered',
  'hardBounce',
  'softBounce',
  'opened',       // ← the one we need to enable
  'click',
  'unsubscribed',
  'spam',
];

export async function POST(request: NextRequest) {
  // Simple admin secret check
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.praxisnovaai.com';
  const webhookUrl = `${appUrl}/api/webhooks/brevo`;

  const headers = {
    'Content-Type': 'application/json',
    'api-key': brevoApiKey,
  };

  try {
    // Step 1: List existing webhooks
    const listRes = await fetch('https://api.brevo.com/v3/webhooks', { headers });
    const listData = await listRes.json();

    const existingWebhooks = listData.webhooks || [];
    const existingForUrl = existingWebhooks.find(
      (wh: { url: string }) => wh.url === webhookUrl
    );

    if (existingForUrl) {
      // Step 2a: Update existing webhook to include all required events
      const webhookId = existingForUrl.id;
      const currentEvents: string[] = existingForUrl.events || [];
      const missingEvents = REQUIRED_EVENTS.filter(e => !currentEvents.includes(e));

      if (missingEvents.length === 0) {
        return NextResponse.json({
          ok: true,
          message: 'All required events already configured',
          webhookId,
          events: currentEvents,
        });
      }

      const allEvents = Array.from(new Set(currentEvents.concat(REQUIRED_EVENTS)));

      const updateRes = await fetch(`https://api.brevo.com/v3/webhooks/${webhookId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          events: allEvents,
          url: webhookUrl,
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.text();
        return NextResponse.json({ error: `Update failed: ${err}` }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: 'Webhook updated with missing events',
        webhookId,
        addedEvents: missingEvents,
        allEvents,
      });
    } else {
      // Step 2b: Create new webhook
      const createRes = await fetch('https://api.brevo.com/v3/webhooks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: webhookUrl,
          events: REQUIRED_EVENTS,
          type: 'transactional',
          description: 'PraxisNova Sales Control — all transactional events',
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        return NextResponse.json({ error: `Create failed: ${err}` }, { status: 500 });
      }

      const createData = await createRes.json();

      return NextResponse.json({
        ok: true,
        message: 'Webhook created',
        webhookId: createData.id,
        events: REQUIRED_EVENTS,
      });
    }
  } catch (error) {
    console.error('Setup webhooks error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
