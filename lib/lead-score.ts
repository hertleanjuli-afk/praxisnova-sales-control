import sql from '@/lib/db';

const SCORE_WEIGHTS = {
  pageview: 1,
  cta_click: 5,
  popup_submit: 20,
  email_open: 3,
  email_click: 5,
  email_reply: 10,
  meeting_booked: 50,
};

export async function calculateLeadScore(leadId: number): Promise<number> {
  // Website clicks (pageviews + CTA clicks)
  const clicks = await sql`
    SELECT
      COUNT(*) FILTER (WHERE button_id = 'unknown' OR button_id IS NULL) as pageviews,
      COUNT(*) FILTER (WHERE button_id != 'unknown' AND button_id IS NOT NULL) as cta_clicks
    FROM website_clicks WHERE lead_id = ${leadId}
  `;

  // Email events
  const events = await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'opened') as opens,
      COUNT(*) FILTER (WHERE event_type = 'clicked') as clicks,
      COUNT(*) FILTER (WHERE event_type = 'replied') as replies,
      COUNT(*) FILTER (WHERE event_type = 'booked') as bookings
    FROM email_events WHERE lead_id = ${leadId}
  `;

  // Check if lead came from popup
  const lead = await sql`SELECT sequence_type FROM leads WHERE id = ${leadId}`;
  const isInbound = lead[0]?.sequence_type === 'inbound' ? 1 : 0;

  const score =
    Number(clicks[0]?.pageviews || 0) * SCORE_WEIGHTS.pageview +
    Number(clicks[0]?.cta_clicks || 0) * SCORE_WEIGHTS.cta_click +
    isInbound * SCORE_WEIGHTS.popup_submit +
    Number(events[0]?.opens || 0) * SCORE_WEIGHTS.email_open +
    Number(events[0]?.clicks || 0) * SCORE_WEIGHTS.email_click +
    Number(events[0]?.replies || 0) * SCORE_WEIGHTS.email_reply +
    Number(events[0]?.bookings || 0) * SCORE_WEIGHTS.meeting_booked;

  // Update the lead's score in DB
  await sql`UPDATE leads SET lead_score = ${score} WHERE id = ${leadId}`;

  return score;
}

export async function recalculateAllScores(): Promise<number> {
  const leads = await sql`SELECT id FROM leads`;
  let updated = 0;
  for (const lead of leads) {
    await calculateLeadScore(lead.id);
    updated++;
  }
  return updated;
}
