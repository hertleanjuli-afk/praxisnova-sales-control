/**
 * Tests fuer LinkedIn-State-Machine (Track 1 Sales Control V2).
 *
 * Pure-Function-Tests, keine DB-Abhaengigkeiten. Laeuft via
 * `npm run test:helpers` (node --test --experimental-strip-types).
 *
 * Auflage aus Angies Gate-Review: mindestens 1 Test pro gueltigem Uebergang,
 * mindestens 1 Test pro explizit ungueltigem Uebergang der blockiert werden
 * muss. Self-Uebergaenge, Sprung-Uebergaenge (z.B. open -> connected) und
 * Zurueck-Uebergaenge aus Block-States muessen klar abgewiesen werden.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LINKEDIN_STATES,
  VALID_TRANSITIONS,
  isValidTransition,
  nextStates,
  buildTransitionEvent,
  type LinkedInState,
} from '../../lib/linkedin-state-machine.ts';

// ---------------------------------------------------------------------------
// Shape + Defensive Assertions
// ---------------------------------------------------------------------------

test('LINKEDIN_STATES enthaelt exakt die 9 States aus Spec', () => {
  assert.deepEqual(LINKEDIN_STATES, [
    'open',
    'no_linkedin',
    'request_sent',
    'connected',
    'message_sent',
    'replied_positive',
    'replied_negative',
    'blocked_person',
    'blocked_company',
  ]);
});

test('VALID_TRANSITIONS hat Eintrag fuer jeden State', () => {
  for (const state of LINKEDIN_STATES) {
    assert.ok(
      Array.isArray(VALID_TRANSITIONS[state]),
      `Kein Transitions-Array fuer ${state}`
    );
  }
});

// ---------------------------------------------------------------------------
// Gueltige Uebergaenge, 1 Test pro Edge aus Spec Teil 2.1 + 2.3
// ---------------------------------------------------------------------------

test('open -> request_sent ist gueltig (Verknuepfung gesendet)', () => {
  assert.equal(isValidTransition('open', 'request_sent'), true);
});

test('open -> no_linkedin ist gueltig (Kein LinkedIn)', () => {
  assert.equal(isValidTransition('open', 'no_linkedin'), true);
});

test('no_linkedin -> open ist gueltig (Revert)', () => {
  assert.equal(isValidTransition('no_linkedin', 'open'), true);
});

test('request_sent -> connected ist gueltig (Verbunden)', () => {
  assert.equal(isValidTransition('request_sent', 'connected'), true);
});

test('request_sent -> no_linkedin ist gueltig (Fallback, kein Profil)', () => {
  assert.equal(isValidTransition('request_sent', 'no_linkedin'), true);
});

test('connected -> message_sent ist gueltig (Erste Nachricht)', () => {
  assert.equal(isValidTransition('connected', 'message_sent'), true);
});

test('message_sent -> replied_positive ist gueltig (Positive Antwort)', () => {
  assert.equal(isValidTransition('message_sent', 'replied_positive'), true);
});

test('message_sent -> replied_negative ist gueltig (Negative Antwort)', () => {
  assert.equal(isValidTransition('message_sent', 'replied_negative'), true);
});

test('replied_positive -> message_sent ist gueltig (Weitere Nachrichten)', () => {
  assert.equal(isValidTransition('replied_positive', 'message_sent'), true);
});

test('blocked_person -> open ist gueltig (Cron-Unblock oder Admin)', () => {
  assert.equal(isValidTransition('blocked_person', 'open'), true);
});

test('blocked_company -> open ist gueltig (Cron-Unblock oder Admin)', () => {
  assert.equal(isValidTransition('blocked_company', 'open'), true);
});

test('Block-Uebergang ist aus jedem Non-Block-State gueltig', () => {
  const nonBlockStates: LinkedInState[] = [
    'open',
    'no_linkedin',
    'request_sent',
    'connected',
    'message_sent',
    'replied_positive',
    'replied_negative',
  ];
  for (const state of nonBlockStates) {
    assert.equal(
      isValidTransition(state, 'blocked_person'),
      true,
      `${state} -> blocked_person sollte gueltig sein`
    );
    assert.equal(
      isValidTransition(state, 'blocked_company'),
      true,
      `${state} -> blocked_company sollte gueltig sein`
    );
  }
});

// ---------------------------------------------------------------------------
// Ungueltige Uebergaenge, 1 Test pro Fall der blockiert werden muss
// ---------------------------------------------------------------------------

test('Self-Uebergang ist nie gueltig', () => {
  for (const state of LINKEDIN_STATES) {
    assert.equal(
      isValidTransition(state, state),
      false,
      `${state} -> ${state} darf nicht gueltig sein`
    );
  }
});

test('open -> connected ist ungueltig (Sprung)', () => {
  assert.equal(isValidTransition('open', 'connected'), false);
});

test('open -> message_sent ist ungueltig (Sprung)', () => {
  assert.equal(isValidTransition('open', 'message_sent'), false);
});

test('request_sent -> message_sent ist ungueltig (Sprung ueber connected)', () => {
  assert.equal(isValidTransition('request_sent', 'message_sent'), false);
});

test('connected -> replied_positive ist ungueltig (Sprung ueber message_sent)', () => {
  assert.equal(isValidTransition('connected', 'replied_positive'), false);
});

test('message_sent -> connected ist ungueltig (Rueckwaerts)', () => {
  assert.equal(isValidTransition('message_sent', 'connected'), false);
});

test('replied_negative -> message_sent ist ungueltig (Terminal ausser Block)', () => {
  assert.equal(isValidTransition('replied_negative', 'message_sent'), false);
});

test('blocked_person -> message_sent ist ungueltig (Block nur ueber open)', () => {
  assert.equal(isValidTransition('blocked_person', 'message_sent'), false);
});

test('blocked_company -> connected ist ungueltig (Block nur ueber open)', () => {
  assert.equal(isValidTransition('blocked_company', 'connected'), false);
});

test('blocked_person -> blocked_company ist ungueltig (Scope-Wechsel nicht im MVP)', () => {
  assert.equal(isValidTransition('blocked_person', 'blocked_company'), false);
});

test('no_linkedin -> request_sent ist ungueltig (Profil fehlt, erst open)', () => {
  assert.equal(isValidTransition('no_linkedin', 'request_sent'), false);
});

// ---------------------------------------------------------------------------
// nextStates + buildTransitionEvent
// ---------------------------------------------------------------------------

test('nextStates(open) enthaelt request_sent, no_linkedin, blocked_person, blocked_company', () => {
  const result = nextStates('open');
  assert.ok(result.includes('request_sent'));
  assert.ok(result.includes('no_linkedin'));
  assert.ok(result.includes('blocked_person'));
  assert.ok(result.includes('blocked_company'));
  assert.ok(!result.includes('open'), 'Self-Uebergang darf nicht drin sein');
});

test('nextStates(blocked_person) enthaelt nur open', () => {
  assert.deepEqual([...nextStates('blocked_person')], ['open']);
});

test('buildTransitionEvent liefert Event fuer gueltigen Uebergang', () => {
  const event = buildTransitionEvent(42, 'open', 'request_sent', 'ui:manual');
  assert.deepEqual(event, {
    lead_id: 42,
    from_state: 'open',
    to_state: 'request_sent',
    triggered_by: 'ui:manual',
  });
});

test('buildTransitionEvent wirft bei ungueltigem Uebergang', () => {
  assert.throws(
    () => buildTransitionEvent(42, 'open', 'connected', 'ui:manual'),
    /Invalid LinkedIn state transition: open -> connected/
  );
});

test('buildTransitionEvent wirft bei Self-Uebergang', () => {
  assert.throws(
    () => buildTransitionEvent(42, 'open', 'open', 'ui:manual'),
    /Invalid LinkedIn state transition: open -> open/
  );
});
