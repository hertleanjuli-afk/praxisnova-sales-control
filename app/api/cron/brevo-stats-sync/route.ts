import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { logAndNotifyError } from '@/lib/error-notify'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

interface BrevoAggregatedStats {
  range: {
    startDate: string
    endDate: string
  }
  globalStats: {
    uniqueClicks: number
    clickers: number
    spam: number
    received: number
    uniqueOpens: number
    trackableUniqueOpens: number
    unsubscriptions: number
    bounces: number
    transacEmailSent: number
    deferred: number
    delivered: number
  }
}

interface BrevoEventResponse {
  data: Array<{
    event: string
    email: string
    date: string
  }>
}

interface EmailPerformanceRecord {
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
}

function getYesterdayDate(): string {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  return yesterday.toISOString().split('T')[0]
}

function getDateBefore(dateStr: string, daysBack: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() - daysBack)
  return date.toISOString().split('T')[0]
}

async function fetchBrevoAggregatedStats(
  startDate: string,
  endDate: string
): Promise<BrevoAggregatedStats | null> {
  const brevoApiKey = process.env.BREVO_API_KEY
  if (!brevoApiKey) {
    console.error('BREVO_API_KEY not set')
    return null
  }

  try {
    const response = await fetch(
      `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${startDate}&endDate=${endDate}`,
      {
        method: 'GET',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`Brevo API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data: BrevoAggregatedStats = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Brevo aggregated stats:', error)
    return null
  }
}

async function fetchBrevoReplies(
  startDate: string,
  endDate: string
): Promise<number> {
  const brevoApiKey = process.env.BREVO_API_KEY
  if (!brevoApiKey) {
    return 0
  }

  try {
    const response = await fetch(
      `https://api.brevo.com/v3/smtp/statistics/events?startDate=${startDate}&endDate=${endDate}&event=reply&limit=1000`,
      {
        method: 'GET',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`Brevo reply API error: ${response.status}`)
      return 0
    }

    const data: BrevoEventResponse = await response.json()
    return data.data ? data.data.length : 0
  } catch (error) {
    console.error('Error fetching Brevo replies:', error)
    return 0
  }
}

async function getPreviousDayStats(
  reportDate: string
): Promise<{ open_rate: number; click_rate: number } | null> {
  try {
    const previousDate = getDateBefore(reportDate, 1)
    const result = await sql<{
      open_rate: number
      click_rate: number
    }>`
      SELECT open_rate, click_rate
      FROM email_performance_daily
      WHERE report_date = ${previousDate}
      LIMIT 1
    `

    if (result.length > 0) {
      return result[0]
    }
    return null
  } catch (error) {
    console.error('Error fetching previous day stats:', error)
    return null
  }
}

function calculateRates(
  stats: BrevoAggregatedStats['globalStats'],
  replies: number
): {
  open_rate: number
  click_rate: number
  bounce_rate: number
  reply_rate: number
} {
  const delivered = stats.delivered || 1
  const sent = stats.transacEmailSent || 1

  return {
    open_rate:
      delivered > 0 ? Number(((stats.uniqueOpens / delivered) * 100).toFixed(2)) : 0,
    click_rate:
      delivered > 0 ? Number(((stats.uniqueClicks / delivered) * 100).toFixed(2)) : 0,
    bounce_rate:
      sent > 0 ? Number(((stats.bounces / sent) * 100).toFixed(2)) : 0,
    reply_rate:
      delivered > 0 ? Number(((replies / delivered) * 100).toFixed(2)) : 0,
  }
}

async function saveEmailPerformance(
  record: EmailPerformanceRecord
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO email_performance_daily (
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
      ) VALUES (
        ${record.report_date},
        ${record.emails_sent},
        ${record.emails_delivered},
        ${record.emails_opened},
        ${record.unique_opens},
        ${record.emails_clicked},
        ${record.unique_clicks},
        ${record.bounces},
        ${record.hard_bounces},
        ${record.soft_bounces},
        ${record.unsubscribes},
        ${record.spam_complaints},
        ${record.replies},
        ${record.open_rate},
        ${record.click_rate},
        ${record.bounce_rate},
        ${record.reply_rate},
        ${record.open_rate_change},
        ${record.click_rate_change},
        NOW(),
        NOW()
      )
      ON CONFLICT (report_date)
      DO UPDATE SET
        emails_sent = EXCLUDED.emails_sent,
        emails_delivered = EXCLUDED.emails_delivered,
        emails_opened = EXCLUDED.emails_opened,
        unique_opens = EXCLUDED.unique_opens,
        emails_clicked = EXCLUDED.emails_clicked,
        unique_clicks = EXCLUDED.unique_clicks,
        bounces = EXCLUDED.bounces,
        hard_bounces = EXCLUDED.hard_bounces,
        soft_bounces = EXCLUDED.soft_bounces,
        unsubscribes = EXCLUDED.unsubscribes,
        spam_complaints = EXCLUDED.spam_complaints,
        replies = EXCLUDED.replies,
        open_rate = EXCLUDED.open_rate,
        click_rate = EXCLUDED.click_rate,
        bounce_rate = EXCLUDED.bounce_rate,
        reply_rate = EXCLUDED.reply_rate,
        open_rate_change = EXCLUDED.open_rate_change,
        click_rate_change = EXCLUDED.click_rate_change,
        updated_at = NOW()
    `
    return true
  } catch (error) {
    console.error('Error saving email performance:', error)
    return false
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const reportDate = getYesterdayDate()

    console.log(`Starting Brevo stats sync for ${reportDate}`)

    // Fetch aggregated stats from Brevo
    const stats = await fetchBrevoAggregatedStats(reportDate, reportDate)
    if (!stats) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to fetch Brevo statistics',
        },
        { status: 500 }
      )
    }

    // Fetch reply count
    const replies = await fetchBrevoReplies(reportDate, reportDate)

    // Calculate rates
    const rates = calculateRates(stats.globalStats, replies)

    // Get previous day stats for comparison
    const previousStats = await getPreviousDayStats(reportDate)

    // Build record
    const record: EmailPerformanceRecord = {
      report_date: reportDate,
      emails_sent: stats.globalStats.transacEmailSent || 0,
      emails_delivered: stats.globalStats.delivered || 0,
      emails_opened: stats.globalStats.uniqueOpens || 0,
      unique_opens: stats.globalStats.trackableUniqueOpens || 0,
      emails_clicked: stats.globalStats.uniqueClicks || 0,
      unique_clicks: stats.globalStats.clickers || 0,
      bounces: stats.globalStats.bounces || 0,
      hard_bounces: 0, // Brevo doesn't separate, will need API enhancement
      soft_bounces: 0,
      unsubscribes: stats.globalStats.unsubscriptions || 0,
      spam_complaints: stats.globalStats.spam || 0,
      replies: replies,
      open_rate: rates.open_rate,
      click_rate: rates.click_rate,
      bounce_rate: rates.bounce_rate,
      reply_rate: rates.reply_rate,
      open_rate_change: previousStats
        ? Number((rates.open_rate - previousStats.open_rate).toFixed(2))
        : null,
      click_rate_change: previousStats
        ? Number((rates.click_rate - previousStats.click_rate).toFixed(2))
        : null,
    }

    // Save to database
    const saved = await saveEmailPerformance(record)
    if (!saved) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to save email performance data',
        },
        { status: 500 }
      )
    }

    console.log(`Successfully saved email performance for ${reportDate}`)

    return NextResponse.json(
      {
        ok: true,
        reportDate: reportDate,
        summary: {
          emailsSent: record.emails_sent,
          emailsDelivered: record.emails_delivered,
          openRate: record.open_rate,
          clickRate: record.click_rate,
          bounceRate: record.bounce_rate,
          replyRate: record.reply_rate,
          openRateChange: record.open_rate_change,
          clickRateChange: record.click_rate_change,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Brevo stats sync error:', error)
    await logAndNotifyError({
      errorType: 'brevo-stats-sync-run-failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      action: 'brevo-stats-sync cron',
    }).catch((notifyErr) => console.error('[brevo-stats-sync] Notify failed:', notifyErr))
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
