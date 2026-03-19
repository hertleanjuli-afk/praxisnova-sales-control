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

<p>Was wäre, wenn der Bericht sich <strong>automatisch aus Ihren Baudaten zusammenstellt</strong>, Fotos, Fortschritt, Wetter, Gewerke, und Sie nur noch freigeben müssen?</p>

<p>Genau das setzen wir mit Bauunternehmen wie {{company_name}} um. Keine Spielerei, sondern handfeste Zeitersparnis.</p>

<p>Wenn Sie sehen möchten, wie das konkret funktioniert, lassen Sie uns sprechen.</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
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
    subject: 'Was ein Bauunternehmen in Bayern automatisiert hat',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>{{SALUTATION}}</p>

<p>ein Bauunternehmen in Bayern (18 Mitarbeiter) hat mit uns in 4 Wochen folgende Prozesse automatisiert:</p>

<ul>
  <li><strong>Wochenberichte:</strong> Automatische Zusammenstellung aus Baudokumentation, Fotos, Gewerke, Fortschritt. Freigabe per Klick.</li>
  <li><strong>Mängeldokumentation:</strong> Fotos per App, KI erkennt Gewerk und Kategorie, erstellt automatisch den Mangelbericht.</li>
  <li><strong>Baustellenprotokoll:</strong> Tägliche Einträge werden automatisch zusammengefasst und archiviert.</li>
</ul>

<p>Das Ergebnis: <strong>6 Stunden pro Woche pro Bauleiter eingespart</strong>, bei 3 Bauleitern sind das 18 Stunden pro Woche, die jetzt auf der Baustelle verbracht werden.</p>

<p>Wäre so etwas auch für {{company_name}} relevant?</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
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

<p>unser <strong>Workshop Starter</strong> ist speziell für Bauunternehmen wie {{company_name}} konzipiert, 4 Stunden, bis zu 12 Personen, <strong>€4.900 Festpreis</strong>.</p>

<p>Was Ihr Team danach kann:</p>

<ul>
  <li>Wochenberichte automatisch aus vorhandenen Daten generieren lassen</li>
  <li>Mängel- und Baudokumentation per App erfassen und automatisch aufbereiten</li>
  <li>Subunternehmer-Kommunikation und Terminkoordination automatisieren</li>
  <li>Angebots- und Nachtragsmanagement beschleunigen</li>
</ul>

<p>Laut einer PwC-Studie lassen sich <strong>90 % der administrativen Aufgaben</strong> in der Baubranche automatisieren. Unser Workshop zeigt Ihnen, wo Sie anfangen.</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
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
  <li>Wochenberichte und Baudokumentation?</li>
  <li>Mängelmanagement und Nachträge?</li>
  <li>Koordination mit Subunternehmern?</li>
</ul>

<p>Je nachdem, wo der größte Hebel liegt, kann ich Ihnen eine konkrete Empfehlung geben, kein Verkaufsgespräch, nur ein ehrlicher Blick auf die Möglichkeiten.</p>

<p>Einfach kurz antworten, ein Wort reicht.</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
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

<p>ich möchte Ihre Zeit respektieren, das ist meine letzte E-Mail zu diesem Thema.</p>

<p>Falls Automatisierung für {{company_name}} grundsätzlich interessant ist, hier zwei konkrete Optionen:</p>

<p><strong>Option 1: Workshop Starter (€4.900)</strong><br>
4 Stunden, bis zu 12 Personen. Ihr Team lernt, welche Prozesse sich automatisieren lassen und wie man startet. Ergebnis: ein klarer Fahrplan.</p>

<p><strong>Option 2: Automatisierungsprojekt (€1.800 Setup + €500/Monat)</strong><br>
Wir setzen gemeinsam eine konkrete Automatisierung um, z.&nbsp;B. Wochenberichte, Mängeldokumentation oder Subunternehmer-Koordination. Innerhalb von 4 Wochen live.</p>

<p>Ansonsten wünsche ich Ihnen alles Gute!</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle<br>
CEO &amp; Head of Sales<br>
PraxisNova AI<br>
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

Nachricht: "Hallo {{first_name}}, ich beschäftige mich mit KI-Automatisierung für Bauunternehmen und bin auf {{company_name}} aufmerksam geworden. Würde mich freuen, uns zu vernetzen, vielleicht ergibt sich ein spannender Austausch."

Hinweis: Diese Nachricht wird NICHT automatisch versendet. Bitte manuell über LinkedIn versenden.`,
  },
];
