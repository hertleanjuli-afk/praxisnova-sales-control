export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

export const allgemeinSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Wie viel Zeit verliert Ihr Team an wiederkehrende Aufgaben?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>eine kurze Frage: Wie viel Zeit verbringt Ihr Team t&auml;glich mit Aufgaben, die sich immer wiederholen?</p>
  <p>Angebote schreiben, Anfragen beantworten, Berichte erstellen, Termine koordinieren. Laut KfW-Mittelstandspanel verbringen KMU im Schnitt <strong>8 Stunden pro Woche</strong> mit solchen Aufgaben.</p>
  <p>Wir bei <strong>PraxisNova AI</strong> helfen Unternehmen wie {{company_name}}, genau diese Aufgaben zu automatisieren. In einem halbst&auml;gigen Workshop oder als fertige L&ouml;sung.</p>
  <p>Wenn Sie wissen m&ouml;chten, wo bei Ihnen der gr&ouml;&szlig;te Hebel liegt, lassen Sie uns 15 Minuten sprechen.</p>
  {{SIGNATURE}}
  <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 13px; color: #666;"><strong>P.S.:</strong> Die Erstberatung ist 100% kostenlos und unverbindlich. Kein Vertrag, keine Verpflichtung. Wenn wir keinen konkreten Mehrwert f&uuml;r {{company_name}} sehen, sagen wir Ihnen das ehrlich.</p>
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: 'Was unsere Kunden in 4 Wochen automatisiert haben',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>ein kurzes Beispiel aus der Praxis.</p>
  <p>Ein Unternehmen mit 14 Mitarbeitern hat nach unserem Workshop drei Dinge automatisiert:</p>
  <ul>
    <li><strong>Angebotserstellung:</strong> Von 45 Minuten auf 7 Minuten pro Angebot</li>
    <li><strong>Kundenanfragen:</strong> Automatische Erstantwort in unter 3 Minuten, auch au&szlig;erhalb der &Ouml;ffnungszeiten</li>
    <li><strong>Berichte und Dokumentation:</strong> Automatisch aus vorhandenen Daten generiert</li>
  </ul>
  <p>Das Ergebnis: <strong>9 Stunden pro Woche eingespart</strong>, die jetzt in produktive Arbeit flie&szlig;en.</p>
  <p>Anders gefragt: Was kostet es {{company_name}}, wenn diese Stunden <strong>weiterhin</strong> in Verwaltung statt in Auftr&auml;ge flie&szlig;en? Bei 8 Stunden pro Woche und 48 Arbeitswochen sind das <strong>384 Stunden im Jahr</strong>, fast 10 volle Arbeitswochen.</p>
  <p>W&auml;re so etwas auch f&uuml;r {{company_name}} denkbar?</p>
  {{SIGNATURE}}
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: 'Unser Workshop: Was in einem halben Tag möglich ist',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>unser <strong>Workshop Starter</strong> ist f&uuml;r Teams konzipiert, die KI praktisch einsetzen wollen, nicht nur dar&uuml;ber reden.</p>
  <p>In 4 Stunden (bis zu 12 Personen, <strong>&euro;4.900 Festpreis</strong>) lernt Ihr Team:</p>
  <ul>
    <li>Welche 3 Prozesse sich in Ihrem Unternehmen sofort automatisieren lassen</li>
    <li>Wie man KI-gest&uuml;tzte Workflows ohne IT-Kenntnisse einrichtet</li>
    <li>Was andere Unternehmen Ihrer Gr&ouml;&szlig;e damit erreicht haben</li>
  </ul>
  <p>Kein Vortrag, keine Theorie. Sie arbeiten direkt an Ihren eigenen Prozessen.</p>
  <p><em>Hinweis: Aktuell haben wir noch <strong>3 Workshop-Pl&auml;tze</strong> in diesem Quartal frei. Bei Interesse reserviere ich Ihnen gerne einen Platz.</em></p>
  <p>Laut KfW-Mittelstandspanel verlieren KMU durchschnittlich 32 Stunden pro Monat an B&uuml;rokratie. Das ist Ihr Hebel.</p>
  {{SIGNATURE}}
  <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 13px; color: #666;"><strong>P.S.:</strong> Sollte der Workshop nicht die erwarteten Ergebnisse liefern, erstatten wir Ihnen den vollen Betrag. Ohne Wenn und Aber.</p>
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 4,
    dayOffset: 10,
    channel: 'email',
    subject: 'Was kostet bei {{company_name}} am meisten Zeit?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>eine kurze, ehrliche Frage: Was kostet bei {{company_name}} aktuell am meisten Zeit?</p>
  <ul>
    <li>Angebote und Kalkulationen?</li>
    <li>Kundenanfragen und Kommunikation?</li>
    <li>Berichte und Dokumentation?</li>
    <li>Terminplanung und Koordination?</li>
  </ul>
  <p>Je nachdem, wo der gr&ouml;&szlig;te Hebel liegt, kann ich Ihnen eine konkrete Empfehlung geben.</p>
  <p>Einfach kurz antworten, ein Wort reicht.</p>
  {{SIGNATURE}}
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 5,
    dayOffset: 14,
    channel: 'email',
    subject: 'Meine letzte Nachricht, zwei Optionen für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>das ist meine letzte E-Mail zu diesem Thema.</p>
  <p>Falls Automatisierung f&uuml;r {{company_name}} grunds&auml;tzlich interessant ist, hier zwei konkrete Optionen:</p>
  <p><strong>Option 1: Workshop Starter (&euro;4.900)</strong><br>
  4 Stunden mit Ihrem Team. Am Ende wissen Sie genau, welche Prozesse sich automatisieren lassen und wie Sie starten.</p>
  <p><strong>Option 2: Automatisierungsprojekt (&euro;1.800 Setup + &euro;500/Monat)</strong><br>
  Wir &uuml;bernehmen die Einrichtung komplett. Sie m&uuml;ssen nichts lernen, es l&auml;uft einfach.</p>
  <p style="background-color: #f8f8f8; padding: 15px; border-left: 3px solid #E8472A;"><strong>Kurze Rechnung:</strong> Wenn {{company_name}} durch Automatisierung nur 8 Stunden pro Woche einspart (KfW-Durchschnitt f&uuml;r KMU), und der Stundensatz Ihrer Mitarbeiter bei 60&euro; liegt, sind das <strong>&uuml;ber 25.000&euro; j&auml;hrliche Ersparnis</strong>. Bei einem Workshop-Invest von 4.900&euro; amortisiert sich das in weniger als 3 Monaten.</p>
  <p>Wenn eine der Optionen passt, buchen Sie gern einen Termin &uuml;ber den Link in meiner Signatur.</p>
  <p>Ansonsten w&uuml;nsche ich Ihnen alles Gute!</p>
  {{SIGNATURE}}
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 6,
    dayOffset: 17,
    channel: 'linkedin',
    bodyTemplate: `LinkedIn-Aufgabe (manuell): Verbindungsanfrage an {{first_name}} von {{company_name}} senden. Nachricht: "Hallo {{first_name}}, ich besch&auml;ftige mich mit KI-Automatisierung f&uuml;r mittelst&auml;ndische Unternehmen und bin auf {{company_name}} aufmerksam geworden. W&uuml;rde mich freuen, uns zu vernetzen." Hinweis: Diese Nachricht wird NICHT automatisch versendet. Bitte manuell &uuml;ber LinkedIn versenden.`,
  },
];
