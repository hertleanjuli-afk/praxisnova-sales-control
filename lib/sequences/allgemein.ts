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
    subject: '{Spintax: Digitalisierung|KI-Potenzial|Effizienz} f\u00fcr {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>laut einer aktuellen KfW-Studie setzen bereits 28&nbsp;% der deutschen Unternehmen auf KI-gest&uuml;tzte Prozesse &ndash; Tendenz stark steigend.</p>
<p>Viele Unternehmen verlieren t&auml;glich wertvolle Zeit mit Aufgaben, die sich leicht automatisieren lassen: Angebote schreiben, Anfragen beantworten, Berichte erstellen oder Termine koordinieren.</p>
<p>Wir bei PraxisNova AI helfen Unternehmen wie {{company_name}}, genau solche Prozesse mit KI zu optimieren. In unserem kostenlosen KI-Potenzialrechner k&ouml;nnen Sie in 2&nbsp;Minuten sehen, wo bei Ihnen das gr&ouml;&szlig;te Potenzial liegt.</p>
<p>W&uuml;rde Sie das interessieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich besch\u00e4ftige mich intensiv mit KI-Automatisierung f\u00fcr den Mittelstand und bin auf {{company_name}} aufmerksam geworden. Ich w\u00fcrde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: 'Wie {Spintax: ein Unternehmen|ein Mittelst\u00e4ndler} mit KI 15 Stunden pro Woche spart',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein mittelst&auml;ndisches Unternehmen hat mit unserer Hilfe 15&nbsp;Stunden pro Woche an manueller Arbeit eingespart &ndash; durch KI-gest&uuml;tzte Automatisierung von Routineaufgaben.</p>
<p>Das Ergebnis: Weniger Fehler, schnellere Reaktionszeiten und mehr Zeit f&uuml;r die Aufgaben, die wirklich z&auml;hlen.</p>
<p>Falls Sie neugierig sind, wo bei {{company_name}} &auml;hnliches Potenzial steckt: Unser KI-Quickcheck (kompakter 2-Stunden-Audit) zeigt Ihnen genau das.</p>
<p>Soll ich Ihnen mehr dazu schicken?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 12,
    channel: 'email',
    subject: 'KI-Quickcheck f\u00fcr {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich m&ouml;chte Ihnen kurz unseren KI-Quickcheck vorstellen. In 2&nbsp;Stunden analysieren wir gemeinsam Ihre Prozesse und identifizieren die drei gr&ouml;&szlig;ten Automatisierungshebel f&uuml;r {{company_name}}.</p>
<p>Sie erhalten einen personalisierten Report mit konkreten Handlungsempfehlungen &ndash; f&uuml;r einmalig 490&nbsp;&euro;.</p>
<p>Hier k&ouml;nnen Sie direkt einen Termin buchen: {{CALENDLY_LINK}}</p>
<p>Passt das f&uuml;r Sie?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 18,
    channel: 'email',
    subject: 'Kurze Frage zu {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine kurze Frage: Welcher Prozess in Ihrem Unternehmen kostet Sie aktuell am meisten Zeit?</p>
<p>Ob Angebotserstellung, Kundenanfragen oder Berichtswesen &ndash; oft gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
<p>Ich freue mich auf Ihre Antwort.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 6,
    dayOffset: 24,
    channel: 'email',
    subject: 'Letzte Nachricht von mir',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich m&ouml;chte Sie nicht weiter bel&auml;stigen und melde mich hiermit ein letztes Mal.</p>
<p>Falls Sie in den n&auml;chsten Wochen doch noch herausfinden m&ouml;chten, wo KI bei {{company_name}} am meisten bringt: Unser KI-Quickcheck steht Ihnen jederzeit offen.</p>
<p>Hier geht es zur Terminbuchung: {{CALENDLY_LINK}}</p>
<p>Ich w&uuml;nsche Ihnen alles Gute!</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
