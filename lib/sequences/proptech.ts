/**
 * PropTech + Hausverwaltung Sequenz (ICP-Switch 2026-04-21)
 *
 * [ANGIE-REVIEW-NOTWENDIG] Platzhalter-Templates, Claude Code generiert.
 * Review vor dem ersten Versand. Kein Einzel-Touch geht live ohne Angies OK.
 *
 * ICP: icp-proptech (PropTech-Anbieter), icp-hausverwaltung (Hausverwaltungen)
 * Target-Sequenz-Name in Apollo: PropTech-Hausverwaltung-DE-Workshop
 * 5 Touches ueber 12 Tage.
 *
 * Hook: Foerder-Orientierung ohne Prozent-Zahlen (PLATFORM-STANDARDS 1.1).
 * CTA: Potenzial-Check buchen (10 Min Call).
 *
 * Forbidden-Phrases-Liste siehe scripts/legal-scan.sh und
 * PLATFORM-STANDARDS 1.1. legal-scan MUSS gruen bleiben.
 */
import type { SequenceStep } from './allgemein.ts';

export const proptechSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: KI-Potenzial bei|Automatisierung fuer} {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>Hausverwaltungen und PropTech-Anbieter sind gerade an zwei Fronten gefragt. Eigentuemer erwarten digitalere Prozesse, gleichzeitig binden Standard-Aufgaben wie Mieterkommunikation, Nebenkostenabrechnung oder Mangelmeldungen viel Zeit im Team.</p>
<p>Wir zeigen in einem 90-Minuten-Potenzial-Check, welche dieser Prozesse bei {{company_name}} mit KI konkret entlastet werden. Inklusive kurzer Orientierung zu passenden Foerderprogrammen fuer Ihre Groesse und Region.</p>
<p>Passt ein 10-Minuten-Call in der naechsten Woche zum Abstimmen?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: '{Spintax: Case-Study-Teaser|Wie ein PropTech-Team Zeit zurueckgewonnen hat} fuer {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ein PropTech-Team aus Hamburg hat uns letzten Monat konkret gesagt, woran sie gescheitert sind und wo KI zuerst half. Drei Dinge, die wir aus dem Gespraech mitgenommen haben:</p>
<ul>
<li>Mieteranfragen per Mail laufen in einer Stunde statt drei durch</li>
<li>Nebenkostenabrechnungs-Entwuerfe aus Rohdaten in Minuten, nicht Tagen</li>
<li>Mangelmeldungen kategorisiert und priorisiert, bevor der Verwalter sie sieht</li>
</ul>
<p>Kein Systemwechsel, kein IT-Grossprojekt. Die ausfuehrliche Case-Study teilen wir gerne im Potenzial-Check.</p>
<p>Interesse an einer kurzen Abstimmung?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 3,
    dayOffset: 6,
    channel: 'email',
    subject: '{Spintax: Workshop-Agenda|Konkreter Fahrplan} fuer {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>unser Inhouse-Workshop fuer Hausverwaltungen und PropTech-Teams dauert einen halben oder einen ganzen Tag. Inhalt:</p>
<ul>
<li>Tool-Ueberblick: welche KI-Tools fuer welche Aufgabe sinnvoll sind</li>
<li>Workflow-Bau: drei konkrete Prozesse aus Ihrem Alltag werden am Tag automatisiert</li>
<li>Prompt-Strukturen: das Team lernt, wie gute Eingaben aussehen</li>
<li>Foerder-Orientierung: wir pruefen gemeinsam, welche Programme fuer Sie in Frage kommen</li>
</ul>
<p>Im 10-Minuten-Call klaeren wir, ob und wie das zu {{company_name}} passt.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 9,
    channel: 'email',
    subject: '{Spintax: DFY-Alternative|Wenn kein Workshop-Slot frei ist} fuer {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>falls kein interner Workshop-Slot frei ist, bauen wir Ihre ersten KI-Prozesse direkt fuer Sie. Beispiele aus laufenden Projekten mit PropTech und Hausverwaltung:</p>
<ul>
<li>Inbox-Assistant, der eingehende Mails klassifiziert und Entwuerfe vorbereitet</li>
<li>Reporting-Bot, der Kennzahlen aus Excel und API-Quellen zusammenzieht</li>
<li>Dokumenten-Parser fuer Mietvertraege, Gutachten, Nebenkostenabrechnungen</li>
</ul>
<p>Festpreis, klarer Liefertermin. Passt fuer Teams, die schneller loslegen wollen als es interne Workshops ermoeglichen.</p>
<p>Kurz telefonieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 12,
    channel: 'email',
    subject: '{Spintax: Letzter Hinweis|Kurz vor Schluss der Kontaktaufnahme} fuer {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich respektiere Ihre Zeit und melde mich zum letzten Mal zu diesem Thema.</p>
<p>Falls Sie spaeter sehen moechten, welche Prozesse bei {{company_name}} am meisten Hebel bieten, ist der 90-Minuten-Potenzial-Check jederzeit buchbar. Orientierung zu Foerderprogrammen ist Teil des Calls.</p>
<p>Alles Gute fuer die naechsten Wochen.</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
