/**
 * Digitale Agenturen Sequenz (ICP-Switch 2026-04-21)
 *
 * [ANGIE-REVIEW-NOTWENDIG] Platzhalter-Templates, Claude Code generiert.
 * Review vor dem ersten Versand. Kein Einzel-Touch geht live ohne Angies OK.
 *
 * ICP: icp-agentur
 * Target-Sequenz-Name in Apollo: Digitale-Agenturen-DE-DFY
 * 4 Touches ueber 10 Tage.
 *
 * Hook: White-Label + Done-for-you. Foerder-Hinweis bleibt Nebenpunkt
 * ohne Prozent-Zahlen (PLATFORM-STANDARDS 1.1).
 */
import type { SequenceStep } from './allgemein.ts';

export const agenturSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: White-Label-KI|Neue Umsatzlinie} fuer {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>Agenturen erweitern ihr Leistungsspektrum gerade um KI-Automatisierung, ohne selbst ein Engineering-Team aufbauen zu muessen. Wir liefern die Bausteine unter Ihrem Brand: Workflows, Prompts, Integrationen.</p>
<p>Drei Beispiele, die wir aktuell fuer Agenturen umsetzen:</p>
<ul>
<li>Content-Pipelines, die auf Knopfdruck Varianten in der Kunden-Tonalitaet liefern</li>
<li>Inbox- und Ticket-Automationen, die eingehende Anfragen vorqualifizieren</li>
<li>Reporting-Bots, die Kampagnen-KPIs zusammenfassen und als Kunden-Draft rausgehen</li>
</ul>
<p>Passt ein 10-Minuten-Call zum Abklopfen, ob White-Label fuer {{company_name}} Sinn ergibt?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: '{Spintax: Case-Skizze|So sah das letzte Agentur-Projekt aus} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>kurze Skizze eines laufenden Agentur-Projekts:</p>
<ul>
<li>Ausgangspunkt: Kundenbetreuer schrieben zwei Stunden pro Reporting-Zyklus manuelle Monatsreports</li>
<li>Loesung: Reporting-Bot zieht Daten aus Ads-Plattformen, erzeugt Text-Draft, Account-Lead checkt und schickt raus</li>
<li>Effekt: sechs von acht Stunden pro Monat pro Account frei, Margen pro Kunde gestiegen</li>
</ul>
<p>Unter Ihrer Marke ausgeliefert. Details und die technische Seite teile ich im Gespraech.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 3,
    dayOffset: 7,
    channel: 'email',
    subject: '{Spintax: DFY-Fahrplan|Was im Festpreis drin ist} fuer {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>Done-for-you-Projekte fuer Agenturen laufen bei uns typisch so:</p>
<ul>
<li>Scoping-Call, wir definieren Workflow, Datenquellen, Ausgabe</li>
<li>Prototyp in zwei Wochen, getestet mit einem echten Ihrer Accounts</li>
<li>Rollout auf drei bis fuenf Accounts, Uebergabe-Dokumentation fuer Ihr Team</li>
</ul>
<p>Wir arbeiten White-Label, d.h. gegenueber Ihrem Endkunden erscheint Ihre Agentur als Absender. Bei Bedarf geben wir Orientierung zu Foerderprogrammen, damit Sie diese Gespraeche mit Ihren Kunden sauber fuehren koennen.</p>
<p>Kurz telefonieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 10,
    channel: 'email',
    subject: '{Spintax: Letzter Hinweis|Ich lasse es ruhen} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich respektiere Ihre Zeit und melde mich zum letzten Mal.</p>
<p>Falls White-Label-KI spaeter relevant wird, liegt der 10-Minuten-Potenzial-Check immer bereit. Am schnellsten kommen wir zu einem Ergebnis, wenn Sie einen konkreten Engpass im Kopf haben, den Sie loesen wollen.</p>
<p>Alles Gute fuer den naechsten Pitch.</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
