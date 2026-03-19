import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchLeads } from '@/lib/apollo';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const state = searchParams.get('state') || undefined;
  const limit = parseInt(searchParams.get('limit') || '25', 10);

  return handleSearch(sector, state, limit);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { sector, state, limit = 25 } = body;

  return handleSearch(sector, state, limit);
}

async function handleSearch(sector: string | null, state: string | undefined, limit: number) {

  if (!sector || !['immobilien', 'handwerk', 'bauunternehmen'].includes(sector)) {
    return NextResponse.json({ error: 'Sektor ist erforderlich (immobilien, handwerk, bauunternehmen)' }, { status: 400 });
  }

  try {
    const apolloResults = await searchLeads(sector, state, limit);

    // Filter out leads that are in active sequence or cooldown
    const emails = apolloResults.map((r) => r.email).filter(Boolean);

    let excludedEmails: string[] = [];
    if (emails.length > 0) {
      const excluded = await sql`
        SELECT email FROM leads
        WHERE email = ANY(${emails})
        AND (
          sequence_status = 'active'
          OR sequence_status = 'unsubscribed'
          OR sequence_status = 'booked'
          OR (cooldown_until IS NOT NULL AND cooldown_until > NOW())
        )
      `;
      excludedEmails = excluded.map((r) => r.email);
    }

    // Also get all known leads to show their status
    let knownLeads: Record<string, any>[] = [];
    if (emails.length > 0) {
      knownLeads = await sql`
        SELECT email, sequence_status, cooldown_until FROM leads
        WHERE email = ANY(${emails})
      `;
    }

    const knownMap = new Map(knownLeads.map((l) => [l.email, l]));

    const results = apolloResults
      .filter((r) => r.email && !excludedEmails.includes(r.email))
      .map((r) => {
        const known = knownMap.get(r.email);
        return {
          apollo_id: r.id,
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          title: r.title,
          company: r.organization?.name,
          employee_count: r.organization?.estimated_num_employees,
          linkedin_url: r.linkedin_url,
          industry: sector,
          status: known?.sequence_status || 'available',
          cooldown_until: known?.cooldown_until || null,
        };
      });

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Lead search error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
