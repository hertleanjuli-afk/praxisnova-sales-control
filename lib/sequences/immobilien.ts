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
  <p>die meisten Immobilienb&uuml;ros brauchen <strong>2 bis 4 Stunden</strong>, um auf eine Expos&eacute;-Anfrage zu reagieren. Manche sogar einen ganzen Tag.</p>
  <p>Was w&auml;re, wenn Ihre Interessenten in <strong>unter 3 Minuten</strong> automatisch das passende Expos&eacute; erhalten, ohne dass jemand in Ihrem Team einen Finger r&uuml;hren muss?</p>
  <p>Genau das zeigen wir in unserem <strong>Workshop f&uuml;r Immobilienprofis</strong>: Wie Sie Expos&eacute;-Versand, Besichtigungsbuchungen und Mieterkommunikation so automatisieren, dass Ihr Team sich auf Abschl&uuml;sse konzentrieren kann.</p>
  <p>Wenn das f&uuml;r {{company_name}} interessant klingt, lassen Sie uns 15 Minuten sprechen.</p>
  <p>Herzliche Gr&uuml;&szlig;e,<br>
  Anjuli Hertle<br>
  CEO &amp; Head of Sales | PraxisNova AI<br>
  <a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
  <a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>
  <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 13px; color: #666;"><strong>P.S.:</strong> Die Erstberatung ist 100% kostenlos und unverbindlich. Kein Vertrag, keine Verpflichtung. Wenn wir keinen konkreten Mehrwert f&uuml;r {{company_name}} sehen, sagen wir Ihnen das ehrlich.</p>
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 2,
    dayOffset: 4,
    channel: 'email',
    subject: 'Was ein Immobilienbüro in München in 4 Wochen automatisiert hat',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>ein Immobilienb&uuml;ro in M&uuml;nchen (11 Mitarbeiter) hat mit uns in nur 4 Wochen drei Dinge automatisiert:</p>
  <ul>
    <li><strong>Expos&eacute;-Autoantwort in unter 3 Minuten</strong>, Anfrage rein, Expos&eacute; raus, ohne manuelles Zutun.</li>
    <li><strong>Selbstbuchung von Besichtigungsterminen</strong>, Interessenten w&auml;hlen freie Slots direkt im Kalender.</li>
    <li><strong>Automatische Mieter-Erinnerungen</strong>, Vertragsverlängerungen, Nebenkostenabrechnungen, Wartungstermine.</li>
  </ul>
  <p>Das Ergebnis: <strong>8 Stunden pro Woche eingespart</strong>, Zeit, die jetzt in Akquise und Abschl&uuml;sse flie&szlig;t.</p>
  <p>Anders gefragt: Was kostet es {{company_name}}, wenn diese Stunden <strong>weiterhin</strong> in Verwaltung statt in Abschl&uuml;sse flie&szlig;en? Bei 8 Stunden pro Woche und 48 Arbeitswochen sind das <strong>384 Stunden im Jahr</strong>, fast 10 volle Arbeitswochen.</p>
  <p>W&auml;re so etwas auch f&uuml;r {{company_name}} denkbar? Ich zeige Ihnen gern, wie das konkret aussehen kann.</p>
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
    dayOffset: 9,
    channel: 'email',
    subject: 'Unser Workshop, was Immobilienprofis in einem halben Tag lernen',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>unser <strong>Workshop Starter</strong> ist speziell f&uuml;r Teams wie Ihres gedacht, 4 Stunden, bis zu 12 Personen, <strong>&euro;4.900 Festpreis</strong>.</p>
  <p>Was Ihr Team danach kann:</p>
  <ul>
    <li>Wiederkehrende Anfragen automatisch beantworten lassen</li>
    <li>Besichtigungstermine ohne Telefon-Pingpong koordinieren</li>
    <li>Expos&eacute;s und Dokumente in Sekunden statt Stunden versenden</li>
    <li>Mieter-Kommunikation strukturiert und zeitsparend abwickeln</li>
  </ul>
  <p><em>Hinweis: Aktuell haben wir noch <strong>3 Workshop-Pl&auml;tze</strong> in diesem Quartal frei. Bei Interesse reserviere ich Ihnen gerne einen Platz.</em></p>
  <p>Laut KfW-Mittelstandspanel verbringen KMU durchschnittlich 32 Stunden pro Monat mit B&uuml;rokratie. Unser Workshop zeigt Ihnen, wo Sie bei {{company_name}} am schnellsten Zeit zur&uuml;ckgewinnen.</p>
  <p>Herzliche Gr&uuml;&szlig;e,<br>
  Anjuli Hertle<br>
  CEO &amp; Head of Sales | PraxisNova AI<br>
  <a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
  <a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>
  <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 13px; color: #666;"><strong>P.S.:</strong> Sollte der Workshop nicht die erwarteten Ergebnisse liefern, erstatten wir Ihnen den vollen Betrag. Ohne Wenn und Aber.</p>
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: 'Kurze Frage für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>eine kurze, ehrliche Frage: Was kostet bei {{company_name}} aktuell am meisten Zeit?</p>
  <ul>
    <li>Anfragen beantworten und Expos&eacute;s verschicken?</li>
    <li>Expos&eacute;s erstellen und aufbereiten?</li>
    <li>Besichtigungstermine koordinieren?</li>
  </ul>
  <p>Je nachdem, wo der gr&ouml;&szlig;te Hebel liegt, kann ich Ihnen eine konkrete Empfehlung geben, kein Verkaufsgespr&auml;ch, nur ein ehrlicher Blick auf die M&ouml;glichkeiten.</p>
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
    dayOffset: 20,
    channel: 'email',
    subject: 'Letzte Nachricht von mir, zwei Optionen für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>ich m&ouml;chte Ihre Zeit respektieren, das ist meine letzte E-Mail zu diesem Thema.</p>
  <p>Falls Automatisierung f&uuml;r {{company_name}} grunds&auml;tzlich interessant ist, hier zwei konkrete Optionen:</p>
  <p><strong>Option 1: Workshop Starter (&euro;4.900)</strong><br>
  4 Stunden, bis zu 12 Personen. Ihr Team lernt, welche Prozesse sich automatisieren lassen und wie man startet. Ergebnis: ein klarer Fahrplan.</p>
  <p><strong>Option 2: Automatisierungsprojekt (&euro;1.800 Setup + &euro;500/Monat)</strong><br>
  Wir setzen gemeinsam eine konkrete Automatisierung um, z.&nbsp;B. Expos&eacute;-Versand, Terminbuchung oder Mieterkommunikation. Innerhalb von 4 Wochen live.</p>
  <p style="background-color: #f8f8f8; padding: 15px; border-left: 3px solid #E8472A;"><strong>Kurze Rechnung:</strong> Wenn {{company_name}} durch Automatisierung nur 8 Stunden pro Woche einspart (KfW-Durchschnitt f&uuml;r KMU), und der Stundensatz Ihrer Mitarbeiter bei 60&euro; liegt, sind das <strong>&uuml;ber 25.000&euro; j&auml;hrliche Ersparnis</strong>. Bei einem Workshop-Invest von 4.900&euro; amortisiert sich das in weniger als 3 Monaten.</p>
  <p>Ansonsten w&uuml;nsche ich Ihnen alles Gute!</p>
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
    dayOffset: 26,
    channel: 'linkedin',
    bodyTemplate: `LinkedIn-Aufgabe (manuell): Verbindungsanfrage an {{first_name}} von {{company_name}} senden. Nachricht: "Hallo {{first_name}}, ich besch&auml;ftige mich mit KI-Automatisierung f&uuml;r Immobilienunternehmen und bin auf {{company_name}} aufmerksam geworden. W&uuml;rde mich freuen, uns zu vernetzen, vielleicht ergibt sich ein spannender Austausch." Hinweis: Diese Nachricht wird NICHT automatisch versendet. Bitte manuell &uuml;ber LinkedIn versenden.`,
  },
];
