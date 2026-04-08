import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

interface EmailPerformanceDay {
  report_date: string
  emails_sent: number
  emails_delivered: number
  emails_opened: number
  unique_opens: number
  emails_clicked: number
  unique_clicks: number
  bounces: number
  hard_bounces: number
  soft_bounces: number
  unsubscribes: number
  spam_complaints: number
  replies: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  reply_rate: number
  open_rate_change: number | null
  click_rate_change: number | null
  created_at: string
  updated_at: string
}

interface OutreachChange {
  id: string
  change_type: string
  old_value: string | null
  new_value: string | null
  reason: string | null
  changed_by: string | null
  created_at: string
}

interface EmailPerformanceSummary {
  avg_open_rate_7d: number
  avg_open_rate_30d: number
  best_day: {
    date: string
    open_rate: number
  } | null
  worst_day: {
    date: string
    open_rate: number
  } | null
  trend: 'improving' | 'declining' | 'stable'
  trend_pct: number
}

async function getEmailPerformanceData(days: number): Promise<EmailPerformanceDay[]> {
  try {
    const result = await sql<EmailPerformanceDay>`
      SELECT
        report_date,
        emails_sent,
        emails_delivered,
        emails_opened,
        unique_opens,
        emails_clicked,
        unique_clicks,
        bounces,
        hard_bounces,
        soft_bounces,
        unsubscribes,
        spam_complaints,
        replies,
        open_rate,
        click_rate,
        bounce_rate,
        reply_rate,
        open_rate_change,
        click_rate_change,
        created_at,
        updated_at
      FROM email_performance_daily
      WHERE report_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY report_date DESC
    `
    return result
  } catch (error) {
    console.error('Error fetching email performance data:', error)
    return []
  }
}

function calculateSummary(
  data: EmailPerformanceDay[],
  totalDays: number
): EmailPerformanceSummary {
  if (data.length === 0) {
    return {
      avg_open_rate_7d: 0,
      avg_open_rate_30d: 0,
      best_day: null,
      worst_day: null,
      trend: 'stable',
      trend_pct: 0,
    }
  }

  // Calculate 7-day average
  const last7Days = data.filter((d) => {
    const date = new Date(d.report_date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return date >= cutoff
  })
  const avg_open_rate_7d =
    last7Days.length > 0
      ? Number(
          (
            last7Days.reduce((sum, d) => sum + d.open_rate, 0) / last7Days.length
          ).toFixed(2)
        )
      : 0

  // Calculate 30-day average
  const last30Days = data.filter((d) => {
    const date = new Date(d.report_date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return date >= cutoff
  })
  const avg_open_rate_30d =
    last30Days.length > 0
      ? Number(
          (
            last30Days.reduce((sum, d) => sum + d.open_rate, 0) / last30Days.length
          ).toFixed(2)
        )
      : 0

  // Find best and worst days
  const sorted = [...data].sort((a, b) => b.open_rate - a.open_rate)
  const best_day =
    sorted.length > 0
      ? {
          date: sorted[0].report_date,
          open_rate: sorted[0].open_rate,
        }
      : null
  const worst_day =
    sorted.length > 0
      ? {
          date: sorted[sorted.length - 1].report_date,
          open_rate: sorted[sorted.length - 1].open_rate,
        }
      : null

  // Calculate trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  let trend_pct = 0

  if (last30Days.length >= 2) {
    const firstHalf = last30Days.slice(Math.ceil(last30Days.length / 2))
    const secondHalf = last30Days.slice(0, Math.ceil(last30Days.length / 2))

    const avgFirstHalf =
      firstHalf.length > 0
        ? firstHalf.reduce((sum, d) => sum + d.open_rate, 0) / firstHalf.length
        : 0
    const avgSecondHalf =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, d) => sum + d.open_rate, 0) / secondHalf.length
        : 0

    if (avgFirstHalf > 0) {
      trend_pct = Number(
        (((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100).toFixed(2)
      )
      if (trend_pct > 2) {
        trend = 'improving'
      } else if (trend_pct < -2) {
        trend = 'declining'
      }
    }
  }

  return {
    avg_open_rate_7d,
    avg_open_rate_30d,
    best_day,
    worst_day,
    trend,
    trend_pct,
  }
}

async function handleGetEmailPerformance(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams
  const rangeParam = searchParams.get('range') || '30'
  const trendsParam = searchParams.get('trends') === 'true'

  const range = Math.max(1, Math.min(365, parseInt(rangeParam)))

  try {
    const data = await getEmailPerformanceData(range)

    if (data.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          data: [],
          summary: {
            avg_open_rate_7d: 0,
            avg_open_rate_30d: 0,
            best_day: null,
            worst_day: null,
            trend: 'stable',
            trend_pct: 0,
          },
          latest: null,
        },
        { status: 200 }
      )
    }

    const summary = trendsParam ? calculateSummary(data, range) : undefined
    const latest = data[0] || null

    return NextResponse.json(
      {
        ok: true,
        data,
        summary,
        latest,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in email performance GET:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch email performance data',
      },
      { status: 500 }
    )
  }
}

async function getOutreachChanges(limit: number): Promise<OutreachChange[]> {
  try {
    const result = await sql<OutreachChange>`
      SELECT
        id,
        change_type,
        old_value,
        new_value,
        reason,
        changed_by,
        created_at
      FROM outreach_changes
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result
  } catch (error) {
    console.error('Error fetching outreach changes:', error)
    return []
  }
}

async function handleGetOutreachChanges(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams
  const limitParam = searchParams.get('limit') || '50'
  const limit = Math.max(1, Math.min(500, parseInt(limitParam)))

  try {
    const changes = await getOutreachChanges(limit)

    return NextResponse.json(
      {
        ok: true,
        data: changes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in outreach changes GET:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch outreach changes',
      },
      { status: 500 }
    )
  }
}

async function handlePostOutreachChange(req: NextRequest): Promise<NextResponse> {
  // Verify authentication
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { change_type, old_value, new_value, reason, changed_by } = body

    // Validate required fields
    if (!change_type) {
      return NextResponse.json(
        {
          ok: false,
          error: 'change_type is required',
        },
        { status: 400 }
      )
    }

    const changedByUser = changed_by || session.user.email || 'system'

    const result = await sql<OutreachChange>`
      INSERT INTO outreach_changes (
        change_type,
        old_value,
        new_value,
        reason,
        changed_by,
        created_at
      ) VALUES (
        ${change_type},
        ${old_value || null},
        ${new_value || null},
        ${reason || null},
        ${changedByUser},
        NOW()
      )
      RETURNING id, change_type, old_value, new_value, reason, changed_by, created_at
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to create outreach change',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        data: result[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in outreach changes POST:', error)
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof SyntaxError
            ? 'Invalid JSON body'
            : 'Failed to create outreach change',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isChangesEndpoint = path.includes('/email-performance/changes')

  if (isChangesEndpoint) {
    return handleGetOutreachChanges(req)
  } else {
    return handleGetEmailPerformance(req)
  }
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isChangesEndpoint = path.includes('/email-performance/changes')

  if (isChangesEndpoint) {
    return handlePostOutreachChange(req)
  } else {
    return NextResponse.json(
      {
        ok: false,
        error: 'POST not supported on this endpoint',
      },
      { status: 405 }
    )
  }
}
