import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';
import { createContact, searchContactByEmail, updateContact } from '@/lib/hubspot';

const VALID_INDUSTRIES = ['immobilien', 'handwerk', 'bauunternehmen'];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, first_name, last_name, company, title, industry, employee_count } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 });
  }

  const normalizedIndustry = industry?.toLowerCase?.().trim() || '';
  if (!normalizedIndustry || !VALID_INDUSTRIES.includes(normalizedIndustry)) {
    return NextResponse.json(
      { error: `Branche muss eine der folgenden sein: ${VALID_INDUSTRIES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    // Check if lead already exists
    const existing = await sql`SELECT * FROM leads WHERE email = ${email}`;

    if (existing.length > 0) {
      const lead = existing[0];
      if (lead.sequence_status === 'active' || (lead.cooldown_until && new Date(lead.cooldown_until) > new Date())) {
        return NextResponse.json(
          { error: 'Lead ist bereits aktiv oder in der Abkühlphase' },
          { status: 409 }
        );
      }
    }

    // Insert or update lead in DB
    let leadId: number;

    if (existing.length > 0) {
      const updated = await sql`
        UPDATE leads SET
          first_name = ${first_name || null},
          last_name = ${last_name || null},
          company = ${company || null},
          title = ${title || null},
          industry = ${normalizedIndustry},
          employee_count = ${employee_count || null},
          sequence_status = 'active',
          sequence_type = ${normalizedIndustry},
          sequence_step = 1,
          enrolled_at = NOW(),
          exited_at = NULL,
          cooldown_until = NULL
        WHERE email = ${email}
        RETURNING id
      `;
      leadId = updated[0].id;
    } else {
      const inserted = await sql`
        INSERT INTO leads (email, first_name, last_name, company, title, industry, employee_count, sequence_status, sequence_type, sequence_step, enrolled_at)
        VALUES (${email}, ${first_name || null}, ${last_name || null}, ${company || null}, ${title || null}, ${normalizedIndustry}, ${employee_count || null}, 'active', ${normalizedIndustry}, 1, NOW())
        RETURNING id
      `;
      leadId = inserted[0].id;
    }

    // Sync to HubSpot
    try {
      const hubspotProps = {
        email,
        firstname: first_name || '',
        lastname: last_name || '',
        company: company || '',
        jobtitle: title || '',
        icp_type: normalizedIndustry,
        sequence_status: 'active',
        sequence_type: normalizedIndustry,
        sequence_step: '1',
      };

      const existingContact = await searchContactByEmail(email);

      if (existingContact) {
        await updateContact(existingContact.id, hubspotProps);
        await sql`UPDATE leads SET hubspot_id = ${existingContact.id} WHERE id = ${leadId} AND hubspot_id IS NULL`;
      } else {
        const newContact = await createContact({
          email,
          first_name: first_name || undefined,
          last_name: last_name || undefined,
          company: company || undefined,
          title: title || undefined,
          icp_type: normalizedIndustry,
          sequence_status: 'active',
          sequence_type: normalizedIndustry,
          sequence_step: 1,
        });
        if (newContact?.id) {
          await sql`UPDATE leads SET hubspot_id = ${newContact.id} WHERE id = ${leadId}`;
        }
      }
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
      // Continue even if HubSpot sync fails
    }

    return NextResponse.json({ success: true, leadId });
  } catch (error) {
    console.error('Manual lead creation error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Leads' }, { status: 500 });
  }
}
