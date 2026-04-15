import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { geminiCall } from '@/lib/helpers/gemini-retry';
import { logger } from '@/lib/helpers/logger';
import { recordBlockedTask } from '@/lib/helpers/blocked-tasks';

const AGENT = 'content-creator';
const INDUSTRIES = ['immobilien', 'handwerk', 'bau'] as const;

function todayIndustry(): (typeof INDUSTRIES)[number] {
  const day = new Date().getUTCDate();
  return INDUSTRIES[day % INDUSTRIES.length];
}

interface NewsRow {
  id: number;
  url: string;
  title: string;
  source: string;
  summary: string;
  industries: string[];
  relevance_score: number;
}

interface DraftRow {
  platform: string;
  headline?: string;
  body: string;
  hashtags?: string[];
}

async function fetchTopNews(industry: string): Promise<NewsRow[]> {
  const rows = await sql`
    SELECT id, url, title, source, summary, industries, relevance_score
    FROM news_items
    WHERE created_at >= NOW() - INTERVAL '2 days'
      AND relevance_score >= 70
      AND (${industry} = ANY(industries) OR 'tech' = ANY(industries))
      AND used_in_content = FALSE
    ORDER BY relevance_score DESC, created_at DESC
    LIMIT 3
  `;
  return rows as unknown as NewsRow[];
}

async function generateDrafts(industry: string, news: NewsRow[]): Promise<DraftRow[]> {
  const newsBlock = news
    .map((n) => `- [${n.relevance_score}] ${n.title} (${n.source}): ${n.summary}`)
    .join('\n');

  const prompt = `Du bist PraxisNovas Content Creator. Zielgruppe: Entscheider aus der Branche "${industry}" in Europa. Brand-Voice: professionell, pragmatisch, warm. KEIN em-dash. KEIN "DACH". Keine leeren Floskeln.

News-Input (top 3, heute):
${newsBlock || '(keine passenden News verfuegbar)'}

Erzeuge 3 Content-Drafts als JSON-Array:
1. LinkedIn Post: 200-300 Worte, Hook-Insight-CTA, 3-5 Hashtags.
2. Facebook Post: 100-150 Worte, visueller Hook.
3. Newsletter Snippet: 3-5 Saetze, neutral.

Jeder Draft referenziert mindestens einen der News-Titel (nicht den Link, nur den Takeaway).

Antwort AUSSCHLIESSLICH als JSON:
{
  "drafts": [
    {"platform": "linkedin", "headline": "...", "body": "...", "hashtags": ["..."]},
    {"platform": "facebook", "body": "...", "hashtags": ["..."]},
    {"platform": "newsletter", "headline": "...", "body": "..."}
  ]
}`;

  const raw = await geminiCall(prompt, { maxTokens: 2500 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { drafts: DraftRow[] };
    return Array.isArray(parsed.drafts) ? parsed.drafts : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const industry = todayIndustry();
    const news = await fetchTopNews(industry);

    if (news.length === 0) {
      await recordBlockedTask({
        agent: AGENT,
        task: 'no-news-input',
        reason: `Keine News-Items fuer ${industry} mit score>=70 in den letzten 48h`,
      });
      return NextResponse.json({ ok: true, industry, drafted: 0, reason: 'no news' });
    }

    const drafts = await generateDrafts(industry, news);
    if (drafts.length === 0) {
      await recordBlockedTask({
        agent: AGENT,
        task: 'gemini-empty-drafts',
        reason: 'Gemini returned no parseable drafts',
      });
      return NextResponse.json({ ok: false, error: 'no drafts' }, { status: 500 });
    }

    const newsIds = news.map((n) => n.id);
    for (const d of drafts) {
      await sql`
        INSERT INTO content_drafts (
          platform, content_type, headline, body, hashtags, source_news_ids, status
        )
        VALUES (
          ${d.platform},
          ${industry},
          ${d.headline ?? null},
          ${d.body},
          ${d.hashtags ?? null},
          ${newsIds},
          'pending_review'
        )
      `;
    }

    await sql`
      UPDATE news_items SET used_in_content = TRUE WHERE id = ANY(${newsIds})
    `;

    logger.info('content creator complete', { industry, drafts: drafts.length });
    return NextResponse.json({ ok: true, industry, drafted: drafts.length, newsUsed: newsIds });
  } catch (err) {
    logger.error('content-creator failed', { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
