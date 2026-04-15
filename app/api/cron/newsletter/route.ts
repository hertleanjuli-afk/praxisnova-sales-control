import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { geminiCall } from '@/lib/helpers/gemini-retry';
import { sendEmail } from '@/lib/helpers/brevo-client';
import { buildEmail } from '@/lib/helpers/html-email-template';
import { logger } from '@/lib/helpers/logger';
import { recordBlockedTask } from '@/lib/helpers/blocked-tasks';

const AGENT = 'newsletter';
const REVIEWER = process.env.NEWSLETTER_REVIEWER ?? 'hertle.anjuli@praxisnovaai.com';

interface NewsRow {
  id: number;
  url: string;
  title: string;
  summary: string;
  industries: string[];
  relevance_score: number;
}

interface ContentRow {
  id: number;
  platform: string;
  headline: string | null;
  body: string;
}

async function getMonthTopNews(): Promise<NewsRow[]> {
  const rows = await sql`
    SELECT id, url, title, summary, industries, relevance_score FROM news_items
    WHERE created_at >= NOW() - INTERVAL '31 days' AND relevance_score >= 70
    ORDER BY relevance_score DESC, created_at DESC
    LIMIT 5
  `;
  return rows as unknown as NewsRow[];
}

async function getApprovedContent(): Promise<ContentRow[]> {
  const rows = await sql`
    SELECT id, platform, headline, body FROM content_drafts
    WHERE created_at >= NOW() - INTERVAL '31 days'
      AND status = 'approved'
      AND platform IN ('newsletter', 'linkedin')
    ORDER BY approved_at DESC NULLS LAST
    LIMIT 3
  `;
  return rows as unknown as ContentRow[];
}

interface NewsletterOutput {
  subject: string;
  intro: string;
  itemSummaries: { title: string; body: string; url: string }[];
  closing: string;
}

async function generateNewsletter(news: NewsRow[], content: ContentRow[]): Promise<NewsletterOutput | null> {
  const newsBlock = news.map((n) => `- ${n.title} (${n.relevance_score}): ${n.summary} [${n.url}]`).join('\n');
  const contentBlock = content.map((c) => `- ${c.platform}: ${c.headline ?? ''} - ${c.body.slice(0, 200)}...`).join('\n');

  const prompt = `Erzeuge den PraxisNova-Monatsnewsletter. Zielgruppe: Entscheider Immobilien/Handwerk/Bau in Europa.

Top News:
${newsBlock || '(keine)'}

Approved Firmen-Content:
${contentBlock || '(keine)'}

Brand-Voice: warm, pragmatisch. KEIN em-dash. KEIN "DACH". Du-Form wenn direkter Leser-Address, sonst neutral.

Erzeuge 1 Newsletter-Entwurf. Struktur: Subject (max 8 Worte), Intro (3-4 Saetze), 3-5 Item-Summaries (je 3-5 Saetze + Link), Closing (2-3 Saetze mit CTA).

Antworte AUSSCHLIESSLICH als JSON:
{
  "subject": "...",
  "intro": "...",
  "itemSummaries": [{"title": "...", "body": "...", "url": "..."}],
  "closing": "..."
}`;

  const raw = await geminiCall(prompt, { maxTokens: 3500 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as NewsletterOutput;
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
    const news = await getMonthTopNews();
    const content = await getApprovedContent();
    if (news.length === 0 && content.length === 0) {
      await recordBlockedTask({
        agent: AGENT,
        task: 'no-input',
        reason: 'Weder high-score News noch approved Content im letzten Monat',
      });
      return NextResponse.json({ ok: true, drafted: 0, reason: 'no input' });
    }

    const newsletter = await generateNewsletter(news, content);
    if (!newsletter) {
      return NextResponse.json({ ok: false, error: 'gemini parse fail' }, { status: 500 });
    }

    const htmlBody = buildEmail({
      title: newsletter.subject,
      sections: [
        { heading: 'Intro', body: newsletter.intro },
        ...newsletter.itemSummaries.map((item) => ({
          heading: item.title,
          body: `${item.body}<br><a href="${item.url}">Weiterlesen</a>`,
        })),
        { heading: 'Zum Abschluss', body: newsletter.closing },
      ],
    });

    const issueMonth = new Date().toISOString().slice(0, 7) + '-01';
    await sql`
      INSERT INTO newsletters (issue_month, subject, html_body, included_news_ids, included_content_ids, status)
      VALUES (
        ${issueMonth},
        ${newsletter.subject},
        ${htmlBody},
        ${news.map((n) => n.id)},
        ${content.map((c) => c.id)},
        'draft'
      )
    `;

    await sendEmail({
      to: REVIEWER,
      subject: `Newsletter-Draft zur Freigabe: ${newsletter.subject}`,
      htmlBody,
      tags: ['newsletter-draft'],
    });

    logger.info('newsletter drafted', { issueMonth, newsCount: news.length, contentCount: content.length });
    return NextResponse.json({ ok: true, issueMonth, newsCount: news.length, contentCount: content.length });
  } catch (err) {
    logger.error('newsletter failed', { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
