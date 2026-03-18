import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createContact, searchContactByEmail, updateContact } from '@/lib/hubspot';

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
        if (ex.sequence_status === 'active') {
          results.push({ email: lead.email, status: 'skipped', reason: 'already_active' });
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

      // Upsert lead in DB
      const dbResult = await sql`
        INSERT INTO leads (apollo_id, email, first_name, last_name, company, title, industry, employee_count, linkedin_url, sequence_status, sequence_type, sequence_step, enrolled_at)
        VALUES (${lead.apollo_id}, ${lead.email}, ${lead.first_name}, ${lead.last_name}, ${lead.company}, ${lead.title}, ${lead.industry}, ${lead.employee_count}, ${lead.linkedin_url}, 'active', ${lead.industry}, 1, NOW())
        ON CONFLICT (email) DO UPDATE SET
          sequence_status = 'active',
          sequence_type = ${lead.industry},
          sequence_step = 1,
          enrolled_at = NOW(),
          exited_at = NULL,
          cooldown_until = NULL
        RETURNING id
      `;

      const leadId = dbResult[0].id;

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
          sequence_status: 'active',
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
            sequence_status: 'active',
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

      results.push({ email: lead.email, status: 'enrolled', leadId });
    } catch (error) {
      console.error('Enroll error for', lead.email, error);
      results.push({ email: lead.email, status: 'error', reason: String(error) });
    }
  }

  return NextResponse.json({ results });
}
