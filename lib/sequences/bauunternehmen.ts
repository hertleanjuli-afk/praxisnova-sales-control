import { SequenceStep } from './allgemein';

export const bauunternehmenSequence: SequenceStep[] = [
  { step: 1, dayOffset: 0, channel: 'email',
    subject: '{Spintax: Digitalisierung|KI-Potenzial|Effizienz} im Bauwesen',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>laut einer aktuellen KfW-Studie setzen bereits 28&nbsp;% der deutschen Unternehmen auf KI-gest&uuml;tzte Prozesse &ndash; Tendenz stark steigend. Gerade im Bauwesen liegen hier enorme Chancen.</p>
<p>Viele Bauunternehmen verlieren t&auml;glich wertvolle Zeit mit manueller Kalkulation, Baustellenkoordination oder Dokumentation. Das sind Aufgaben, die sich hervorragend automatisieren lassen.</p>
<p>Wir bei PraxisNova AI helfen Bauunternehmenn wie {{company_name}}, solche Prozesse mit KI zu optimieren. In unserem kostenlosen KI-Potenzialrechner k&ouml;nnen Sie in 2&nbsp;Minuten sehen, wo bei Ihnen das gr&ouml;&szlig;te Potenzial liegt.</p>
<p>W&uuml;rde Sie das interessieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  { step: 2, dayOffset: 0, channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich besch\u00e4ftige mich intensiv mit KI-Automatisierung im Bauwesen und bin auf {{company_name}} aufmerksam geworden. Ich w\u00fcrde mich freuen, uns zu vernetzen.'
  },
  { step: 3, dayOffset: 7, channel: 'email',
    subject: 'Wie {Spintax: ein Bauunternehmen|ein Baubetrieb} mit KI Zeit spart',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein Bauunternehmen aus NRW hat mit unserer Hilfe die Angebotskalkulation um 50&nbsp;% beschleunigt &ndash; durch einen KI-gest&uuml;tzten Kalkulations-Assistenten.</p>
<p>Das Ergebnis: Schnellere Angebote, weniger Fehler in der Kalkulation und mehr gewonnene Auftr&auml;ge.</p>
<p>Falls Sie neugierig sind, wo bei {{company_name}} &auml;hnliches Potenzial steckt: Unser KI-Quickcheck (kompakter 2-Stunden-Audit) zeigt Ihnen genau das.</p>
<p>Soll ich Ihnen mehr dazu schicken?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  { step: 4, dayOffset: 12, channel: 'email',
    subject: 'KI-Quickcheck f\u00fcr {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich m&ouml;chte Ihnen kurz unseren KI-Quickcheck vorstellen. In 2&nbsp;Stunden analysieren wir gemeinsam Ihre Prozesse und identifizieren die drei gr&ouml;&szlig;ten Automatisierungshebel f&uuml;r {{company_name}}.</p>
<p>Sie erhalten einen personalisierten Report mit konkreten Handlungsempfehlungen &ndash; f&uuml;r einmalig 490&nbsp;&euro;.</p>
<p>Hier k&ouml;nnen Sie direkt einen Termin buchen: {{CALENDLY_LINK}}</p>
<p>Passt das f&uuml;r Sie?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  { step: 5, dayOffset: 18, channel: 'email',
    subject: 'Kurze Frage zu {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine kurze Frage: Welcher Prozess auf Ihren Baustellen oder im B&uuml;ro kostet Sie aktuell am meisten Zeit?</p>
<p>Ob Kalkulation, Baustellendokumentation oder Nachunternehmer-Koordination &ndash; oft gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
<p>Ich freue mich auf Ihre Antwort.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  { step: 6, dayOffset: 24, channel: 'email',
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
