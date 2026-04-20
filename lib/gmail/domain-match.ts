/**
 * Pure Helper fuer das Domain-basierte Reply-Matching des Gmail-Reply-Detectors.
 *
 * Szenario Amelie Chwalinski 2026-04-13: Ein Lead (Marco Hoffmann,
 * m.hoffmann@realestatepilot.com) wurde via Sequenz kontaktiert. Die Antwort
 * kam von einer anderen Email der gleichen Firma (amelie.chwalinski@...).
 * Per-Email-Match greift nicht. Domain-Match greift: extractCompanyDomain
 * liefert "realestatepilot.com" und die Route kann ueber diese Domain
 * einen aktiven Lead derselben Firma finden, die Sequenz stoppen und
 * einen neuen Lead fuer Amelie anlegen.
 *
 * FREE_EMAIL_DOMAINS filtert Provider-Adressen (gmail.com, web.de, ...)
 * aus. Ohne Filter wuerde jede gmail.com-Antwort faelschlich alle Leads
 * mit gmail.com-Adresse als "Firmen-Kollegen" behandeln und deren
 * Sequenzen stoppen.
 */

export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'web.de', 'gmx.de', 'gmx.net', 'yahoo.com',
  'hotmail.com', 'outlook.com', 't-online.de', 'freenet.de',
  'posteo.de', 'icloud.com', 'live.de', 'live.com', 'aol.com',
  'mail.de', 'protonmail.com',
]);

/**
 * Extrahiert die Firmen-Domain aus einer Email-Adresse, sofern die Adresse
 * (a) eine gueltige @domain Komponente hat und (b) nicht zu einem bekannten
 * Free-Mail-Provider gehoert.
 *
 * Rueckgabe lowercased Domain, oder null falls nicht eligible.
 */
export function extractCompanyDomain(email: string): string | null {
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();
  if (!domain) return null;
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}
