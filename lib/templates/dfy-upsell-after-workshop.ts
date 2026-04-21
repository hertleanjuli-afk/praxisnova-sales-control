/**
 * Transactional Template: DFY-Upsell nach Workshop
 * Getriggert einige Tage nach einem abgeschlossenen Workshop, wenn der
 * Kunde signalisiert dass er Umsetzungsbedarf hat. Ein-Shot.
 *
 * [ANGIE-REVIEW-NOTWENDIG] Platzhalter-Template vom 2026-04-21, ICP-Switch Track 3.
 */

export interface DfyUpsellInput {
  firstName: string;
  companyName: string;
  workshopDate: string;
  calendlyUrl: string;
}

export function buildDfyUpsellAfterWorkshop(input: DfyUpsellInput): {
  subject: string;
  html: string;
} {
  const { firstName, companyName, workshopDate, calendlyUrl } = input;
  const greetingName = firstName || 'Hallo';
  const company = companyName || 'Ihrem Unternehmen';

  return {
    subject: `Umsetzung nach dem Workshop bei ${company}`,
    html: `<p>${greetingName},</p>
<p>der Workshop am ${workshopDate} liegt ein paar Tage zurueck. Erfahrungsgemaess gibt es danach eine klare Reihenfolge:</p>
<ol>
<li>Zwei oder drei Prozesse sind als Favoriten rausgekommen</li>
<li>Das Team braucht Zeit und Drehpunkt, um sie selbst zu bauen</li>
<li>Bei einem davon ist Geschwindigkeit wichtig, der Rest kann folgen</li>
</ol>
<p>Wenn Sie bei dem einen dringenden Workflow nicht warten wollen: wir setzen ihn als Done-for-you-Projekt um. Festpreis, klarer Liefertermin, Rollout mit Ihrem Team. Das ist der direkte Anschluss an das, was wir im Workshop besprochen haben.</p>
<p>10 Minuten zum Abstimmen, welcher Workflow zuerst: <a href="${calendlyUrl}">${calendlyUrl}</a></p>
<p>Herzliche Gruesse,<br>Anjuli Hertle<br>PraxisNova AI</p>`
  };
}
