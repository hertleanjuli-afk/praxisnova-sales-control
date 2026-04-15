import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { geminiCall } from '@/lib/helpers/gemini-retry';
import { logger } from '@/lib/helpers/logger';
import { recordBlockedTask } from '@/lib/helpers/blocked-tasks';

const AGENT = 'news-scout';
const MIN_STORE_SCORE = 60;

interface ScoredItem {
  url: string;
  title: string;
  source: string;
  publishedAt?: string;
  summary: string;
  industries: string[];
  relevanceScore: number;
}

interface RssItem {
  url: string;
  title: string;
  source: string;
  publishedAt?: string;
  snippet: string;
}

async function fetchRssFeed(url: string, source: string): Promise<RssItem[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRssXml(text, source);
  } catch (err) {
    logger.warn('rss fetch failed', { url, err: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

function parseRssXml(xml: string, source: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const description = extractTag(block, 'description');
    if (!title || !link) continue;
    items.push({
      url: link,
      title: stripHtml(title),
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
      snippet: stripHtml(description).slice(0, 500),
    });
    if (items.length >= 20) break;
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function getActiveFeeds(): Promise<{ industry: string; url: string }[]> {
  try {
    const rows = await sql`
      SELECT industry, feed_url FROM industry_feeds WHERE active = TRUE
    `;
    if (rows.length > 0) {
      return rows.map((r) => ({ industry: r.industry as string, url: r.feed_url as string }));
    }
  } catch {
    /* table may not exist yet */
  }
  return [
    { industry: 'tech', url: 'https://t3n.de/rss.xml' },
    { industry: 'tech', url: 'https://www.heise.de/rss/heise-top-atom.xml' },
  ];
}

async function scoreItem(item: RssItem): Promise<ScoredItem | null> {
  const prompt = `Bewerte die Relevanz dieses News-Artikels fuer PraxisNova AI (B2B SaaS, AI-Agenten fuer Sales/Marketing an Immobilien, Handwerk, Bauunternehmen in Europa).

Titel: ${item.title}
Quelle: ${item.source}
Snippet: ${item.snippet}

Antworte AUSSCHLIESSLICH als JSON:
{"score": 0-100, "industries": ["immobilien"|"handwerk"|"bau"|"tech"|"sales"|"marketing"], "summary": "2-3 Saetze Zusammenfassung"}`;

  const raw = await geminiCall(prompt, { maxTokens: 500 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as {
      score: number;
      industries: string[];
      summary: string;
    };
    return {
      url: item.url,
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      summary: parsed.summary,
      industries: Array.isArray(parsed.industries) ? parsed.industries : [],
      relevanceScore: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const feeds = await getActiveFeeds();
    const allItems: RssItem[] = [];
    for (const f of feeds) {
      const items = await fetchRssFeed(f.url, new URL(f.url).hostname);
      allItems.push(...items);
    }

    const seen = new Set<string>();
    const deduped = allItems.filter((i) => {
      if (seen.has(i.url)) return false;
      seen.add(i.url);
      return true;
    });

    let stored = 0;
    let scored = 0;
    for (const item of deduped.slice(0, 30)) {
      const scoredItem = await scoreItem(item);
      if (!scoredItem) continue;
      scored++;
      if (scoredItem.relevanceScore < MIN_STORE_SCORE) continue;

      await sql`
        INSERT INTO news_items (url, title, source, published_at, summary, industries, relevance_score)
        VALUES (
          ${scoredItem.url},
          ${scoredItem.title},
          ${scoredItem.source},
          ${scoredItem.publishedAt ?? null},
          ${scoredItem.summary},
          ${scoredItem.industries},
          ${scoredItem.relevanceScore}
        )
        ON CONFLICT (url) DO NOTHING
      `;
      stored++;
    }

    if (stored === 0 && scored > 0) {
      await recordBlockedTask({
        agent: AGENT,
        task: 'no-relevant-news',
        reason: `${scored} items gescored, keiner mit score >= ${MIN_STORE_SCORE}`,
      });
    }

    logger.info('news scout complete', { feeds: feeds.length, fetched: deduped.length, scored, stored });
    return NextResponse.json({ ok: true, fetched: deduped.length, scored, stored });
  } catch (err) {
    logger.error('news-scout failed', { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
