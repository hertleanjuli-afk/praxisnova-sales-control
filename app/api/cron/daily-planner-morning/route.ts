import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { geminiCall } from '@/lib/helpers/gemini-retry';
import { sendEmail } from '@/lib/helpers/brevo-client';
import { buildEmail } from '@/lib/helpers/html-email-template';
import { getTasks } from '@/lib/helpers/tasks-md-reader';
import { recordBlockedTask } from '@/lib/helpers/blocked-tasks';
import { logger } from '@/lib/helpers/logger';
import type { PlanBlock } from '@/types/agents';

const AGENT = 'daily-planner-morning';
const RECIPIENT = process.env.PLANNER_RECIPIENT ?? 'hertle.anjuli@praxisnovaai.com';

interface PlannerContext {
  date: string;
  openTasks: string[];
  activeLeads: number;
  activeSequences: number;
}

async function collectContext(): Promise<PlannerContext> {
  const today = new Date().toISOString().slice(0, 10);

  let openTasks: string[] = [];
  try {
    const phases = await getTasks();
    openTasks = phases
      .flatMap((p) => p.items)
      .filter((i) => i.status === 'open' || i.status === 'in_progress')
      .slice(0, 20)
      .map((i) => i.text);
  } catch (err) {
    await recordBlockedTask({
      agent: AGENT,
      task: 'tasks-md-read',
      reason: `TASKS.md not readable at runtime path: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const activeLeadsRows = await sql`
    SELECT COUNT(*) as count FROM leads
    WHERE sequence_status = 'active'
  `;
  const sequencesRows = await sql`
    SELECT COUNT(DISTINCT lead_id) as count FROM email_events
    WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND event_type = 'sent'
  `;

  return {
    date: today,
    openTasks,
    activeLeads: Number(activeLeadsRows[0]?.count ?? 0),
    activeSequences: Number(sequencesRows[0]?.count ?? 0),
  };
}

function buildPlannerPrompt(ctx: PlannerContext): string {
  return `Du bist Angies Tagesplaner. Erstelle einen strukturierten Plan fuer ${ctx.date} von 08:00 bis 20:00 Uhr (Berlin-Zeit).

Context:
- Offene Tasks: ${ctx.openTasks.length > 0 ? ctx.openTasks.map((t) => `  - ${t}`).join('\n') : 'keine'}
- Aktive Leads in Outreach: ${ctx.activeLeads}
- Emails in den letzten 24h: ${ctx.activeSequences}

Pflicht-Regeln:
- Mittagspause 12:30-13:30
- Spaziergang 16:00-16:30
- Maximal 3 Deep-Work-Bloecke (je 90 Min) mit 15 Min Pause dazwischen
- Kategorien: deep-work, shallow-work, meeting, pause, admin

Antworte AUSSCHLIESSLICH in diesem JSON-Format (keine Erklaerung):
{
  "blocks": [
    {"start": "08:00", "end": "09:00", "title": "...", "category": "...", "priority": "high|medium|low"}
  ]
}`;
}

function parseBlocks(text: string): PlanBlock[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { blocks?: PlanBlock[] };
    return parsed.blocks ?? [];
  } catch {
    return [];
  }
}

function renderBlocksHtml(blocks: PlanBlock[]): string {
  return blocks
    .map(
      (b) =>
        `<div style="padding:6px 0;border-bottom:1px solid #e5e7eb;"><b>${b.start}-${b.end}</b> &middot; ${b.title} <span style="color:#6b7280;font-size:12px;">(${b.category}${b.priority ? `, ${b.priority}` : ''})</span></div>`,
    )
    .join('');
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ctx = await collectContext();
    const raw = await geminiCall(buildPlannerPrompt(ctx), { maxTokens: 2000 });
    const blocks = parseBlocks(raw);

    if (blocks.length === 0) {
      await recordBlockedTask({
        agent: AGENT,
        task: 'gemini-parse-plan',
        reason: `Empty or invalid plan returned: ${raw.slice(0, 200)}`,
      });
      return NextResponse.json({ ok: false, error: 'empty plan' }, { status: 500 });
    }

    await sql`
      INSERT INTO daily_plans (plan_date, status, blocks_json)
      VALUES (${ctx.date}, 'active', ${JSON.stringify(blocks)})
      ON CONFLICT (plan_date) DO UPDATE
      SET blocks_json = EXCLUDED.blocks_json,
          status = 'active'
    `;

    const html = buildEmail({
      title: `Dein Tagesplan fuer ${ctx.date}`,
      sections: [
        {
          heading: 'Bloecke',
          body: renderBlocksHtml(blocks),
        },
        {
          heading: 'Kontext',
          body: `${ctx.openTasks.length} offene Tasks, ${ctx.activeLeads} aktive Leads, ${ctx.activeSequences} Email-Aktivitaet (24h).`,
        },
      ],
    });

    await sendEmail({
      to: RECIPIENT,
      subject: `Tagesplan ${ctx.date}`,
      htmlBody: html,
      tags: ['daily-planner-morning'],
    });

    logger.info('daily planner morning sent', {
      date: ctx.date,
      blockCount: blocks.length,
    });

    return NextResponse.json({ ok: true, date: ctx.date, blocks: blocks.length });
  } catch (err) {
    logger.error('daily-planner-morning failed', {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
