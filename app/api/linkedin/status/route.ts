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

  const { leadId, action, message } = await request.json();

  if (!leadId || !action) {
    return NextResponse.json({ error: 'leadId and action required' }, { status: 400 });
  }

  try {
    const lead = await sql`SELECT * FROM leads WHERE id = ${leadId}`;
    if (lead.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    switch (action) {
      case 'request_sent':
        await sql`
          UPDATE leads SET linkedin_status = 'request_sent', linkedin_request_date = ${now}
          WHERE id = ${leadId}
        `;
        if (lead[0].hubspot_id) {
          await updateContact(lead[0].hubspot_id, {
            linkedin_export_week: `Anfrage gesendet ${new Date().toLocaleDateString('de-DE')}`,
          }).catch(console.error);
        }
        break;

      case 'connected':
        await sql`
          UPDATE leads SET linkedin_status = 'connected', linkedin_connected_date = ${now}
          WHERE id = ${leadId}
        `;
        if (lead[0].hubspot_id) {
          await updateContact(lead[0].hubspot_id, {
            linkedin_export_week: `Verbunden ${new Date().toLocaleDateString('de-DE')}`,
          }).catch(console.error);
        }
        break;

      case 'message_sent':
        await sql`
          UPDATE leads SET linkedin_status = 'message_sent', linkedin_message = ${message || null}, linkedin_message_date = ${now}
          WHERE id = ${leadId}
        `;
        if (lead[0].hubspot_id) {
          await updateContact(lead[0].hubspot_id, {
            linkedin_export_week: `Nachricht gesendet ${new Date().toLocaleDateString('de-DE')}`,
          }).catch(console.error);
        }
        break;

      case 'replied': {
        const cooldown = new Date();
        cooldown.setDate(cooldown.getDate() + 90);
        await sql`
          UPDATE leads SET
            linkedin_status = 'replied',
            linkedin_reply = ${message || null},
            linkedin_reply_date = ${now},
            sequence_status = 'replied',
            exited_at = ${now},
            cooldown_until = ${cooldown.toISOString()}
          WHERE id = ${leadId}
        `;
        if (lead[0].hubspot_id) {
          await updateContact(lead[0].hubspot_id, {
            sequence_status: 'replied',
            linkedin_export_week: `Antwort erhalten ${new Date().toLocaleDateString('de-DE')}`,
            cooldown_until: cooldown.toISOString().split('T')[0],
          }).catch(console.error);
        }
        break;
      }

      case 'meeting_booked': {
        const cooldown2 = new Date();
        cooldown2.setDate(cooldown2.getDate() + 90);
        await sql`
          UPDATE leads SET
            linkedin_status = 'meeting_booked',
            sequence_status = 'booked',
            exited_at = ${now},
            cooldown_until = ${cooldown2.toISOString()}
          WHERE id = ${leadId}
        `;
        await sql`
          INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
          VALUES (${leadId}, ${lead[0].sequence_type}, ${lead[0].sequence_step}, 'booked')
        `;
        if (lead[0].hubspot_id) {
          await updateContact(lead[0].hubspot_id, {
            sequence_status: 'booked',
            linkedin_export_week: `Meeting gebucht ${new Date().toLocaleDateString('de-DE')}`,
            cooldown_until: cooldown2.toISOString().split('T')[0],
          }).catch(console.error);
        }
        break;
      }

      case 'no_linkedin':
        await sql`
          UPDATE leads SET
            linkedin_status = 'no_linkedin',
            linkedin_no_profile = TRUE,
            linkedin_no_profile_date = ${now}
          WHERE id = ${leadId}
        `;
        if (lead[0].hubspot_id) {
          await updateContact(lead[0].hubspot_id, {
            linkedin_export_week: `Kein LinkedIn ${new Date().toLocaleDateString('de-DE')}`,
          }).catch(console.error);
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, action, leadId });
  } catch (error) {
    console.error('LinkedIn status error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
