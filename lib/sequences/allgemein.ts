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
    subject: '{Spintax: Digitalisierung|KI-Potenzial|Effizienz} für {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>laut einer aktuellen KfW-Studie setzen bereits 28&nbsp;% der deutschen Unternehmen auf KI-gest&uuml;tzte Prozesse &ndash; Tendenz stark steigend.</p>
<p>Viele Unternehmen verlieren t&auml;glich wertvolle Zeit mit Aufgaben, die sich leicht automatisieren lassen: Angebote schreiben, Anfragen beantworten, Berichte erstellen oder Termine koordinieren.</p>
<p>Wir bei PraxisNova AI helfen Unternehmen wie {{company_name}}, genau solche Prozesse mit KI zu optimieren. In unserem kostenlosen <a href="https://praxisnovaai.com/potenzialrechner">KI-Potenzialrechner</a> k&ouml;nnen Sie in 2&nbsp;Minuten sehen, wo bei Ihnen das gr&ouml;&szlig;te Potenzial liegt.</p>
<p>W&uuml;rde Sie das interessieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich beschäftige mich intensiv mit KI-Automatisierung für den Mittelstand und bin auf {{company_name}} aufmerksam geworden. Ich würde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 6,
    channel: 'email',
    subject: '{Spintax: Routineaufgaben|Büroarbeit} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine Zahl, die viele &uuml;berrascht: Laut einer Capmo-Studie verbringen Mitarbeiter im Durchschnitt 8,3&nbsp;Stunden pro Woche mit Verwaltungsaufgaben. Das sind &uuml;ber 400&nbsp;Stunden pro Jahr &ndash; pro Person.</p>
<p>Die h&auml;ufigsten Zeitfresser: Angebote manuell erstellen, Anfragen beantworten, Berichte zusammenstellen und Rechnungen pr&uuml;fen.</p>
<p>Was w&auml;re, wenn sich 40&ndash;60&nbsp;% dieser Aufgaben automatisieren lie&szlig;en? Ohne IT-Abteilung, ohne Systemwechsel &ndash; einfach im Hintergrund.</p>
<p>W&uuml;rde sich das f&uuml;r {{company_name}} lohnen?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: 'Wie {Spintax: ein Unternehmen|ein Mittelständler} mit KI 15 Stunden pro Woche spart',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein mittelst&auml;ndisches Unternehmen hat mit unserer Hilfe 15&nbsp;Stunden pro Woche an manueller Arbeit eingespart &ndash; durch KI-gest&uuml;tzte Automatisierung von Routineaufgaben.</p>
<p>Der Ablauf war einfach:</p>
<ul>
<li>2-Stunden-Audit der bestehenden Prozesse (unser KI-Quickcheck)</li>
<li>Identifikation der drei gr&ouml;&szlig;ten Automatisierungshebel</li>
<li>Umsetzung innerhalb von 2&ndash;3&nbsp;Wochen</li>
</ul>
<p>Das Ergebnis: Weniger Fehler, schnellere Reaktionszeiten und mehr Zeit f&uuml;r die Aufgaben, die wirklich z&auml;hlen.</p>
<p>Den KI-Quickcheck gibt es f&uuml;r einmalig 490&nbsp;&euro; &ndash; inklusive personalisierten Report mit konkreten Handlungsempfehlungen.</p>
<p>Hier k&ouml;nnen Sie direkt einen Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 22,
    channel: 'email',
    subject: 'Kurze Frage zu {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine kurze Frage: Welcher Prozess in Ihrem Unternehmen kostet Sie aktuell am meisten Zeit?</p>
<p>Ob Angebotserstellung, Kundenanfragen, Berichtswesen oder Rechnungsstellung &ndash; meistens gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
<p>Schreiben Sie mir gerne &ndash; ich gebe Ihnen eine kurze Einsch&auml;tzung, ob und wie KI dort helfen kann.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 6,
    dayOffset: 30,
    channel: 'email',
    subject: 'Letzte Nachricht von mir',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich m&ouml;chte Ihre Zeit respektieren und melde mich hiermit ein letztes Mal.</p>
<p>Falls Sie in den kommenden Wochen doch herausfinden m&ouml;chten, wo KI bei {{company_name}} am meisten bringt &ndash; unser KI-Quickcheck steht Ihnen jederzeit offen. 2&nbsp;Stunden, 490&nbsp;&euro;, konkreter Report.</p>
<p>Oder testen Sie unseren kostenlosen <a href="https://praxisnovaai.com/potenzialrechner">KI-Potenzialrechner</a> &ndash; dauert nur 2&nbsp;Minuten.</p>
<p>Ich w&uuml;nsche Ihnen alles Gute!</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
