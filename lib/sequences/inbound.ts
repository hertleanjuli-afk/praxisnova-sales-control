export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

export const inboundSequence: SequenceStep[] = [
  {
    step: 0,
    dayOffset: 0,
    channel: 'email',
    subject: 'Bitte bestätigen Sie Ihre E-Mail-Adresse',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>vielen Dank für Ihr Interesse an PraxisNova AI!</p>

<p>Bitte bestätigen Sie Ihre E-Mail-Adresse, damit wir Ihnen relevante Informationen zu KI-Automatisierung zusenden können:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{CONFIRM_LINK}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">E-Mail-Adresse bestätigen</a>
</p>

<p>Dieser Link ist <strong>24 Stunden</strong> gültig. Falls Sie diese Anmeldung nicht angefordert haben, können Sie diese E-Mail einfach ignorieren.</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Willkommen bei PraxisNova AI',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>schön, dass Sie dabei sind! Kurz zu uns:</p>

<p>Wir bei <strong>PraxisNova AI</strong> schulen Mitarbeitende im professionellen Umgang mit KI (in praxisnahen Workshops) und bauen automatisierte Workflows direkt in Ihre bestehenden Systeme ein, damit Sie Zeit sparen, ohne alles umstellen zu müssen.</p>

<p>Falls Sie sich fragen, wie das konkret für Ihr Unternehmen aussehen könnte, buchen Sie gern ein kurzes Kennenlerngespräch über den Link in meiner Signatur.</p>

<p>Ich freue mich auf den Austausch!</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: 'Kurze Nachfrage',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>ich wollte mich kurz melden und fragen, ob Sie Fragen zu unseren Workshops oder Automatisierungslösungen haben.</p>

<p>Sie können mir gerne direkt auf diese E-Mail antworten oder über den Link in meiner Signatur einen kurzen Gesprächstermin buchen.</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
];
