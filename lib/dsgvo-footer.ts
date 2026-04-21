/**
 * Rechtssicherer B2B-Cold-Outreach-Footer gemaess PLATFORM-STANDARDS 3.3.
 *
 * Enthaelt:
 *  - Firma und Anschrift (Impressum kurz)
 *  - Datenherkunft: oeffentliche Quellen / professionelle B2B-Datenbanken
 *  - Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
 *  - Stop-per-Reply + One-Click-Unsubscribe-Link
 *  - Links zu Impressum und Datenschutzerklaerung
 *
 * Vorherige UWG-Paragraph-Formulierung war fuer B2B-Cold-Outreach nicht
 * ausreichend. DSGVO-Art. 6 Abs. 1 lit. f ist die saubere Grundlage.
 *
 * Pure function, keine DB-Calls. Leicht unit-testbar.
 */

// Fixed links, koennen via Env-Var ueberschrieben werden falls sich die
// Pfade aendern. Defaults zeigen auf Produktions-URLs.
const IMPRESSUM_URL_ENV = 'FOOTER_IMPRESSUM_URL';
const PRIVACY_URL_ENV = 'FOOTER_PRIVACY_URL';
const IMPRESSUM_URL_DEFAULT = 'https://www.praxisnovaai.com/impressum';
const PRIVACY_URL_DEFAULT = 'https://www.praxisnovaai.com/datenschutz';

export interface FooterUrls {
  impressumUrl?: string;
  privacyUrl?: string;
}

export function buildDsgvoFooter(
  unsubscribeLink: string,
  urls: FooterUrls = {}
): string {
  const impressumUrl =
    urls.impressumUrl || process.env[IMPRESSUM_URL_ENV] || IMPRESSUM_URL_DEFAULT;
  const privacyUrl =
    urls.privacyUrl || process.env[PRIVACY_URL_ENV] || PRIVACY_URL_DEFAULT;

  return `
<br/>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0"/>
<p style="font-size:11px;color:#999;line-height:1.5;">
  Diese E-Mail richtet sich an Sie als Ansprechpartner in Ihrer beruflichen Funktion.
  Ihre Gesch&auml;ftsadresse haben wir aus oeffentlichen Quellen bzw. professionellen
  B2B-Datenbanken bezogen. Die Verarbeitung erfolgt auf Grundlage unseres berechtigten
  Interesses an B2B-Kontaktaufnahme (Art. 6 Abs. 1 lit. f DSGVO).<br/>
  Wenn Sie keine weitere Kontaktaufnahme wuenschen, antworten Sie kurz mit "Stop"
  oder klicken Sie hier: <a href="${unsubscribeLink}">Abmelden</a>.<br/>
  <br/>
  PraxisNova AI, Anjuli Hertle | Otto-Hahn-Str., 72622 N&uuml;rtingen | info@praxisnovaai.com<br/>
  <a href="${impressumUrl}">Impressum</a> |
  <a href="${privacyUrl}">Datenschutz</a>
</p>`;
}
