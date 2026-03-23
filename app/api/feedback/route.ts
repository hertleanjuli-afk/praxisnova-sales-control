import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('week_start') || getCurrentMonday();

    const feedbacks = await sql`
      SELECT * FROM weekly_feedback
      WHERE week_start = ${weekStart}::date
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      pending: feedbacks.length === 0,
      feedbacks,
      week_start: weekStart,
    });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { week_start, answer_1, answer_2, answer_3, answer_4, answer_5 } = body;

    if (!answer_1 || !answer_2 || !answer_3 || !answer_4 || !answer_5) {
      return NextResponse.json(
        { error: 'Alle Fragen müssen beantwortet werden' },
        { status: 400 }
      );
    }

    const mondayDate = week_start || getCurrentMonday();
    const submittedBy = session.user?.name || session.user?.email || 'unknown';

    const result = await sql`
      INSERT INTO weekly_feedback (
        week_start, answer_1, answer_2, answer_3, answer_4, answer_5, submitted_by
      ) VALUES (
        ${mondayDate}::date,
        ${answer_1},
        ${answer_2},
        ${answer_3},
        ${answer_4},
        ${answer_5},
        ${submittedBy}
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, feedback: result[0] });
  } catch (error) {
    console.error('Feedback submit error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
