export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

export const bauunternehmenSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Wie viel Zeit kostet Ihr Wochenbericht?',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>Bauleiter verbringen im Schnitt <strong>1,5 bis 3 Stunden pro Woche</strong> mit Wochenberichten, Fotos zuordnen, Texte formulieren, alles ins richtige Format bringen.</p>
  <p>Was w&auml;re, wenn der Bericht sich <strong>automatisch aus Ihren Baudaten zusammenstellt</strong>, Fotos, Fortschritt, Wetter, Gewerke, und Sie nur noch freigeben m&uuml;ssen?</p>
  <p>Genau das setzen wir mit Bauunternehmen wie {{company_name}} um. Keine Spielerei, sondern handfeste Zeitersparnis.</p>
  <p>Wenn Sie sehen m&ouml;chten, wie das konkret funktioniert, lassen Sie uns sprechen.</p>
  <p>Herzliche Gr&uuml;&szlig;e,<br>
  Samantha Meyer<br>
  Head of Process Automation | PraxisNova AI<br>
  <a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
  <a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>
  <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 13px; color: #666;"><strong>P.S.:</strong> Die Erstberatung ist 100% kostenlos und unverbindlich. Kein Vertrag, keine Verpflichtung. Wenn wir keinen konkreten Mehrwert f&uuml;r {{company_name}} sehen, sagen wir Ihnen das ehrlich.</p>
  {{FOOTER}}
</body>
</html>`,
  },
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: 'Was ein Bauunternehmen in Bayern automatisiert hat',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>ein Bauunternehmen in Bayern (18 Mitarbeiter) hat mit uns in 4 Wochen folgende Prozesse automatisiert:</p>
  <ul>
    <li><strong>Wochenberichte:</strong> Automatische Zusammenstellung aus Baudokumentation, Fotos, Gewerke, Fortschritt. Freigabe per Klick.</li>
    <li><strong>M&auml;ngeldokumentation:</strong> Fotos per App, KI erkennt Gewerk und Kategorie, erstellt automatisch den Mangelbericht.</li>
    <li><strong>Baustellenprotokoll:</strong> T&auml;gliche Eintr&auml;ge werden automatisch zusammengefasst und archiviert.</li>
  </ul>
  <p>Das Ergebnis: <strong>8 Stunden pro Woche pro Bauleiter eingespart</strong>, bei 3 Bauleitern sind das 24 Stunden pro Woche, die jetzt auf der Baustelle verbracht werden statt am Schreibtisch.</p>
  <p>Anders gefragt: Was kostet es {{company_name}}, wenn jeder Bauleiter weiterhin <strong>8 Stunden pro Woche</strong> mit Verwaltung verbringt? Das sind 384 Stunden pro Bauleiter im Jahr. Bei 3 Bauleitern &uuml;ber <strong>1.100 Stunden j&auml;hrlich</strong>, fast 28 Arbeitswochen verloren.</p>
  <p>W&auml;re so etwas auch f&uuml;r {{company_name}} relevant?</p>
  <p>Herzliche Gr&uuml;&szlig;e,<br>
  Samantha Meyer<br>
  Head of Process Automation | PraxisNova AI<br>
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
    subject: 'Was Bauunternehmen in unserem Workshop konkret umsetzen',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>unser <strong>Workshop Starter</strong> ist speziell f&uuml;r Bauunternehmen wie {{company_name}} konzipiert, 4 Stunden, bis zu 12 Personen, <strong>&euro;4.900 Festpreis</strong>.</p>
  <p>Was Ihr Team danach kann:</p>
  <ul>
    <li>Wochenberichte automatisch aus vorhandenen Daten generieren lassen</li>
    <li>M&auml;ngel- und Baudokumentation per App erfassen und automatisch aufbereiten</li>
    <li>Subunternehmer-Kommunikation und Terminkoordination automatisieren</li>
    <li>Angebots- und Nachtragsmanagement beschleunigen</li>
  </ul>
  <p><em>Hinweis: Aktuell haben wir noch <strong>3 Workshop-Pl&auml;tze</strong> in diesem Quartal frei. Bei Interesse reserviere ich Ihnen gerne einen Platz.</em></p>
  <p>Laut KfW-Mittelstandspanel verbringen Bau-KMU 8,1% ihrer Arbeitszeit mit B&uuml;rokratie, rund 8 Stunden pro Woche pro Mitarbeiter. Unser Workshop zeigt Ihnen, wo Sie in {{company_name}} am schnellsten ansetzen k&ouml;nnen.</p>
  <p>Herzliche Gr&uuml;&szlig;e,<br>
  Samantha Meyer<br>
  Head of Process Automation | PraxisNova AI<br>
  <a href="https://www.praxisnovaai.com">www.praxisnovaai.com</a><br>
  <a href="https://calendly.com/meyer-samantha-praxisnovaai/erstgesprach">Termin buchen</a></p>
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
    <li>Wochenberichte und Baudokumentation?</li>
    <li>M&auml;ngelmanagement und Nachtr&auml;ge?</li>
    <li>Koordination mit Subunternehmern?</li>
  </ul>
  <p>Je nachdem, wo der gr&ouml;&szlig;te Hebel liegt, kann ich Ihnen eine konkrete Empfehlung geben, kein Verkaufsgespr&auml;ch, nur ein ehrlicher Blick auf die M&ouml;glichkeiten.</p>
  <p>Einfach kurz antworten, ein Wort reicht.</p>
  <p>Herzliche Gr&uuml;&szlig;e,<br>
  Samantha Meyer<br>
  Head of Process Automation | PraxisNova AI<br>
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
    subject: 'Letzte Nachricht, zwei Optionen für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
  <p>{{SALUTATION}}</p>
  <p>ich m&ouml;chte Ihre Zeit respektieren, das ist meine letzte E-Mail zu diesem Thema.</p>
  <p>Falls Automatisierung f&uuml;r {{company_name}} grunds&auml;tzlich interessant ist, hier zwei konkrete Optionen:</p>
  <p><strong>Option 1: Workshop Starter (&euro;4.900)</strong><br>
  4 Stunden, bis zu 12 Personen. Ihr Team lernt, welche Prozesse sich automatisieren lassen und wie man startet. Ergebnis: ein klarer Fahrplan.</p>
  <p><strong>Option 2: Automatisierungsprojekt (&euro;1.800 Setup + &euro;500/Monat)</strong><br>
  Wir setzen gemeinsam eine konkrete Automatisierung um, z.&nbsp;B. Wochenberichte, M&auml;ngeldokumentation oder Subunternehmer-Koordination. Innerhalb von 4 Wochen live.</p>
  <p style="background-color: #f8f8f8; padding: 15px; border-left: 3px solid #E8472A;"><strong>Kurze Rechnung:</strong> Wenn {{company_name}} durch Automatisierung nur 8 Stunden pro Woche einspart (KfW-Durchschnitt f&uuml;r Bau-KMU), und der Stundensatz bei 60&euro; liegt, sind das <strong>&uuml;ber 25.000&euro; j&auml;hrliche Ersparnis</strong>. Bei einem Workshop-Invest von 4.900&euro; amortisiert sich das in weniger als 3 Monaten.</p>
  <p>Ansonsten w&uuml;nsche ich Ihnen alles Gute!</p>
  <p>Herzliche Gr&uuml;&szlig;e,<br>
  Samantha Meyer<br>
  Head of Process Automation | PraxisNova AI<br>
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
    bodyTemplate: `LinkedIn-Aufgabe (manuell): Verbindungsanfrage an {{first_name}} von {{company_name}} senden. Nachricht: "Hallo {{first_name}}, ich besch&auml;ftige mich mit KI-Automatisierung f&uuml;r Bauunternehmen und bin auf {{company_name}} aufmerksam geworden. W&uuml;rde mich freuen, uns zu vernetzen, vielleicht ergibt sich ein spannender Austausch." Hinweis: Diese Nachricht wird NICHT automatisch versendet. Bitte manuell &uuml;ber LinkedIn versenden.`,
  },
];
