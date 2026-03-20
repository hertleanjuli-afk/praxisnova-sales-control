import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';
import { updateContact } from '@/lib/hubspot';
import { immobilienSequence } from '@/lib/sequences/immobilien';
import { handwerkSequence } from '@/lib/sequences/handwerk';
import { bauunternehmenSequence } from '@/lib/sequences/bauunternehmen';
import { inboundSequence } from '@/lib/sequences/inbound';
import type { SequenceStep } from '@/types';
import { formatSalutation } from '@/lib/gender';
import { logAndNotifyError } from '@/lib/error-notify';

const sequenceMap: Record<string, SequenceStep[]> = {
  immobilien: immobilienSequence,
  handwerk: handwerkSequence,
  bauunternehmen: bauunternehmenSequence,
  inbound: inboundSequence,
};

function getSenderForSequence(sequenceType: string): { email: string; name: string } {
  switch (sequenceType) {
    case 'immobilien':
      return {
        email: process.env.BREVO_SENDER_IMMOBILIEN_EMAIL || process.env.BREVO_SENDER_EMAIL_PRIMARY || 'info@praxisnovaai.com',
        name: process.env.BREVO_SENDER_IMMOBILIEN_NAME || 'Anjuli Hertle',
      };
    case 'handwerk':
      return {
        email: process.env.BREVO_SENDER_HANDWERK_EMAIL || process.env.BREVO_SENDER_EMAIL_PRIMARY || 'info@praxisnovaai.com',
        name: process.env.BREVO_SENDER_HANDWERK_NAME || 'Anjuli Hertle',
      };
    case 'bauunternehmen':
      return {
        email: process.env.BREVO_SENDER_BAU_EMAIL || process.env.BREVO_SENDER_EMAIL_PRIMARY || 'info@praxisnovaai.com',
        name: process.env.BREVO_SENDER_BAU_NAME || 'Samantha Meyer',
      };
    case 'inbound':
      return {
        email: process.env.BREVO_SENDER_INBOUND_EMAIL || process.env.BREVO_SENDER_EMAIL_PRIMARY || 'info@praxisnovaai.com',
        name: process.env.BREVO_SENDER_INBOUND_NAME || 'Anjuli Hertle',
      };
    default:
      return {
        email: process.env.BREVO_SENDER_EMAIL_PRIMARY || 'info@praxisnovaai.com',
        name: process.env.BREVO_SENDER_NAME || 'Anjuli Hertle',
      };
  }
}

export async function GET(request: NextRequest) {
  // Auth: either cron secret OR authenticated session (for manual trigger)
  const authHeader = request.headers.get('authorization');
  const isManual = request.headers.get('x-manual-trigger') === 'true';

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // If not cron, check for session auth (manual trigger from dashboard)
    if (isManual) {
      const { getServerSession } = await import('next-auth');
      const { authOptions } = await import('@/lib/auth');
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Step send windows — ready for Vercel Pro plan (multiple cron runs per day)
  // STEP_SEND_HOURS: { 1: 8, 2: 10, 3: 14, 4: 9, 5: 11 } (MEZ)
  // Enable by upgrading to Pro and setting cron to "30 7,8,9,10,12,13 * * 1-4"

  const stats = { processed: 0, sent: 0, failed: 0, completed: 0, linkedin_tasks: 0 };

  try {
    // Get all active leads
    const activeLeads = await sql`
      SELECT * FROM leads
      WHERE sequence_status = 'active'
      AND sequence_type IS NOT NULL
      AND enrolled_at IS NOT NULL
      ORDER BY enrolled_at ASC
    `;

    for (const lead of activeLeads) {
      stats.processed++;

      const sequence = sequenceMap[lead.sequence_type];
      if (!sequence) continue;

      const currentStep = lead.sequence_step;
      const enrolledAt = new Date(lead.enrolled_at);
      const now = new Date();
      const daysSinceEnroll = Math.floor((now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24));

      // Find the current step in the sequence
      const step = sequence.find((s) => s.step === currentStep);
      if (!step) {
        // Sequence completed
        const cooldownUntil = new Date();
        cooldownUntil.setDate(cooldownUntil.getDate() + 90);

        await sql`
          UPDATE leads SET
            sequence_status = 'completed',
            exited_at = NOW(),
            cooldown_until = ${cooldownUntil.toISOString()}
          WHERE id = ${lead.id}
        `;

        if (lead.hubspot_id) {
          try {
            await updateContact(lead.hubspot_id, {
              sequence_status: 'completed',
              cooldown_until: cooldownUntil.toISOString().split('T')[0],
            });
          } catch (e) {
            console.error('HubSpot update error:', e);
          }
        }

        stats.completed++;
        continue;
      }

      // Check if it's time for this step (day-wise)
      if (daysSinceEnroll < step.dayOffset) continue;

      // Step send time windows (activated when cron runs multiple times per day on Pro plan)
      // Currently disabled on Hobby plan (cron runs once at 08:00 UTC)
      // To enable: upgrade to Vercel Pro and set cron to "30 7,8,9,10,12,13 * * 1-4"
      // if (!isManual && step.channel === 'email') {
      //   const stepSendHour = STEP_SEND_HOURS[currentStep] ?? 8;
      //   if (currentHourMEZ !== stepSendHour) { stats.skipped_time++; continue; }
      // }

      // Check if this step was already sent
      const alreadySent = await sql`
        SELECT id FROM email_events
        WHERE lead_id = ${lead.id} AND step_number = ${currentStep} AND event_type = 'sent'
      `;
      if (alreadySent.length > 0) {
        // Move to next step
        await sql`UPDATE leads SET sequence_step = ${currentStep + 1} WHERE id = ${lead.id}`;
        continue;
      }

      if (step.channel === 'linkedin') {
        // LinkedIn steps are manual tasks — just log and advance
        await sql`
          INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
          VALUES (${lead.id}, ${lead.sequence_type}, ${currentStep}, 'sent')
        `;
        await sql`UPDATE leads SET sequence_step = ${currentStep + 1} WHERE id = ${lead.id}`;
        stats.linkedin_tasks++;
        continue;
      }

      // Send email
      const salutation = formatSalutation(lead.first_name, lead.last_name);
      const emailBody = step.bodyTemplate
        .replace(/\{\{SALUTATION\}\}/g, salutation)
        .replace(/\{\{first_name\}\}/g, lead.first_name || '')
        .replace(/\{\{last_name\}\}/g, lead.last_name || '')
        .replace(/\{\{company_name\}\}/g, lead.company || 'Ihrem Unternehmen')
        .replace(/href="(https:\/\/(?:www\.)?praxisnovaai\.com[^"]*?)"/g, (match, url) => {
          const separator = url.includes('?') ? '&' : '?';
          return `href="${url}${separator}vid=${lead.id}"`;
        });

      const subject = (step.subject || '')
        .replace(/\{\{first_name\}\}/g, lead.first_name || '')
        .replace(/\{\{last_name\}\}/g, lead.last_name || '')
        .replace(/\{\{company_name\}\}/g, lead.company || '');

      try {
        // Get sender config based on sequence type
        const senderConfig = getSenderForSequence(lead.sequence_type);
        const result = await sendTransactionalEmail({
          to: lead.email,
          subject,
          htmlContent: emailBody,
          tags: [lead.sequence_type, `step-${currentStep}`],
          senderEmail: senderConfig.email,
          senderName: senderConfig.name,
        });

        if (result.success) {
          await sql`
            INSERT INTO email_events (lead_id, sequence_type, step_number, event_type, brevo_message_id, sender_used)
            VALUES (${lead.id}, ${lead.sequence_type}, ${currentStep}, 'sent', ${result.messageId}, ${result.senderUsed})
          `;
          await sql`UPDATE leads SET sequence_step = ${currentStep + 1} WHERE id = ${lead.id}`;

          if (lead.hubspot_id) {
            try {
              await updateContact(lead.hubspot_id, {
                sequence_step: String(currentStep + 1),
              });
            } catch (e) {
              console.error('HubSpot step update error:', e);
            }
          }

          stats.sent++;
        } else {
          await sql`
            INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
            VALUES (${lead.id}, ${lead.sequence_type}, ${currentStep}, 'failed')
          `;
          stats.failed++;
        }
      } catch (error) {
        console.error('Email send error for lead', lead.id, error);
        await sql`
          INSERT INTO email_events (lead_id, sequence_type, step_number, event_type)
          VALUES (${lead.id}, ${lead.sequence_type}, ${currentStep}, 'failed')
        `;
        await logAndNotifyError({
          errorType: 'brevo_send_failed',
          leadId: lead.id,
          leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          leadEmail: lead.email,
          leadCompany: lead.company,
          sequenceType: lead.sequence_type,
          stepNumber: currentStep,
          errorMessage: error instanceof Error ? error.message : String(error),
          action: 'E-Mail senden via Brevo',
        }).catch(() => {});
        stats.failed++;
      }
    }

    // Double opt-in reminders
    const pendingOptins = await sql`
      SELECT * FROM leads
      WHERE sequence_status = 'pending_optin'
      AND sequence_type = 'inbound'
      AND enrolled_at < NOW() - INTERVAL '24 hours'
      AND (optin_reminded IS NULL OR optin_reminded = FALSE)
    `;

    for (const lead of pendingOptins) {
      try {
        const { generateConfirmLink, sendTransactionalEmail } = await import('@/lib/brevo');
        const { formatSalutation } = await import('@/lib/gender');
        const confirmLink = generateConfirmLink(lead.email);
        const salutation = formatSalutation(lead.first_name, lead.last_name);

        await sendTransactionalEmail({
          to: lead.email,
          subject: 'Haben Sie unsere Bestätigung verpasst?',
          htmlContent: `<html><body style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.6;">
<p>${salutation}</p>
<p>wir haben bemerkt, dass Sie Ihre E-Mail-Adresse noch nicht bestätigt haben.</p>
<p>Klicken Sie einfach auf den folgenden Link, um die Bestätigung abzuschließen:</p>
<p style="text-align:center;margin:30px 0;">
  <a href="${confirmLink}" style="background-color:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">Jetzt bestätigen</a>
</p>
<p>Der Link ist noch 24 Stunden gültig.</p>
<p>Herzliche Grüße,<br>Anjuli Hertle<br>CEO &amp; Head of Sales<br>PraxisNova AI</p>
{{FOOTER}}
</body></html>`,
          tags: ['inbound', 'optin-reminder'],
        });

        await sql`UPDATE leads SET optin_reminded = TRUE WHERE id = ${lead.id}`;
        stats.sent++;
      } catch (e) {
        console.error('Opt-in reminder error:', e);
      }
    }

    // Expire old pending opt-ins (7+ days)
    await sql`
      UPDATE leads SET sequence_status = 'expired'
      WHERE sequence_status = 'pending_optin'
      AND enrolled_at < NOW() - INTERVAL '7 days'
    `;

    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error('Cron process-sequences error:', error);
    return NextResponse.json({ error: 'Internal error', stats }, { status: 500 });
  }
}
