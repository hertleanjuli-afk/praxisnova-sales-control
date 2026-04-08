import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - load all customer_insight entries
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const insights = await sql`
      SELECT id, reasoning, data_payload, created_at
      FROM agent_decisions
      WHERE decision_type = 'customer_insight'
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ insights, count: insights.length });
  } catch (error) {
    console.error('[customer-insight GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST - log new insight
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      industry,
      customer_type,
      region,
      pain_points,
      key_insight,
      recommended_email_angle,
      source_note,
    } = body;

    if (!industry || !pain_points || pain_points.length === 0) {
      return NextResponse.json(
        { error: 'industry and pain_points are required' },
        { status: 400 }
      );
    }

    const dataPayload = {
      source_type: 'customer_conversation',
      date: new Date().toISOString().split('T')[0],
      industry,
      customer_type: customer_type || '',
      region: region || 'DACH',
      pain_points,
      key_insight: key_insight || '',
      recommended_email_angle: recommended_email_angle || '',
      source_note: source_note || '',
      validated: true,
    };

    const rows = await sql`
      INSERT INTO agent_decisions (
        run_id,
        agent_name,
        decision_type,
        subject_type,
        reasoning,
        data_payload,
        status
      ) VALUES (
        gen_random_uuid()::text,
        'market_intel',
        'customer_insight',
        'system',
        ${`Customer insight: ${customer_type || industry} | ${region || 'DACH'}`},
        ${JSON.stringify(dataPayload)},
        'completed'
      )
      RETURNING id
    `;

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (error) {
    console.error('[customer-insight POST]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE - remove insight
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`
      DELETE FROM agent_decisions
      WHERE id = ${id} AND decision_type = 'customer_insight'
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
