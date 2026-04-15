import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { geminiCall } from '@/lib/helpers/gemini-retry';
import { logger } from '@/lib/helpers/logger';
import { recordBlockedTask } from '@/lib/helpers/blocked-tasks';

const AGENT = 'pr-outreach';
const MAX_DRAFTS_PER_RUN = 5;
const MIN_COOLDOWN_DAYS = 30;

interface PressRow {
  id: number;
  outlet_name: string;
  outlet_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  industries: string[];
  last_contacted: string | null;
}

interface NewsRow {
  id: number;
  title: string;
  summary: string;
}

async function getColdContacts(): Promise<PressRow[]> {
  const rows = await sql`
    SELECT id, outlet_name, outlet_type, contact_name, contact_email, contact_role, industries, last_contacted
    FROM press_contacts
    WHERE status IN ('cold', 'warm')
      AND contact_email IS NOT NULL
      AND (last_contacted IS NULL OR last_contacted < NOW() - INTERVAL '30 days')
    ORDER BY (last_contacted IS NULL) DESC, last_contacted ASC NULLS FIRST
    LIMIT ${MAX_DRAFTS_PER_RUN}
  `;
  return rows as unknown as PressRow[];
}

async function getRecentNews(industries: string[]): Promise<NewsRow[]> {
  if (industries.length === 0) return [];
  const rows = await sql`
    SELECT id, title, summary FROM news_items
    WHERE created_at >= NOW() - INTERVAL '14 days'
      AND relevance_score >= 70
      AND industries && ${industries}
    ORDER BY relevance_score DESC
    LIMIT 2
  `;
  return rows as unknown as NewsRow[];
}

interface DraftOutput {
  subject: string;
  body: string;
}

async function generateDraft(contact: PressRow, news: NewsRow[]): Promise<DraftOutput | null> {
  const newsBlock = news.map((n) => `- ${n.title}: ${n.summary}`).join('\n') || '(keine passenden News)';
  const prompt = `Schreibe eine personalisierte PR-Pitch-Email fuer diesen Kontakt.

Outlet: ${contact.outlet_name} (${contact.outlet_type ?? 'unbekannt'})
Kontakt: ${contact.contact_name ?? 'Redaktion'} (${contact.contact_role ?? ''})
Branchen: ${contact.industries.join(', ')}

Relevante News / Angles:
${newsBlock}

Absender: PraxisNova AI (B2B SaaS, AI-Agenten fuer Sales/Marketing an Immobilien, Handwerk, Bau in Europa).
Brand-Voice: pragmatisch, warm, konkret. KEIN em-dash. KEIN "DACH". Max 120 Worte Body. Sie-Form.
Ein klarer Ask: Gespraech, Gastbeitrag oder Zitat-Anfrage.

Antwort AUSSCHLIESSLICH als JSON:
{"subject": "max 6 Worte", "body": "..."}`;

  const raw = await geminiCall(prompt, { maxTokens: 800 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as DraftOutput;
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
    const contacts = await getColdContacts();
    if (contacts.length === 0) {
      return NextResponse.json({ ok: true, drafted: 0, note: 'no eligible contacts' });
    }

    let drafted = 0;
    for (const contact of contacts) {
      const news = await getRecentNews(contact.industries);
      const draft = await generateDraft(contact, news);
      if (!draft) {
        await recordBlockedTask({
          agent: AGENT,
          task: 'draft-gen',
          reason: `Gemini parse fail fuer contact ${contact.id}`,
        });
        continue;
      }

      await sql`
        INSERT INTO pr_campaigns (press_contact_id, subject, body, status)
        VALUES (${contact.id}, ${draft.subject}, ${draft.body}, 'pending_review')
      `;
      drafted++;
    }

    logger.info('pr-outreach complete', { contacts: contacts.length, drafted });
    return NextResponse.json({ ok: true, contacts: contacts.length, drafted });
  } catch (err) {
    logger.error('pr-outreach failed', { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
