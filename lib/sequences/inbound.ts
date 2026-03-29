import { SequenceStep } from './allgemein';

export const inboundSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Bitte bestätigen Sie Ihre Anmeldung',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>vielen Dank f&uuml;r Ihr Interesse an PraxisNova AI! Bevor wir Ihnen weitere Informationen zusenden, bitten wir Sie, Ihre E-Mail-Adresse zu best&auml;tigen.</p>
<p>Bitte klicken Sie auf den folgenden Link, um Ihre Anmeldung abzuschlie&szlig;en:</p>
<p><a href="{{OPT_IN_LINK}}">Jetzt E-Mail-Adresse best&auml;tigen</a></p>
<p>Falls Sie diese Anmeldung nicht durchgef&uuml;hrt haben, k&ouml;nnen Sie diese Nachricht einfach ignorieren.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 1,
    channel: 'email',
    subject: 'Erinnerung: Bitte bestätigen Sie Ihre Anmeldung',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>wir haben gestern eine Best&auml;tigungsmail an Sie gesendet. Falls Sie diese &uuml;bersehen haben &ndash; bitte klicken Sie auf den folgenden Link, um Ihre Anmeldung abzuschlie&szlig;en:</p>
<p><a href="{{OPT_IN_LINK}}">Jetzt E-Mail-Adresse best&auml;tigen</a></p>
<p>Nach der Best&auml;tigung erhalten Sie von uns wertvolle Informationen rund um KI-Automatisierung f&uuml;r Ihr Unternehmen.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 3,
    dayOffset: 0,
    channel: 'email',
    subject: 'Willkommen bei PraxisNova AI, {{first_name}}!',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>herzlich willkommen! Sch&ouml;n, dass Sie dabei sind.</p>
<p>Sie haben sich &uuml;ber unsere Website f&uuml;r weitere Informationen angemeldet. Hier eine kurze &Uuml;bersicht, wie wir Unternehmen wie {{company_name}} unterst&uuml;tzen:</p>
<p>Unser <strong>KI-Potenzialrechner</strong> zeigt Ihnen in 2&nbsp;Minuten, wo in Ihrem Unternehmen das gr&ouml;&szlig;te Automatisierungspotenzial liegt &ndash; kostenlos und unverbindlich.</p>
<p>Probieren Sie es gerne aus: <a href="https://praxisnovaai.com/potenzialrechner">Zum KI-Potenzialrechner</a></p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 7,
    channel: 'email',
    subject: 'Wie Unternehmen mit KI 15 Stunden pro Woche sparen',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>wussten Sie, dass viele unserer Kunden bereits nach wenigen Wochen sp&uuml;rbare Ergebnisse sehen?</p>
<p>Ein mittelst&auml;ndisches Unternehmen hat mit unserer Hilfe 15&nbsp;Stunden pro Woche an manueller B&uuml;roarbeit eingespart &ndash; durch KI-gest&uuml;tzte Automatisierung von Routineaufgaben wie Angebotserstellung, Rechnungspr&uuml;fung und Kundenkommunikation.</p>
<p>Das Ergebnis: Weniger Fehler, schnellere Reaktionszeiten und mehr Zeit f&uuml;r die Aufgaben, die wirklich z&auml;hlen.</p>
<p>Der erste Schritt war unser <strong>KI-Quickcheck</strong> &ndash; ein kompakter 2-Stunden-Audit, bei dem wir gemeinsam Prozesse analysieren und die drei gr&ouml;&szlig;ten Automatisierungshebel identifizieren.</p>
<p>F&uuml;r einmalig 490&nbsp;&euro; erhalten Sie einen personalisierten Report mit konkreten Handlungsempfehlungen.</p>
<p>Interesse? Hier k&ouml;nnen Sie direkt einen Termin buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 18,
    channel: 'email',
    subject: 'Welcher Prozess kostet Sie am meisten Zeit?',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>eine kurze Frage: Welcher Prozess in Ihrem Unternehmen kostet Sie aktuell am meisten Zeit?</p>
<p>Ob Angebotserstellung, Kundenanfragen beantworten, Rechnungen schreiben oder Berichte erstellen &ndash; meistens gibt es einen Bereich, der sich mit KI besonders schnell optimieren l&auml;sst.</p>
<p>Schreiben Sie mir gerne &ndash; ich gebe Ihnen eine kurze Einsch&auml;tzung, ob und wie KI dort helfen kann. Kostenlos und unverbindlich.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 6,
    dayOffset: 30,
    channel: 'email',
    subject: 'Noch Fragen zu KI für {{company_name}}?',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich wollte mich kurz melden und fragen, ob Sie noch Fragen zu KI-Automatisierung f&uuml;r {{company_name}} haben.</p>
<p>Falls Sie unsicher sind, wo Sie anfangen sollen &ndash; genau daf&uuml;r gibt es unseren KI-Quickcheck. In 2&nbsp;Stunden bekommen Sie Klarheit &uuml;ber Ihre wichtigsten Automatisierungspotenziale.</p>
<p>Hier geht es zur Terminbuchung: {{CALENDLY_LINK}}</p>
<p>Oder testen Sie unseren kostenlosen <a href="https://praxisnovaai.com/potenzialrechner">KI-Potenzialrechner</a> &ndash; dauert nur 2&nbsp;Minuten.</p>
<p>Ich freue mich auf Ihre R&uuml;ckmeldung.</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
