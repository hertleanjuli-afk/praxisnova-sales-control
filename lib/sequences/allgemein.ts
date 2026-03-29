export interface SequenceStep {
  step: number;
  dayOffset: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  bodyTemplate: string;
}

// A/B Subject Line Varianten:
// Step 1: A) "KI-Potenzial bei {{company_name}}" B) "32 Stunden pro Monat für Bürokratie"
// Step 3: A) "8,3 Stunden pro Woche verschwendet" B) "40–60 % Ihrer Aufgaben automatisierbar"
// Step 4: A) "15 Stunden pro Woche eingespart" B) "Wie ein Mittelständler KI nutzt"
// Step 5: A) "Kurze Frage an Sie" B) "Was kostet Sie am meisten Zeit?"
// Step 6: A) "Mein letzter Hinweis" B) "Letzte Nachricht von mir"

export const allgemeinSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: KI-Potenzial bei|32 Stunden Bürokratie bei} {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>laut KfW-Studie setzen bereits 28&nbsp;% der deutschen Unternehmen auf KI-gest&uuml;tzte Prozesse. Tendenz stark steigend.</p>
<p>Gleichzeitig verlieren KMU durchschnittlich 32&nbsp;Stunden pro Monat an Verwaltungsaufgaben: Angebote schreiben, Anfragen beantworten, Berichte erstellen.</p>
<p>In unserem kostenlosen <a href="https://praxisnovaai.com/potenzialrechner">KI-Potenzialrechner</a> sehen Sie in 2&nbsp;Minuten, wo bei {{company_name}} das gr&ouml;&szlig;te Potenzial liegt.</p>
<p>W&uuml;rde Sie das interessieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich beschäftige mich mit KI-Automatisierung für den Mittelstand und bin auf {{company_name}} aufmerksam geworden. Würde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: '{Spintax: 8,3 Stunden pro Woche verschwendet|40–60 % Ihrer Aufgaben automatisierbar}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine Zahl, die viele &uuml;berrascht: Mitarbeiter verbringen im Schnitt 8,3&nbsp;Stunden pro Woche mit Verwaltungsaufgaben (Capmo-Studie). Das sind &uuml;ber 400&nbsp;Stunden pro Jahr.</p>
<p>Die h&auml;ufigsten Zeitfresser: Angebote manuell erstellen, Anfragen beantworten, Berichte zusammenstellen.</p>
<p>40 bis 60&nbsp;% davon lassen sich automatisieren. Ohne IT-Abteilung, ohne Systemwechsel.</p>
<p>Interessant f&uuml;r {{company_name}}?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: '{Spintax: 15 Stunden pro Woche eingespart|Wie ein Mittelständler KI nutzt}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein mittelst&auml;ndisches Unternehmen hat mit unserer Hilfe 15&nbsp;Stunden pro Woche an manueller Arbeit eingespart. Der Ablauf war einfach:</p>
<ul>
<li>2-Stunden-Audit der bestehenden Prozesse</li>
<li>Identifikation der drei gr&ouml;&szlig;ten Hebel</li>
<li>Umsetzung innerhalb von 2 bis 3&nbsp;Wochen</li>
</ul>
<p>Weniger Fehler. Schnellere Reaktionszeiten. Mehr Zeit f&uuml;r das, was z&auml;hlt.</p>
<p>Unser KI-Quickcheck zeigt in 2&nbsp;Stunden, wo bei {{company_name}} das Potenzial liegt. 490&nbsp;&euro;, konkreter Report.</p>
<p>Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 22,
    channel: 'email',
    subject: '{Spintax: Kurze Frage an Sie|Was kostet Sie am meisten Zeit?}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>welcher Prozess in Ihrem Unternehmen kostet Sie aktuell am meisten Zeit?</p>
<p>Angebotserstellung, Kundenanfragen, Berichtswesen, Rechnungsstellung &ndash; meistens gibt es einen Bereich, der sich mit KI sofort optimieren l&auml;sst.</p>
<p>Ich gebe Ihnen gerne eine kurze Einsch&auml;tzung. Einfach auf diese E-Mail antworten.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 6,
    dayOffset: 30,
    channel: 'email',
    subject: '{Spintax: Mein letzter Hinweis|Letzte Nachricht von mir}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich respektiere Ihre Zeit und melde mich ein letztes Mal.</p>
<p>Falls Sie sp&auml;ter herausfinden m&ouml;chten, wo KI bei {{company_name}} am meisten bringt: Unser KI-Quickcheck steht Ihnen jederzeit offen.</p>
<p>Oder testen Sie unseren kostenlosen <a href="https://praxisnovaai.com/potenzialrechner">KI-Potenzialrechner</a> &ndash; dauert 2&nbsp;Minuten.</p>
<p>Alles Gute!</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
