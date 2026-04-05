import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';

function getKW(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

function changeColor(current: number, previous: number): string {
  if (current > previous) return '#16a34a';
  if (current < previous) return '#dc2626';
  return '#6b7280';
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setHours(0, 0, 0, 0);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const prevWeekEnd = new Date(weekStart);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const kw = getKW(now);

    // --- Collect KPIs ---

    // Leads contacted
    const leadsContactedRows = await sql`
      SELECT COUNT(DISTINCT lead_id) as count FROM email_events
      WHERE event_type = 'sent' AND created_at >= ${weekStart.toISOString()} AND created_at < ${weekEnd.toISOString()}
    `;
    const leadsContacted = Number(leadsContactedRows[0]?.count || 0);

    // Email counts
    const emailSentRows = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'sent' AND created_at >= ${weekStart.toISOString()} AND created_at < ${weekEnd.toISOString()}
    `;
    const emailsSent = Number(emailSentRows[0]?.count || 0);

    const emailOpenedRows = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'opened' AND created_at >= ${weekStart.toISOString()} AND created_at < ${weekEnd.toISOString()}
    `;
    const emailsOpened = Number(emailOpenedRows[0]?.count || 0);

    const emailRepliedRows = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'replied' AND created_at >= ${weekStart.toISOString()} AND created_at < ${weekEnd.toISOString()}
    `;
    const emailsReplied = Number(emailRepliedRows[0]?.count || 0);

    // LinkedIn stats
    const linkedinRequestsRows = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE linkedin_request_date >= ${weekStart.toISOString()} AND linkedin_request_date < ${weekEnd.toISOString()}
    `;
    const linkedinRequests = Number(linkedinRequestsRows[0]?.count || 0);

    const linkedinConnectedRows = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE linkedin_connected_date >= ${weekStart.toISOString()} AND linkedin_connected_date < ${weekEnd.toISOString()}
    `;
    const linkedinConnected = Number(linkedinConnectedRows[0]?.count || 0);

    const linkedinMessagesRows = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE linkedin_message_date >= ${weekStart.toISOString()} AND linkedin_message_date < ${weekEnd.toISOString()}
    `;
    const linkedinMessages = Number(linkedinMessagesRows[0]?.count || 0);

    const linkedinRepliedRows = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE linkedin_reply_date >= ${weekStart.toISOString()} AND linkedin_reply_date < ${weekEnd.toISOString()}
    `;
    const linkedinReplied = Number(linkedinRepliedRows[0]?.count || 0);

    // LinkedIn meetings (replied leads that mention meeting/termin)
    const linkedinMeetingsRows = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE linkedin_reply_date >= ${weekStart.toISOString()} AND linkedin_reply_date < ${weekEnd.toISOString()}
        AND (LOWER(linkedin_reply) LIKE '%termin%' OR LOWER(linkedin_reply) LIKE '%meeting%' OR LOWER(linkedin_reply) LIKE '%call%')
    `;
    const linkedinMeetings = Number(linkedinMeetingsRows[0]?.count || 0);

    // Sector breakdown
    const sectorRows = await sql`
      SELECT
        COALESCE(l.sequence_type, 'allgemein') as sector,
        COUNT(DISTINCT ee.lead_id) as count
      FROM email_events ee
      JOIN leads l ON l.id = ee.lead_id
      WHERE ee.event_type = 'sent' AND ee.created_at >= ${weekStart.toISOString()} AND ee.created_at < ${weekEnd.toISOString()}
      GROUP BY l.sequence_type
    `;

    let sectorImmobilien = 0, sectorHandwerk = 0, sectorBau = 0, sectorAllgemein = 0;
    for (const row of sectorRows) {
      const s = (row.sector || '').toLowerCase();
      if (s.includes('immobilien')) sectorImmobilien = Number(row.count);
      else if (s.includes('handwerk')) sectorHandwerk = Number(row.count);
      else if (s.includes('bau')) sectorBau = Number(row.count);
      else sectorAllgemein += Number(row.count);
    }

    // Best performing sector (highest reply rate)
    const sectorReplyRows = await sql`
      SELECT
        COALESCE(l.sequence_type, 'allgemein') as sector,
        COUNT(DISTINCT CASE WHEN ee.event_type = 'sent' THEN ee.lead_id END) as sent_leads,
        COUNT(DISTINCT CASE WHEN ee.event_type = 'replied' THEN ee.lead_id END) as replied_leads
      FROM email_events ee
      JOIN leads l ON l.id = ee.lead_id
      WHERE ee.created_at >= ${weekStart.toISOString()} AND ee.created_at < ${weekEnd.toISOString()}
      GROUP BY l.sequence_type
    `;
    let bestSector = 'N/A';
    let bestReplyRate = 0;
    for (const row of sectorReplyRows) {
      const sent = Number(row.sent_leads || 0);
      const replied = Number(row.replied_leads || 0);
      if (sent > 0) {
        const rate = replied / sent;
        if (rate > bestReplyRate) {
          bestReplyRate = rate;
          bestSector = row.sector || 'allgemein';
        }
      }
    }

    // Meetings booked (from call_logs with result = 'appointment')
    const meetingsRows = await sql`
      SELECT COUNT(*) as count FROM call_logs
      WHERE result = 'appointment' AND created_at >= ${weekStart.toISOString()} AND created_at < ${weekEnd.toISOString()}
    `;
    const meetingsBooked = Number(meetingsRows[0]?.count || 0);

    // Save to weekly_reports
    await sql`
      INSERT INTO weekly_reports (
        week_start, week_end, leads_contacted, emails_sent, emails_opened, emails_replied,
        meetings_booked, linkedin_requests, linkedin_connected, linkedin_messages,
        linkedin_replied, linkedin_meetings,
        sector_immobilien_count, sector_handwerk_count, sector_bau_count, sector_allgemein_count,
        best_performing_sector
      ) VALUES (
        ${weekStart.toISOString().split('T')[0]},
        ${weekEnd.toISOString().split('T')[0]},
        ${leadsContacted}, ${emailsSent}, ${emailsOpened}, ${emailsReplied},
        ${meetingsBooked}, ${linkedinRequests}, ${linkedinConnected}, ${linkedinMessages},
        ${linkedinReplied}, ${linkedinMeetings},
        ${sectorImmobilien}, ${sectorHandwerk}, ${sectorBau}, ${sectorAllgemein},
        ${bestSector}
      )
    `;

    // Previous week data
    const prevRows = await sql`
      SELECT * FROM weekly_reports
      WHERE week_start = ${prevWeekStart.toISOString().split('T')[0]}
      ORDER BY id DESC LIMIT 1
    `;
    const prev = prevRows[0] || null;
    const prevLeads = Number(prev?.leads_contacted || 0);
    const prevSent = Number(prev?.emails_sent || 0);
    const prevOpened = Number(prev?.emails_opened || 0);
    const prevReplied = Number(prev?.emails_replied || 0);
    const prevMeetings = Number(prev?.meetings_booked || 0);

    const openRate = emailsSent > 0 ? ((emailsOpened / emailsSent) * 100).toFixed(1) : '0.0';
    const replyRate = emailsSent > 0 ? ((emailsReplied / emailsSent) * 100).toFixed(1) : '0.0';
    const prevOpenRate = prevSent > 0 ? ((prevOpened / prevSent) * 100).toFixed(1) : '0.0';
    const prevReplyRate = prevSent > 0 ? ((prevReplied / prevSent) * 100).toFixed(1) : '0.0';

    // Warmup status estimate
    const recentSentRows = await sql`
      SELECT COUNT(*) as count FROM email_events
      WHERE event_type = 'sent' AND created_at >= ${new Date(Date.now() - 3 * 86400000).toISOString()}
    `;
    const recentSent = Number(recentSentRows[0]?.count || 0);
    const estimatedDailyLimit = Math.max(Math.round(recentSent / 3), 1);

    // Hot Leads (Issue #12)
    const hotLeadsRows = await sql`
      SELECT
        l.id, l.first_name, l.last_name, l.email, l.phone, l.company, l.title,
        l.agent_score, l.signal_email_reply, l.signal_linkedin_interest, l.linkedin_url,
        CASE
          WHEN l.signal_email_reply = TRUE THEN 'Email-Antwort'
          WHEN l.signal_linkedin_interest = TRUE THEN 'LinkedIn-Interesse'
          ELSE 'Hoher Score'
        END as hot_reason
      FROM leads l
      WHERE l.agent_score >= 9
        AND (l.signal_email_reply = TRUE OR l.signal_linkedin_interest = TRUE OR l.agent_score >= 9)
        AND l.pipeline_stage NOT IN ('Blocked', 'Nicht qualifiziert')
        AND (l.permanently_blocked IS NULL OR l.permanently_blocked = FALSE)
      ORDER BY
        CASE WHEN l.signal_email_reply = TRUE THEN 0 ELSE 1 END,
        CASE WHEN l.signal_linkedin_interest = TRUE THEN 0 ELSE 1 END,
        l.agent_score DESC
      LIMIT 10
    `;

    // Open tasks
    const noLinkedinRows = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE sequence_status = 'active' AND (linkedin_url IS NULL OR linkedin_url = '') AND linkedin_no_profile = FALSE
    `;
    const leadsWithoutLinkedin = Number(noLinkedinRows[0]?.count || 0);

    const inboundPendingRows = await sql`
      SELECT COUNT(*) as count FROM leads
      WHERE source = 'inbound' AND sequence_status IN ('none', 'active')
    `;
    const inboundPending = Number(inboundPendingRows[0]?.count || 0);

    // --- Build HTML email ---
    const htmlContent = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f8fafc; padding: 24px;">
  <div style="background: #1E3A5F; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">PraxisNova Weekly Report</h1>
    <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">KW ${kw} â ${formatDate(weekStart)} bis ${formatDate(weekEnd)}</p>
  </div>

  <div style="background: white; padding: 24px; border: 1px solid #e2e8f0;">
    <!-- DIESE WOCHE -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #2563EB; padding-bottom: 6px;">DIESE WOCHE</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr style="background: #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 600; font-size: 13px;">Leads kontaktiert</td>
        <td style="padding: 10px 12px; text-align: right; font-size: 14px; font-weight: 700;">${leadsContacted}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-size: 13px;">E-Mails gesendet</td>
        <td style="padding: 10px 12px; text-align: right; font-size: 14px; font-weight: 700;">${emailsSent}</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="padding: 10px 12px; font-size: 13px;">Oeffnungsrate</td>
        <td style="padding: 10px 12px; text-align: right; font-size: 14px; font-weight: 700;">${openRate}%</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-size: 13px;">Antwortrate</td>
        <td style="padding: 10px 12px; text-align: right; font-size: 14px; font-weight: 700;">${replyRate}%</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="padding: 10px 12px; font-size: 13px;">Meetings gebucht</td>
        <td style="padding: 10px 12px; text-align: right; font-size: 14px; font-weight: 700;">${meetingsBooked}</td>
      </tr>
    </table>

    <!-- LINKEDIN -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #0A66C2; padding-bottom: 6px;">LINKEDIN</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr style="background: #f1f5f9;">
        <td style="padding: 10px 12px; font-size: 13px;">Anfragen gesendet</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700;">${linkedinRequests}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-size: 13px;">Verbunden</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700;">${linkedinConnected}</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="padding: 10px 12px; font-size: 13px;">Nachrichten gesendet</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700;">${linkedinMessages}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-size: 13px;">Antworten</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700;">${linkedinReplied}</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="padding: 10px 12px; font-size: 13px;">Meetings</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700;">${linkedinMeetings}</td>
      </tr>
    </table>

    <!-- BEST PERFORMER -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #16a34a; padding-bottom: 6px;">BEST PERFORMER</h2>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px;"><strong>Sektor:</strong> ${bestSector}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Antwortrate: ${(bestReplyRate * 100).toFixed(1)}%</p>
    </div>

    <!-- VERGLEICH -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">VERGLEICH ZUR VORWOCHE</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <tr style="background: #1E3A5F; color: white;">
        <th style="padding: 10px 12px; text-align: left;">Metrik</th>
        <th style="padding: 10px 12px; text-align: right;">Diese Woche</th>
        <th style="padding: 10px 12px; text-align: right;">Letzte Woche</th>
        <th style="padding: 10px 12px; text-align: right;">Veraenderung</th>
      </tr>
      <tr>
        <td style="padding: 8px 12px;">Leads kontaktiert</td>
        <td style="padding: 8px 12px; text-align: right;">${leadsContacted}</td>
        <td style="padding: 8px 12px; text-align: right;">${prevLeads}</td>
        <td style="padding: 8px 12px; text-align: right; color: ${changeColor(leadsContacted, prevLeads)}; font-weight: 600;">${pctChange(leadsContacted, prevLeads)}</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="padding: 8px 12px;">E-Mails gesendet</td>
        <td style="padding: 8px 12px; text-align: right;">${emailsSent}</td>
        <td style="padding: 8px 12px; text-align: right;">${prevSent}</td>
        <td style="padding: 8px 12px; text-align: right; color: ${changeColor(emailsSent, prevSent)}; font-weight: 600;">${pctChange(emailsSent, prevSent)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;">Oeffnungsrate</td>
        <td style="padding: 8px 12px; text-align: right;">${openRate}%</td>
        <td style="padding: 8px 12px; text-align: right;">${prevOpenRate}%</td>
        <td style="padding: 8px 12px; text-align: right; color: ${changeColor(parseFloat(openRate), parseFloat(prevOpenRate))}; font-weight: 600;">${pctChange(parseFloat(openRate), parseFloat(prevOpenRate))}</td>
      </tr>
      <tr style="background: #f1f5f9;">
        <td style="padding: 8px 12px;">Antwortrate</td>
        <td style="padding: 8px 12px; text-align: right;">${replyRate}%</td>
        <td style="padding: 8px 12px; text-align: right;">${prevReplyRate}%</td>
        <td style="padding: 8px 12px; text-align: right; color: ${changeColor(parseFloat(replyRate), parseFloat(prevReplyRate))}; font-weight: 600;">${pctChange(parseFloat(replyRate), parseFloat(prevReplyRate))}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px;">Meetings</td>
        <td style="padding: 8px 12px; text-align: right;">${meetingsBooked}</td>
        <td style="padding: 8px 12px; text-align: right;">${prevMeetings}</td>
        <td style="padding: 8px 12px; text-align: right; color: ${changeColor(meetingsBooked, prevMeetings)}; font-weight: 600;">${pctChange(meetingsBooked, prevMeetings)}</td>
      </tr>
    </table>

    <!-- WARM-UP STATUS -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #8b5cf6; padding-bottom: 6px;">WARM-UP STATUS</h2>
    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px;"><strong>Geschaetztes Tageslimit:</strong> ${estimatedDailyLimit} E-Mails/Tag</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Basierend auf den letzten 3 Tagen (${recentSent} E-Mails gesendet)</p>
    </div>

    <!-- HOT LEADS -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #FF6B35; padding-bottom: 6px;">HOT LEADS (Top ${hotLeadsRows.length})</h2>
    ${hotLeadsRows.length === 0 ? '<p style="font-size: 13px; color: #6b7280; margin-bottom: 24px;">Keine Hot Leads diese Woche.</p>' : `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px;">
      <tr style="background: #1E3A5F; color: white;">
        <th style="padding: 8px 10px; text-align: left;">Name</th>
        <th style="padding: 8px 10px; text-align: left;">Firma</th>
        <th style="padding: 8px 10px; text-align: center;">Score</th>
        <th style="padding: 8px 10px; text-align: left;">Grund</th>
        <th style="padding: 8px 10px; text-align: left;">Kontakt</th>
      </tr>
      ${hotLeadsRows.map((hl: any, idx: number) => `
      <tr style="background: ${idx % 2 === 0 ? '#fff7ed' : 'white'};">
        <td style="padding: 8px 10px; font-weight: 600;">${hl.first_name} ${hl.last_name}</td>
        <td style="padding: 8px 10px;">${hl.company || '-'}</td>
        <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #FF6B35;">${hl.agent_score}</td>
        <td style="padding: 8px 10px;">${hl.hot_reason}</td>
        <td style="padding: 8px 10px;">${hl.phone ? hl.phone : hl.email}</td>
      </tr>`).join('')}
    </table>`}

        <!-- OFFENE AUFGABEN -->
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #ef4444; padding-bottom: 6px;">OFFENE AUFGABEN</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr style="background: #fef2f2;">
        <td style="padding: 10px 12px; font-size: 13px;">Leads ohne LinkedIn-Profil</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: ${leadsWithoutLinkedin > 0 ? '#dc2626' : '#16a34a'};">${leadsWithoutLinkedin}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-size: 13px;">Inbound Leads ausstehend</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: ${inboundPending > 0 ? '#f59e0b' : '#16a34a'};">${inboundPending}</td>
      </tr>
    </table>
  </div>

  <div style="background: #1E3A5F; color: white; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; opacity: 0.9;">
    PraxisNova AI Sales Control â Automatisch generiert
  </div>
</div>`;

    // Send to both recipients
    const subject = `PraxisNova Weekly Report KW ${kw} â ${formatDate(weekStart)}`;
    const recipients = ['hertle.anjuli@praxisnovaai.com', 'meyer.samantha@praxisnovaai.com'];
    for (const to of recipients) {
      await sendTransactionalEmail({
        to,
        subject,
        htmlContent,
        senderEmail: 'info@praxisnovaai.com',
        senderName: 'PraxisNova AI',
        tags: ['weekly-report'],
      });
    }

    console.log(`[weekly-report] KW ${kw} report sent to ${recipients.join(', ')}`);

    return NextResponse.json({
      ok: true,
      kw,
      leadsContacted,
      emailsSent,
      openRate,
      replyRate,
      meetingsBooked,
      linkedinRequests,
      bestSector,
    });
  } catch (error) {
    console.error('[weekly-report] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
