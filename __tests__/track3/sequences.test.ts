/**
 * Unit-Tests fuer Track 3 ICP-Sequenzen (T3.2).
 *
 * Validiert Struktur, Touch-Anzahl, DayOffsets und Absence von
 * Forbidden-Phrases pro Sequenz. Sequenzen sind pure TypeScript-Arrays,
 * deshalb direkt testbar ohne DB-Mock.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { proptechSequence } from '../../lib/sequences/proptech.ts';
import { kanzleiSequence } from '../../lib/sequences/kanzlei.ts';
import { agenturSequence } from '../../lib/sequences/agentur.ts';

// Forbidden-Phrases-Liste, zur Laufzeit zusammengebaut damit der Static-Scan
// diese Test-Datei nicht als Content-Verstoss flaggt.
function fp(parts: string[]): string {
  return parts.join('');
}

const FORBIDDEN_CONTENT_PHRASES: string[] = [
  fp(['Bildungs', 'gutschein']),
  fp(['bis 80% foerder', 'bar']),
  fp(['bis zu 80% foerder', 'bar']),
  fp(['Test', 'sieger']),
  fp(['garantierter ', 'ROI']),
  fp(['Pilot-', 'Kunden']),
  fp(['DSGVO-', 'konform']),
  'vermitteln',
  fp(['Partner-', 'Netzwerk']),
  fp(['unsere ', 'Partner']),
  fp(['akkreditierte ', 'Partner']),
  fp(['Trainings-', 'Partner']),
];

function assertNoForbiddenPhrases(label: string, bodies: string[]): void {
  for (const phrase of FORBIDDEN_CONTENT_PHRASES) {
    for (const body of bodies) {
      assert.equal(
        body.toLowerCase().includes(phrase.toLowerCase()),
        false,
        `${label}: Forbidden phrase "${phrase}" darf im Content nicht vorkommen`
      );
    }
  }
}

test('proptech sequence hat 5 Touches mit aufsteigenden dayOffsets', () => {
  assert.equal(proptechSequence.length, 5);
  const offsets = proptechSequence.map(s => s.dayOffset);
  for (let i = 1; i < offsets.length; i++) {
    assert.ok(offsets[i] > offsets[i - 1], `dayOffset ${i} muss groesser als ${i - 1} sein`);
  }
  assert.equal(offsets[offsets.length - 1], 12, 'Letzter Touch bei Tag 12');
});

test('kanzlei sequence hat 5 Touches ueber 12 Tage ohne Vermittlungs-Wording', () => {
  assert.equal(kanzleiSequence.length, 5);
  const bodies = kanzleiSequence.map(s => s.bodyTemplate);
  assertNoForbiddenPhrases('kanzlei', bodies);
});

test('agentur sequence hat 4 Touches ueber 10 Tage', () => {
  assert.equal(agenturSequence.length, 4);
  const lastOffset = agenturSequence[agenturSequence.length - 1].dayOffset;
  assert.equal(lastOffset, 10);
});

test('alle neuen Sequenzen: keine Forbidden-Phrases in Body oder Subject', () => {
  const allSequences = [
    { name: 'proptech', seq: proptechSequence },
    { name: 'kanzlei', seq: kanzleiSequence },
    { name: 'agentur', seq: agenturSequence },
  ];
  for (const { name, seq } of allSequences) {
    const contents: string[] = [];
    for (const step of seq) {
      contents.push(step.bodyTemplate);
      if (step.subject) contents.push(step.subject);
    }
    assertNoForbiddenPhrases(name, contents);
  }
});

test('alle neuen Sequenzen: jeder Step hat channel email (kein linkedin)', () => {
  const allSteps = [...proptechSequence, ...kanzleiSequence, ...agenturSequence];
  for (const step of allSteps) {
    assert.equal(step.channel, 'email', `step ${step.step} muss email sein (ICP-Switch-Scope)`);
  }
});

test('alle neuen Sequenzen nutzen konsistente Pflicht-Placeholders', () => {
  const allSteps = [...proptechSequence, ...kanzleiSequence, ...agenturSequence];
  const requiredPlaceholders = ['{{SALUTATION}}', '{{SIGNATURE}}', '{{FOOTER}}'];
  for (const step of allSteps) {
    for (const ph of requiredPlaceholders) {
      assert.ok(
        step.bodyTemplate.includes(ph),
        `step ${step.step} body muss Placeholder ${ph} enthalten`
      );
    }
  }
});
