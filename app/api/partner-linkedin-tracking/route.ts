import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: All partners with linkedin tracking status
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const items = await sql`
      SELECT
        p.id as partner_id,
        COALESCE(plt.id, 0) as id,
        p.company,
        p.contact_name,
        p.contact_title as title,
        p.email,
        p.linkedin_url,
        p.category,
        p.tier,
        p.status as partner_status,
        COALESCE(plt.connection_status, 'none') as connection_status,
        plt.request_due_date, plt.request_sent_at, plt.connected_at,
        COALESCE(plt.message_sent, false) as message_sent,
        plt.message_sent_at, plt.message_content,
        COALESCE(plt.reply_received, false) as reply_received,
        plt.reply_received_at, plt.reply_content,
        plt.notes
      FROM partners p
      LEFT JOIN partner_linkedin_tracking plt ON plt.partner_id = p.id
      WHERE p.status != 'inactive'
      ORDER BY p.tier ASC NULLS LAST, p.company ASC
    `;

    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE plt.connection_status = 'request_sent') as request_sent,
        COUNT(*) FILTER (WHERE plt.connection_status = 'connected' AND plt.message_sent = false) as connected_no_msg,
        COUNT(*) FILTER (WHERE plt.connection_status = 'connected' AND plt.message_sent = true AND plt.reply_received = false) as message_sent,
        COUNT(*) FILTER (WHERE plt.reply_received = true) as replied,
        COUNT(*) as total
      FROM partners p
      LEFT JOIN partner_linkedin_tracking plt ON plt.partner_id = p.id
      WHERE p.status != 'inactive'
    `;

    // Normalize null fields
    const safeItems = items.map((item: Record<string, unknown>) => ({
      ...item,
      connection_status: item.connection_status || 'none',
      message_sent: item.message_sent ?? false,
      reply_received: item.reply_received ?? false,
      company: item.company || '',
      contact_name: item.contact_name || '',
      title: item.title || '',
    }));

    return NextResponse.json({ ok: true, stats, items: safeItems, count: safeItems.length });
  } catch (error) {
    console.error('[partner-linkedin-tracking] GET error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

// PATCH: Update partner linkedin tracking status
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { partner_id, action, message_content, reply_content, notes } = await req.json();

    if (!partner_id || !action) {
      return NextResponse.json({ error: 'partner_id and action required' }, { status: 400 });
    }

    // Ensure tracking row exists
    await sql`
      INSERT INTO partner_linkedin_tracking (partner_id, connection_status, created_at)
      VALUES (${partner_id}, 'none', NOW())
      ON CONFLICT (partner_id) DO NOTHING
    `;

    switch (action) {
      case 'request_sent':
        await sql`
          UPDATE partner_linkedin_tracking
          SET connection_status = 'request_sent', request_sent_at = NOW(), updated_at = NOW()
          WHERE partner_id = ${partner_id}
        `;
        break;
      case 'connected':
        await sql`
          UPDATE partner_linkedin_tracking
          SET connection_status = 'connected', connected_at = NOW(), updated_at = NOW()
          WHERE partner_id = ${partner_id}
        `;
        break;
      case 'message_sent':
        await sql`
          UPDATE partner_linkedin_tracking
          SET message_sent = true, message_sent_at = NOW(),
              message_content = COALESCE(${message_content || null}, message_content),
              updated_at = NOW()
          WHERE partner_id = ${partner_id}
        `;
        break;
      case 'reply_received':
        await sql`
          UPDATE partner_linkedin_tracking
          SET reply_received = true, reply_received_at = NOW(),
              reply_content = COALESCE(${reply_content || null}, reply_content),
              updated_at = NOW()
          WHERE partner_id = ${partner_id}
        `;
        // Add note to partner record
        await sql`
          UPDATE partners SET outreach_source = 'linkedin_replied'
          WHERE id = ${partner_id}
        `.catch(() => {});
        break;
      case 'no_linkedin':
        await sql`
          UPDATE partner_linkedin_tracking
          SET connection_status = 'no_linkedin', updated_at = NOW()
          WHERE partner_id = ${partner_id}
        `;
        break;
      case 'ignored':
        await sql`
          UPDATE partner_linkedin_tracking
          SET connection_status = 'ignored', updated_at = NOW()
          WHERE partner_id = ${partner_id}
        `;
        break;
    }

    if (notes !== undefined) {
      await sql`
        UPDATE partner_linkedin_tracking
        SET notes = ${notes}, updated_at = NOW()
        WHERE partner_id = ${partner_id}
      `;
    }

    return NextResponse.json({ ok: true, partner_id, action });
  } catch (error) {
    console.error('[partner-linkedin-tracking] PATCH error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
