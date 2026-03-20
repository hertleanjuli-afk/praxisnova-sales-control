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

<p>die meisten Handwerksbetriebe brauchen <strong>45 Minuten bis 2 Stunden</strong> für ein einziges Angebot, Aufmaß zusammenstellen, Positionen kalkulieren, alles sauber formatieren.</p>

<p>Was wäre, wenn das in <strong>7 Minuten</strong> erledigt wäre, automatisiert, mit Ihren Preisen, Ihrem Layout?</p>

<p>Genau das setzen wir mit Handwerksbetrieben wie {{company_name}} um: KI-gestützte Automatisierung, die aus einer Anfrage ein fertiges Angebot macht.</p>

<p>Wenn Sie sehen möchten, wie das konkret funktioniert, lassen Sie uns 15 Minuten sprechen.</p>

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

<p>Das Ergebnis: <strong>9 Stunden pro Woche eingespart</strong>, Zeit, die jetzt in Aufträge fließt statt in Verwaltung.</p>

<p>Könnte so etwas auch für {{company_name}} funktionieren?</p>

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
    subject: 'Was Handwerksbetriebe in unserem Workshop konkret umsetzen',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>unser <strong>Workshop Starter</strong> ist speziell für Handwerksbetriebe wie {{company_name}} konzipiert, 4 Stunden, bis zu 12 Personen, <strong>€4.900 Festpreis</strong>.</p>

<p>Was Ihr Team danach kann:</p>

<ul>
  <li>Angebote in Minuten statt Stunden erstellen lassen</li>
  <li>Kundenanfragen automatisch erfassen und priorisieren</li>
  <li>Terminplanung ohne Telefon-Pingpong organisieren</li>
  <li>Nachfass-Prozesse für offene Angebote automatisieren</li>
</ul>

<p>Laut einer Capmo-Studie verbringen Handwerker im Schnitt <strong>8,3 Stunden pro Woche</strong> mit Verwaltung. Unser Workshop zeigt, wie Sie diese Zeit drastisch reduzieren.</p>

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
    subject: 'Letzte Nachricht, zwei Wege für {{company_name}}',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>ich möchte Ihre Zeit respektieren, das ist meine letzte E-Mail zu diesem Thema.</p>

<p>Falls Automatisierung für {{company_name}} grundsätzlich interessant ist, hier zwei konkrete Wege:</p>

<p><strong>Weg 1: Workshop Starter (€4.900)</strong><br>
4 Stunden, bis zu 12 Personen. Ihr Team lernt, welche Prozesse sich automatisieren lassen und wie man startet. Ergebnis: ein klarer Fahrplan.</p>

<p><strong>Weg 2: Automatisierungsprojekt (€1.800 Setup + €500/Monat)</strong><br>
Wir setzen gemeinsam eine konkrete Automatisierung um, z.&nbsp;B. Angebotserstellung, Terminbuchung oder Nachfass-Prozesse. Innerhalb von 4 Wochen live.</p>

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

Nachricht: "Hallo {{first_name}}, ich beschäftige mich mit KI-Automatisierung für Handwerksbetriebe und bin auf {{company_name}} aufmerksam geworden. Würde mich freuen, uns zu vernetzen, vielleicht ergibt sich ein spannender Austausch."

Hinweis: Diese Nachricht wird NICHT automatisch versendet. Bitte manuell über LinkedIn versenden.`,
  },
];
