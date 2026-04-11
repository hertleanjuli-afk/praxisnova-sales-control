/**
 * Out-of-Office Detector (Paket A, 2026-04-11)
 *
 * Pure Funktion ohne IO. Nimmt Subject, Body und Headers einer Email
 * und entscheidet ob es sich um eine Abwesenheitsnotiz (Out-of-Office,
 * Auto-Reply, Urlaubsnachricht) handelt. Wenn ja: versucht zusätzlich
 * ein Rückkehrdatum aus dem Text zu parsen.
 *
 * Drei Confidence-Stufen:
 *
 *  - `high`: ein RFC-definierter Auto-Submitted Header ist gesetzt.
 *    Das ist technisch explizit - kein False Positive möglich.
 *  - `medium`: Subject matcht ein typisches OOO-Muster (z.B. "Out of
 *    Office" oder "Abwesenheitsnotiz").
 *  - `low`: kein Subject-Match, aber der Body enthält eine OOO-Phrase
 *    wie "ich bin bis ... nicht erreichbar".
 *
 * Warum diese Funktion wichtig ist: ohne OOO-Detection würde der
 * gmail-reply-sync Cron jede Abwesenheitsnotiz als "echten Reply"
 * verarbeiten. Das würde bedeuten:
 *   - Lead auf pipeline_stage = 'Replied' setzen (falsch)
 *   - 9-Monats-Firmenblockade auslösen (katastrophal, betrifft alle
 *     anderen Leads derselben Firma obwohl der Kontakt nur im Urlaub ist)
 *   - Angies manuelle Nachfass-Queue vergiften
 *
 * Deshalb hat die Detection Vorrang vor der Reply-Verarbeitung.
 */

// ─── Ergebnis-Typ ────────────────────────────────────────────────────────

export type OOOResult = {
  isOOO: boolean;
  confidence: 'high' | 'medium' | 'low' | null;
  returnDate: Date | null;
  matchedPattern: string | null;
  /** Ein kurzer lesbarer Grund, z.B. für Logging/Debugging. */
  reason: string | null;
};

// ─── Input ───────────────────────────────────────────────────────────────

export type OOOInput = {
  subject: string | null;
  body: string | null;
  /** Optional: Auto-Submitted / X-Autoreply / Precedence Header. */
  autoSubmitted: string | null;
  xAutoreply: string | null;
  xAutoresponse: string | null;
  precedence: string | null;
};

// ─── Header-basierte Detection (höchste Confidence) ──────────────────────

function checkAutoSubmittedHeaders(input: OOOInput): OOOResult | null {
  // RFC 3834: "Auto-Submitted" Header
  if (input.autoSubmitted) {
    const val = input.autoSubmitted.toLowerCase();
    if (val.includes('auto-replied') || val.includes('auto-generated')) {
      return {
        isOOO: true,
        confidence: 'high',
        returnDate: null,
        matchedPattern: `Auto-Submitted: ${input.autoSubmitted}`,
        reason: 'RFC 3834 Auto-Submitted Header gesetzt',
      };
    }
  }

  // Nicht-standard aber weit verbreitet: X-Autoreply
  if (input.xAutoreply) {
    const val = input.xAutoreply.toLowerCase().trim();
    if (val === 'yes' || val === 'true' || val === '1') {
      return {
        isOOO: true,
        confidence: 'high',
        returnDate: null,
        matchedPattern: `X-Autoreply: ${input.xAutoreply}`,
        reason: 'X-Autoreply Header gesetzt',
      };
    }
  }

  if (input.xAutoresponse) {
    const val = input.xAutoresponse.toLowerCase().trim();
    if (val === 'yes' || val === 'true' || val === '1') {
      return {
        isOOO: true,
        confidence: 'high',
        returnDate: null,
        matchedPattern: `X-Autoresponse: ${input.xAutoresponse}`,
        reason: 'X-Autoresponse Header gesetzt',
      };
    }
  }

  // Precedence: auto_reply / bulk
  if (input.precedence) {
    const val = input.precedence.toLowerCase().trim();
    if (val === 'auto_reply' || val === 'auto-reply' || val === 'bulk') {
      return {
        isOOO: true,
        confidence: 'high',
        returnDate: null,
        matchedPattern: `Precedence: ${input.precedence}`,
        reason: 'Precedence Header markiert als Auto-Reply',
      };
    }
  }

  return null;
}

// ─── Subject-basierte Detection (mittlere Confidence) ────────────────────

const SUBJECT_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /^(automatische\s*)?antwort(\s*\(abwesenheit\))?/i, reason: 'Subject: Automatische Antwort' },
  { regex: /^(automatic\s*)?(reply|response)/i, reason: 'Subject: Automatic Reply' },
  { regex: /^auto[\s-]?reply/i, reason: 'Subject: Auto-Reply' },
  { regex: /^auto[\s-]?responder/i, reason: 'Subject: Auto-Responder' },
  { regex: /^abwesen(heit|d|heitsnotiz)/i, reason: 'Subject: Abwesenheit' },
  { regex: /^out[\s-]?of[\s-]?office/i, reason: 'Subject: Out of Office' },
  { regex: /^(i am|i'm)\s+out\s+of\s+office/i, reason: 'Subject: I am out of office' },
  { regex: /^urlaub(snotiz|svertretung)?/i, reason: 'Subject: Urlaub' },
  { regex: /^im\s+urlaub/i, reason: 'Subject: Im Urlaub' },
  { regex: /^vacation|^on\s+holiday|^on\s+leave/i, reason: 'Subject: Vacation/Holiday/Leave' },
  { regex: /^(aus|ausser|ausserhalb)\s+(dem)?\s*b(ü|ue)ro/i, reason: 'Subject: Ausser Buero' },
  { regex: /^(nicht\s+)?erreichbar/i, reason: 'Subject: Nicht erreichbar' },
  { regex: /^dienstreise/i, reason: 'Subject: Dienstreise' },
  { regex: /^krank(meldung)?/i, reason: 'Subject: Krankmeldung' },
];

function checkSubjectPattern(subject: string | null): { matched: boolean; reason: string | null } {
  if (!subject) return { matched: false, reason: null };
  for (const { regex, reason } of SUBJECT_PATTERNS) {
    if (regex.test(subject)) return { matched: true, reason };
  }
  return { matched: false, reason: null };
}

// ─── Body-basierte Detection (niedrigste Confidence) ─────────────────────

const BODY_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  // Deutsch
  { regex: /ich\s+bin\s+(derzeit|aktuell|momentan|zur(\s+)?zeit)?\s*(bis|wieder\s+am|zur(ü|ue)ck\s+am|ab\s+dem)/i, reason: 'Body DE: ich bin bis/zurueck am' },
  { regex: /bin\s+(im|auf|in)\s+urlaub/i, reason: 'Body DE: bin im Urlaub' },
  { regex: /befinde\s+mich\s+(derzeit|aktuell|im)\s+urlaub/i, reason: 'Body DE: befinde mich im Urlaub' },
  { regex: /(au(ß|ss)er|nicht\s+im)\s+haus|nicht\s+im\s+b(ü|ue)ro|nicht\s+erreichbar/i, reason: 'Body DE: ausser Haus / nicht erreichbar' },
  { regex: /abwesenheitsnotiz/i, reason: 'Body DE: Abwesenheitsnotiz' },
  { regex: /(in\s+dringenden\s+f(ä|ae)llen|in\s+eiligen\s+f(ä|ae)llen)/i, reason: 'Body DE: in dringenden Faellen' },
  { regex: /wende\s+sie\s+sich\s+(bitte\s+)?an/i, reason: 'Body DE: wenden Sie sich an' },
  { regex: /vertretung\s+(ü|ue)bernimmt|meine\s+vertretung/i, reason: 'Body DE: Vertretung' },

  // English
  { regex: /(i\s+am|i'm)\s+(currently\s+)?(out\s+of\s+office|away|on\s+vacation|on\s+holiday|on\s+leave)/i, reason: 'Body EN: I am out of office' },
  { regex: /(i\s+will|i'll)\s+be\s+(back|returning|out\s+of\s+office)/i, reason: 'Body EN: I will be back' },
  // Workaround für TS Target < ES2018: kein /s Flag, stattdessen [\s\S]
  { regex: /thank\s+you\s+for\s+your\s+(email|message)[\s\S]+?(out\s+of\s+office|away|unavailable)/i, reason: 'Body EN: Thank you for your email ... out of office' },
  { regex: /automated\s+(reply|response)/i, reason: 'Body EN: automated reply' },
  { regex: /for\s+urgent\s+(matters|requests|issues),?\s+please\s+contact/i, reason: 'Body EN: for urgent matters contact' },
];

function checkBodyPattern(body: string | null): { matched: boolean; reason: string | null } {
  if (!body) return { matched: false, reason: null };
  for (const { regex, reason } of BODY_PATTERNS) {
    if (regex.test(body)) return { matched: true, reason };
  }
  return { matched: false, reason: null };
}

// ─── Rückkehrdatum Parser ────────────────────────────────────────────────

const DE_MONTHS: Record<string, number> = {
  januar: 1, jan: 1,
  februar: 2, feb: 2,
  'märz': 3, maerz: 3, mrz: 3,
  april: 4, apr: 4,
  mai: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  dezember: 12, dez: 12,
};

const EN_MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

/**
 * Wenn nur Tag + Monat angegeben sind (kein Jahr), nimm das aktuelle
 * Jahr - es sei denn das Datum wäre in der Vergangenheit, dann nimm
 * das nächste Jahr (typisch im Dezember wenn jemand "bis 15.01"
 * schreibt).
 */
function yearForPartialDate(month: number, day: number, today: Date = new Date()): number {
  const thisYear = today.getFullYear();
  const candidate = new Date(thisYear, month - 1, day);
  // 24h Puffer damit "heute" noch zählt
  if (candidate.getTime() < today.getTime() - 86400000) {
    return thisYear + 1;
  }
  return thisYear;
}

function makeDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  // Sanity-Check: Date.UTC normalisiert ungültige Daten still (z.B. 31.02 -> 03.03)
  if (d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return null;
  return d;
}

/**
 * Versucht ein Rückkehrdatum aus dem Body zu extrahieren. Sucht nach:
 *
 *   - DD.MM.YYYY oder DD.MM.YY oder DD.MM  (deutsche Datumsnotation)
 *   - DD. Monatname YYYY  oder DD Monatname  (deutsch)
 *   - Monatname DD, YYYY  oder Monatname DD  (englisch)
 *   - YYYY-MM-DD (ISO)
 *
 * Präferenz: das erste Datum das NACH dem Absendedatum der Mail liegt.
 * Wenn kein Datum parsebar ist, liefert die Funktion null zurück - das
 * bedeutet "OOO erkannt aber Rückkehr unbekannt", der Caller setzt dann
 * kein `oof_until` in der DB.
 */
export function parseReturnDate(body: string | null, now: Date = new Date()): Date | null {
  if (!body) return null;

  const candidates: Date[] = [];

  // Helper: klassischer exec-Loop statt matchAll für TS-Target < ES2018
  function execAll(regex: RegExp, input: string): RegExpExecArray[] {
    const results: RegExpExecArray[] = [];
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      results.push(m);
      // Schutz gegen Endlos-Loop bei zero-width matches
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return results;
  }

  // ISO: YYYY-MM-DD
  for (const m of execAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, body)) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    const d = makeDate(year, month, day);
    if (d && d.getTime() > now.getTime()) candidates.push(d);
  }

  // Deutsche Notation: DD.MM.YYYY oder DD.MM.YY oder DD.MM.
  for (const m of execAll(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})?\b/g, body)) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year: number;
    if (m[3]) {
      year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
    } else {
      year = yearForPartialDate(month, day, now);
    }
    const d = makeDate(year, month, day);
    if (d && d.getTime() > now.getTime()) candidates.push(d);
  }

  // Deutsche Monatsnamen: "15. April", "am 15. April 2026", "15 Maerz"
  const deMonthRegex = /\b(\d{1,2})\.?\s+(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jan|Feb|Mrz|Apr|Jun|Jul|Aug|Sep|Sept|Okt|Nov|Dez)\b\.?\s*(\d{4})?/gi;
  for (const m of execAll(deMonthRegex, body)) {
    const day = parseInt(m[1], 10);
    const monthKey = m[2].toLowerCase();
    const monthKeyAscii = monthKey.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
    const month = DE_MONTHS[monthKey] || DE_MONTHS[monthKeyAscii];
    if (!month) continue;
    let year: number;
    if (m[3]) year = parseInt(m[3], 10);
    else year = yearForPartialDate(month, day, now);
    const d = makeDate(year, month, day);
    if (d && d.getTime() > now.getTime()) candidates.push(d);
  }

  // Englische Monatsnamen: "April 15", "April 15, 2026", "Apr 15th"
  const enMonthRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/gi;
  for (const m of execAll(enMonthRegex, body)) {
    const monthName = m[1].toLowerCase();
    const month = EN_MONTHS[monthName];
    if (!month) continue;
    const day = parseInt(m[2], 10);
    let year: number;
    if (m[3]) year = parseInt(m[3], 10);
    else year = yearForPartialDate(month, day, now);
    const d = makeDate(year, month, day);
    if (d && d.getTime() > now.getTime()) candidates.push(d);
  }

  if (candidates.length === 0) return null;

  // Nimm das späteste gefundene Datum - typisch steht in OOO-Mails
  // "bis einschliesslich 15.04.2026" und das ist das Rueckkehrdatum.
  // Wir nehmen das spaeteste gefundene Datum weil das meistens das
  // "Bin ab dann wieder da" Datum ist.
  candidates.sort((a, b) => b.getTime() - a.getTime());
  return candidates[0];
}

// ─── Haupt-Funktion ──────────────────────────────────────────────────────

/**
 * Die einzige Funktion die der gmail-reply-sync Cron aufruft.
 * Entscheidet ob eine Mail eine Abwesenheitsnotiz ist und zieht
 * optional das Rueckkehrdatum.
 *
 * Prio-Reihenfolge:
 *   1. Header (höchste Confidence)
 *   2. Subject-Pattern
 *   3. Body-Pattern
 *
 * Sobald eine Stufe matcht, wird das Ergebnis zurueckgegeben und
 * das Rueckkehrdatum aus dem Body extrahiert.
 */
export function detectOOO(input: OOOInput, now: Date = new Date()): OOOResult {
  // Stufe 1: Header
  const headerHit = checkAutoSubmittedHeaders(input);
  if (headerHit) {
    headerHit.returnDate = parseReturnDate(input.body, now);
    return headerHit;
  }

  // Stufe 2: Subject
  const subjectHit = checkSubjectPattern(input.subject);
  if (subjectHit.matched) {
    return {
      isOOO: true,
      confidence: 'medium',
      returnDate: parseReturnDate(input.body, now),
      matchedPattern: subjectHit.reason,
      reason: subjectHit.reason,
    };
  }

  // Stufe 3: Body
  const bodyHit = checkBodyPattern(input.body);
  if (bodyHit.matched) {
    return {
      isOOO: true,
      confidence: 'low',
      returnDate: parseReturnDate(input.body, now),
      matchedPattern: bodyHit.reason,
      reason: bodyHit.reason,
    };
  }

  return {
    isOOO: false,
    confidence: null,
    returnDate: null,
    matchedPattern: null,
    reason: null,
  };
}
