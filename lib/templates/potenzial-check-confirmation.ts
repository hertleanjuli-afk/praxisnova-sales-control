/**
 * Transactional Template: Bestaetigung nach Potenzial-Check-Buchung
 * Getriggert sofort nach Calendly-Webhook fuer einen Potenzial-Check-Termin.
 * Ein-Shot, Double-Opt-In-aehnlich (Termin bestaetigt).
 *
 * [ANGIE-REVIEW-NOTWENDIG] Platzhalter-Template vom 2026-04-21, ICP-Switch Track 3.
 */

export interface PotenzialCheckConfirmationInput {
  firstName: string;
  companyName: string;
  meetingTime: string;
  meetingLink: string;
  icp?: string;
}

export function buildPotenzialCheckConfirmation(
  input: PotenzialCheckConfirmationInput
): { subject: string; html: string } {
  const { firstName, companyName, meetingTime, meetingLink, icp } = input;
  const greetingName = firstName || 'Hallo';
  const company = companyName || 'Ihrem Unternehmen';

  const icpNote = icpPrepNote(icp);

  return {
    subject: `Bestaetigung: Potenzial-Check ${meetingTime}`,
    html: `<p>${greetingName},</p>
<p>danke fuer die Buchung. Ihr Potenzial-Check-Termin steht fest:</p>
<ul>
<li><strong>Zeit:</strong> ${meetingTime}</li>
<li><strong>Dauer:</strong> 90 Minuten, per Video-Call</li>
<li><strong>Link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>
</ul>
<p>Damit der Call fuer ${company} konkret wird, waere eines hilfreich vorher:</p>
<ul>
<li>Ein bis zwei Prozesse, die aktuell am meisten Zeit kosten</li>
<li>Optional: ein typisches Dokument oder ein typischer Mailverlauf fuer genau diesen Prozess</li>
</ul>
${icpNote}
<p>Wir zeigen im Call, welche KI-Hebel konkret fuer Sie Sinn ergeben. Dabei geben wir auch eine Orientierung zu passenden Foerderprogrammen, damit Sie mit Zahlen weiterarbeiten koennen.</p>
<p>Bis dahin, herzliche Gruesse,<br>Anjuli Hertle<br>PraxisNova AI</p>`
  };
}

function icpPrepNote(icp?: string): string {
  switch (icp) {
    case 'icp-kanzlei':
      return `<p>Da Sie als Kanzlei mit sensiblen Mandantendaten arbeiten: die genannten Beispiele werden vorher anonymisiert. Das besprechen wir ebenfalls im Call.</p>`;
    case 'icp-proptech':
    case 'icp-hausverwaltung':
      return `<p>Wenn Sie ein Beispiel aus Mieterkommunikation oder Abrechnung haben, nehmen wir das gern konkret durch.</p>`;
    case 'icp-agentur':
      return `<p>Wenn Sie aktuell einen Kunden-Workflow im Kopf haben, den Sie White-Label anbieten wollen, ist das ein idealer Startpunkt fuer den Call.</p>`;
    default:
      return '';
  }
}
