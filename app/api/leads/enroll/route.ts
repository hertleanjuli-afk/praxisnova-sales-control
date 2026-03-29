import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createContact, searchContactByEmail, updateContact } from '@/lib/hubspot';
import { sendTransactionalEmail, generateConfirmLink } from '@/lib/brevo';
import { formatSalutation } from '@/lib/gender';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { leads } = body as {
    leads: Array<{
      apollo_id: string;
      email: string;
      first_name: string;
      last_name: string;
      company: string;
      title: string;
      employee_count: number;
      linkedin_url: string;
      industry: string;
    }>;
  };

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'Keine Leads angegeben' }, { status: 400 });
  }

  const results = [];

  for (const lead of leads) {
    try {
      // Check if lead already exists in DB
      const existing = await sql`
        SELECT id, sequence_status, cooldown_until FROM leads WHERE email = ${lead.email}
      `;

      if (existing.length > 0) {
        const ex = existing[0];
        // DSGVO: permanently blocked leads must NEVER be re-enrolled
        if (ex.permanently_blocked) {
          results.push({ email: lead.email, status: 'skipped', reason: 'permanently_blocked' });
          continue;
        }
        if (ex.sequence_status === 'active' || ex.sequence_status === 'pending_optin') {
          results.push({ email: lead.email, status: 'skipped', reason: 'already_active_or_pending' });
          continue;
        }
        if (ex.sequence_status === 'unsubscribed') {
          results.push({ email: lead.email, status: 'skipped', reason: 'unsubscribed' });
          continue;
        }
        if (ex.cooldown_until && new Date(ex.cooldown_until) > new Date()) {
          results.push({ email: lead.email, status: 'skipped', reason: 'cooldown' });
          continue;
        }
      }

      // Determine if this is an inbound lead (already has consent) or outbound (needs opt-in)
      const isInbound = lead.industry === 'inbound';
      const initialStatus = isInbound ? 'active' : 'pending_optin';

      // Upsert lead in DB
      const dbResult = await sql`
        INSERT INTO leads (apollo_id, email, first_name, last_name, company, title, industry,
                           employee_count, linkedin_url, sequence_status, sequence_type, sequence_step, enrolled_at)
        VALUES (${lead.apollo_id}, ${lead.email}, ${lead.first_name}, ${lead.last_name},
                ${lead.company}, ${lead.title}, ${lead.industry}, ${lead.employee_count},
                ${lead.linkedin_url}, ${initialStatus}, ${lead.industry}, 1, NOW())
        ON CONFLICT (email) DO UPDATE SET
          sequence_status = ${initialStatus},
          sequence_type = ${lead.industry},
          sequence_step = 1,
          enrolled_at = NOW(),
          exited_at = NULL,
          cooldown_until = NULL,
          optin_reminded = NULL
        RETURNING id
      `;

      const leadId = dbResult[0].id;

      // For outbound leads: send double opt-in confirmation email
      if (!isInbound) {
        try {
          const confirmLink = generateConfirmLink(lead.email);
          const salutation = formatSalutation(lead.first_name, lead.last_name);

          await sendTransactionalEmail({
            to: lead.email,
            subject: 'Dürfen wir Ihnen zeigen, wo bei ' + (lead.company || 'Ihrem Unternehmen') + ' der größte Hebel liegt?',
            htmlContent: `<html>
<body style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.6;">
<p>${salutation}</p>
<p>wir sind PraxisNova AI und helfen Unternehmen wie ${lead.company || 'Ihrem'}, wiederkehrende Aufgaben mit KI zu automatisieren – von der Angebotserstellung bis zur Kundenkommunikation.</p>
<p>Laut KfW-Mittelstandspanel verlieren KMU im Schnitt <strong>8 Stunden pro Woche</strong> an solche Aufgaben. Wir würden Ihnen gerne zeigen, wo bei ${lead.company || 'Ihnen'} der größte Hebel liegt.</p>
<p><strong>Dürfen wir Ihnen dazu eine kurze E-Mail-Serie mit konkreten Tipps und Beispielen senden?</strong></p>
<p style="text-align:center;margin:30px 0;">
  <a href="${confirmLink}" style="background-color:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">Ja, gerne – Tipps zusenden</a>
</p>
<p style="font-size:13px;color:#666;">Wenn Sie kein Interesse haben, müssen Sie nichts tun – Sie erhalten dann keine weiteren E-Mails von uns.</p>
<p>Herzliche Grüße,<br>Anjuli Hertle<br>CEO & Head of Sales<br>PraxisNova AI</p>
</body>
</html>`,
            tags: [lead.industry, 'optin-request'],
          });

          await sql`
            INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
            VALUES (${leadId}, ${lead.industry}, 0, 'optin_sent')
          `;
        } catch (emailError) {
          console.error('Opt-in email error for', lead.email, emailError);
        }
      }

      // Sync to HubSpot
      try {
        const hubspotContact = await searchContactByEmail(lead.email);
        const hubspotUpdateProps = {
          email: lead.email,
          firstname: lead.first_name,
          lastname: lead.last_name,
          company: lead.company,
          jobtitle: lead.title,
          icp_type: lead.industry,
          sequence_status: initialStatus,
          sequence_type: lead.industry,
          sequence_step: '1',
          enrolled_at: new Date().toISOString().split('T')[0],
        };

        if (hubspotContact) {
          await updateContact(hubspotContact.id, hubspotUpdateProps);
          await sql`UPDATE leads SET hubspot_id = ${hubspotContact.id} WHERE id = ${leadId}`;
        } else {
          const newContact = await createContact({
            email: lead.email,
            first_name: lead.first_name,
            last_name: lead.last_name,
            company: lead.company,
            title: lead.title,
            icp_type: lead.industry,
            sequence_status: initialStatus,
            sequence_type: lead.industry,
            sequence_step: 1,
            enrolled_at: new Date().toISOString().split('T')[0],
          });
          if (newContact?.id) {
            await sql`UPDATE leads SET hubspot_id = ${newContact.id} WHERE id = ${leadId}`;
          }
        }
      } catch (hubspotError) {
        console.error('HubSpot sync error for', lead.email, hubspotError);
      }

      results.push({ email: lead.email, status: isInbound ? 'enrolled' : 'pending_optin', leadId });
    } catch (error) {
      console.error('Enroll error for', lead.email, error);
      results.push({ email: lead.email, status: 'error', reason: String(error) });
    }
  }

  return NextResponse.json({ results });
}
