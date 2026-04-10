import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';

function getQuarter(date: Date): number {
  return Math.ceil((date.getMonth() + 1) / 3);
}

function getQuarterRange(date: Date): { start: Date; end: Date } {
  const q = getQuarter(date);
  // Report covers the PREVIOUS quarter
  const prevQ = q === 1 ? 4 : q - 1;
  const year = q === 1 ? date.getFullYear() - 1 : date.getFullYear();
  const startMonth = (prevQ - 1) * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 1),
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const { start, end } = getQuarterRange(now);
    const quarterLabel = `Q${getQuarter(start)} ${start.getFullYear()}`;
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // --- 3-month trends from weekly_reports ---
    const weeklyRows = await sql`
      SELECT * FROM weekly_reports
      WHERE week_start >= ${startStr} AND week_start < ${endStr}
      ORDER BY week_start ASC
    `;

    // Aggregates
    let totalLeads = 0, totalSent = 0, totalOpened = 0, totalReplied = 0, totalMeetings = 0;
    let totalLiConnected = 0, totalLiMeetings = 0;
    for (const r of weeklyRows) {
      totalLeads += Number(r.leads_contacted || 0);
      totalSent += Number(r.emails_sent || 0);
      totalOpened += Number(r.emails_opened || 0);
      totalReplied += Number(r.emails_replied || 0);
      totalMeetings += Number(r.meetings_booked || 0);
      totalLiConnected += Number(r.linkedin_connected || 0);
      totalLiMeetings += Number(r.linkedin_meetings || 0);
    }
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
    const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0.0';

    // Monthly breakdown for trend
    const months: { label: string; sent: number; replied: number; meetings: number }[] = [];
    for (let m = 0; m < 3; m++) {
      const mStart = new Date(start.getFullYear(), start.getMonth() + m, 1);
      const mEnd = new Date(start.getFullYear(), start.getMonth() + m + 1, 1);
      const mLabel = mStart.toLocaleDateString('de-DE', { month: 'long' });
      let mSent = 0, mReplied = 0, mMeetings = 0;
      for (const r of weeklyRows) {
        const ws = new Date(r.week_start);
        if (ws >= mStart && ws < mEnd) {
          mSent += Number(r.emails_sent || 0);
          mReplied += Number(r.emails_replied || 0);
          mMeetings += Number(r.meetings_booked || 0);
        }
      }
      months.push({ label: mLabel, sent: mSent, replied: mReplied, meetings: mMeetings });
    }

    // --- Best/worst sequence steps ---
    const stepRows = await sql`
      SELECT
        step_number,
        sequence_type,
        COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
        COUNT(*) FILTER (WHERE event_type = 'opened') as opened,
        COUNT(*) FILTER (WHERE event_type = 'replied') as replied,
        CASE WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE event_type = 'replied')::numeric / COUNT(*) FILTER (WHERE event_type = 'sent') * 100, 1)
          ELSE 0
        END as reply_rate
      FROM email_events
      WHERE created_at >= ${start.toISOString()} AND created_at < ${end.toISOString()}
      GROUP BY step_number, sequence_type
      HAVING COUNT(*) FILTER (WHERE event_type = 'sent') >= 5
      ORDER BY reply_rate DESC
    `;
    const bestSteps = stepRows.slice(0, 3);
    const worstSteps = stepRows.length > 3 ? stepRows.slice(-3).reverse() : [];

    // --- ROI overview ---
    const roi = totalSent > 0 ? ((totalMeetings / totalSent) * 100).toFixed(2) : '0.00';
    const totalChannelMeetings = totalMeetings + totalLiMeetings;

    // --- Strategic recommendations ---
    const recommendations: string[] = [];
    if (parseFloat(replyRate) < 2) {
      recommendations.push('Die Antwortrate liegt unter 2%. Eine Ueberarbeitung der E-Mail-Sequenzen wird dringend empfohlen.');
    }
    if (parseFloat(replyRate) >= 5) {
      recommendations.push('Die Antwortrate ist stark. Volumen kann sicher gesteigert werden.');
    }
    if (totalLiConnected > 0 && totalLiMeetings === 0) {
      recommendations.push('LinkedIn generiert Verbindungen, aber keine Meetings. LinkedIn-Messaging-Strategie ueberpruefen.');
    }
    if (totalLiMeetings > totalMeetings && totalMeetings > 0) {
      recommendations.push('LinkedIn generiert mehr Meetings als E-Mail. Kanal-Budget umschichten erwägen.');
    }
    if (bestSteps.length > 0 && Number(bestSteps[0].reply_rate) > 5) {
      recommendations.push(`Schritt ${bestSteps[0].step_number} (${bestSteps[0].sequence_type}) ist der staerkste Performer mit ${bestSteps[0].reply_rate}% Antwortrate. Dieses Template als Basis fuer weitere Schritte verwenden.`);
    }
    if (worstSteps.length > 0 && Number(worstSteps[0].reply_rate) < 1) {
      recommendations.push(`Schritt ${worstSteps[0].step_number} (${worstSteps[0].sequence_type}) hat nur ${worstSteps[0].reply_rate}% Antwortrate. Ueberarbeitung oder Entfernung empfohlen.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Keine kritischen Handlungsempfehlungen. Performance weiter beobachten und A/B-Tests durchfuehren.');
    }

    // --- Build HTML ---
    const monthTrendHtml = months.map((m, i) => `
      <tr${i % 2 === 0 ? ' style="background: #f1f5f9;"' : ''}>
        <td style="padding: 8px 12px; font-size: 13px; font-weight: 600;">${m.label}</td>
        <td style="padding: 8px 12px; text-align: right;">${m.sent}</td>
        <td style="padding: 8px 12px; text-align: right;">${m.replied}</td>
        <td style="padding: 8px 12px; text-align: right;">${m.sent > 0 ? ((m.replied / m.sent) * 100).toFixed(1) : '0.0'}%</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700;">${m.meetings}</td>
      </tr>`).join('');

    const bestStepsHtml = bestSteps.length > 0
      ? bestSteps.map((r, i) => `
        <tr${i % 2 === 0 ? ' style="background: #f0fdf4;"' : ''}>
          <td style="padding: 8px 12px; font-size: 13px;">Schritt ${r.step_number} (${r.sequence_type})</td>
          <td style="padding: 8px 12px; text-align: right;">${r.sent}</td>
          <td style="padding: 8px 12px; text-align: right;">${r.replied}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #16a34a;">${r.reply_rate}%</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #9ca3af;">Nicht genug Daten</td></tr>';

    const worstStepsHtml = worstSteps.length > 0
      ? worstSteps.map((r, i) => `
        <tr${i % 2 === 0 ? ' style="background: #fef2f2;"' : ''}>
          <td style="padding: 8px 12px; font-size: 13px;">Schritt ${r.step_number} (${r.sequence_type})</td>
          <td style="padding: 8px 12px; text-align: right;">${r.sent}</td>
          <td style="padding: 8px 12px; text-align: right;">${r.replied}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #dc2626;">${r.reply_rate}%</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #9ca3af;">Nicht genug Daten</td></tr>';

    const htmlContent = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f8fafc; padding: 24px;">
  <div style="background: #1E3A5F; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">PraxisNova Quartalsbericht</h1>
    <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">${quarterLabel}</p>
  </div>

  <div style="background: white; padding: 24px; border: 1px solid #e2e8f0;">
    <!-- QUARTALSUEBERSICHT -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #2563EB; padding-bottom: 6px;">QUARTALSUEBERSICHT</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">Wochen berichtet</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${weeklyRows.length}</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px;">Leads kontaktiert</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalLeads}</td></tr>
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">E-Mails gesendet</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalSent}</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px;">Oeffnungsrate</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${openRate}%</td></tr>
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">Antwortrate</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${replyRate}%</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px;">Meetings (E-Mail)</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalMeetings}</td></tr>
      <tr style="background: #f1f5f9;"><td style="padding: 10px 12px; font-size: 13px;">Meetings (LinkedIn)</td><td style="padding: 10px 12px; text-align: right; font-weight: 700;">${totalLiMeetings}</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 13px; font-weight: 700;">Meetings (Gesamt)</td><td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #2563EB; font-size: 16px;">${totalChannelMeetings}</td></tr>
    </table>

    <!-- 3-MONATS-TREND -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">3-MONATS-TREND</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="background: #1E3A5F; color: white;">
        <th style="padding: 8px 12px; text-align: left;">Monat</th>
        <th style="padding: 8px 12px; text-align: right;">Gesendet</th>
        <th style="padding: 8px 12px; text-align: right;">Antworten</th>
        <th style="padding: 8px 12px; text-align: right;">Antwortrate</th>
        <th style="padding: 8px 12px; text-align: right;">Meetings</th>
      </tr>
      ${monthTrendHtml}
    </table>

    <!-- BESTE SCHRITTE -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #16a34a; padding-bottom: 6px;">BESTE SEQUENZ-SCHRITTE</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="background: #1E3A5F; color: white;">
        <th style="padding: 8px 12px; text-align: left;">Schritt</th>
        <th style="padding: 8px 12px; text-align: right;">Gesendet</th>
        <th style="padding: 8px 12px; text-align: right;">Antworten</th>
        <th style="padding: 8px 12px; text-align: right;">Antwortrate</th>
      </tr>
      ${bestStepsHtml}
    </table>

    <!-- SCHLECHTESTE SCHRITTE -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #dc2626; padding-bottom: 6px;">SCHWACHSTELLEN</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="background: #1E3A5F; color: white;">
        <th style="padding: 8px 12px; text-align: left;">Schritt</th>
        <th style="padding: 8px 12px; text-align: right;">Gesendet</th>
        <th style="padding: 8px 12px; text-align: right;">Antworten</th>
        <th style="padding: 8px 12px; text-align: right;">Antwortrate</th>
      </tr>
      ${worstStepsHtml}
    </table>

    <!-- ROI -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #8b5cf6; padding-bottom: 6px;">ROI UEBERSICHT</h2>
    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="padding: 4px 0;">E-Mails gesendet</td><td style="text-align: right; font-weight: 700;">${totalSent}</td></tr>
        <tr><td style="padding: 4px 0;">Meetings gebucht (Gesamt)</td><td style="text-align: right; font-weight: 700;">${totalChannelMeetings}</td></tr>
        <tr><td style="padding: 4px 0;">Konversionsrate (E-Mail &rarr; Meeting)</td><td style="text-align: right; font-weight: 700; color: #2563EB;">${roi}%</td></tr>
        <tr><td style="padding: 4px 0;">E-Mails pro Meeting</td><td style="text-align: right; font-weight: 700;">${totalMeetings > 0 ? Math.round(totalSent / totalMeetings) : 'N/A'}</td></tr>
      </table>
    </div>

    <!-- STRATEGISCHE EMPFEHLUNGEN -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">STRATEGISCHE EMPFEHLUNGEN</h2>
    <ul style="margin: 0 0 16px; padding-left: 20px;">
      ${recommendations.map(r => `<li style="margin-bottom: 8px; font-size: 13px; line-height: 1.5;">${r}</li>`).join('')}
    </ul>
  </div>

  <div style="background: #1E3A5F; color: white; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; opacity: 0.9;">
    PraxisNova AI Sales Control &mdash; Automatisch generiert
  </div>
</div>`;

    const subject = `PraxisNova Quartalsbericht ${quarterLabel}`;
    const recipients = ['hertle.anjuli@praxisnovaai.com', 'meyer.samantha@praxisnovaai.com'];
    for (const to of recipients) {
      await sendTransactionalEmail({
        to,
        subject,
        htmlContent,
        senderEmail: 'info@praxisnovaai.com',
        senderName: 'PraxisNova AI',
        tags: ['quarterly-report'],
        wrapAsInternal: true,
      });
    }

    console.log(`[quarterly-report] ${quarterLabel} report sent`);

    return NextResponse.json({
      ok: true,
      quarter: quarterLabel,
      totalLeads,
      totalSent,
      totalMeetings: totalChannelMeetings,
      openRate,
      replyRate,
    });
  } catch (error) {
    console.error('[quarterly-report] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
