export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

export const handwerkSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Wie lange brauchen Sie für ein Angebot?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>die meisten Handwerksbetriebe brauchen <strong>45 Minuten bis 2 Stunden</strong> f&uuml;r ein einziges Angebot, Aufma&szlig; zusammenstellen, Positionen kalkulieren, alles sauber formatieren.</p>
  <p>Was w&auml;re, wenn das in <strong>7 Minuten</strong> erledigt w&auml;re, automatisiert, mit Ihren Preisen, Ihrem Layout?</p>
  <p>Genau das setzen wir mit Handwerksbetrieben wie {{company_name}} um: KI-gest&uuml;tzte Automatisierung, die aus einer Anfrage ein fertiges Angebot macht.</p>
  <p>Wenn Sie sehen m&ouml;chten, wie das konkret funktioniert, lassen Sie uns 15 Minuten sprechen.</p>
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
    subject: '45 Minuten auf 7 Minuten: Was ein Elektrobetrieb automatisiert hat',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>ein Elektrobetrieb mit 14 Mitarbeitern hat mit uns folgende Prozesse automatisiert:</p>
  <ul>
    <li><strong>Angebotserstellung:</strong> Von 45 Minuten auf 7 Minuten pro Angebot, automatische Kalkulation aus der Anfrage heraus.</li>
    <li><strong>Terminplanung:</strong> Kunden buchen freie Slots direkt online, kein Hin-und-Her per Telefon mehr.</li>
    <li><strong>Nachfass-E-Mails:</strong> Offene Angebote werden automatisch nach 3 und 7 Tagen nachgefasst.</li>
  </ul>
  <p>Das Ergebnis: <strong>9 Stunden pro Woche eingespart</strong>, Zeit, die jetzt in Auftr&auml;ge flie&szlig;t statt in Verwaltung.</p>
  <p>Anders gefragt: Was kostet es {{company_name}}, wenn diese Stunden <strong>weiterhin</strong> in Verwaltung statt in Auftr&auml;ge flie&szlig;en? Bei 8 Stunden pro Woche und 48 Arbeitswochen sind das <strong>384 Stunden im Jahr</strong>, fast 10 volle Arbeitswochen.</p>
  <p>K&ouml;nnte so etwas auch f&uuml;r {{company_name}} funktionieren?</p>
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
    subject: 'Was Handwerksbetriebe in unserem Workshop konkret umsetzen',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>unser <strong>Workshop Starter</strong> ist speziell f&uuml;r Handwerksbetriebe wie {{company_name}} konzipiert, 4 Stunden, bis zu 12 Personen, <strong>&euro;4.900 Festpreis</strong>.</p>
  <p>Was Ihr Team danach kann:</p>
  <ul>
    <li>Angebote in Minuten statt Stunden erstellen lassen</li>
    <li>Kundenanfragen automatisch erfassen und priorisieren</li>
    <li>Terminplanung ohne Telefon-Pingpong organisieren</li>
    <li>Nachfass-Prozesse f&uuml;r offene Angebote automatisieren</li>
  </ul>
  <p><em>Hinweis: Aktuell haben wir noch <strong>3 Workshop-Pl&auml;tze</strong> in diesem Quartal frei. Bei Interesse reserviere ich Ihnen gerne einen Platz.</em></p>
  <p>Laut einer Capmo-Studie verbringen Handwerker im Schnitt <strong>8,3 Stunden pro Woche</strong> mit Verwaltung. Unser Workshop zeigt, wie Sie diese Zeit drastisch reduzieren.</p>
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
    subject: 'Was kostet bei {{company_name}} am meisten Zeit?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>eine kurze, ehrliche Frage: Was kostet bei {{company_name}} aktuell am meisten Zeit?</p>
  <ul>
    <li>Angebote schreiben und kalkulieren?</li>
    <li>Termine mit Kunden koordinieren?</li>
    <li>Rechnungen und Dokumentation?</li>
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
    subject: 'Letzte Nachricht, zwei Wege für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>ich m&ouml;chte Ihre Zeit respektieren, das ist meine letzte E-Mail zu diesem Thema.</p>
  <p>Falls Automatisierung f&uuml;r {{company_name}} grunds&auml;tzlich interessant ist, hier zwei konkrete Wege:</p>
  <p><strong>Weg 1: Workshop Starter (&euro;4.900)</strong><br>
  4 Stunden, bis zu 12 Personen. Ihr Team lernt, welche Prozesse sich automatisieren lassen und wie man startet. Ergebnis: ein klarer Fahrplan.</p>
  <p><strong>Weg 2: Automatisierungsprojekt (&euro;1.800 Setup + &euro;500/Monat)</strong><br>
  Wir setzen gemeinsam eine konkrete Automatisierung um, z.&nbsp;B. Angebotserstellung, Terminbuchung oder Nachfass-Prozesse. Innerhalb von 4 Wochen live.</p>
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
    bodyTemplate: `LinkedIn-Aufgabe (manuell): Verbindungsanfrage an {{first_name}} von {{company_name}} senden. Nachricht: "Hallo {{first_name}}, ich besch&auml;ftige mich mit KI-Automatisierung f&uuml;r Handwerksbetriebe und bin auf {{company_name}} aufmerksam geworden. W&uuml;rde mich freuen, uns zu vernetzen, vielleicht ergibt sich ein spannender Austausch." Hinweis: Diese Nachricht wird NICHT automatisch versendet. Bitte manuell &uuml;ber LinkedIn versenden.`,
  },
];
