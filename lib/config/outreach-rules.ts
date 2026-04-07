/**
 * Zentrale Outreach-Konfiguration
 * Wird von allen Agents und dem UI verwendet.
 * Aenderungen hier gelten systemweit (Issue #10).
 */

export const OUTREACH_CONFIG = {
  // Signatur-Infos (Issue #2, #4)
  signature: {
    name: 'Anjuli Hertle',
    title: 'CEO & Head of Sales',
    company: 'PraxisNova AI',
    email: 'hertle.anjuli@praxisnovaai.com',
    website: 'www.praxisnovaai.com',
    calendly: 'https://calendly.com/praxisnovaai/erstgesprach',
  },

  // Blocking-Regeln (Issues #1, #6, #7)
  blocking: {
    manualStopMonths: 9,
    noInterestMonths: 9,
    wrongTimingMonths: 3,
    repliedMonths: 9,
    companyWideBlock: true,
    defaultBlockMonths: 9,
  },

  // Pipeline Stages
  pipelineStages: {
    new: 'Neu',
    inOutreach: 'In Outreach',
    replied: 'Replied',
    booked: 'Booked',
    blocked: 'Blocked',
    customer: 'Customer',
    notQualified: 'Nicht qualifiziert',
    cooldown: 'Cooldown',
    nurture: 'Nurture',
  },

  // Block Reasons
  blockReasons: {
    manualStop: 'manual_stop',
    noInterest: 'no_interest',
    wrongTiming: 'wrong_timing',
    replied: 'replied',
    companyBlock: 'company_block',
    ooo: 'ooo',
  } as const,

  // Email-Regeln
  email: {
    maxPerRun: 15,           // Pro Lauf - Agent laeuft 3x/Tag = bis zu 45 Emails/Tag
    runsPerDay: 3,           // 08:00, 11:00, 14:00 UTC (10:00, 13:00, 16:00 Berlin)
    dailyTargetMin: 20,      // Absolutes Minimum pro Tag
    dailyTargetMax: 45,      // Ziel pro Tag (3 x 15)
    maxWords: 150,
    maxSubjectLength: 50,
    duplicateCheckDays: 14,
    senderEmail: 'hertle.anjuli@praxisnovaai.com',
    senderName: 'Anjuli Hertle',
  },

  // Hot Lead Kriterien (Issue #12)
  hotLeads: {
    minScore: 9,
    requireSignal: true, // signal_email_reply OR signal_linkedin_interest
    reportDay: 1, // Montag
    reportHourUTC: 6, // 06:00 UTC = 08:00 Muenchen
  },

  // Approach-Vorlagen (A/B/C)
  approaches: {
    A: {
      name: 'Direct Pain Point',
      description: 'Direkter Bezug auf ein identifiziertes Problem',
      template: 'Bezug auf konkretes Problem des Unternehmens, dann Loesung durch PraxisNova',
    },
    B: {
      name: 'Social Proof',
      description: 'Ergebnisse aehnlicher Unternehmen hervorheben',
      template: 'Erwaehnung von Ergebnissen bei aehnlichen Firmen, dann Angebot fuer Gespraech',
    },
    C: {
      name: 'Trigger Event',
      description: 'Aktuelles Event oder Gesetzesaenderung als Aufhaenger',
      template: 'Bezug auf aktuelles Event/Gesetz, dann wie PraxisNova dabei hilft',
    },
  },
} as const;

// Helper: Block-Dauer basierend auf Grund ermitteln
export function getBlockDuration(reason: string): number {
  switch (reason) {
    case OUTREACH_CONFIG.blockReasons.wrongTiming:
      return OUTREACH_CONFIG.blocking.wrongTimingMonths;
    case OUTREACH_CONFIG.blockReasons.noInterest:
      return OUTREACH_CONFIG.blocking.noInterestMonths;
    case OUTREACH_CONFIG.blockReasons.manualStop:
      return OUTREACH_CONFIG.blocking.manualStopMonths;
    case OUTREACH_CONFIG.blockReasons.replied:
      return OUTREACH_CONFIG.blocking.repliedMonths;
    default:
      return OUTREACH_CONFIG.blocking.defaultBlockMonths;
  }
}

// Helper: HTML-Signatur generieren
export function getSignatureHtml(): string {
  const s = OUTREACH_CONFIG.signature;
  return `<p>Herzliche Gruesse<br>${s.name}<br>${s.title} | ${s.company}<br>${s.website}<br>Termin buchen: <a href="${s.calendly}">${s.calendly}</a></p>`;
}

// Helper: Email sanitizen (Issues #3, #4, #5)
export function sanitizeEmail(html: string): string {
  let clean = html;
  // Doppelte Satzzeichen (Issue #3)
  clean = clean.replace(/,,/g, ',').replace(/\.\./g, '.').replace(/!!/g, '!');
  // Em-Dash und En-Dash entfernen
  clean = clean.replace(/[\u2013\u2014]/g, '-');
  return clean;
}

// Helper: Subject sanitizen (Issue #5)
export function sanitizeSubject(subject: string): string {
  let clean = subject;
  // Spintax aufloesen
  clean = clean.replace(/\{Spintax:\s*/gi, '');
  clean = clean.replace(/\{[^}]*\|([^}]*)\}/g, '$1');
  clean = clean.replace(/[{}|]/g, '');
  // Em-Dash und En-Dash
  clean = clean.replace(/[\u2013\u2014]/g, '-');
  return clean.trim();
}
