import { SequenceStep } from './allgemein';

// A/B Subject Line Varianten als Kommentar:
// Step 1: A) "Offene Forderungen bei {{company_name}}?" B) "Automatisches Mahnwesen für Makler"
// Step 3: A) "43 % antworten zu spät" B) "Ihre Leads warten nicht 24 Stunden"
// Step 4: A) "60 % weniger Routinearbeit" B) "Exposé in 10 statt 45 Minuten"
// Step 5: A) "Kurze Frage an Sie" B) "Was kostet Sie am meisten Zeit?"
// Step 6: A) "Mein letzter Hinweis" B) "Letzte Nachricht von mir"

export const immobilienSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: Offene Forderungen bei|Automatisches Mahnwesen für} {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>wie viel Geld steckt bei {{company_name}} gerade in &uuml;berf&auml;lligen Forderungen?</p>
<p>Mietausf&auml;lle, offene Provisionen, versp&auml;tete Nebenkostennachzahlungen &ndash; bei vielen Immobilienunternehmen summiert sich das auf f&uuml;nfstellige Betr&auml;ge.</p>
<p>Wir haben ein automatisches 3-Stufen-Mahnsystem gebaut. Von der freundlichen Erinnerung bis zur foermlichen Mahnung. Laeuft im Hintergrund.</p>
<p>F&uuml;r 3&nbsp;Unternehmen richten wir das kostenlos ein. Interesse?</p>
<p>Antworten Sie einfach auf diese E-Mail.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich beschäftige mich mit KI-Automatisierung in der Immobilienbranche und bin auf {{company_name}} aufmerksam geworden. Würde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: '{Spintax: 43 % antworten zu spät|Ihre Leads warten nicht 24 Stunden}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>43&nbsp;% der Maklerb&uuml;ros beantworten Anfragen erst nach &uuml;ber 24&nbsp;Stunden (ImmoScout24-Studie). Bis dahin hat der Interessent woanders angefragt.</p>
<p>Was w&auml;re, wenn jede Anfrage innerhalb von 2&nbsp;Minuten eine professionelle Antwort bekommt? Automatisch, rund um die Uhr. Ohne Systemwechsel.</p>
<p>W&uuml;rde das f&uuml;r {{company_name}} einen Unterschied machen?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: '{Spintax: 60 % weniger Routinearbeit|Exposé in 10 statt 45 Minuten}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein Immobilienb&uuml;ro aus S&uuml;ddeutschland hat mit unserer Hilfe die Bearbeitungszeit f&uuml;r Mieteranfragen um 60&nbsp;% reduziert.</p>
<p>Wie das funktioniert:</p>
<ul>
<li>Anfrage kommt rein (Portal, E-Mail, Website)</li>
<li>KI erkennt Anliegen, erstellt passende Antwort</li>
<li>Makler pr&uuml;ft kurz und sendet ab</li>
</ul>
<p>Unser KI-Quickcheck zeigt Ihnen in 2&nbsp;Stunden, wo bei {{company_name}} das gr&ouml;&szlig;te Potenzial liegt. 490&nbsp;&euro;, konkreter Report.</p>
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
<p>welcher Prozess bei {{company_name}} kostet Sie aktuell am meisten Zeit?</p>
<p>Expos&eacute;-Erstellung (45&nbsp;Min. pro Objekt), Lead-Nachverfolgung, Mieterkommunikation &ndash; meistens gibt es einen Bereich, der sich mit KI schnell optimieren l&auml;sst.</p>
<p>Ich freue mich &uuml;ber eine kurze Antwort.</p>
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
<p>Terminbuchung: {{CALENDLY_LINK}}</p>
<p>Alles Gute!</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
