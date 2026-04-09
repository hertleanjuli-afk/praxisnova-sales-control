import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

interface PartnerRow {
  id: number;
  company: string;
  website: string | null;
  email: string | null;
  contact_name: string | null;
  contact_title: string | null;
  linkedin_url: string | null;
  category: string | null;
  tier: number | null;
  status: string;
  outreach_source: string | null;
  created_at: string;
  agent_reasoning: string | null;
  agent_score: number | null;
}

interface Partner extends PartnerRow {
  partnership_potential: string;
}

function mapCategoryToPartnershipPotential(category: string | null): string {
  if (!category) return 'Unclassified';

  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes('white-label') || lowerCategory.includes('whitelabel')) {
    return 'White-Label Partner';
  }
  if (lowerCategory.includes('provisions') || lowerCategory.includes('provision')) {
    return 'Provisions-Partner';
  }
  if (lowerCategory.includes('technologie') || lowerCategory.includes('technology') || lowerCategory.includes('tech')) {
    return 'Technologie-Partner';
  }
  if (lowerCategory.includes('empfehlung') || lowerCategory.includes('recommendation') || lowerCategory.includes('referral')) {
    return 'Empfehlungs-Partner';
  }

  return 'Other Partner';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tier = searchParams.get('tier');
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 50;

    let query = `
      SELECT
        p.id,
        p.company,
        p.website,
        p.email,
        p.contact_name,
        p.contact_title,
        p.linkedin_url,
        p.category,
        p.tier,
        p.status,
        p.outreach_source,
        p.created_at,
        ad.reasoning as agent_reasoning,
        ad.score as agent_score
      FROM partners p
      LEFT JOIN (
        SELECT
          subject_id,
          reasoning,
          score,
          created_at
        FROM agent_decisions
        WHERE subject_type = 'partner' AND decision_type = 'qualify_partner'
      ) ad ON p.id = ad.subject_id
        AND ad.created_at = (
          SELECT MAX(created_at)
          FROM agent_decisions
          WHERE subject_type = 'partner'
            AND decision_type = 'qualify_partner'
            AND subject_id = p.id
        )
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (tier) {
      query += ` AND p.tier = $${params.length + 1}`;
      params.push(parseInt(tier, 10));
    }

    if (status) {
      query += ` AND p.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await sql<PartnerRow[]>(query, params);

    const partners: Partner[] = rows.map((row) => ({
      ...row,
      partnership_potential: mapCategoryToPartnershipPotential(row.category),
    }));

    return NextResponse.json({
      partners,
      count: partners.length,
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}
