import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { geminiCall } from '@/lib/helpers/gemini-retry';
import { sendEmail } from '@/lib/helpers/brevo-client';
import { buildEmail } from '@/lib/helpers/html-email-template';
import { logger } from '@/lib/helpers/logger';
import { recordBlockedTask } from '@/lib/helpers/blocked-tasks';
import type { PlanBlock } from '@/types/agents';

const AGENT = 'daily-planner-evening';
const RECIPIENT = process.env.PLANNER_RECIPIENT ?? 'hertle.anjuli@praxisnovaai.com';

interface ReviewContext {
  date: string;
  plannedBlocks: PlanBlock[];
  emailsSentToday: number;
  repliesReceivedToday: number;
  newLeadsToday: number;
}

async function collectContext(date: string): Promise<ReviewContext> {
  const planRows = await sql`
    SELECT blocks_json FROM daily_plans WHERE plan_date = ${date}
  `;
  const plannedBlocks = (planRows[0]?.blocks_json as PlanBlock[] | undefined) ?? [];

  const emailSent = await sql`
    SELECT COUNT(*) as count FROM email_events
    WHERE event_type = 'sent' AND created_at::date = ${date}
  `;
  const replies = await sql`
    SELECT COUNT(*) as count FROM email_events
    WHERE event_type = 'replied' AND created_at::date = ${date}
  `;
  const newLeads = await sql`
    SELECT COUNT(*) as count FROM leads
    WHERE created_at::date = ${date}
  `;

  return {
    date,
    plannedBlocks,
    emailsSentToday: Number(emailSent[0]?.count ?? 0),
    repliesReceivedToday: Number(replies[0]?.count ?? 0),
    newLeadsToday: Number(newLeads[0]?.count ?? 0),
  };
}

interface ReviewResult {
  doneBlocks: string[];
  openBlocks: string[];
  questions: string[];
  tomorrowNotes: string;
}

function buildReviewPrompt(ctx: ReviewContext): string {
  const blockList = ctx.plannedBlocks
    .map((b) => `- ${b.start}-${b.end} ${b.title} (${b.category})`)
    .join('\n');
  return `Du bist Angies Tages-Reviewer. Review fuer ${ctx.date}.

Geplant:
${blockList || 'kein Plan vorhanden'}

Tatsaechliche Aktivitaet:
- Emails gesendet heute: ${ctx.emailsSentToday}
- Antworten heute: ${ctx.repliesReceivedToday}
- Neue Leads heute: ${ctx.newLeadsToday}

Analysiere: Welche Bloecke wurden wahrscheinlich erledigt (ja/nein)? Welche Fragen muss Angie beantworten, damit der Review vollstaendig ist? Welche kurzen Notizen fuer morgen?

Antworte AUSSCHLIESSLICH in JSON:
{
  "doneBlocks": ["Titel"],
  "openBlocks": ["Titel"],
  "questions": ["Frage"],
  "tomorrowNotes": "kurzer Text"
}`;
}

function parseReview(text: string): ReviewResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as ReviewResult;
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
    const today = new Date().toISOString().slice(0, 10);
    const ctx = await collectContext(today);

    if (ctx.plannedBlocks.length === 0) {
      await recordBlockedTask({
        agent: AGENT,
        task: 'no-morning-plan',
        reason: `Kein daily_plans-Eintrag fuer ${today}. Morning-Route wahrscheinlich nicht gelaufen.`,
      });
    }

    const raw = await geminiCall(buildReviewPrompt(ctx), { maxTokens: 1500 });
    const review = parseReview(raw);
    if (!review) {
      return NextResponse.json({ ok: false, error: 'parse failed' }, { status: 500 });
    }

    await sql`
      UPDATE daily_plans
      SET review_json = ${JSON.stringify(review)},
          status = 'completed',
          reviewed_at = NOW()
      WHERE plan_date = ${today}
    `;

    const html = buildEmail({
      title: `Tages-Review ${today}`,
      sections: [
        {
          heading: 'Erledigt',
          body: review.doneBlocks.length > 0 ? '' : 'nichts erkannt',
          bullets: review.doneBlocks,
        },
        {
          heading: 'Offen',
          body: review.openBlocks.length > 0 ? '' : 'nichts offen',
          bullets: review.openBlocks,
        },
        {
          heading: 'Fragen an dich',
          body: review.questions.length > 0 ? '' : 'keine',
          bullets: review.questions,
        },
        {
          heading: 'Fuer morgen',
          body: review.tomorrowNotes || 'keine Notizen',
        },
      ],
    });

    await sendEmail({
      to: RECIPIENT,
      subject: `Review ${today}`,
      htmlBody: html,
      tags: ['daily-planner-evening'],
    });

    logger.info('daily planner evening sent', { date: today });
    return NextResponse.json({ ok: true, date: today });
  } catch (err) {
    logger.error('daily-planner-evening failed', {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
