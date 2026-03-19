import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { updateContact } from '@/lib/hubspot';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leadId, reason = 'manual_stop' } = await request.json();

  if (!leadId) {
    return NextResponse.json({ error: 'Lead-ID erforderlich' }, { status: 400 });
  }

  try {
    const lead = await sql`SELECT * FROM leads WHERE id = ${leadId}`;
    if (lead.length === 0) {
      return NextResponse.json({ error: 'Lead nicht gefunden' }, { status: 404 });
    }

    const statusMap: Record<string, string> = {
      replied: 'replied',
      unsubscribed: 'unsubscribed',
      booked: 'booked',
    };
    const status = statusMap[reason] || 'completed';
    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 90);

    await sql`
      UPDATE leads SET
        sequence_status = ${status},
        exited_at = NOW(),
        cooldown_until = ${cooldownUntil.toISOString()}
      WHERE id = ${leadId}
    `;

    // Sync to HubSpot
    if (lead[0].hubspot_id) {
      try {
        await updateContact(lead[0].hubspot_id, {
          sequence_status: status,
          cooldown_until: cooldownUntil.toISOString().split('T')[0],
        });
      } catch (hubspotError) {
        console.error('HubSpot sync error:', hubspotError);
      }
    }

    return NextResponse.json({ success: true, status, cooldown_until: cooldownUntil.toISOString() });
  } catch (error) {
    console.error('Stop sequence error:', error);
    return NextResponse.json({ error: 'Fehler beim Stoppen der Sequenz' }, { status: 500 });
  }
}
