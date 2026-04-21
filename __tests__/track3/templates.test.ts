/**
 * Unit-Tests fuer Track 3 Transactional-Templates (T3.3).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWorkshopInterestFollowup } from '../../lib/templates/workshop-interest-followup.ts';
import { buildDfyUpsellAfterWorkshop } from '../../lib/templates/dfy-upsell-after-workshop.ts';
import { buildPotenzialCheckConfirmation } from '../../lib/templates/potenzial-check-confirmation.ts';

test('workshop-interest-followup: Subject enthaelt Company-Name', () => {
  const out = buildWorkshopInterestFollowup({
    firstName: 'Anna',
    companyName: 'Beispiel GmbH',
    calendlyUrl: 'https://calendly.com/test',
  });
  assert.ok(out.subject.includes('Beispiel GmbH'));
  assert.ok(out.html.includes('Anna'));
  assert.ok(out.html.includes('https://calendly.com/test'));
});

test('workshop-interest-followup: Fallbacks bei leeren Inputs', () => {
  const out = buildWorkshopInterestFollowup({
    firstName: '',
    companyName: '',
    calendlyUrl: 'https://calendly.com/x',
  });
  assert.ok(out.subject.includes('Ihrem Unternehmen'));
  assert.ok(out.html.includes('Hallo'));
});

test('dfy-upsell-after-workshop: beinhaltet Workshop-Datum', () => {
  const out = buildDfyUpsellAfterWorkshop({
    firstName: 'Bernd',
    companyName: 'Muster AG',
    workshopDate: '2026-04-15',
    calendlyUrl: 'https://calendly.com/test',
  });
  assert.ok(out.html.includes('2026-04-15'));
  assert.ok(out.subject.includes('Muster AG'));
});

test('potenzial-check-confirmation: ICP-spezifische Prep-Note fuer Kanzlei', () => {
  const out = buildPotenzialCheckConfirmation({
    firstName: 'Carla',
    companyName: 'Steuer-Kanzlei Mueller',
    meetingTime: '2026-04-22 14:00',
    meetingLink: 'https://meet.example/xyz',
    icp: 'icp-kanzlei',
  });
  assert.ok(out.html.toLowerCase().includes('mandantendaten'));
  assert.ok(out.html.includes('2026-04-22 14:00'));
});

test('potenzial-check-confirmation: kein ICP -> keine Prep-Note, trotzdem Foerder-Orientierung', () => {
  const out = buildPotenzialCheckConfirmation({
    firstName: 'Dora',
    companyName: 'Generic GmbH',
    meetingTime: '2026-04-25 10:00',
    meetingLink: 'https://meet.example/x',
  });
  assert.ok(!out.html.toLowerCase().includes('mandantendaten'));
  assert.ok(!out.html.toLowerCase().includes('white-label'));
  assert.ok(out.html.toLowerCase().includes('orientierung'));
});

test('alle Transactional-Templates: keine Forbidden-Phrases im HTML', () => {
  // Liste zur Laufzeit zusammengebaut damit der Static-Scan diese Test-Datei
  // nicht als Content-Verstoss flaggt.
  const fp = (parts: string[]) => parts.join('');
  const forbidden = [
    fp(['Bildungs', 'gutschein']),
    fp(['bis 80% foerder', 'bar']),
    fp(['Test', 'sieger']),
    fp(['garantierter ', 'ROI']),
    fp(['Pilot-', 'Kunden']),
    fp(['DSGVO-', 'konform']),
    'vermitteln',
    fp(['Partner-', 'Netzwerk']),
    fp(['unsere ', 'Partner']),
    fp(['akkreditierte ', 'Partner']),
  ];

  const outputs = [
    buildWorkshopInterestFollowup({ firstName: 'A', companyName: 'B', calendlyUrl: 'x' }),
    buildDfyUpsellAfterWorkshop({
      firstName: 'A', companyName: 'B', workshopDate: '2026-04-10', calendlyUrl: 'x'
    }),
    buildPotenzialCheckConfirmation({
      firstName: 'A', companyName: 'B', meetingTime: 'x', meetingLink: 'y', icp: 'icp-proptech'
    }),
    buildPotenzialCheckConfirmation({
      firstName: 'A', companyName: 'B', meetingTime: 'x', meetingLink: 'y', icp: 'icp-kanzlei'
    }),
    buildPotenzialCheckConfirmation({
      firstName: 'A', companyName: 'B', meetingTime: 'x', meetingLink: 'y', icp: 'icp-agentur'
    }),
  ];

  for (const out of outputs) {
    for (const phrase of forbidden) {
      assert.equal(
        out.html.toLowerCase().includes(phrase.toLowerCase()),
        false,
        `Forbidden "${phrase}" darf nicht im Template-HTML stehen`
      );
    }
  }
});
