import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * GET /api/leads/manage?search=text&stage=In+Outreach&limit=50
 *
 * Lead-Verwaltung API (Issue #8)
 * Unterstuetzt Suche nach Name, Firma, Email und Filter nach Pipeline-Stage
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const stage = searchParams.get('stage') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let leads;

    if (search && stage && stage !== 'all') {
      leads = await sql`
        SELECT id, first_name, last_name, email, phone, company, title, industry,
               agent_score, pipeline_stage, pipeline_notes, blocked_until, block_reason,
               signal_email_reply, signal_linkedin_interest, linkedin_url, website_url,
               phone_source, created_at
        FROM leads
        WHERE pipeline_stage = ${stage}
          AND (
            LOWER(first_name) LIKE LOWER(${'%' + search + '%'})
            OR LOWER(last_name) LIKE LOWER(${'%' + search + '%'})
            OR LOWER(company) LIKE LOWER(${'%' + search + '%'})
            OR LOWER(email) LIKE LOWER(${'%' + search + '%'})
          )
        ORDER BY agent_score DESC, created_at DESC
        LIMIT ${limit}
      `;
    } else if (search) {
      leads = await sql`
        SELECT id, first_name, last_name, email, phone, company, title, industry,
               agent_score, pipeline_stage, pipeline_notes, blocked_until, block_reason,
               signal_email_reply, signal_linkedin_interest, linkedin_url, website_url,
               phone_source, created_at
        FROM leads
        WHERE LOWER(first_name) LIKE LOWER(${'%' + search + '%'})
           OR LOWER(last_name) LIKE LOWER(${'%' + search + '%'})
           OR LOWER(company) LIKE LOWER(${'%' + search + '%'})
           OR LOWER(email) LIKE LOWER(${'%' + search + '%'})
        ORDER BY agent_score DESC, created_at DESC
        LIMIT ${limit}
      `;
    } else if (stage && stage !== 'all') {
      leads = await sql`
        SELECT id, first_name, last_name, email, phone, company, title, industry,
               agent_score, pipeline_stage, pipeline_notes, blocked_until, block_reason,
               signal_email_reply, signal_linkedin_interest, linkedin_url, website_url,
               phone_source, created_at
        FROM leads
        WHERE pipeline_stage = ${stage}
        ORDER BY agent_score DESC, created_at DESC
        LIMIT ${limit}
      `;
    } else {
      leads = await sql`
        SELECT id, first_name, last_name, email, phone, company, title, industry,
               agent_score, pipeline_stage, pipeline_notes, blocked_until, block_reason,
               signal_email_reply, signal_linkedin_interest, linkedin_url, website_url,
               phone_source, created_at
        FROM leads
        ORDER BY agent_score DESC, created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ leads, count: leads.length });
  } catch (error) {
    console.error('Lead manage error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Leads' },
      { status: 500 }
    );
  }
}
