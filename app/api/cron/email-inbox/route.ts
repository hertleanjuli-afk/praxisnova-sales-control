import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { geminiCall } from '@/lib/helpers/gemini-retry';
import { logger } from '@/lib/helpers/logger';
import { recordBlockedTask } from '@/lib/helpers/blocked-tasks';
import {
  listInboxMessages,
  getMessage,
  createDraft,
  setLabel,
} from '@/lib/helpers/gmail-client';

const AGENT = 'email-inbox';

const VALID_CATEGORIES = new Set([
  'customer-inquiry',
  'partner',
  'admin',
  'marketing-tool',
  'spam-ish',
  'personal',
]);

interface Classification {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  requiresAction: boolean;
  suggestedReply?: string;
}

async function classify(from: string, subject: string, body: string): Promise<Classification | null> {
  const prompt = `Klassifiziere diese Email fuer Angie (Founder von PraxisNova AI, B2B SaaS Europa).

Von: ${from}
Betreff: ${subject}
Body (erste 1500 Zeichen):
${body.slice(0, 1500)}

Kategorien:
- customer-inquiry: Interesse an PraxisNova, Demo-Anfrage, Kundenfrage
- partner: Kooperations-Anfrage, Reseller, Agency
- admin: Rechnungen, Terminbestaetigungen, Behoerden, Banken
- marketing-tool: Newsletter, Tool-Benachrichtigungen (Linear, Vercel, Brevo, Google)
- spam-ish: unaufgeforderte Outreach die Zeit kostet
- personal: privat

Antworte AUSSCHLIESSLICH als JSON:
{
  "category": "...",
  "priority": "low|medium|high|urgent",
  "summary": "1-2 Saetze",
  "requiresAction": true|false,
  "suggestedReply": "Draft falls requiresAction=true, sonst leer"
}`;

  const raw = await geminiCall(prompt, { maxTokens: 800 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Classification;
    if (!VALID_CATEGORIES.has(parsed.category)) parsed.category = 'admin';
    return parsed;
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
    const messages = await listInboxMessages(20, AGENT);
    if (messages.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, note: 'inbox empty or oauth missing' });
    }

    const existing = await sql`
      SELECT gmail_id FROM email_inbox WHERE gmail_id = ANY(${messages.map((m) => m.id)})
    `;
    const seen = new Set(existing.map((r) => r.gmail_id as string));

    let processed = 0;
    let drafted = 0;
    for (const m of messages) {
      if (seen.has(m.id)) continue;
      const detail = await getMessage(m.id, AGENT);
      if (!detail) continue;
      const classification = await classify(detail.from, detail.subject, detail.body);
      if (!classification) {
        await recordBlockedTask({
          agent: AGENT,
          task: 'classify-email',
          reason: `Gemini-Parse fail fuer ${m.id}`,
        });
        continue;
      }

      await sql`
        INSERT INTO email_inbox (
          gmail_id, thread_id, from_email, subject, received_at,
          category, priority, summary, draft_reply, requires_action
        )
        VALUES (
          ${detail.id},
          ${detail.threadId},
          ${detail.from},
          ${detail.subject},
          ${detail.receivedAt},
          ${classification.category},
          ${classification.priority},
          ${classification.summary},
          ${classification.suggestedReply ?? null},
          ${classification.requiresAction}
        )
        ON CONFLICT (gmail_id) DO NOTHING
      `;

      await setLabel(detail.id, `PraxisNova/${classification.category}`, AGENT).catch(() => {});

      if (classification.requiresAction && classification.suggestedReply) {
        await createDraft(detail.threadId, detail.from, `Re: ${detail.subject}`, classification.suggestedReply, AGENT);
        drafted++;
      }
      processed++;
    }

    logger.info('email-inbox run complete', { processed, drafted });
    return NextResponse.json({ ok: true, processed, drafted });
  } catch (err) {
    logger.error('email-inbox failed', { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
