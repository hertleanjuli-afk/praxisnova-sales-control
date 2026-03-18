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
<p>Hallo {{first_name}},</p>

<p>vielen Dank für Ihr Interesse an PraxisNova AI!</p>

<p>Bitte bestätigen Sie Ihre E-Mail-Adresse, damit wir Ihnen relevante Informationen zu KI-Automatisierung zusenden können:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{CONFIRM_LINK}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">E-Mail-Adresse bestätigen</a>
</p>

<p>Dieser Link ist <strong>24 Stunden</strong> gültig. Falls Sie diese Anmeldung nicht angefordert haben, können Sie diese E-Mail einfach ignorieren.</p>

<p>Viele Grüße,<br>
Anjuli Hertle</p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Schön, dass Sie da sind — das machen wir bei PraxisNova AI',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>Hallo {{first_name}},</p>

<p>schön, dass Sie dabei sind! Kurz zu uns:</p>

<p><strong>PraxisNova AI</strong> hilft kleinen und mittelständischen Unternehmen in den Bereichen <strong>Bau, Handwerk und Immobilien</strong>, repetitive Aufgaben mit KI zu automatisieren — damit Ihr Team sich auf das konzentrieren kann, was wirklich zählt.</p>

<p>Konkret bedeutet das:</p>

<ul>
  <li>Angebote, die sich in Minuten statt Stunden erstellen</li>
  <li>Kundenanfragen, die automatisch beantwortet werden</li>
  <li>Berichte und Dokumentation, die sich selbst zusammenstellen</li>
  <li>Termine, die sich ohne Telefon-Pingpong koordinieren</li>
</ul>

<p>In den nächsten E-Mails zeige ich Ihnen konkrete Beispiele, echte Zahlen und wie andere Betriebe gestartet haben.</p>

<p>Wenn Sie direkt sprechen möchten:<br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Kostenloses Erstgespräch buchen</a></p>

<p>Herzliche Grüße,<br>
Anjuli Hertle</p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 2,
    dayOffset: 2,
    channel: 'email',
    subject: 'Unser Workshop: Was in einem halben Tag möglich ist',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>Hallo {{first_name}},</p>

<p>unser beliebtestes Angebot ist der <strong>Workshop Starter</strong> — und das hat einen Grund:</p>

<p>In nur <strong>4 Stunden</strong> lernt Ihr Team (bis zu 12 Personen), welche Prozesse sich in Ihrem Betrieb automatisieren lassen und wie man sofort startet.</p>

<p>Was Sie davon haben:</p>

<ul>
  <li>Ein klarer Überblick, wo KI in Ihrem Alltag den größten Hebel hat</li>
  <li>Konkrete Anwendungsfälle, die Ihr Team direkt umsetzen kann</li>
  <li>Ein Fahrplan mit Prioritäten — was zuerst, was später</li>
  <li>Antworten auf alle Fragen, die Ihr Team zu KI hat</li>
</ul>

<p><strong>Festpreis: €4.900</strong> — keine versteckten Kosten, keine Folgeverpflichtung.</p>

<p>Interesse? Lassen Sie uns kurz sprechen:<br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Termin buchen</a></p>

<p>Viele Grüße,<br>
Anjuli</p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 3,
    dayOffset: 5,
    channel: 'email',
    subject: 'Was KI-Automatisierung konkret bedeutet — mit echten Zahlen',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>Hallo {{first_name}},</p>

<p>KI-Automatisierung klingt abstrakt — deshalb hier konkrete Zahlen aus unseren Projekten:</p>

<p><strong>Immobilienbüro (11 Mitarbeiter):</strong></p>
<ul>
  <li>Exposé-Versand: von 2–4 Stunden auf unter 3 Minuten</li>
  <li>Zeitersparnis: 8 Stunden pro Woche</li>
</ul>

<p><strong>Elektrobetrieb (14 Mitarbeiter):</strong></p>
<ul>
  <li>Angebotserstellung: von 45 Minuten auf 7 Minuten</li>
  <li>Zeitersparnis: 9 Stunden pro Woche</li>
</ul>

<p><strong>Bauunternehmen (18 Mitarbeiter):</strong></p>
<ul>
  <li>Wochenberichte: automatisch aus Baudaten generiert</li>
  <li>Zeitersparnis: 6 Stunden pro Woche pro Bauleiter</li>
</ul>

<p>Die gemeinsame Formel: <strong>Repetitive Aufgabe identifizieren → Automatisierung aufsetzen → Zeit für Wichtigeres gewinnen.</strong></p>

<p>Wenn Sie wissen möchten, wo bei {{company_name}} der größte Hebel liegt:<br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Kostenloses Erstgespräch buchen</a></p>

<p>Viele Grüße,<br>
Anjuli</p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 4,
    dayOffset: 9,
    channel: 'email',
    subject: 'Ein Betrieb wie Ihrer — was sich in 4 Wochen verändert hat',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>Hallo {{first_name}},</p>

<p>ein Malerbetrieb mit 12 Mitarbeitern kam zu uns mit einem typischen Problem: Zu viel Zeit für Verwaltung, zu wenig für die eigentliche Arbeit.</p>

<p><strong>Vorher:</strong></p>
<ul>
  <li>Angebote manuell schreiben — 1 Stunde pro Stück</li>
  <li>Kundentermine per Telefon koordinieren — ständiges Hin und Her</li>
  <li>Rechnungen und Nachfass-Mails von Hand verschicken</li>
</ul>

<p><strong>Nach 4 Wochen mit PraxisNova AI:</strong></p>
<ul>
  <li>Angebote werden automatisch aus Anfragen generiert</li>
  <li>Kunden buchen Termine selbst über ein Online-Tool</li>
  <li>Nachfass-Mails gehen automatisch nach 3 und 7 Tagen raus</li>
</ul>

<p><strong>Ergebnis: 11 Stunden pro Woche eingespart.</strong></p>

<p>Wäre ein ähnliches Ergebnis für {{company_name}} interessant?<br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Lassen Sie uns darüber sprechen</a></p>

<p>Viele Grüße,<br>
Anjuli</p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 5,
    dayOffset: 14,
    channel: 'email',
    subject: 'Die häufigsten Fragen — ehrlich beantwortet',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>Hallo {{first_name}},</p>

<p>bevor jemand mit uns arbeitet, kommen immer die gleichen Fragen. Hier die ehrlichen Antworten:</p>

<p><strong>"Brauchen wir IT-Kenntnisse?"</strong><br>
Nein. Unsere Lösungen sind so gebaut, dass Ihr Team sie ohne technisches Vorwissen bedienen kann. Im Workshop zeigen wir alles Schritt für Schritt.</p>

<p><strong>"Was, wenn es bei uns nicht funktioniert?"</strong><br>
Dann bleiben wir dran, bis es funktioniert. Wir begleiten die Umsetzung und lassen Sie nicht mit einer halbfertigen Lösung stehen.</p>

<p><strong>"Lohnt sich das für uns?"</strong><br>
Wenn Ihr Team mehr als 5 Stunden pro Woche mit repetitiven Aufgaben verbringt — ja, sehr wahrscheinlich. In einem kurzen Gespräch können wir das gemeinsam einschätzen.</p>

<p><strong>"Was kostet das?"</strong></p>
<ul>
  <li><strong>Workshop Starter:</strong> €4.900 (Festpreis, 4 Stunden, bis zu 12 Personen)</li>
  <li><strong>Automatisierungsprojekt:</strong> €1.800 einmalig + €500/Monat</li>
</ul>

<p>Noch Fragen? Einfach antworten oder direkt einen Termin buchen:<br>
<a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Kostenloses Erstgespräch buchen</a></p>

<p>Viele Grüße,<br>
Anjuli</p>

{{FOOTER}}
</body>
</html>`,
  },
  {
    step: 6,
    dayOffset: 21,
    channel: 'email',
    subject: 'Letzte Nachricht von mir — und ein ehrliches Angebot',
    bodyTemplate: `<html>
<body style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
<p>Hallo {{first_name}},</p>

<p>das ist meine letzte E-Mail — versprochen.</p>

<p>Ich weiß, dass nicht jeder Zeitpunkt der richtige ist. Und nicht jede Lösung passt zu jedem Betrieb.</p>

<p>Falls KI-Automatisierung für {{company_name}} grundsätzlich interessant ist, mache ich Ihnen ein einfaches Angebot:</p>

<p><strong>15 Minuten, kostenlos, ohne Druck.</strong></p>

<p>Wir schauen gemeinsam, ob es bei Ihnen einen Hebel gibt — und wenn ja, wie groß er ist. Wenn nicht, sagen wir das ehrlich.</p>

<p><a href="https://calendly.com/meyer-samantha-praxisnovaai/30min">Termin buchen</a></p>

<p>Ich wünsche Ihnen auf jeden Fall alles Gute — ob mit oder ohne uns.</p>

<p>Herzliche Grüße,<br>
Anjuli Hertle</p>

{{FOOTER}}
</body>
</html>`,
  },
];
