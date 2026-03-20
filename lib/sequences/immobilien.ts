export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

export const immobilienSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Wie lange dauert bei Ihnen eine Exposé-Anfrage?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>die meisten Immobilienbüros brauchen <strong>2 bis 4 Stunden</strong>, um auf eine Exposé-Anfrage zu reagieren. Manche sogar einen ganzen Tag.</p>

<p>Was wäre, wenn Ihre Interessenten in <strong>unter 3 Minuten</strong> automatisch das passende Exposé erhalten, ohne dass jemand in Ihrem Team einen Finger rühren muss?</p>

<p>Genau das zeigen wir in unserem <strong>Workshop für Immobilienprofis</strong>: Wie Sie Exposé-Versand, Besichtigungsbuchungen und Mieterkommunikation so automatisieren, dass Ihr Team sich auf Abschlüsse konzentrieren kann.</p>

<p>Wenn das für {{company_name}} interessant klingt, lassen Sie uns 15 Minuten sprechen.</p>

<p>Herzliche Gr&uuml;&szlig;e,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales | PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: 'Was ein Immobilienbüro in München in 4 Wochen automatisiert hat',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>ein Immobilienbüro in München (11 Mitarbeiter) hat mit uns in nur 4 Wochen drei Dinge automatisiert:</p>

<ul>
  <li><strong>Exposé-Autoantwort in unter 3 Minuten</strong>, Anfrage rein, Exposé raus, ohne manuelles Zutun.</li>
  <li><strong>Selbstbuchung von Besichtigungsterminen</strong>, Interessenten wählen freie Slots direkt im Kalender.</li>
  <li><strong>Automatische Mieter-Erinnerungen</strong>, Vertragsverlängerungen, Nebenkostenabrechnungen, Wartungstermine.</li>
</ul>

<p>Das Ergebnis: <strong>8 Stunden pro Woche eingespart</strong>, Zeit, die jetzt in Akquise und Abschlüsse fließt.</p>

<p>Wäre so etwas auch für {{company_name}} denkbar? Ich zeige Ihnen gern, wie das konkret aussehen kann.</p>

<p>Herzliche Gr&uuml;&szlig;e,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales | PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: 'Unser Workshop, was Immobilienprofis in einem halben Tag lernen',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>unser <strong>Workshop Starter</strong> ist speziell für Teams wie Ihres gedacht, 4 Stunden, bis zu 12 Personen, <strong>€4.900 Festpreis</strong>.</p>

<p>Was Ihr Team danach kann:</p>

<ul>
  <li>Wiederkehrende Anfragen automatisch beantworten lassen</li>
  <li>Besichtigungstermine ohne Telefon-Pingpong koordinieren</li>
  <li>Exposés und Dokumente in Sekunden statt Stunden versenden</li>
  <li>Mieter-Kommunikation strukturiert und zeitsparend abwickeln</li>
</ul>

<p>Laut einer PwC-Studie lassen sich <strong>90 % der administrativen Aufgaben</strong> in der Immobilienbranche automatisieren. Unser Workshop zeigt Ihnen, wo Sie anfangen.</p>

<p>Herzliche Gr&uuml;&szlig;e,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales | PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 4,
    dayOffset: 10,
    channel: 'email',
    subject: 'Kurze Frage für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>eine kurze, ehrliche Frage: Was kostet bei {{company_name}} aktuell am meisten Zeit?</p>

<ul>
  <li>Anfragen beantworten und Exposés verschicken?</li>
  <li>Exposés erstellen und aufbereiten?</li>
  <li>Besichtigungstermine koordinieren?</li>
</ul>

<p>Je nachdem, wo der größte Hebel liegt, kann ich Ihnen eine konkrete Empfehlung geben, kein Verkaufsgespräch, nur ein ehrlicher Blick auf die Möglichkeiten.</p>

<p>Einfach kurz antworten, ein Wort reicht.</p>

<p>Herzliche Gr&uuml;&szlig;e,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales | PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 5,
    dayOffset: 14,
    channel: 'email',
    subject: 'Letzte Nachricht von mir, zwei Optionen für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>ich möchte Ihre Zeit respektieren, das ist meine letzte E-Mail zu diesem Thema.</p>

<p>Falls Automatisierung für {{company_name}} grundsätzlich interessant ist, hier zwei konkrete Optionen:</p>

<p><strong>Option 1: Workshop Starter (€4.900)</strong><br>
4 Stunden, bis zu 12 Personen. Ihr Team lernt, welche Prozesse sich automatisieren lassen und wie man startet. Ergebnis: ein klarer Fahrplan.</p>

<p><strong>Option 2: Automatisierungsprojekt (€1.800 Setup + €500/Monat)</strong><br>
Wir setzen gemeinsam eine konkrete Automatisierung um, z.&nbsp;B. Exposé-Versand, Terminbuchung oder Mieterkommunikation. Innerhalb von 4 Wochen live.</p>

<p>Ansonsten wünsche ich Ihnen alles Gute!</p>

<p>Herzliche Gr&uuml;&szlig;e,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales | PraxisNova AI<br>
<a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 6,
    dayOffset: 17,
    channel: 'linkedin',
    bodyTemplate: `LinkedIn-Aufgabe (manuell): Verbindungsanfrage an {{first_name}} von {{company_name}} senden.

Nachricht: "Hallo {{first_name}}, ich beschäftige mich mit KI-Automatisierung für Immobilienunternehmen und bin auf {{company_name}} aufmerksam geworden. Würde mich freuen, uns zu vernetzen, vielleicht ergibt sich ein spannender Austausch."

Hinweis: Diese Nachricht wird NICHT automatisch versendet. Bitte manuell über LinkedIn versenden.`,
  },
];
