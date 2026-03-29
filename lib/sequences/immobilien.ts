import { SequenceStep } from './allgemein';

export const immobilienSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Kostenlos f\u00fcr {{company_name}}: Automatisches {Spintax: Forderungsmanagement|Mahnsystem} bei offenen Mieten',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>kurze Frage: Wie viele Mieter oder Gesch&auml;ftspartner bei {{company_name}} zahlen gerade versp&auml;tet?</p>
<p>Mietausf&auml;lle, versp&auml;tete Nebenkostennachzahlungen, offene Maklerprovisionen &ndash; in vielen Immobilienunternehmen summiert sich das schnell auf f&uuml;nfstellige Betr&auml;ge. Manuelles Nachfassen kostet Zeit und Nerven.</p>
<p>Wir haben ein automatisches Mahnsystem gebaut: 3&nbsp;Stufen, von freundlicher Erinnerung bis f&ouml;rmlicher Mahnung mit Fristsetzung. L&auml;uft im Hintergrund, professionell formuliert, DSGVO-konform.</p>
<p>F&uuml;r 3&nbsp;Immobilienunternehmen richten wir das komplett kostenlos ein. Im Gegenzug: Wenn es klappt, teilen Sie uns kurz Ihre Erfahrung mit.</p>
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
    dayOffset: 6,
    channel: 'email',
    subject: '{Spintax: Lead-Nachverfolgung|Mieteranfragen} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine Zahl, die viele Immobilienprofis &uuml;berrascht: Laut einer Studie von ImmobilienScout24 beantworten 43&nbsp;% der Maklerb&uuml;ros Anfragen erst nach mehr als 24&nbsp;Stunden. Bis dahin hat der Interessent l&auml;ngst woanders angefragt.</p>
<p>Was w&auml;re, wenn jede Anfrage &ndash; egal ob von ImmoScout, Website oder E-Mail &ndash; innerhalb von 2&nbsp;Minuten eine professionelle Antwort bekommt? Automatisch, rund um die Uhr.</p>
<p>Das ist einer der Prozesse, die sich mit KI am schnellsten automatisieren lassen. Ohne IT-Aufwand, ohne Systemwechsel.</p>
<p>W&uuml;rde Sie das f&uuml;r {{company_name}} interessieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: 'Wie {Spintax: eine Hausverwaltung|ein Maklerb\u00fcro} 60\u00a0% weniger Routinearbeit hat',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein Immobilienb&uuml;ro aus S&uuml;ddeutschland hat mit unserer Hilfe die Bearbeitungszeit f&uuml;r Mieteranfragen um 60&nbsp;% reduziert &ndash; durch einen KI-gest&uuml;tzten Antwort-Assistenten.</p>
<p>Der Ablauf:</p>
<ul>
<li>Anfrage kommt rein (E-Mail, Portal, Website)</li>
<li>KI erkennt Anliegen und erstellt passende Antwort</li>
<li>Makler pr&uuml;ft kurz und sendet ab &ndash; oder es geht vollautomatisch</li>
</ul>
<p>Das Ergebnis: Weniger Routinearbeit, schnellere R&uuml;ckmeldungen, zufriedenere Mieter und Interessenten.</p>
<p>Unser <strong>KI-Quickcheck</strong> zeigt Ihnen in 2&nbsp;Stunden, wo bei {{company_name}} das gr&ouml;&szlig;te Potenzial liegt. F&uuml;r einmalig 490&nbsp;&euro; erhalten Sie einen personalisierten Report mit konkreten Handlungsempfehlungen.</p>
<p>Hier k&ouml;nnen Sie direkt einen Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 22,
    channel: 'email',
    subject: 'Expos\u00e9-Erstellung bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine kurze Frage: Wie lange braucht Ihr Team aktuell f&uuml;r ein vollst&auml;ndiges Expos&eacute;?</p>
<p>Viele Maklerb&uuml;ros investieren 45&nbsp;Minuten bis 2&nbsp;Stunden pro Objekt &ndash; f&uuml;r Texte, Fotos sortieren, Grundrissbeschreibungen und Formatierung. Mit KI l&auml;sst sich das auf unter 10&nbsp;Minuten reduzieren.</p>
<p>Ob Expos&eacute;-Erstellung, Lead-Scoring oder Mieterkommunikation &ndash; oft gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
<p>Was w&auml;re f&uuml;r {{company_name}} aktuell am relevantesten?</p>
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
<p>Hier geht es zur Terminbuchung: {{CALENDLY_LINK}}</p>
<p>Ich w&uuml;nsche Ihnen weiterhin viel Erfolg!</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
