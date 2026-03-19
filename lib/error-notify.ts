import sql from '@/lib/db';

const NOTIFY_EMAIL = 'hertle.anjuli@praxisnovaai.com';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface ErrorContext {
  errorType: string;
  leadId?: number;
  leadName?: string;
  leadEmail?: string;
  leadCompany?: string;
  sequenceType?: string;
  stepNumber?: number;
  errorMessage: string;
  action?: string;
}

export async function logAndNotifyError(ctx: ErrorContext): Promise<void> {
  // 1. Log to database
  try {
    await sql`
      INSERT INTO error_logs (error_type, lead_id, sequence_type, step_number, error_message, context)
      VALUES (
        ${ctx.errorType},
        ${ctx.leadId || null},
        ${ctx.sequenceType || null},
        ${ctx.stepNumber || null},
        ${ctx.errorMessage},
        ${ctx.action || null}
      )
    `;
  } catch (dbError) {
    console.error('[ErrorNotify] Could not log to DB:', dbError);
  }

  // 2. Send notification email
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('[ErrorNotify] No BREVO_API_KEY, cannot send notification');
      return;
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL_FALLBACK || 'hertle.anjuli@praxisnovaai.com';
    const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

    const leadInfo = ctx.leadId
      ? `<tr><td style="padding:4px 8px;color:#666;">Lead:</td><td style="padding:4px 8px;">${ctx.leadName || '–'} (${ctx.leadEmail || '–'}) – ${ctx.leadCompany || '–'}</td></tr>`
      : '';

    const sequenceInfo = ctx.sequenceType
      ? `<tr><td style="padding:4px 8px;color:#666;">Sequenz:</td><td style="padding:4px 8px;">${ctx.sequenceType}${ctx.stepNumber != null ? `, Schritt ${ctx.stepNumber}` : ''}</td></tr>`
      : '';

    const htmlContent = `<html>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">
<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:16px;">
  <h2 style="margin:0 0 8px;color:#991b1b;font-size:16px;">Fehler im Sales Control Center</h2>
  <p style="margin:0;font-size:13px;color:#666;">${timestamp}</p>
</div>

<table style="border-collapse:collapse;width:100%;font-size:14px;">
  <tr><td style="padding:4px 8px;color:#666;">Fehlertyp:</td><td style="padding:4px 8px;font-weight:bold;">${ctx.errorType}</td></tr>
  ${leadInfo}
  ${sequenceInfo}
  <tr><td style="padding:4px 8px;color:#666;">Aktion:</td><td style="padding:4px 8px;">${ctx.action || '–'}</td></tr>
  <tr><td style="padding:4px 8px;color:#666;">Fehlermeldung:</td><td style="padding:4px 8px;color:#991b1b;">${ctx.errorMessage}</td></tr>
</table>

<p style="margin-top:16px;font-size:12px;color:#999;">
  Diese Nachricht wurde automatisch vom PraxisNova Sales Control Center gesendet.<br>
  <a href="https://praxisnova-sales-control.vercel.app/errors">Fehler-Log ansehen</a>
</p>
</body>
</html>`;

    await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { name: 'Sales Control Center', email: senderEmail },
        to: [{ email: NOTIFY_EMAIL }],
        subject: `[Fehler] ${ctx.errorType}: ${ctx.errorMessage.substring(0, 80)}`,
        htmlContent,
        tags: ['error-notification'],
      }),
    });

    // Mark as notified
    if (ctx.leadId) {
      await sql`
        UPDATE error_logs SET notified = TRUE
        WHERE lead_id = ${ctx.leadId} AND error_type = ${ctx.errorType}
        AND created_at >= NOW() - INTERVAL '1 minute'
      `.catch(() => {});
    }
  } catch (emailError) {
    console.error('[ErrorNotify] Could not send notification email:', emailError);
  }
}

export async function sendDailySummary(): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const senderEmail = process.env.BREVO_SENDER_EMAIL_FALLBACK || 'hertle.anjuli@praxisnovaai.com';

  // Gather stats from last 24h
  const emailsSent = await sql`
    SELECT COUNT(*) as count FROM email_events
    WHERE event_type = 'sent' AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const emailsFailed = await sql`
    SELECT COUNT(*) as count FROM email_events
    WHERE event_type = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const activeSequences = await sql`
    SELECT COUNT(*) as count FROM leads WHERE sequence_status = 'active'
  `;
  const newInbound = await sql`
    SELECT COUNT(*) as count FROM leads
    WHERE sequence_type = 'inbound' AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  const booked = await sql`
    SELECT COUNT(*) as count FROM leads
    WHERE sequence_status = 'booked' AND exited_at >= NOW() - INTERVAL '24 hours'
  `;
  const errors = await sql`
    SELECT error_type, COUNT(*) as count FROM error_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY error_type ORDER BY count DESC
  `;
  const recentErrors = await sql`
    SELECT el.error_type, el.error_message, el.created_at,
           l.first_name, l.last_name, l.email as lead_email
    FROM error_logs el
    LEFT JOIN leads l ON l.id = el.lead_id
    WHERE el.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY el.created_at DESC LIMIT 10
  `;

  const sent = Number(emailsSent[0]?.count || 0);
  const failed = Number(emailsFailed[0]?.count || 0);
  const active = Number(activeSequences[0]?.count || 0);
  const inbound = Number(newInbound[0]?.count || 0);
  const bookedCount = Number(booked[0]?.count || 0);
  const totalErrors = errors.reduce((sum, e) => sum + Number(e.count), 0);

  const today = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let errorSection = '';
  if (totalErrors > 0) {
    const errorRows = recentErrors.map(e => {
      const time = new Date(e.created_at).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' });
      const lead = e.lead_email ? `${e.first_name || ''} ${e.last_name || ''} (${e.lead_email})` : '–';
      return `<tr><td style="padding:4px 8px;font-size:13px;">${time}</td><td style="padding:4px 8px;font-size:13px;">${e.error_type}</td><td style="padding:4px 8px;font-size:13px;">${lead}</td><td style="padding:4px 8px;font-size:13px;color:#991b1b;">${e.error_message.substring(0, 100)}</td></tr>`;
    }).join('');

    errorSection = `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-top:16px;">
      <h3 style="margin:0 0 8px;color:#991b1b;font-size:14px;">Fehler (${totalErrors})</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#fee2e2;"><th style="padding:4px 8px;text-align:left;font-size:12px;">Zeit</th><th style="padding:4px 8px;text-align:left;font-size:12px;">Typ</th><th style="padding:4px 8px;text-align:left;font-size:12px;">Lead</th><th style="padding:4px 8px;text-align:left;font-size:12px;">Meldung</th></tr>
        ${errorRows}
      </table>
    </div>`;
  }

  const htmlContent = `<html>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">
<div style="background:#1E3A5F;color:white;padding:16px;border-radius:8px 8px 0 0;">
  <h2 style="margin:0;font-size:18px;">Tägliche Zusammenfassung</h2>
  <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">${today}</p>
</div>

<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:8px;text-align:center;width:20%;">
        <div style="font-size:28px;font-weight:bold;color:#2563EB;">${sent}</div>
        <div style="font-size:12px;color:#666;">E-Mails gesendet</div>
      </td>
      <td style="padding:8px;text-align:center;width:20%;">
        <div style="font-size:28px;font-weight:bold;color:${failed > 0 ? '#dc2626' : '#16a34a'};">${failed}</div>
        <div style="font-size:12px;color:#666;">Fehlgeschlagen</div>
      </td>
      <td style="padding:8px;text-align:center;width:20%;">
        <div style="font-size:28px;font-weight:bold;color:#1E3A5F;">${active}</div>
        <div style="font-size:12px;color:#666;">Aktive Sequenzen</div>
      </td>
      <td style="padding:8px;text-align:center;width:20%;">
        <div style="font-size:28px;font-weight:bold;color:#7c3aed;">${inbound}</div>
        <div style="font-size:12px;color:#666;">Neue Inbound</div>
      </td>
      <td style="padding:8px;text-align:center;width:20%;">
        <div style="font-size:28px;font-weight:bold;color:#16a34a;">${bookedCount}</div>
        <div style="font-size:12px;color:#666;">Termine gebucht</div>
      </td>
    </tr>
  </table>

  ${errorSection}

  <p style="margin-top:16px;text-align:center;">
    <a href="https://praxisnova-sales-control.vercel.app" style="background:#2563EB;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-size:14px;">Dashboard öffnen</a>
  </p>
</div>

<p style="margin-top:16px;font-size:11px;color:#999;text-align:center;">
  PraxisNova AI Sales Control Center | Automatische Zusammenfassung
</p>
</body>
</html>`;

  await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { name: 'Sales Control Center', email: senderEmail },
      to: [{ email: NOTIFY_EMAIL }],
      subject: `Sales Report ${today}: ${sent} gesendet, ${active} aktiv${totalErrors > 0 ? `, ${totalErrors} Fehler` : ''}`,
      htmlContent,
      tags: ['daily-summary'],
    }),
  });
}
