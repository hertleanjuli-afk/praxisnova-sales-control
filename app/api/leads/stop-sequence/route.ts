import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

/**
 * POST /api/leads/stop-sequence
 *
 * Stop sequences for a single lead, all leads sharing a company domain,
 * or all leads sharing a company name.
 *
 * Body (one of):
 *   { leadId: number }
 *   { companyDomain: string }
 *   { companyName: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leadId, companyDomain, companyName } = body as {
      leadId?: number;
      companyDomain?: string;
      companyName?: string;
    };

    let affectedLeads = 0;

    if (leadId !== undefined && leadId !== null) {
      // ---- Single lead ----
      const parsed = Number(leadId);
      if (isNaN(parsed)) {
        return NextResponse.json({ error: 'Ungueltige leadId' }, { status: 400 });
      }

      const noteText = ` | [Sequence stopped manually] (${new Date().toISOString()})`;

      const result = await sql`
        UPDATE leads
        SET sequence_status = 'stopped_manual',
            pipeline_notes  = CONCAT(COALESCE(pipeline_notes, ''), ${noteText})
        WHERE id = ${parsed}
        RETURNING id
      `;

      affectedLeads = result.length;
    } else if (companyDomain) {
      // ---- Company domain ----
      // Extract bare domain (strip leading @ if present, strip protocol/path)
      let domain = companyDomain.trim().toLowerCase();
      domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (domain.startsWith('@')) {
        domain = domain.slice(1);
      }

      if (!domain) {
        return NextResponse.json({ error: 'Ungueltige companyDomain' }, { status: 400 });
      }

      const pattern = `%@${domain}`;

      const result = await sql`
        UPDATE leads
        SET sequence_status = 'stopped_manual'
        WHERE email LIKE ${pattern}
          AND sequence_status IN ('active', 'pending_optin', 'paused')
        RETURNING id
      `;

      affectedLeads = result.length;
    } else if (companyName) {
      // ---- Company name ----
      const name = companyName.trim();
      if (!name) {
        return NextResponse.json({ error: 'Ungueltige companyName' }, { status: 400 });
      }

      const result = await sql`
        UPDATE leads
        SET sequence_status = 'stopped_manual'
        WHERE LOWER(company) = LOWER(${name})
          AND sequence_status IN ('active', 'pending_optin', 'paused')
        RETURNING id
      `;

      affectedLeads = result.length;
    } else {
      return NextResponse.json(
        { error: 'Entweder leadId, companyDomain oder companyName muss angegeben werden' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, affectedLeads });
  } catch (error) {
    console.error('POST /api/leads/stop-sequence error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
