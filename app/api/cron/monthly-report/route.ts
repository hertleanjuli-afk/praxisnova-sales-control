import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';

function getMonthName(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of previous month
    const monthName = getMonthName(monthStart);

    // --- Aggregate weekly reports for the month ---
    const weeklyRows = await sql`
      SELECT
        COALESCE(SUM(leads_contacted), 0) as total_leads,
        COALESCE(SUM(emails_sent), 0) as total_sent,
        COALESCE(SUM(emails_opened), 0) as total_opened,
        COALESCE(SUM(emails_replied), 0) as total_replied,
        COALESCE(SUM(meetings_booked), 0) as total_meetings,
        COALESCE(SUM(linkedin_requests), 0) as total_li_requests,
        COALESCE(SUM(linkedin_connected), 0) as total_li_connected,
        COALESCE(SUM(linkedin_messages), 0) as total_li_messages,
        COALESCE(SUM(linkedin_replied), 0) as total_li_replied,
        COALESCE(SUM(linkedin_meetings), 0) as total_li_meetings,
        COUNT(*) as weeks_count
      FROM weekly_reports
      WHERE week_start >= ${monthStart.toISOString().split('T')[0]}
        AND week_start < ${monthEnd.toISOString().split('T')[0]}
    `;
    const agg = weeklyRows[0] || {};
    const totalLeads = Number(agg.total_leads || 0);
    const totalSent = Number(agg.total_sent || 0);
    const totalOpened = Number(agg.total_opened || 0);
    const totalReplied = Number(agg.total_replied || 0);
    const totalMeetings = Number(agg.total_meetings || 0);
    const totalLiRequests = Number(agg.total_li_requests || 0);
    const totalLiConnected = Number(agg.total_li_connected || 0);
    const totalLiMessages = Number(agg.total_li_messages || 0);
    const totalLiReplied = Number(agg.total_li_replied || 0);
    const weeksCount = Number(agg.weeks_count || 0);
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
    const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0.0';

    // --- Top 3 email steps by open rate ---
    const topStepsRows = await sql`
      SELECT
        step_number,
        COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opened,
        CASE WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'opened')::numeric / COUNT(*) FILTER (WHERE event_type = 'sent') * 100, 1)
          ELSE 0
        END as open_rate
      FROM email_events
      WHERE created_at >= ${monthStart.toISOString()} AND created_at < ${monthEnd.toISOString()}
      GROUP BY step_number
      HAVING COUNT(*) FILTER (WHERE event_type = 'sent') > 0
      ORDER BY open_rate DESC
      LIMIT 3
    `;

    // --- Sector comparison ---
    const sectorRows = await sql`
      SELECT
        COALESCE(l.sequence_type, 'allgemein') as sector,
        COUNT(DISTINCT CASE WHEN ee.event_type = 'sent' THEN ee.lead_id END) as leads,
        COUNT(*) FILTER (WHERE ee.event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE ee.event_type = 'replied') as replied,
        CASE WHEN COUNT(*) FILTER (WHERE ee.event_type = 'sent') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE ee.event_type = 'replied')::numeric / COUNT(*) FILTER (WHERE ee.event_type = 'sent') * 100, 1)
          ELSE 0
        END as reply_rate
      FROM email_events ee
      JOIN leads l ON l.id = ee.lead_id
      WHERE ee.created_at >= ${monthStart.toISOString()} AND ee.created_at < ${monthEnd.toISOString()}
      GROUP BY l.sequence_type
      ORDER BY reply_rate DESC
    `;

    // --- Change log for the month ---
    const changeLogRows = await sql`
      SELECT change_date, change_type, change_description, changed_by, expected_impact, actual_impact
      FROM change_log
      WHERE change_date >= ${monthStart.toISOString().split('T')[0]}
        AND change_date < ${monthEnd.toISOString().split('T')[0]}
      ORDER BY change_date DESC
    `;

    // --- Weekly feedback for the month ---
    const feedbackRows = await sql`
      SELECT week_start, answer_1, answer_2, answer_3, answer_4, answer_5, submitted_by
      FROM weekly_feedback
      WHERE week_start >= ${monthStart.toISOString().split('T')[0]}
        AND week_start < ${monthEnd.toISOString().split('T')[0]}
      ORDER BY week_start DESC
    `;

    // --- Build HTML ---
    const topStepsHtml = topStepsRows.length > 0
      ? topStepsRows.map((r, i) => `
        <tr${i % 2 === 0 ? ' style="background: #f1f5f9;"' : ''}>
          <td style="padding: 8px 12px; font-size: 13px;">Schritt ${r.step_number}</td>
          <td style="padding: 8px 12px; text-align: right;">${r.sent}</td>
          <td style="padding: 8px 12px; text-align: right;">${r.opened}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #2563EB;">${r.open_rate}%</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #9ca3af;">Keine Daten verfuegbar</td></tr>';

    const sectorHtml = sectorRows.length > 0
      ? sectorRows.map((r, i) => `
        <tr${i % 2 === 0 ? ' style="background: #f1f5f9;"' : ''}>
          <td style="padding: 8px 12px; font-size: 13px; font-weight: 600;">${r.sector}</td>
          <td style="padding: 8px 12px; text-align: right;">${r.leads}</td>
          <td style="padding: 8px 12px; text-align: right;">${r.sent}</td>
          <td style="padding: 8px 12px; text-align: right;">${r.replied}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #2563EB;">${r.reply_rate}%</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #9ca3af;">Keine Daten verfuegbar</td></tr>';

    const changeLogHtml = changeLogRows.length > 0
      ? changeLogRows.map(r => `
        <li style="margin-bottom: 8px; font-size: 13px;">
          <strong>${new Date(r.change_date).toLocaleDateString('de-DE')}</strong> [${r.change_type}] ${r.change_description}
          ${r.actual_impact ? `<br/><span style="color: #16a34a; font-size: 12px;">Ergebnis: ${r.actual_impact}</span>` : ''}
        </li>`).join('')
      : '<li style="color: #9ca3af; font-size: 13px;">Keine Aenderungen dokumentiert</li>';

    const feedbackHtml = feedbackRows.length > 0
      ? feedbackRows.map(r => `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 8px; font-size: 13px;">
          <strong>KW ${new Date(r.week_start).toLocaleDateString('de-DE')}</strong> (${r.submitted_by})<br/>
          ${r.answer_1 ? `<span style="color: #16a34a;">Gut:</span> ${r.answer_1}<br/>` : ''}
          ${r.answer_2 ? `<span style="color: #dc2626;">Nicht gut:</span> ${r.answer_2}<br/>` : ''}
          ${r.answer_5 ? `<span style="color: #2563EB;">Naechste Woche testen:</span> ${r.answer_5}` : ''}
        </div>`).join('')
      : '<p style="color: #9ca3af; font-size: 13px;">Kein Feedback eingegangen</p>';

    // Recommendations based on data
    const recommendations: string[] = [];
    if (parseFloat(replyRate) < 2) recommendations.push('Die Antwortrate liegt unter 2%. E-Mail-Templates sollten ueberarbeitet werden.');
    if (totalLiConnected > 0 && totalLiMessages === 0) recommendations.push('LinkedIn-Verbindungen bestehen, aber keine Nachrichten gesendet. LinkedIn-Messaging aktivieren.');
    if (sectorRows.length > 0) {
      const bestSector = sectorRows[0];
      if (Number(bestSector.reply_rate) > 5) recommendations.push(`Sektor "${bestSector.sector}" hat die hoechste Antwortrate (${bestSector.reply_rate}%). Mehr Leads in diesem Sektor kontaktieren.`);
    }
    if (recommendations.length === 0) recommendations.push('Aktuell keine spezifischen Empfehlungen. Weiter beobachten.');

    const htmlContent = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f8fafc; padding: 24px;">
  <div style="background: #1E3A5F; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">PraxisNova Monatsbericht</h1>
    <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">${monthName}</p>
  </div>

  <div style="background: white; padding: 24px; border: 1px solid #e2e8f0;">
    <!-- MONATSUEBERSICHT -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #2563EB; padding-bottom: 6px;">MONATSUEBERSICHT</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">Wochen berichtet</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${weeksCount}</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px;">Leads kontaktiert</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalLeads}</td></tr>
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">E-Mails gesendet</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalSent}</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px;">Oeffnungsrate</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${openRate}%</td></tr>
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">Antwortrate</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${replyRate}%</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px;">Meetings gebucht</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalMeetings}</td></tr>
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">LinkedIn Anfragen / Verbunden</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalLiRequests} / ${totalLiConnected}</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px;">LinkedIn Nachrichten / Antworten</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalLiMessages} / ${totalLiReplied}</td></tr>
    </table>

    <!-- TOP 3 E-MAILS -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #8b5cf6; padding-bottom: 6px;">TOP 3 E-MAIL-SCHRITTE (Oeffnungsrate)</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="background: #1E3A5F; color: white;">
        <th style="padding: 8px 12px; text-align: left;">Schritt</th>
        <th style="padding: 8px 12px; text-align: right;">Gesendet</th>
        <th style="padding: 8px 12px; text-align: right;">Geoeffnet</th>
        <th style="padding: 8px 12px; text-align: right;">Oeffnungsrate</th>
      </tr>
      ${topStepsHtml}
    </table>

    <!-- SEKTOR-VERGLEICH -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #16a34a; padding-bottom: 6px;">SEKTOR-VERGLEICH</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="background: #1E3A5F; color: white;">
        <th style="padding: 8px 12px; text-align: left;">Sektor</th>
        <th style="padding: 8px 12px; text-align: right;">Leads</th>
        <th style="padding: 8px 12px; text-align: right;">Gesendet</th>
        <th style="padding: 8px 12px; text-align: right;">Antworten</th>
        <th style="padding: 8px 12px; text-align: right;">Antwortrate</th>
      </tr>
      ${sectorHtml}
    </table>

    <!-- EMPFEHLUNGEN -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">EMPFEHLUNGEN</h2>
    <ul style="margin: 0 0 24px; padding-left: 20px;">
      ${recommendations.map(r => `<li style="margin-bottom: 6px; font-size: 13px;">${r}</li>`).join('')}
    </ul>

    <!-- CHANGE LOG -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #6366f1; padding-bottom: 6px;">CHANGE LOG</h2>
    <ul style="margin: 0 0 24px; padding-left: 20px;">
      ${changeLogHtml}
    </ul>

    <!-- FEEDBACK -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #ec4899; padding-bottom: 6px;">WOECHENTLICHES FEEDBACK</h2>
    ${feedbackHtml}
  </div>

  <div style="background: #1E3A5F; color: white; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; opacity: 0.9;">
    PraxisNova AI Sales Control &mdash; Automatisch generiert
  </div>
</div>`;

    const subject = `PraxisNova Monatsbericht ${monthName}`;
    const recipients = ['hertle.anjuli@praxisnovaai.com', 'meyer.samantha@praxisnovaai.com'];
    for (const to of recipients) {
      await sendTransactionalEmail({
        to,
        subject,
        htmlContent,
        senderEmail: 'info@praxisnovaai.com',
        senderName: 'PraxisNova AI',
        tags: ['monthly-report'],
        wrapAsInternal: true,
      });
    }

    console.log(`[monthly-report] ${monthName} report sent`);

    return NextResponse.json({
      ok: true,
      month: monthName,
      totalLeads,
      totalSent,
      openRate,
      replyRate,
      totalMeetings,
    });
  } catch (error) {
    console.error('[monthly-report] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
