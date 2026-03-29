import { SequenceStep } from './allgemein';

// A/B Subject Line Varianten:
// Step 1: A) "Offene Forderungen bei {{company_name}}?" B) "Automatisches Mahnsystem für Bauunternehmen"
// Step 3: A) "8,3 Stunden pro Woche für Verwaltung" B) "Wochenberichte schreiben sich selbst"
// Step 4: A) "Kalkulation 50 % schneller" B) "Angebote in der halben Zeit"
// Step 5: A) "Kurze Frage an Sie" B) "Mängelmanagement bei {{company_name}}"
// Step 6: A) "Mein letzter Hinweis" B) "Letzte Nachricht von mir"

export const bauunternehmenSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: Offene Forderungen bei|Automatisches Mahnsystem für} {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>wie viel Geld steckt bei {{company_name}} gerade in &uuml;berf&auml;lligen Rechnungen?</p>
<p>Bei vielen Bauunternehmen sind es 20.000 bis 150.000&nbsp;&euro;. Zahlungsziele von 30 bis 60&nbsp;Tagen, Nachunternehmer die sp&auml;t zahlen &ndash; und keiner hat Zeit f&uuml;r konsequentes Mahnwesen.</p>
<p>Wir haben ein automatisches 3-Stufen-Mahnsystem gebaut. L&auml;uft im Hintergrund, ohne Aufwand f&uuml;r Ihr Team.</p>
<p>F&uuml;r 3&nbsp;Bauunternehmen richten wir das kostenlos ein. Einzige Bedingung: anonyme Fallstudie bei Erfolg.</p>
<p>10&nbsp;Minuten diese Woche f&uuml;r einen kurzen Austausch?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich beschäftige mich mit KI-Automatisierung im Bauwesen und bin auf {{company_name}} aufmerksam geworden. Würde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: '{Spintax: 8,3 Stunden pro Woche für Verwaltung|Wochenberichte schreiben sich selbst}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>Bauleiter verbringen im Schnitt 8,3&nbsp;Stunden pro Woche mit Verwaltungsaufgaben (Capmo-Studie). Das sind &uuml;ber 400&nbsp;Stunden pro Jahr, die auf der Baustelle fehlen.</p>
<p>Was w&auml;re, wenn der Wochenbericht sich selbst schreibt? Automatisch aus Bautagesberichten und Statusmeldungen &ndash; fertig formatiert, jeden Freitag.</p>
<p>Kein IT-Aufwand. Kein Systemwechsel.</p>
<p>Interessant f&uuml;r {{company_name}}?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: '{Spintax: Kalkulation 50 % schneller|Angebote in der halben Zeit}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein Bauunternehmen aus NRW hat die Angebotskalkulation um 50&nbsp;% beschleunigt. Der Ablauf:</p>
<ul>
<li>Ausschreibungsunterlagen hochladen</li>
<li>KI extrahiert Positionen, Mengen, Anforderungen</li>
<li>Kalkulator erh&auml;lt vorbereitete Kalkulation zur Pr&uuml;fung</li>
</ul>
<p>Schnellere Angebote. Weniger Fehler. Mehr gewonnene Auftr&auml;ge.</p>
<p>Unser KI-Quickcheck zeigt in 2&nbsp;Stunden, wo bei {{company_name}} das gr&ouml;&szlig;te Potenzial liegt. 490&nbsp;&euro;, konkreter Report.</p>
<p>Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 22,
    channel: 'email',
    subject: '{Spintax: Kurze Frage an Sie|Mängelmanagement bei {{company_name}}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>wie l&auml;uft bei {{company_name}} aktuell das M&auml;ngelmanagement?</p>
<p>Bei vielen Bauunternehmen: Mangel entdeckt, Foto mit dem Handy, WhatsApp an den Nachunternehmer. Keine &Uuml;bersicht, keine Fristen, keine Eskalation.</p>
<p>Ob M&auml;ngelmanagement, Dokumentation oder Subunternehmer-Koordination &ndash; meistens gibt es einen Bereich, der sich mit KI sofort optimieren l&auml;sst.</p>
<p>Welcher Prozess kostet Sie am meisten Zeit?</p>
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
