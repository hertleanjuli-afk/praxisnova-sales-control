import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';
import { updateContact } from '@/lib/hubspot';
import { immobilienSequence } from '@/lib/sequences/immobilien';
import { handwerkSequence } from '@/lib/sequences/handwerk';
import { bauunternehmenSequence } from '@/lib/sequences/bauunternehmen';
import { inboundSequence } from '@/lib/sequences/inbound';
import type { SequenceStep } from '@/types';

const sequenceMap: Record<string, SequenceStep[]> = {
  immobilien: immobilienSequence,
  handwerk: handwerkSequence,
  bauunternehmen: bauunternehmenSequence,
  inbound: inboundSequence,
};

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

      // Check if it's time for this step
      if (daysSinceEnroll < step.dayOffset) continue;

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
      const emailBody = step.bodyTemplate
        .replace(/\{\{first_name\}\}/g, lead.first_name || 'dort')
        .replace(/\{\{company_name\}\}/g, lead.company || 'Ihrem Unternehmen');

      const subject = (step.subject || '')
        .replace(/\{\{first_name\}\}/g, lead.first_name || '')
        .replace(/\{\{company_name\}\}/g, lead.company || '');

      try {
        const result = await sendTransactionalEmail({
          to: lead.email,
          subject,
          htmlContent: emailBody,
          tags: [lead.sequence_type, `step-${currentStep}`],
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
        stats.failed++;
      }
    }

    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error('Cron process-sequences error:', error);
    return NextResponse.json({ error: 'Internal error', stats }, { status: 500 });
  }
}
