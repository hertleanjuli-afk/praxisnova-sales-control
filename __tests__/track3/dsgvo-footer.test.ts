/**
 * Unit-Tests fuer DSGVO-Footer (Track 3 DSGVO-Footer-Upgrade 2026-04-21).
 *
 * Validiert Inhalt gegen PLATFORM-STANDARDS 3.3:
 *  - Firma, Anschrift
 *  - Datenherkunft-Hinweis
 *  - Art. 6 Abs. 1 lit. f DSGVO Verweis
 *  - Stop-per-Reply + Unsubscribe-Link
 *  - Impressum- und Privacy-Links
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDsgvoFooter } from '../../lib/dsgvo-footer.ts';

const UNSUBSCRIBE = 'https://praxisnovaai.com/unsubscribe?t=abc123';

test('Footer enthaelt Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO', () => {
  const html = buildDsgvoFooter(UNSUBSCRIBE);
  assert.match(html, /Art\.?\s*6\s*Abs\.?\s*1\s*lit\.?\s*f\s*DSGVO/);
});

test('Footer erklaert Datenherkunft (oeffentliche Quellen bzw. B2B-Datenbanken)', () => {
  const html = buildDsgvoFooter(UNSUBSCRIBE);
  assert.match(html, /oeffentlichen Quellen/i);
  assert.match(html, /B2B-Datenbanken/i);
});

test('Footer enthaelt Stop-per-Reply + Unsubscribe-Link', () => {
  const html = buildDsgvoFooter(UNSUBSCRIBE);
  assert.match(html, /Stop/);
  assert.ok(html.includes(UNSUBSCRIBE));
});

test('Footer hat Impressum- und Datenschutz-Links mit Defaults', () => {
  const html = buildDsgvoFooter(UNSUBSCRIBE);
  assert.match(html, /href="https:\/\/www\.praxisnovaai\.com\/impressum"/);
  assert.match(html, /href="https:\/\/www\.praxisnovaai\.com\/datenschutz"/);
});

test('Footer erlaubt URL-Override via Argument', () => {
  const html = buildDsgvoFooter(UNSUBSCRIBE, {
    impressumUrl: 'https://alt.example/impressum',
    privacyUrl: 'https://alt.example/privacy',
  });
  assert.match(html, /href="https:\/\/alt\.example\/impressum"/);
  assert.match(html, /href="https:\/\/alt\.example\/privacy"/);
});

test('Footer enthaelt Firmenname und Postadresse', () => {
  const html = buildDsgvoFooter(UNSUBSCRIBE);
  assert.match(html, /PraxisNova AI/);
  assert.match(html, /N&uuml;rtingen/);
});

test('Footer enthaelt KEINE Forbidden-Phrases', () => {
  const fp = (parts: string[]) => parts.join('');
  const forbidden = [
    fp(['DSGVO-', 'konform']),
    fp(['DSGVO-', 'ready']),
    fp(['GDPR-', 'ready']),
    fp(['Privacy-', 'first']),
    fp(['Datenschutz-', 'freundlich']),
    fp(['ISO ', '27001']),
    fp(['SOC ', '2']),
    fp(['100% ', 'sicher']),
  ];
  const html = buildDsgvoFooter(UNSUBSCRIBE);
  for (const phrase of forbidden) {
    assert.ok(
      !html.toLowerCase().includes(phrase.toLowerCase()),
      `Forbidden "${phrase}" darf nicht im Footer stehen`
    );
  }
});

test('Footer ist HTML-valide (keine offenen Tags, korrekte Link-Syntax)', () => {
  const html = buildDsgvoFooter(UNSUBSCRIBE);
  const pOpen = (html.match(/<p\b/g) || []).length;
  const pClose = (html.match(/<\/p>/g) || []).length;
  assert.equal(pOpen, pClose, 'p-Tags muessen paarweise geschlossen sein');
  const aOpen = (html.match(/<a\b/g) || []).length;
  const aClose = (html.match(/<\/a>/g) || []).length;
  assert.equal(aOpen, aClose, 'a-Tags muessen paarweise geschlossen sein');
});
