// ============================================================
// CRON: LinkedIn Posting Check
// Schedule: 16:00 UTC (18:00 Berlin) taeglich
// Prueft ob heute 2 Posts gemacht wurden
// Sendet Reminder Email an Angie + Samantha wenn nicht
// ============================================================

import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const ALERT_RECIPIENTS = [
  { email: 'hertle.anjuli@praxisnovaai.com', name: 'Anjuli Hertle' },
  { email: 'meyer.samantha@praxisnovaai.com', name: 'Samantha Giulia Meyer' },
];

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Heutige Posts pruefen
    const todayPosts = await sql`
      SELECT post_number, posted
      FROM linkedin_posts
      WHERE post_date = CURRENT_DATE
      ORDER BY post_number
    `;

    const post1Done = todayPosts.some((p: { post_number: number; posted: boolean }) =>
      p.post_number === 1 && p.posted
    );
    const post2Done = todayPosts.some((p: { post_number: number; posted: boolean }) =>
      p.post_number === 2 && p.posted
    );

    // Wenn beide gepostet, nichts tun
    if (post1Done && post2Done) {
      return NextResponse.json({
        ok: true,
        message: 'Beide Posts heute erledigt - kein Reminder noetig',
        post1: true,
        post2: true,
      });
    }

    // Reminder zusammenstellen
    const missingPosts: string[] = [];
    if (!post1Done) missingPosts.push('Post 1');
    if (!post2Done) missingPosts.push('Post 2');

    // Wochen-Statistik holen
    const [weekStats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE posted = true) as done,
        14 as target
      FROM linkedin_posts
      WHERE post_date >= DATE_TRUNC('week', CURRENT_DATE)
      AND post_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
    `;

    const today = new Date().toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Email senden
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #E8472A; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">LinkedIn Posting Reminder</h2>
        </div>
        <div style="background: #1a1a1a; padding: 24px; color: #e0e0e0; border-radius: 0 0 8px 8px;">
          <p>Hallo zusammen,</p>
          <p>Heute (${today}) fehlen noch <strong style="color: #E8472A;">${missingPosts.length} LinkedIn Post(s)</strong>:</p>
          <ul style="list-style: none; padding: 0;">
            <li style="padding: 8px 12px; margin: 4px 0; background: ${post1Done ? '#1a3a1a' : '#3a1a1a'}; border-radius: 4px;">
              ${post1Done ? '&#9989;' : '&#10060;'} Post 1 - ${post1Done ? 'Erledigt' : 'FEHLT NOCH'}
            </li>
            <li style="padding: 8px 12px; margin: 4px 0; background: ${post2Done ? '#1a3a1a' : '#3a1a1a'}; border-radius: 4px;">
              ${post2Done ? '&#9989;' : '&#10060;'} Post 2 - ${post2Done ? 'Erledigt' : 'FEHLT NOCH'}
            </li>
          </ul>
          <p style="margin-top: 16px;">
            <strong>Wochenfortschritt:</strong> ${weekStats?.done || 0} von ${weekStats?.target || 14} Posts
          </p>
          <p style="margin-top: 20px;">
            <a href="https://praxisnova-sales-control.vercel.app/linkedin-posting"
               style="background: #E8472A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Posting-Tracker oeffnen
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">
            PraxisNova AI - Sales Control Center
          </p>
        </div>
      </div>
    `;

    // Via Brevo senden
    if (BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: 'hertle.anjuli@praxisnovaai.com', name: 'PraxisNova AI' },
          to: ALERT_RECIPIENTS,
          subject: `LinkedIn Reminder: ${missingPosts.join(' + ')} fehlt noch (${today})`,
          htmlContent: htmlBody,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[linkedin-posting-check] Brevo Fehler:', errorText);
        return NextResponse.json({ ok: false, error: 'Email konnte nicht gesendet werden' });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Reminder gesendet - ${missingPosts.join(' und ')} fehlt noch`,
      post1: post1Done,
      post2: post2Done,
      recipients: ALERT_RECIPIENTS.map(r => r.email),
    });

  } catch (error) {
    console.error('[linkedin-posting-check] Fehler:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
