import { SequenceStep } from './allgemein';

export const handwerkSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Kostenlos f\u00fcr {{company_name}}: Automatische {Spintax: Zahlungserinnerungen|Mahnungen} f\u00fcr offene Rechnungen',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>kurze Frage: Wie viele Rechnungen sind bei {{company_name}} gerade &uuml;berf&auml;llig?</p>
<p>Bei den meisten Handwerksbetrieben stecken zwischen 10.000 und 50.000&nbsp;&euro; in offenen Forderungen. Nicht weil Kunden nicht zahlen wollen &ndash; sondern weil niemand Zeit hat, hinterherzutelefonieren.</p>
<p>Wir haben ein System gebaut, das automatisch freundliche Zahlungserinnerungen verschickt: Stufe&nbsp;1 nach 3&nbsp;Tagen, Stufe&nbsp;2 nach 10&nbsp;Tagen, Stufe&nbsp;3 nach 21&nbsp;Tagen. Kein Aufwand f&uuml;r Sie, professionell formuliert.</p>
<p>F&uuml;r 3&nbsp;Handwerksbetriebe richten wir das komplett kostenlos ein. Im Gegenzug: Wenn es klappt, teilen Sie uns kurz Ihre Erfahrung mit.</p>
<p>Interesse? Antworten Sie einfach auf diese E-Mail.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich besch\u00e4ftige mich intensiv mit KI-Automatisierung im Handwerk und bin auf {{company_name}} aufmerksam geworden. Ich w\u00fcrde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 6,
    channel: 'email',
    subject: '{Spintax: Anfragen beantworten|Kundenanfragen} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine Zahl aus dem Handwerk: Laut einer Studie der Handwerkskammer bleiben 35&nbsp;% der Kundenanfragen l&auml;nger als 24&nbsp;Stunden unbeantwortet. Der h&auml;ufigste Grund? Der Meister ist auf der Baustelle, und im B&uuml;ro hat niemand Zeit.</p>
<p>Was w&auml;re, wenn jede Anfrage &ndash; egal ob per E-Mail, Website oder WhatsApp &ndash; innerhalb von 2&nbsp;Minuten eine professionelle Best&auml;tigung bekommt? Automatisch, auch am Wochenende.</p>
<p>Das ist einer der Prozesse, die sich mit KI am schnellsten einrichten lassen. Ohne IT-Abteilung, ohne Systemwechsel.</p>
<p>W&uuml;rde Sie das f&uuml;r {{company_name}} interessieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: 'Wie {Spintax: ein Meisterbetrieb|ein Handwerksbetrieb} Angebote 70\u00a0% schneller erstellt',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein SHK-Betrieb aus Bayern hat mit unserer Hilfe die Angebotserstellung um 70&nbsp;% beschleunigt &ndash; von durchschnittlich 45&nbsp;Minuten auf unter 10&nbsp;Minuten pro Angebot.</p>
<p>Der Ablauf:</p>
<ul>
<li>Anfrage kommt rein (E-Mail, Formular, WhatsApp)</li>
<li>KI erkennt Auftragsart, extrahiert Details und erstellt Angebotsentwurf</li>
<li>Meister pr&uuml;ft, passt an und versendet &ndash; fertig</li>
</ul>
<p>Das Ergebnis: Weniger B&uuml;roarbeit am Abend, schnellere Angebote, zufriedenere Kunden.</p>
<p>Unser <strong>KI-Quickcheck</strong> zeigt Ihnen in 2&nbsp;Stunden, wo bei {{company_name}} das gr&ouml;&szlig;te Potenzial liegt. F&uuml;r einmalig 490&nbsp;&euro; erhalten Sie einen personalisierten Report mit konkreten Handlungsempfehlungen.</p>
<p>Hier k&ouml;nnen Sie direkt einen Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 22,
    channel: 'email',
    subject: 'B\u00fcroarbeit bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine kurze Frage: Wie viele Stunden pro Woche verbringen Sie oder Ihr Team mit B&uuml;roarbeit &ndash; Angebote, Rechnungen, E-Mails, Dokumentation?</p>
<p>Laut einer Capmo-Studie sind es im Durchschnitt 8,3&nbsp;Stunden pro Woche. Stunden, die auf der Baustelle fehlen.</p>
<p>Ob Angebotserstellung, Auftragsplanung, Rechnungsstellung oder Kundenkommunikation &ndash; meistens gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
<p>Welcher Prozess kostet Sie bei {{company_name}} aktuell am meisten Zeit?</p>
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
<p>Ich w&uuml;nsche Ihnen weiterhin viel Erfolg!</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
