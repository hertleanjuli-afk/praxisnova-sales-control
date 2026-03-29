import { SequenceStep } from './allgemein';

// A/B Subject Line Varianten:
// Step 1: A) "Offene Rechnungen bei {{company_name}}?" B) "Automatisches Mahnwesen für Handwerker"
// Step 3: A) "35 % der Anfragen bleiben liegen" B) "Antworten in 2 statt 24 Minuten"
// Step 4: A) "Angebote 70 % schneller" B) "Von 45 auf 10 Minuten pro Angebot"
// Step 5: A) "Kurze Frage an Sie" B) "Was frisst Ihre Abende?"
// Step 6: A) "Mein letzter Hinweis" B) "Letzte Nachricht von mir"

export const handwerkSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: Offene Rechnungen bei|Automatisches Mahnwesen für} {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>wie viel Geld steckt bei {{company_name}} gerade in &uuml;berf&auml;lligen Rechnungen?</p>
<p>Bei den meisten Handwerksbetrieben sind es 10.000 bis 50.000&nbsp;&euro;. Nicht weil Kunden nicht zahlen wollen &ndash; sondern weil niemand Zeit hat, hinterherzutelefonieren.</p>
<p>Wir haben ein automatisches Mahnsystem gebaut: Stufe&nbsp;1 nach 3&nbsp;Tagen, Stufe&nbsp;2 nach 10&nbsp;Tagen, Stufe&nbsp;3 nach 21&nbsp;Tagen. Kein Aufwand f&uuml;r Sie.</p>
<p>F&uuml;r 3&nbsp;Betriebe richten wir das kostenlos ein. Interesse?</p>
<p>Antworten Sie einfach auf diese E-Mail.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 0,
    channel: 'linkedin',
    bodyTemplate: 'Hallo {{first_name}}, ich beschäftige mich mit KI-Automatisierung im Handwerk und bin auf {{company_name}} aufmerksam geworden. Würde mich freuen, uns zu vernetzen.'
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: '{Spintax: 35 % der Anfragen bleiben liegen|Antworten in 2 statt 24 Minuten}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>35&nbsp;% der Kundenanfragen im Handwerk bleiben l&auml;nger als 24&nbsp;Stunden unbeantwortet (Handwerkskammer). Der h&auml;ufigste Grund: Der Meister ist auf der Baustelle.</p>
<p>Was w&auml;re, wenn jede Anfrage innerhalb von 2&nbsp;Minuten eine professionelle Best&auml;tigung bekommt? Automatisch, auch am Wochenende. Ohne IT-Aufwand.</p>
<p>Interessant f&uuml;r {{company_name}}?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 14,
    channel: 'email',
    subject: '{Spintax: Angebote 70 % schneller|Von 45 auf 10 Minuten pro Angebot}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein SHK-Betrieb aus Bayern erstellt Angebote jetzt in 10 statt 45&nbsp;Minuten. Der Ablauf:</p>
<ul>
<li>Anfrage kommt rein (E-Mail, Formular, WhatsApp)</li>
<li>KI erkennt Auftragsart und erstellt Entwurf</li>
<li>Meister pr&uuml;ft, passt an, versendet</li>
</ul>
<p>Weniger B&uuml;roarbeit am Abend. Schnellere Angebote. Zufriedenere Kunden.</p>
<p>Unser KI-Quickcheck zeigt in 2&nbsp;Stunden, wo bei {{company_name}} das gr&ouml;&szlig;te Potenzial liegt. 490&nbsp;&euro;, konkreter Report.</p>
<p>Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 22,
    channel: 'email',
    subject: '{Spintax: Kurze Frage an Sie|Was frisst Ihre Abende?}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>welcher Prozess bei {{company_name}} kostet Sie aktuell am meisten Zeit?</p>
<p>Angebotserstellung, Auftragsplanung, Rechnungsstellung, Kundenkommunikation &ndash; meistens gibt es einen Bereich, der sich mit KI sofort optimieren l&auml;sst.</p>
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
<p>Oder testen Sie unseren kostenlosen <a href="https://praxisnovaai.com/potenzialrechner">KI-Potenzialrechner</a> &ndash; dauert 2&nbsp;Minuten.</p>
<p>Alles Gute!</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
