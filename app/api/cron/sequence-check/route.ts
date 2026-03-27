import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

const NOTIFY_EMAIL = 'hertle.anjuli@praxisnovaai.com';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const issues: string[] = [];

  try {
    // 1. Active sequences with reply events but status still 'active'
    const missedReplies = await sql`
      SELECT DISTINCT l.id, l.first_name, l.last_name, l.email, l.company, l.sequence_type, l.sequence_status
      FROM leads l
      INNER JOIN email_events ee ON ee.lead_id = l.id
      WHERE ee.event_type = 'replied'
        AND l.sequence_status = 'active'
    `;
    for (const lead of missedReplies) {
      issues.push(
        `REPLY NICHT ERKANNT: ${lead.first_name || ''} ${lead.last_name || ''} (${lead.email}) - ` +
        `Sequenz "${lead.sequence_type}" ist noch aktiv, obwohl eine Antwort vorliegt`
      );
      // Auto-fix: set status to replied with 90-day cooldown
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 90);
      await sql`
        UPDATE leads SET
          sequence_status = 'replied',
          exited_at = COALESCE(exited_at, NOW()),
          cooldown_until = ${cooldownUntil.toISOString()}
        WHERE id = ${lead.id}
      `;
    }

    // 2. Active sequences with bounce events but status still 'active'
    const missedBounces = await sql`
      SELECT DISTINCT l.id, l.first_name, l.last_name, l.email, l.company, l.sequence_type
      FROM leads l
      INNER JOIN email_events ee ON ee.lead_id = l.id
      WHERE ee.event_type = 'bounced'
        AND l.sequence_status = 'active'
    `;
    for (const lead of missedBounces) {
      issues.push(
        `BOUNCE NICHT ERKANNT: ${lead.first_name || ''} ${lead.last_name || ''} (${lead.email}) - ` +
        `Sequenz "${lead.sequence_type}" ist noch aktiv trotz Bounce`
      );
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 90);
      await sql`
        UPDATE leads SET
          sequence_status = 'bounced',
          exited_at = COALESCE(exited_at, NOW()),
          cooldown_until = ${cooldownUntil.toISOString()}
        WHERE id = ${lead.id}
      `;
    }

    // 3. Active sequences with unsubscribe events but status still 'active'
    const missedUnsubs = await sql`
      SELECT DISTINCT l.id, l.first_name, l.last_name, l.email, l.company, l.sequence_type
      FROM leads l
      INNER JOIN email_events ee ON ee.lead_id = l.id
      WHERE ee.event_type = 'unsubscribed'
        AND l.sequence_status = 'active'
    `;
    for (const lead of missedUnsubs) {
      issues.push(
        `ABMELDUNG NICHT ERKANNT: ${lead.first_name || ''} ${lead.last_name || ''} (${lead.email}) - ` +
        `Sequenz "${lead.sequence_type}" ist noch aktiv trotz Abmeldung`
      );
      await sql`
        UPDATE leads SET
          sequence_status = 'unsubscribed',
          permanently_blocked = TRUE,
          unsubscribed_at = COALESCE(unsubscribed_at, NOW()),
          exited_at = COALESCE(exited_at, NOW()),
          cooldown_until = NULL
        WHERE id = ${lead.id}
      `;
    }

    // 4. Active sequences stuck on same step for >7 days (no email sent)
    const stuckSequences = await sql`
      SELECT l.id, l.first_name, l.last_name, l.email, l.company, l.sequence_type, l.sequence_step, l.enrolled_at
      FROM leads l
      WHERE l.sequence_status = 'active'
        AND l.enrolled_at < NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM email_events ee
          WHERE ee.lead_id = l.id
            AND ee.created_at >= NOW() - INTERVAL '7 days'
        )
    `;
    for (const lead of stuckSequences) {
      issues.push(
        `SEQUENZ HÄNGT: ${lead.first_name || ''} ${lead.last_name || ''} (${lead.email}) - ` +
        `Sequenz "${lead.sequence_type}" Schritt ${lead.sequence_step}, keine Aktivität seit 7+ Tagen`
      );
    }

    // 5. Leads with expired cooldown still in non-none status
    const expiredCooldowns = await sql`
      SELECT id, first_name, last_name, email, sequence_status, cooldown_until
      FROM leads
      WHERE cooldown_until < NOW()
        AND sequence_status NOT IN ('none', 'active')
        AND cooldown_until IS NOT NULL
    `;
    if (expiredCooldowns.length > 5) {
      issues.push(
        `${expiredCooldowns.length} Leads mit abgelaufenem Cooldown noch nicht zurückgesetzt`
      );
    }

    // Send notification if issues found
    if (issues.length > 0) {
      await sendConsistencyAlert(issues);
    }

    return NextResponse.json({
      ok: true,
      issues_found: issues.length,
      auto_fixed: missedReplies.length + missedBounces.length + missedUnsubs.length,
      details: issues,
    });
  } catch (error) {
    console.error('Sequence consistency check error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function sendConsistencyAlert(issues: string[]): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const senderEmail = process.env.BREVO_SENDER_EMAIL_FALLBACK || 'hertle.anjuli@praxisnovaai.com';
  const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

  const issueRows = issues
    .map(
      (issue) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;">${issue}</td></tr>`
    )
    .join('');

  const htmlContent = `<html>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">
<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:16px;">
  <h2 style="margin:0 0 8px;color:#92400e;font-size:16px;">Sequenz-Konsistenzprüfung — ${issues.length} Problem${issues.length !== 1 ? 'e' : ''} gefunden</h2>
  <p style="margin:0;font-size:13px;color:#666;">${timestamp}</p>
</div>

<table style="width:100%;border-collapse:collapse;">
  ${issueRows}
</table>

<p style="margin-top:16px;font-size:13px;color:#666;">
  Probleme mit Status-Inkonsistenzen (Reply/Bounce/Abmeldung nicht erkannt) wurden automatisch korrigiert.
</p>
<p style="margin-top:8px;">
  <a href="https://praxisnova-sales-control.vercel.app/sequences" style="background:#2563EB;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-size:14px;">Sequenzen ansehen</a>
</p>

<p style="margin-top:16px;font-size:11px;color:#999;">
  PraxisNova AI Sales Control Center | Tägliche Konsistenzprüfung
</p>
</body>
</html>`;

  await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { name: 'Sales Control Center', email: senderEmail },
      to: [{ email: NOTIFY_EMAIL }],
      subject: `[Warnung] ${issues.length} Sequenz-Inkonsistenz${issues.length !== 1 ? 'en' : ''} gefunden`,
      htmlContent,
      tags: ['consistency-check'],
    }),
  });
}
