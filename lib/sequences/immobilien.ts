import { SequenceStep } from './allgemein';

export const immobilienSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Kostenlos f\u00fcr {{company_name}}: Automatische {Spintax: Zahlungserinnerungen|Mietmahnung} bei offenen Forderungen',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>kurze Frage: Wie viele Mieter oder Gesch&auml;ftspartner bei {{company_name}} zahlen gerade versp&auml;tet?</p>
<p>Mietausf&auml;lle, versp&auml;tete Nebenkostennachzahlungen, offene Maklerprovisionen: In vielen Immobilienunternehmen summiert sich das schnell auf f&uuml;nfstellige Betr&auml;ge. Manuelles Nachfassen kostet Zeit und Nerven.</p>
<p>Wir haben ein automatisches Mahnsystem gebaut: 3 Stufen, von freundlicher Erinnerung bis f&ouml;rmlicher Mahnung mit Fristsetzung. L&auml;uft im Hintergrund, professionell formuliert.</p>
<p>F&uuml;r 3 Immobilienunternehmen richten wir das komplett kostenlos ein. Im Gegenzug: Wenn es klappt, teilen Sie uns kurz Ihre Erfahrung mit.</p>
<p>Interesse? Antworten Sie einfach auf diese E-Mail.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich besch\u00e4ftige mich intensiv mit KI-Automatisierung in der Immobilienbranche und bin auf {{company_name}} aufmerksam geworden. Ich w\u00fcrde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: 'Wie {Spintax: ein Immobilienb\u00fcro|eine Hausverwaltung} mit KI Zeit spart',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein Immobilienb&uuml;ro aus M&uuml;nchen hat mit unserer Hilfe die Bearbeitungszeit f&uuml;r Mieteranfragen um 60&nbsp;% reduziert &ndash; durch einen KI-gest&uuml;tzten Antwort-Assistenten.</p>
<p>Das Ergebnis: Weniger Routinearbeit, schnellere R&uuml;ckmeldungen und zufriedenere Mieter.</p>
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
<p>eine kurze Frage: Welcher Prozess in Ihrem Immobilienalltag kostet Sie aktuell am meisten Zeit?</p>
<p>Ob Mieterkorrespondenz, Expos&eacute;-Erstellung oder Objektverwaltung &ndash; oft gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
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
