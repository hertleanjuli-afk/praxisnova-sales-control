/**
 * Pure Helper-Funktionen fuer Dashboard-V2 Metriken (Track 1, T1.2).
 *
 * Keine DB-, Keine IO-Abhaengigkeiten. Alle Funktionen sind deterministisch
 * und reine Datenverarbeitung, damit sie in __tests__/helpers/metrics.test.ts
 * ohne DB getestet werden koennen.
 *
 * SQL-Queries leben separat in lib/metrics-queries.ts.
 */

/**
 * Iso-Woche laut Spec Teil 1.1. Montag ist Wochenstart, Woche enthaelt
 * Donnerstag des Jahres. Wir geben den Montag 00:00 UTC zurueck.
 */
export function startOfIsoWeek(now: Date): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  if (dayNum !== 1) {
    d.setUTCDate(d.getUTCDate() - (dayNum - 1));
  }
  return d;
}

export function startOfLastIsoWeek(now: Date): Date {
  const thisMonday = startOfIsoWeek(now);
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  return lastMonday;
}

export function startOfToday(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function daysFromNow(now: Date, days: number): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export interface TimeWindows {
  today: string;
  thisWeek: string;
  lastWeekStart: string;
  lastWeekEnd: string;
  monthStart: string;
  now: string;
}

/**
 * Liefert ISO-Strings fuer alle Zeit-Anker die Spec Teil 1.1-1.5 braucht.
 * API-Route und Page nutzen dieselben Anker, damit Zahlen konsistent sind.
 */
export function buildTimeWindows(now: Date = new Date()): TimeWindows {
  const today = startOfToday(now);
  const thisWeek = startOfIsoWeek(now);
  const lastWeekStart = startOfLastIsoWeek(now);
  const lastWeekEnd = thisWeek;
  const monthStart = startOfMonth(now);
  return {
    today: today.toISOString(),
    thisWeek: thisWeek.toISOString(),
    lastWeekStart: lastWeekStart.toISOString(),
    lastWeekEnd: lastWeekEnd.toISOString(),
    monthStart: monthStart.toISOString(),
    now: now.toISOString(),
  };
}

/**
 * LinkedIn-Conversion-Rate laut Spec Teil 1.3: angenommene / verschickte.
 * Sauber gerundet auf 1 Nachkommastelle. Null-Schutz bei 0 Anfragen.
 */
export function calcConversionRate(
  sent: number,
  accepted: number
): number {
  if (sent <= 0) return 0;
  const raw = (accepted / sent) * 100;
  return Math.round(raw * 10) / 10;
}

export interface SectorCount {
  sector: string;
  count: number;
}

export interface ConsistencyReport {
  totalLeads: number;
  sectorSum: number;
  consistent: boolean;
  delta: number;
}

/**
 * Konsistenz-Invariante aus Track-1-Prompt T1.2: Summe aller
 * ICP-Branchen-Counts muss gleich Gesamt-Count sein. Weicht es ab, wird im
 * UI ein rotes Warn-Banner gezeigt.
 */
export function checkConsistency(
  sectorBreakdown: readonly SectorCount[],
  totalLeads: number
): ConsistencyReport {
  const sectorSum = sectorBreakdown.reduce(
    (acc, row) => acc + (row.count || 0),
    0
  );
  const delta = sectorSum - totalLeads;
  return {
    totalLeads,
    sectorSum,
    consistent: delta === 0,
    delta,
  };
}

/**
 * Maximal-Step pro Sequenz-Typ. Quelle: lib/sequences/*.ts.
 * Spec Teil 1.2 definiert "Sequenzen auf letztem Step" als
 * sequence_step >= maxStep.
 *
 * Hinweis: Werte sind bewusst im Code gepflegt, weil die sequences als
 * strukturierte Daten vorliegen und keine icp_config-Tabelle aktiv ist.
 * Bei Einfuehrung von icp_config (separater Track) sollte diese Map aus
 * der Tabelle geladen werden.
 */
export const SEQUENCE_MAX_STEPS: Record<string, number> = {
  allgemein: 7,
  bauunternehmen: 6,
  handwerk: 6,
  immobilien: 6,
  inbound: 6,
} as const;

export function isOnLastStep(
  sequenceType: string | null,
  sequenceStep: number | null
): boolean {
  if (!sequenceType || sequenceStep == null) return false;
  const max = SEQUENCE_MAX_STEPS[sequenceType];
  if (max == null) return false;
  return sequenceStep >= max;
}
