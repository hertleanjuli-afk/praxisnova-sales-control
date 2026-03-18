import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get ISO week string
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    const isoWeek = `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;

    // Get all leads added in the last 7 days with LinkedIn URLs
    const recentLeads = await sql`
      SELECT id, first_name, last_name, company, title, linkedin_url, industry, created_at
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '7 days'
      AND linkedin_url IS NOT NULL
      AND linkedin_url != ''
      AND sequence_status != 'unsubscribed'
      AND sequence_status != 'bounced'
      ORDER BY industry, created_at DESC
    `;

    // Update linkedin_export_week in HubSpot for these leads
    // (batch update would be ideal but we keep it simple)
    const stats = {
      total: recentLeads.length,
      immobilien: 0,
      handwerk: 0,
      bauunternehmen: 0,
      iso_week: isoWeek,
    };

    for (const lead of recentLeads) {
      if (lead.industry === 'immobilien') stats.immobilien++;
      else if (lead.industry === 'handwerk') stats.handwerk++;
      else if (lead.industry === 'bauunternehmen') stats.bauunternehmen++;
    }

    return NextResponse.json({
      ok: true,
      stats,
      leads: recentLeads,
    });
  } catch (error) {
    console.error('Weekly LinkedIn cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
