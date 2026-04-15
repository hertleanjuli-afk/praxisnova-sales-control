import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmail } from '../../lib/helpers/html-email-template.ts';

test('buildEmail renders title and sections', () => {
  const html = buildEmail({
    title: 'Tagesplan fuer 2026-04-15',
    sections: [
      { heading: 'Block 1', body: 'Deep work morning', bullets: ['Task A', 'Task B'] },
    ],
  });
  assert.ok(html.includes('Tagesplan fuer 2026-04-15'));
  assert.ok(html.includes('Block 1'));
  assert.ok(html.includes('Deep work morning'));
  assert.ok(html.includes('<li'));
  assert.ok(html.includes('Task A'));
});

test('buildEmail escapes HTML in headings and bullets', () => {
  const html = buildEmail({
    title: 'Report <script>alert(1)</script>',
    sections: [{ heading: 'A & B', body: 'safe', bullets: ['<b>x</b>'] }],
  });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('A &amp; B'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
});

test('buildEmail includes CTA button when provided', () => {
  const html = buildEmail({
    title: 't',
    sections: [{ heading: 'h', body: 'b' }],
    ctaButton: { text: 'Review', url: 'https://example.com/review' },
  });
  assert.ok(html.includes('Review'));
  assert.ok(html.includes('https://example.com/review'));
});

test('buildEmail omits CTA when not provided', () => {
  const html = buildEmail({ title: 't', sections: [{ heading: 'h', body: 'b' }] });
  assert.ok(!html.includes('background:#1a3a6c;color:#fff;padding:12px 24px'));
});
