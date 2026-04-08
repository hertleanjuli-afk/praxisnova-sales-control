import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type UpdateCategory = 'pain_points' | 'new_customers' | 'market_updates' | 'agent_instructions' | 'general';
type UpdatePriority = 'high' | 'medium' | 'low';

interface StrategicUpdate {
  id: number;
  category: UpdateCategory;
  title: string;
  content: string;
  priority: UpdatePriority;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateUpdatePayload {
  category: UpdateCategory;
  title: string;
  content: string;
  priority?: UpdatePriority;
  active?: boolean;
  expires_at?: string;
}

interface UpdatePayload {
  title?: string;
  content?: string;
  category?: UpdateCategory;
  priority?: UpdatePriority;
  active?: boolean;
  expires_at?: string;
}

/**
 * Helper: Get all active, non-expired updates formatted for agent consumption
 */
export async function getActiveUpdatesForAgents(): Promise<string> {
  try {
    const updates = await sql<StrategicUpdate[]>`
      SELECT id, category, title, content, priority, active, expires_at, created_at, updated_at
      FROM strategic_updates
      WHERE active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, created_at DESC
    `;

    if (!updates || updates.length === 0) {
      return '';
    }

    const grouped = updates.reduce((acc, update) => {
      if (!acc[update.category]) {
        acc[update.category] = [];
      }
      acc[update.category].push(update);
      return acc;
    }, {} as Record<UpdateCategory, StrategicUpdate[]>);

    let formatted = '=== STRATEGIC UPDATES FOR AGENTS ===\n\n';

    const categoryLabels: Record<UpdateCategory, string> = {
      pain_points: 'Customer Pain Points',
      new_customers: 'New Customers',
      market_updates: 'Market Updates',
      agent_instructions: 'Agent Instructions',
      general: 'General Notes'
    };

    for (const [category, items] of Object.entries(grouped)) {
      formatted += `[${categoryLabels[category as UpdateCategory]}]\n`;
      for (const item of items) {
        formatted += `- ${item.title} (Priority: ${item.priority.toUpperCase()})\n`;
        formatted += `  ${item.content}\n\n`;
      }
      formatted += '\n';
    }

    return formatted;
  } catch (error) {
    console.error('Error fetching active updates for agents:', error);
    return '';
  }
}

/**
 * GET /api/strategic-updates
 */
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let updates;
    if (activeOnly) {
      updates = await sql`
        SELECT id, category, title, content, priority, active, expires_at, created_at, updated_at
        FROM strategic_updates
        WHERE active = true AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
      `;
    } else {
      updates = await sql`
        SELECT id, category, title, content, priority, active, expires_at, created_at, updated_at
        FROM strategic_updates
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ data: updates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching strategic updates:', error);
    return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 });
  }
}

/**
 * POST /api/strategic-updates
 */
async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateUpdatePayload = await request.json();

    if (!body.category || !body.title || !body.content) {
      return NextResponse.json({ error: 'Missing required fields: category, title, content' }, { status: 400 });
    }

    const priority = body.priority || 'medium';
    const active = body.active !== false;
    const expiresAt = body.expires_at || null;

    const result = await sql<StrategicUpdate[]>`
      INSERT INTO strategic_updates (category, title, content, priority, active, expires_at)
      VALUES (${body.category}, ${body.title}, ${body.content}, ${priority}, ${active}, ${expiresAt})
      RETURNING id, category, title, content, priority, active, expires_at, created_at, updated_at
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Failed to create update' }, { status: 500 });
    }

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating strategic update:', error);
    return NextResponse.json({ error: 'Failed to create update' }, { status: 500 });
  }
}

/**
 * PATCH /api/strategic-updates
 */
async function handlePATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdatePayload & { id: number } = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    if (body.active !== undefined && !body.title && !body.content && !body.category && !body.priority) {
      const result = await sql`
        UPDATE strategic_updates
        SET active = ${body.active}, updated_at = NOW()
        WHERE id = ${body.id}
        RETURNING id, category, title, content, priority, active, expires_at, created_at, updated_at
      `;

      if (!result || result.length === 0) {
        return NextResponse.json({ error: 'Update not found' }, { status: 404 });
      }
      return NextResponse.json({ data: result[0] }, { status: 200 });
    }

    const current = await sql`SELECT * FROM strategic_updates WHERE id = ${body.id}`;
    if (!current || current.length === 0) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    const existing = current[0] as StrategicUpdate;
    const newTitle = body.title ?? existing.title;
    const newContent = body.content ?? existing.content;
    const newCategory = body.category ?? existing.category;
    const newPriority = body.priority ?? existing.priority;
    const newActive = body.active ?? existing.active;
    const newExpiresAt = body.expires_at !== undefined ? body.expires_at : existing.expires_at;

    const result = await sql`
      UPDATE strategic_updates
      SET title = ${newTitle}, content = ${newContent}, category = ${newCategory},
          priority = ${newPriority}, active = ${newActive}, expires_at = ${newExpiresAt},
          updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING id, category, title, content, priority, active, expires_at, created_at, updated_at
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating strategic update:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/**
 * DELETE /api/strategic-updates
 */
async function handleDELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    const result = await sql<StrategicUpdate[]>`
      UPDATE strategic_updates
      SET active = false, updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING id, category, title, content, priority, active, expires_at, created_at, updated_at
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Error deleting strategic update:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleGET(request);
}

export async function POST(request: NextRequest) {
  return handlePOST(request);
}

export async function PATCH(request: NextRequest) {
  return handlePATCH(request);
}

export async function DELETE(request: NextRequest) {
  return handleDELETE(request);
}
