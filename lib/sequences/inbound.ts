export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

const SIGNATURE = `<p>Herzliche Gr&uuml;&szlig;e,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>`;

export const inboundSequence: SequenceStep[] = [
  // Step 0: Double Opt-in Bestätigung
  {
    step: 0,
    dayOffset: 0,
    channel: 'email',
    subject: 'Bitte bestätigen Sie Ihre E-Mail-Adresse',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>vielen Dank f&uuml;r Ihr Interesse an PraxisNova AI!</p>

<p>Bitte best&auml;tigen Sie Ihre E-Mail-Adresse, damit wir Ihnen relevante Informationen zu KI-Automatisierung zusenden k&ouml;nnen:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{CONFIRM_LINK}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">E-Mail-Adresse best&auml;tigen</a>
</p>

<p>Dieser Link ist <strong>24 Stunden</strong> g&uuml;ltig. Falls Sie diese Anmeldung nicht angefordert haben, k&ouml;nnen Sie diese E-Mail einfach ignorieren.</p>

${SIGNATURE}

{{FOOTER}}
</body>
</html>`,
  },

  // Step 1: Willkommen + Vorstellung (Tag 0 nach Bestätigung)
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Ihre Anfrage bei PraxisNova AI',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>vielen Dank f&uuml;r Ihr Interesse an PraxisNova AI.</p>

<p>Wir schulen Mitarbeitende im professionellen Umgang mit KI und bauen automatisierte Workflows direkt in Ihre bestehenden Systeme ein, damit Sie Zeit sparen, ohne alles umstellen zu m&uuml;ssen.</p>

<p>Um Ihnen konkret zeigen zu k&ouml;nnen, was f&uuml;r Ihr Unternehmen m&ouml;glich ist, w&uuml;rde ich mich &uuml;ber ein kurzes unverbindliches Beratungsgespr&auml;ch freuen. Bitte buchen Sie gern direkt &uuml;ber den Link in meiner Signatur einen Termin.</p>

<p>Falls Sie vorab Fragen haben, lassen Sie diese mir gerne per E-Mail zukommen. Zus&auml;tzliche Informationen helfen mir, mich optimal auf unser Gespr&auml;ch vorzubereiten.</p>

<p>Ich freue mich auf den Austausch!</p>

${SIGNATURE}

{{FOOTER}}
</body>
</html>`,
  },

  // Step 2: Pain + Statistik (Tag 3)
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: 'Wie viel Zeit verliert Ihr Team täglich an wiederkehrende Aufgaben?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>eine kurze Frage: Wie viel Zeit verbringt Ihr Team t&auml;glich mit Aufgaben, die sich immer wiederholen, Angebote schreiben, Anfragen beantworten, Berichte erstellen?</p>

<p>Studien zeigen, dass Mitarbeitende in Bau, Handwerk und Immobilien durchschnittlich <strong>8,3 Stunden pro Woche</strong> mit solchen Aufgaben verbringen. Das sind &uuml;ber 400 Stunden pro Jahr, die Ihrem Unternehmen verloren gehen.</p>

<p>Genau hier setzen wir an. In einem kurzen Gespr&auml;ch zeigen wir Ihnen, welche drei Prozesse sich in Ihrem Betrieb sofort automatisieren lassen.</p>

<p>Buchen Sie gern einen Termin &uuml;ber den Link in meiner Signatur.</p>

${SIGNATURE}

{{FOOTER}}
</body>
</html>`,
  },

  // Step 3: Agitate + Wettbewerbsvorteil (Tag 7)
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: 'Was passiert, wenn Ihre Mitbewerber früher auf KI setzen?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>90% der Betriebe in Ihrer Branche nutzen KI noch nicht (PwC 2025). Das ist Ihr Vorteil, aber nur solange Sie fr&uuml;her handeln als Ihre Mitbewerber.</p>

<p>Unternehmen die bereits mit uns gearbeitet haben, gewinnen durchschnittlich <strong>8 bis 9 Stunden pro Woche</strong> zur&uuml;ck. Nicht durch gro&szlig;e Umstrukturierungen, sondern durch kleine, gezielte Automatisierungen in bestehenden Abl&auml;ufen.</p>

<p>Wir w&uuml;rden Ihnen gern in 15 Minuten zeigen, was konkret f&uuml;r Ihr Unternehmen m&ouml;glich ist. Kein Aufwand, keine Verpflichtung.</p>

<p>Termin buchen &uuml;ber den Link in meiner Signatur.</p>

${SIGNATURE}

{{FOOTER}}
</body>
</html>`,
  },

  // Step 4: Solve + Fallstudie (Tag 12)
  {
    step: 4,
    dayOffset: 12,
    channel: 'email',
    subject: 'Was ein Betrieb wie Ihrer in 4 Wochen erreicht hat',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>ein Beispiel aus der Praxis: Ein Handwerksbetrieb aus S&uuml;ddeutschland, 12 Mitarbeiter, hat uns kontaktiert weil sein Team t&auml;glich 2 bis 3 Stunden mit Angeboten und Kundennachrichten verbracht hat.</p>

<p>Nach unserem Workshop:</p>
<ul>
  <li>Angebote werden in 8 Minuten automatisch erstellt statt in 45 Minuten</li>
  <li>Kundenanfragen werden automatisch beantwortet, auch au&szlig;erhalb der &Ouml;ffnungszeiten</li>
  <li>Ergebnis nach 4 Wochen: <strong>11 Stunden pro Woche zur&uuml;ckgewonnen</strong></li>
</ul>

<p>Das ist kein Einzelfall. Das ist das was wir regelm&auml;&szlig;ig f&uuml;r unsere Kunden einrichten.</p>

<p>Darf ich Ihnen in einem kurzen Gespr&auml;ch zeigen, was f&uuml;r {{company_name}} m&ouml;glich w&auml;re?</p>

<p>Termin buchen &uuml;ber den Link in meiner Signatur.</p>

${SIGNATURE}

{{FOOTER}}
</body>
</html>`,
  },

  // Step 5: Letzte E-Mail (Tag 18)
  {
    step: 5,
    dayOffset: 18,
    channel: 'email',
    subject: 'Meine letzte Nachricht an Sie',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>das ist meine letzte E-Mail an Sie, ich verspreche es.</p>

<p>Ich schreibe Ihnen weil ich wei&szlig;, dass der Alltag im Betrieb wenig Zeit l&auml;sst, sich mit neuen Themen zu besch&auml;ftigen. Das verstehe ich.</p>

<p>Falls KI-Automatisierung f&uuml;r {{company_name}} irgendwann ein Thema wird, wissen Sie wo Sie uns finden: <a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a></p>

<p>Wenn Sie doch noch kurz sprechen m&ouml;chten, buchen Sie gern einen Termin &uuml;ber den Link in meiner Signatur.</p>

<p>Ich w&uuml;nsche Ihnen weiterhin viel Erfolg.</p>

${SIGNATURE}

{{FOOTER}}
</body>
</html>`,
  },
];
