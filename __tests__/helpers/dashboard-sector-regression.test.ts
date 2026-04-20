/**
 * Regression-Test LECK-18 (2026-04-20 Audit, 2026-04-11 Forensik).
 *
 * Bug: Dashboard zeigte `Alle = 0` vs `Immobilien = 100`. Root-Cause im
 * `app/api/dashboard/route.ts` sectorBreakdown: der Filter
 *   WHERE sequence_type IS NOT NULL
 * exkludierte Leads mit NULL sequence_type. KPI-Cards zaehlten alle Leads,
 * sectorBreakdown zaehlte nur non-NULL. Folge: Summe(Branchen) < Total,
 * "allgemein"-Bucket blieb unsichtbar.
 *
 * Fix: Filter entfernt, `COALESCE(sequence_type, 'allgemein')` im GROUP BY
 * sorgt fuer die Gruppierung der NULL-Rows.
 *
 * Dieser Test liest die Route-Datei als Text und prueft die Query-Form,
 * weil das vorhandene Test-Setup kein SQL-Mock bietet (Node native
 * --experimental-strip-types, kein Jest/Vitest). Der Test schuetzt gegen
 * zufaelliges Wiedereinfuehren des Filters durch Refactor.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTE_PATH = resolve(__dirname, '../../app/api/dashboard/route.ts');

test('dashboard-sector-regression: sectorBreakdown enthaelt keinen non-null Filter', () => {
  const source = readFileSync(ROUTE_PATH, 'utf8');

  // Der Bug-Filter darf nicht wiederkehren
  const bugPattern = /WHERE\s+sequence_type\s+IS\s+NOT\s+NULL/i;
  const sectorBlockMatch = source.match(/const sectorBreakdown = await sql`[\s\S]*?`/);
  assert.ok(
    sectorBlockMatch,
    'sectorBreakdown Query-Block muss existieren in app/api/dashboard/route.ts',
  );
  const sectorBlock = sectorBlockMatch[0];

  assert.equal(
    bugPattern.test(sectorBlock),
    false,
    'LECK-18 Regression: der Filter WHERE sequence_type IS NOT NULL darf im sectorBreakdown NICHT zurueckkehren',
  );
});

test('dashboard-sector-regression: COALESCE sorgt fuer Null-Bucket Gruppierung', () => {
  const source = readFileSync(ROUTE_PATH, 'utf8');
  const sectorBlockMatch = source.match(/const sectorBreakdown = await sql`[\s\S]*?`/);
  const sectorBlock = sectorBlockMatch ? sectorBlockMatch[0] : '';

  // COALESCE im SELECT und im GROUP BY (letzteres damit NULL-Rows zum
  // 'allgemein'-Bucket aggregieren, nicht als separater NULL-Bucket fallen).
  assert.match(
    sectorBlock,
    /COALESCE\(sequence_type,\s*'allgemein'\)\s+AS\s+sector/i,
    'SELECT muss COALESCE(sequence_type, allgemein) AS sector enthalten',
  );
  assert.match(
    sectorBlock,
    /GROUP\s+BY\s+COALESCE\(sequence_type,\s*'allgemein'\)/i,
    'GROUP BY muss COALESCE nutzen, damit NULL-Rows zum allgemein-Bucket zaehlen',
  );
});

test('dashboard-sector-regression: Sum-of-Sectors Invariante dokumentiert', () => {
  // Simulierter Dataset: 100 Leads total, 40 mit sequence_type=NULL, 60 auf Branchen verteilt.
  // Nach Fix muss Summe aller Branchen (inklusive allgemein) = 100 sein.
  const fakeRows = [
    { sequence_type: 'immobilien', count: 30 },
    { sequence_type: 'bau', count: 20 },
    { sequence_type: 'handwerk', count: 10 },
    { sequence_type: null, count: 40 },
  ];

  // Client-seitige Aggregation wie es die Query tun wuerde (nach Fix)
  const aggregated = new Map<string, number>();
  for (const row of fakeRows) {
    const bucket = row.sequence_type ?? 'allgemein';
    aggregated.set(bucket, (aggregated.get(bucket) ?? 0) + row.count);
  }

  let total = 0;
  for (const count of aggregated.values()) total += count;

  assert.equal(total, 100, 'Summe aller Branchen inkl. allgemein muss Total Leads ergeben');
  assert.equal(aggregated.get('allgemein'), 40, 'NULL-Rows muessen im allgemein-Bucket landen');
});
