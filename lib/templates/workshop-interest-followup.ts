/**
 * Transactional Template: Workshop-Interest-Followup
 * Getriggert wenn Lead auf eine Workshop-Sequenz positiv reagiert, aber
 * noch keinen Termin gebucht hat. Ein-Shot, nicht Teil einer Sequenz.
 *
 * [ANGIE-REVIEW-NOTWENDIG] Platzhalter-Template vom 2026-04-21, ICP-Switch Track 3.
 */

export interface WorkshopFollowupInput {
  firstName: string;
  companyName: string;
  calendlyUrl: string;
}

export function buildWorkshopInterestFollowup(input: WorkshopFollowupInput): {
  subject: string;
  html: string;
} {
  const { firstName, companyName, calendlyUrl } = input;
  const greetingName = firstName || 'Hallo';
  const company = companyName || 'Ihrem Unternehmen';

  return {
    subject: `Kurzer Folge-Termin zum KI-Workshop, ${company}?`,
    html: `<p>${greetingName},</p>
<p>Sie hatten Interesse am KI-Workshop signalisiert. Damit der naechste Schritt konkret wird, schlage ich einen 15-Minuten-Termin vor. Inhalt:</p>
<ul>
<li>Drei konkrete Prozesse aus Ihrem Alltag kurz anreissen</li>
<li>Passender Workshop-Rahmen, halber oder ganzer Tag, Inhouse oder remote</li>
<li>Foerder-Orientierung, wir pruefen gemeinsam welche Programme fuer ${company} in Frage kommen</li>
</ul>
<p>Termin buchen: <a href="${calendlyUrl}">${calendlyUrl}</a></p>
<p>Alternativ antworten Sie einfach mit zwei bis drei Zeitfenstern, die passen.</p>
<p>Herzliche Gruesse,<br>Anjuli Hertle<br>PraxisNova AI</p>`
  };
}
