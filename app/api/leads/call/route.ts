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

  const { leadId, result, notes } = await request.json();

  if (!leadId || !result) {
    return NextResponse.json({ error: 'Lead-ID und Ergebnis sind erforderlich' }, { status: 400 });
  }

  const validResults = ['reached', 'not_reached', 'voicemail', 'appointment'];
  if (!validResults.includes(result)) {
    return NextResponse.json(
      { error: `Ergebnis muss eines der folgenden sein: ${validResults.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const lead = await sql`SELECT * FROM leads WHERE id = ${leadId}`;
    if (lead.length === 0) {
      return NextResponse.json({ error: 'Lead nicht gefunden' }, { status: 404 });
    }

    // Insert call log
    await sql`
      INSERT INTO call_logs (lead_id, result, notes, call_date)
      VALUES (${leadId}, ${result}, ${notes || null}, NOW())
    `;

    // If appointment booked, update lead status
    if (result === 'appointment') {
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 90);

      await sql`
        UPDATE leads SET
          sequence_status = 'booked',
          exited_at = NOW(),
          cooldown_until = ${cooldownUntil.toISOString()}
        WHERE id = ${leadId}
      `;

      // Sync to HubSpot
      if (lead[0].hubspot_id) {
        try {
          await updateContact(lead[0].hubspot_id, {
            sequence_status: 'booked',
            cooldown_until: cooldownUntil.toISOString().split('T')[0],
          });
        } catch (hubspotError) {
          console.error('HubSpot sync error:', hubspotError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Call log error:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern des Anrufs' }, { status: 500 });
  }
}
