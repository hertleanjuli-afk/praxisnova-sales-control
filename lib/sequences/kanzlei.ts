/**
 * Kanzleien Sequenz, Steuerberater + Anwaelte (ICP-Switch 2026-04-21)
 *
 * [ANGIE-REVIEW-NOTWENDIG] Platzhalter-Templates, Claude Code generiert.
 * Review vor dem ersten Versand. Kein Einzel-Touch geht live ohne Angies OK.
 *
 * ICP: icp-kanzlei
 * Target-Sequenz-Name in Apollo: Kanzleien-Steuerberater-DE-Workshop
 * 5 Touches ueber 12 Tage.
 *
 * Hook: AZAV-Vermittlung rechtssicher formuliert. Kein direktes AZAV-Versprechen
 * von PraxisNova AI (PLATFORM-STANDARDS 1.1), sondern Vermittlung akkreditierter
 * Trainings-Partner.
 *
 * DSGVO-Sensibilitaet: Kanzleien arbeiten selbst mit Mandantendaten, daher
 * prominente Datenschutz-Erwaehnung in Touch 1 und Touch 3.
 */
import { SequenceStep } from './allgemein';

export const kanzleiSequence: SequenceStep[] = [
  {
    step: 1,
    dayOffset: 0,
    channel: 'email',
    subject: '{Spintax: KI in der Kanzlei|Zeit zurueckgewinnen in} {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>Kanzleien arbeiten unter hohem Termindruck und gleichzeitig mit sensiblen Mandantendaten. Genau dort sehen wir aktuell den groessten Hebel fuer KI: Texte zusammenfassen, Dokumente strukturieren, wiederkehrende Schriftsaetze vorbereiten. Unterbrechungsfrei und in dem Setup, das Ihre Datenschutz-Anforderungen einhaelt.</p>
<p>Wir fuehren regelmaessig Inhouse-Workshops fuer Steuerberater und Anwaelte durch. Fuer passende Foerderprogramme vermitteln wir bei Bedarf akkreditierte Trainings-Partner.</p>
<p>Hat ein 10-Minuten-Potenzial-Check in den naechsten Tagen Platz bei Ihnen?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 2,
    dayOffset: 3,
    channel: 'email',
    subject: '{Spintax: Drei Use-Cases|Was Kanzleien zuerst automatisieren} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>aus Gespraechen mit Steuer- und Anwaltskanzleien der letzten Wochen kristallisieren sich drei Einstiegspunkte heraus:</p>
<ul>
<li>Mandanten-Onboarding: KI strukturiert Unterlagen und bereitet Erstgespraeche vor</li>
<li>Wiederkehrende Schriftsaetze: Entwurf aus Falldatei, Anwalt oder Berater prueft und finalisiert</li>
<li>Fristen- und Aktenmanagement: automatische Zusammenfassungen, Erinnerungen, Eskalationen</li>
</ul>
<p>Nichts davon verlaesst Ihre Hoheit. Das besprechen wir im Potenzial-Check inklusive der Datenschutz-Rahmenbedingungen.</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 3,
    dayOffset: 6,
    channel: 'email',
    subject: '{Spintax: Workshop-Inhalte|Was Ihr Team mitnimmt} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>unser Inhouse-Workshop fuer Kanzleien dauert einen halben oder einen ganzen Tag. Agenda im Kern:</p>
<ul>
<li>Rechts- und datenschutz-konforme Tool-Auswahl, abgestimmt auf Berufsrecht</li>
<li>Workflow-Bau an drei eigenen Faellen aus dem Kanzleialltag</li>
<li>Prompt-Strukturen fuer typische Schriftsatz- und Analyse-Aufgaben</li>
<li>Orientierung zu Foerderprogrammen, wir vermitteln bei Bedarf AZAV-zertifizierte Trainings-Partner</li>
</ul>
<p>Mandantendaten bleiben im Workshop ausserhalb von Fremd-Servern. Das Setup legen wir vorher fest.</p>
<p>10-Minuten-Call zum Abstimmen?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 4,
    dayOffset: 9,
    channel: 'email',
    subject: '{Spintax: DFY fuer Kanzleien|Wenn kein Schulungs-Slot frei ist} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>falls ein interner Workshop-Slot gerade nicht passt, setzen wir Ihre ersten zwei oder drei KI-Workflows direkt um. Aktuelle Beispiele aus Kanzlei-Projekten:</p>
<ul>
<li>Mandanten-Intake, KI bereitet den Berater-Termin strukturiert vor</li>
<li>Schriftsatz-Entwuerfe aus Akte, Anwalt prueft und unterschreibt</li>
<li>Fristen-Ueberwachung mit automatischer Wochenagenda fuer das Team</li>
</ul>
<p>Festpreis, klarer Liefertermin, Rollout mit Ihrem Team.</p>
<p>Kurz telefonieren?</p>
{{SIGNATURE}}
{{FOOTER}}`
  },
  {
    step: 5,
    dayOffset: 12,
    channel: 'email',
    subject: '{Spintax: Letzter Hinweis|Ich lasse Ihnen Ruhe} bei {{company_name}}',
    bodyTemplate: `<p>{{SALUTATION}},</p>
<p>ich respektiere Ihre Zeit und melde mich zum letzten Mal zu diesem Thema.</p>
<p>Falls Sie spaeter pruefen moechten, welche KI-Workflows bei {{company_name}} mandanten-sicher laufen, ist der 90-Minuten-Potenzial-Check jederzeit buchbar. Foerder-Orientierung ist Teil des Calls.</p>
<p>Alles Gute fuer die kommende Fristenphase.</p>
{{SIGNATURE}}
{{FOOTER}}`
  }
];
