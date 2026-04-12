import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

/**
 * Global Search API
 *
 * Searches across leads, strategic_updates, agent_logs, email_events,
 * industry_news. Adapted to the actual project schema:
 *
 * - leads: first_name + last_name (no `name` column), phone, email, company,
 *          industry, pipeline_stage. No `sector` or `is_archived`.
 * - strategic_updates: id, title, content, category, priority, created_at
 *   (the patch template called this `agent_updates` but that is a different
 *   table with only agent_name/update_type/content).
 * - agent_logs: id, agent_name, status, details JSONB, created_at
 *   (no `error_message` / `summary` columns — both live inside `details`)
 * - industry_news + linkedin_post_drafts queries are wrapped in try/catch
 *   because those tables may not exist yet on fresh installs.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const term = `%${q.toLowerCase()}%`;

  try {
    // 1) Search leads (name, company, email, phone, mobile_phone)
    const leads = await sql`
      SELECT
        id,
        first_name,
        last_name,
        company,
        email,
        phone,
        pipeline_stage,
        industry
      FROM leads
      WHERE
        LOWER(COALESCE(first_name, '')) LIKE ${term}
        OR LOWER(COALESCE(last_name, '')) LIKE ${term}
        OR LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${term}
        OR LOWER(COALESCE(company, '')) LIKE ${term}
        OR LOWER(COALESCE(email, '')) LIKE ${term}
        OR LOWER(COALESCE(phone, '')) LIKE ${term}
        OR LOWER(COALESCE(mobile_phone, '')) LIKE ${term}
      ORDER BY
        CASE
          WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${term} THEN 0
          WHEN LOWER(COALESCE(company, '')) LIKE ${term} THEN 1
          ELSE 2
        END,
        last_name,
        first_name
      LIMIT 8
    `;

    // 2) Search strategic updates (the manager instructions / pain points / market notes)
    let strategicUpdates: Record<string, any>[] = [];
    try {
      strategicUpdates = await sql`
        SELECT id, title, content, category, priority, created_at
        FROM strategic_updates
        WHERE
          active = true
          AND (
            LOWER(COALESCE(title, '')) LIKE ${term}
            OR LOWER(COALESCE(content, '')) LIKE ${term}
            OR LOWER(COALESCE(category, '')) LIKE ${term}
          )
        ORDER BY created_at DESC
        LIMIT 4
      `;
    } catch { /* table may not exist yet */ }

    // 3) Search agent logs (agent_name + details::text)
    let agentLogs: Record<string, any>[] = [];
    try {
      agentLogs = await sql`
        SELECT id, agent_name, status, details, created_at
        FROM agent_logs
        WHERE
          LOWER(agent_name) LIKE ${term}
          OR LOWER(COALESCE(details::text, '')) LIKE ${term}
        ORDER BY created_at DESC
        LIMIT 4
      `;
    } catch { /* table may not exist yet */ }

    // 4) Search email events (join to leads to get who opened/clicked)
    let emailEvents: Record<string, any>[] = [];
    try {
      emailEvents = await sql`
        SELECT
          ee.id,
          ee.event_type,
          ee.created_at,
          l.first_name,
          l.last_name,
          l.company,
          l.email,
          l.id as lead_id
        FROM email_events ee
        LEFT JOIN leads l ON l.id = ee.lead_id
        WHERE
          LOWER(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')) LIKE ${term}
          OR LOWER(COALESCE(l.company, '')) LIKE ${term}
          OR LOWER(COALESCE(l.email, '')) LIKE ${term}
        ORDER BY ee.created_at DESC
        LIMIT 4
      `;
    } catch { /* table may not exist yet */ }

    // 5) Search industry news (table may not exist until news-agent runs)
    let news: Record<string, any>[] = [];
    try {
      news = await sql`
        SELECT id, headline, summary, sector, relevance_score, news_date
        FROM industry_news
        WHERE
          LOWER(COALESCE(headline, '')) LIKE ${term}
          OR LOWER(COALESCE(summary, '')) LIKE ${term}
          OR LOWER(COALESCE(sector, '')) LIKE ${term}
        ORDER BY news_date DESC, relevance_score DESC
        LIMIT 3
      `;
    } catch { /* table may not exist yet */ }

    const eventTypeLabel = (t: string) => {
      if (t === 'opened') return 'E-Mail geöffnet';
      if (t === 'clicked') return 'E-Mail geklickt';
      if (t === 'replied') return 'E-Mail beantwortet';
      if (t === 'bounced') return 'E-Mail gebounced';
      return `E-Mail ${t}`;
    };

    const results = [
      ...leads.map(r => {
        const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email || 'Unbekannt';
        const subtitleParts = [r.company, r.pipeline_stage].filter(Boolean);
        return {
          type: 'lead' as const,
          id: String(r.id),
          title: fullName,
          subtitle: subtitleParts.join(' - '),
          meta: r.industry || '',
          href: `/lead/${r.id}`,
          icon: 'person',
        };
      }),
      ...strategicUpdates.map(r => ({
        type: 'update' as const,
        id: String(r.id),
        title: r.title,
        subtitle: (r.content || '').slice(0, 80),
        meta: r.category || '',
        href: '/settings',
        icon: 'update',
      })),
      ...agentLogs.map(r => ({
        type: 'log' as const,
        id: String(r.id),
        title: r.agent_name,
        subtitle: r.status,
        meta: new Date(r.created_at).toLocaleDateString('de-DE'),
        href: '/agents',
        icon: 'log',
      })),
      ...emailEvents.map(r => {
        const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Unbekannt';
        return {
          type: 'email' as const,
          id: String(r.id),
          title: fullName,
          subtitle: eventTypeLabel(r.event_type),
          meta: r.company || '',
          href: r.lead_id ? `/lead/${r.lead_id}` : '/email-tracking',
          icon: 'email',
        };
      }),
      ...news.map(r => ({
        type: 'news' as const,
        id: String(r.id),
        title: r.headline,
        subtitle: r.sector || '',
        meta: new Date(r.news_date).toLocaleDateString('de-DE'),
        href: '/agent-updates',
        icon: 'news',
      })),
    ];

    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error('[search] error:', error);
    return NextResponse.json({ results: [], error: 'Suche fehlgeschlagen' }, { status: 500 });
  }
}
