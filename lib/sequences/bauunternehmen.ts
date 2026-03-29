import { SequenceStep } from './allgemein';

export const bauunternehmenSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Kostenlos f\u00fcr {{company_name}}: Automatisches {Spintax: Forderungsmanagement|Mahnsystem} f\u00fcr offene Rechnungen',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>kurze Frage: Wie viel Geld steckt bei {{company_name}} gerade in &uuml;berf&auml;lligen Rechnungen?</p>
<p>Bei vielen Bauunternehmen summieren sich offene Forderungen auf 20.000 bis 150.000&nbsp;&euro;. Zahlungsziele von 30 bis 60&nbsp;Tagen, Nachunternehmer die sp&auml;t zahlen &ndash; und keiner im B&uuml;ro hat Zeit f&uuml;r konsequentes Mahnwesen.</p>
<p>Wir haben ein automatisches Mahnsystem gebaut: 3&nbsp;Stufen, von freundlicher Erinnerung bis f&ouml;rmlicher Mahnung. L&auml;uft im Hintergrund, ohne Aufwand f&uuml;r Ihr Team.</p>
<p>F&uuml;r 3&nbsp;Bauunternehmen richten wir das komplett kostenlos ein. Einzige Bedingung: Wenn es funktioniert, d&uuml;rfen wir die Ergebnisse anonym als Fallstudie nutzen.</p>
<p>H&auml;tten Sie 10&nbsp;Minuten diese Woche f&uuml;r einen kurzen Austausch?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich besch\u00e4ftige mich intensiv mit KI-Automatisierung im Bauwesen und bin auf {{company_name}} aufmerksam geworden. Ich w\u00fcrde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 6,
    channel: 'email',
    subject: '{Spintax: Baustellendokumentation|Wochenberichte} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine Zahl aus der Branche: Laut der Capmo-Effizienzstudie verbringen Bauleiter im Schnitt 8,3&nbsp;Stunden pro Woche mit Verwaltungsaufgaben &ndash; Dokumentation, Berichte, Abstimmung. Das sind &uuml;ber 400&nbsp;Stunden pro Jahr, die auf der Baustelle fehlen.</p>
<p>Was w&auml;re, wenn der Wochenbericht sich selbst schreibt? Automatisch aus Bautagesberichten, Fotos und Statusmeldungen &ndash; fertig formatiert, jeden Freitag um 16:00&nbsp;Uhr.</p>
<p>Das ist einer der Prozesse, die sich mit KI besonders schnell einrichten lassen. Ohne IT-Abteilung, ohne Systemwechsel.</p>
<p>W&uuml;rde Sie das f&uuml;r {{company_name}} interessieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: 'Wie {Spintax: ein Bauunternehmen|ein GU} die Kalkulation um 50\u00a0% beschleunigt hat',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein Bauunternehmen aus NRW hat mit unserer Hilfe die Angebotskalkulation um 50&nbsp;% beschleunigt &ndash; durch einen KI-gest&uuml;tzten Kalkulations-Assistenten.</p>
<p>Der Ablauf:</p>
<ul>
<li>Ausschreibungsunterlagen werden hochgeladen</li>
<li>KI extrahiert Positionen, Mengen und Anforderungen</li>
<li>Kalkulator erh&auml;lt vorbereitete Kalkulation zur Pr&uuml;fung</li>
</ul>
<p>Das Ergebnis: Schnellere Angebote, weniger Fehler in der Kalkulation und mehr gewonnene Auftr&auml;ge.</p>
<p>Unser <strong>KI-Quickcheck</strong> zeigt Ihnen in 2&nbsp;Stunden, wo bei {{company_name}} das gr&ouml;&szlig;te Potenzial liegt. F&uuml;r einmalig 490&nbsp;&euro; erhalten Sie einen personalisierten Report mit konkreten Handlungsempfehlungen.</p>
<p>Hier k&ouml;nnen Sie direkt einen Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 22,
    channel: 'email',
    subject: 'M\u00e4ngelmanagement bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine kurze Frage: Wie l&auml;uft bei {{company_name}} aktuell das M&auml;ngelmanagement auf der Baustelle?</p>
<p>Bei vielen Bauunternehmen sieht es so aus: Mangel entdeckt, Foto mit dem Handy, WhatsApp an den Nachunternehmer &ndash; und dann hinterherrennen, ob es erledigt wurde. Keine &Uuml;bersicht, keine Fristen, keine Eskalation.</p>
<p>Ob M&auml;ngelmanagement, Nachunternehmer-Koordination oder Baustellendokumentation &ndash; meistens gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
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
