/**
 * Integration-Tests fuer das observe + memory-hygiene + retry Pattern in
 * Gmail Reply-Detector.
 *
 * Hinweis: wir importieren NICHT `lib/memory/agent-facts.ts` direkt, weil
 * das Modul auf Top-Level `import sql from '../db'` zieht und `lib/db.ts`
 * einen typed named-export aus `@neondatabase/serverless` verwendet, den
 * Node's --experimental-strip-types Loader nicht aufloesen kann (fine in
 * Next.js Production-Build). Stattdessen spiegelen wir die produktiven
 * Facts (`reply_detector.gmail_oauth_configured`,
 * `reply_detector.processed_label_name_consistent`) hier als Mock-Facts.
 * Das reicht fuer das Hygiene-Pattern-Verifikation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyMemoryFacts,
  getStaleFacts,
  type MemoryFact,
} from '../../lib/memory/hygiene.ts';
import { retryGmail } from '../../lib/util/retry.ts';
import {
  FREE_EMAIL_DOMAINS,
  extractCompanyDomain,
} from '../../lib/gmail/domain-match.ts';

// Mirror der DB-freien Facts aus lib/memory/agent-facts.ts
const mockOauthFact: MemoryFact = {
  id: 'reply_detector.gmail_oauth_configured',
  description: 'Gmail OAuth-Credentials existieren',
  verify: async () =>
    Boolean(
      process.env.GMAIL_CLIENT_ID &&
        process.env.GMAIL_CLIENT_SECRET &&
        process.env.GMAIL_REFRESH_TOKEN,
    ),
};

const mockLabelFact: MemoryFact = {
  id: 'reply_detector.processed_label_name_consistent',
  description: 'Gmail-Label-Name Konstante',
  verify: async () => {
    const expected = 'praxisnova-processed';
    return typeof expected === 'string' && expected.length > 0;
  },
};

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
function silenceConsole() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function restoreConsole() {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

test('gmail-adoption: memory hygiene detects missing OAuth env as stale', async () => {
  silenceConsole();
  try {
    // Keine Gmail-OAuth ENVs -> oauth-Fact wird stale
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;

    const results = await verifyMemoryFacts(
      [mockOauthFact],
      { agent: 'reply_detector' },
      { topN: 1 },
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'stale');
    assert.equal(results[0].fact_id, 'reply_detector.gmail_oauth_configured');
  } finally {
    restoreConsole();
  }
});

test('gmail-adoption: memory hygiene fact fresh when all OAuth envs set', async () => {
  silenceConsole();
  try {
    process.env.GMAIL_CLIENT_ID = 'mock-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'mock-secret';
    process.env.GMAIL_REFRESH_TOKEN = 'mock-token';

    const results = await verifyMemoryFacts(
      [mockOauthFact],
      { agent: 'reply_detector' },
      { topN: 1 },
    );
    assert.equal(results[0].status, 'fresh');
  } finally {
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;
    restoreConsole();
  }
});

test('gmail-adoption: getStaleFacts filters correctly', async () => {
  silenceConsole();
  try {
    // Keine ENVs -> oauth-Fact stale, label-Fact fresh (static)
    delete process.env.GMAIL_CLIENT_ID;
    const results = await verifyMemoryFacts(
      [mockOauthFact, mockLabelFact],
      { agent: 'reply_detector' },
      { topN: 2 },
    );
    const stale = getStaleFacts(results);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].fact_id, 'reply_detector.gmail_oauth_configured');
  } finally {
    restoreConsole();
  }
});

test('gmail-adoption: retryGmail uses 3 maxAttempts (probe 429-loop)', async () => {
  silenceConsole();
  try {
    let calls = 0;
    let thrown: unknown;
    try {
      await retryGmail(
        async () => {
          calls += 1;
          const err = new Error('gmail 429');
          Object.assign(err, { status: 429 });
          throw err;
        },
        { baseDelayMs: 1, jitterFactor: 0 },
      );
    } catch (e) {
      thrown = e;
    }
    assert.equal(calls, 3);
    assert.equal((thrown as { attempts: number }).attempts, 3);
  } finally {
    restoreConsole();
  }
});

test('gmail-adoption: retryGmail success after 503 then ok', async () => {
  silenceConsole();
  try {
    let calls = 0;
    const result = await retryGmail(
      async () => {
        calls += 1;
        if (calls === 1) {
          const err = new Error('upstream');
          Object.assign(err, { status: 503 });
          throw err;
        }
        return { messages: [] };
      },
      { baseDelayMs: 1, jitterFactor: 0 },
    );
    assert.equal(calls, 2);
    assert.deepEqual(result, { messages: [] });
  } finally {
    restoreConsole();
  }
});

// ─── Domain-Match fuer unternehmensweite Reply-Detection (Amelie-Case) ─────
//
// Szenario aus 2026-04-13 Forensik: Marco Hoffmann (m.hoffmann@realestatepilot.com)
// erhielt Sequenz-Email. Die Antwort kam von Amelie Chwalinski
// (amelie.chwalinski@realestatepilot.com), weil Marco intern weitergeleitet
// hat. Per-Email-Match im Gmail-Reply-Sync fand nichts, weil die Reply-
// Absender-Email nicht im leads.email stand. Ergebnis: die Sequenz an Marco
// lief weiter obwohl die Firma bereits geantwortet hatte.
//
// Fix-Mechanismus: extractCompanyDomain liefert fuer beide Adressen die
// gleiche Domain "realestatepilot.com". Die Route nutzt die Domain um
// aktive Leads der gleichen Firma zu finden und stoppt deren Sequenzen.

test('domain-match: Amelie-Case extrahiert gleiche Firmen-Domain wie Marco', () => {
  const marcoEmail = 'm.hoffmann@realestatepilot.com';
  const amelieEmail = 'amelie.chwalinski@realestatepilot.com';

  const marcoDomain = extractCompanyDomain(marcoEmail);
  const amelieDomain = extractCompanyDomain(amelieEmail);

  assert.equal(marcoDomain, 'realestatepilot.com');
  assert.equal(amelieDomain, 'realestatepilot.com');
  assert.equal(
    marcoDomain,
    amelieDomain,
    'Beide Emails derselben Firma muessen die gleiche Domain liefern',
  );
});

test('domain-match: Amelie-Case ist case-insensitive (From-Header Varianten)', () => {
  // Gmail liefert die From-Email manchmal mit gemischter Grossschreibung
  // (z.B. aus Display-Name Parsing). Der Match muss case-insensitive sein.
  const mixedCase = 'Amelie.Chwalinski@ReaLEstatepiLOT.com';
  assert.equal(extractCompanyDomain(mixedCase), 'realestatepilot.com');
});

test('domain-match: Free-Mail-Adressen liefern null (kein Firmen-Match)', () => {
  // Ohne den Free-Mail-Filter wuerde jede gmail.com-Antwort als
  // "Firmen-Kollege" von jedem anderen gmail.com-Lead gewertet und
  // deren Sequenzen flaechendeckend stoppen.
  assert.equal(extractCompanyDomain('someone@gmail.com'), null);
  assert.equal(extractCompanyDomain('kontakt@web.de'), null);
  assert.equal(extractCompanyDomain('test@gmx.de'), null);
  assert.equal(extractCompanyDomain('buero@t-online.de'), null);
  assert.equal(extractCompanyDomain('user@icloud.com'), null);
});

test('domain-match: malformed Emails liefern null', () => {
  assert.equal(extractCompanyDomain('kein-at-zeichen'), null);
  assert.equal(extractCompanyDomain('zwei@at@zeichen.com'), null);
  assert.equal(extractCompanyDomain('leer@'), null);
  assert.equal(extractCompanyDomain(''), null);
});

test('domain-match: FREE_EMAIL_DOMAINS enthaelt nicht realestatepilot.com', () => {
  // Regression-Absicherung: keine Firmen-Domain darf versehentlich in
  // die Free-Mail-Liste rutschen.
  assert.equal(FREE_EMAIL_DOMAINS.has('realestatepilot.com'), false);
  // Gegen-Probe: gaengige Free-Mail-Domains sind drin
  assert.equal(FREE_EMAIL_DOMAINS.has('gmail.com'), true);
  assert.equal(FREE_EMAIL_DOMAINS.has('web.de'), true);
});
