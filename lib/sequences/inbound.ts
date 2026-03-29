import { SequenceStep } from './allgemein';

// A/B Subject Line Varianten:
// Step 1: A) "Bitte bestätigen Sie Ihre Anmeldung" (kein A/B, rechtlich erforderlich)
// Step 2: A) "Erinnerung: Anmeldung bestätigen" (kein A/B)
// Step 3: A) "Willkommen bei PraxisNova AI" B) "Schön, dass Sie dabei sind"
// Step 4: A) "15 Stunden pro Woche gespart" B) "Wie Unternehmen KI nutzen"
// Step 5: A) "Kurze Frage an Sie" B) "Was kostet Sie am meisten Zeit?"
// Step 6: A) "Haben Sie noch Fragen?" B) "Noch Fragen zu KI für {{company_name}}?"

export const inboundSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: 'Bitte bestätigen Sie Ihre Anmeldung',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>vielen Dank f&uuml;r Ihr Interesse an PraxisNova AI!</p>
<p>Bitte best&auml;tigen Sie Ihre E-Mail-Adresse, damit wir Ihnen weitere Informationen zusenden k&ouml;nnen:</p>
<p><a href="{{OPT_IN_LINK}}">Jetzt E-Mail-Adresse best&auml;tigen</a></p>
<p>Falls Sie diese Anmeldung nicht durchgef&uuml;hrt haben, ignorieren Sie diese Nachricht einfach.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 1,
    channel: 'email',
    subject: 'Erinnerung: Anmeldung bestätigen',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>wir haben gestern eine Best&auml;tigungsmail an Sie gesendet. Falls Sie diese &uuml;bersehen haben:</p>
<p><a href="{{OPT_IN_LINK}}">Jetzt E-Mail-Adresse best&auml;tigen</a></p>
<p>Nach der Best&auml;tigung erhalten Sie von uns Informationen rund um KI-Automatisierung f&uuml;r Ihr Unternehmen.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 3,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: Willkommen bei PraxisNova AI|Schön, dass Sie dabei sind}, {{first_name}}!',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>herzlich willkommen! Sch&ouml;n, dass Sie dabei sind.</p>
<p>Unser <strong>KI-Potenzialrechner</strong> zeigt Ihnen in 2&nbsp;Minuten, wo in Ihrem Unternehmen das gr&ouml;&szlig;te Automatisierungspotenzial liegt &ndash; kostenlos und unverbindlich.</p>
<p><a href="https://praxisnovaai.com/potenzialrechner">Zum KI-Potenzialrechner</a></p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 7,
    channel: 'email',
    subject: '{Spintax: 15 Stunden pro Woche gespart|Wie Unternehmen KI nutzen}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein mittelst&auml;ndisches Unternehmen hat mit unserer Hilfe 15&nbsp;Stunden pro Woche an manueller B&uuml;roarbeit eingespart.</p>
<p>Der erste Schritt war unser <strong>KI-Quickcheck</strong>: Ein kompakter 2-Stunden-Audit, bei dem wir gemeinsam Prozesse analysieren und die drei gr&ouml;&szlig;ten Automatisierungshebel identifizieren.</p>
<p>490&nbsp;&euro;, personalisierter Report mit konkreten Handlungsempfehlungen.</p>
<p>Interesse? Hier direkt buchen: {{CALENDLY_LINK}}</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 18,
    channel: 'email',
    subject: '{Spintax: Kurze Frage an Sie|Was kostet Sie am meisten Zeit?}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>welcher Prozess in Ihrem Unternehmen kostet Sie aktuell am meisten Zeit?</p>
<p>Angebotserstellung, Kundenanfragen, Rechnungen, Berichte &ndash; meistens gibt es einen Bereich, der sich mit KI schnell optimieren l&auml;sst.</p>
<p>Ich gebe Ihnen gerne eine kurze Einsch&auml;tzung &ndash; kostenlos und unverbindlich. Einfach auf diese E-Mail antworten.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 6,
    dayOffset: 30,
    channel: 'email',
    subject: '{Spintax: Haben Sie noch Fragen?|Noch Fragen zu KI für {{company_name}}?}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich wollte kurz fragen, ob Sie noch Fragen zu KI-Automatisierung f&uuml;r {{company_name}} haben.</p>
<p>Falls Sie unsicher sind, wo Sie anfangen sollen: Unser KI-Quickcheck gibt Ihnen in 2&nbsp;Stunden Klarheit.</p>
<p>Termin buchen: {{CALENDLY_LINK}}</p>
<p>Oder testen Sie unseren kostenlosen <a href="https://praxisnovaai.com/potenzialrechner">KI-Potenzialrechner</a> &ndash; dauert 2&nbsp;Minuten.</p>
<p>Ich freue mich auf Ihre R&uuml;ckmeldung.</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
