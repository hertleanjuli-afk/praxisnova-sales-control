import { NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * GET /api/debug/pause-test
 * Tests if pause/block columns exist and work
 */
export async function GET() {
  const results: Record<string, any> = {};

  // Step 1: Check if columns exist
  try {
    const cols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'leads'
        AND column_name IN ('paused_at', 'resume_at', 'pause_reason', 'blocked_until', 'block_reason', 'pipeline_notes', 'exited_at', 'sequence_status', 'pipeline_stage')
      ORDER BY column_name
    `;
    results.existing_columns = cols.map(c => c.column_name);
  } catch (e) {
    results.column_check_error = String(e);
  }

  // Step 2: Try creating missing columns
  results.migrations = [];
  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ`;
    results.migrations.push('paused_at OK');
  } catch (e) { results.migrations.push('paused_at FAIL: ' + String(e)); }

  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ`;
    results.migrations.push('resume_at OK');
  } catch (e) { results.migrations.push('resume_at FAIL: ' + String(e)); }

  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pause_reason TEXT`;
    results.migrations.push('pause_reason OK');
  } catch (e) { results.migrations.push('pause_reason FAIL: ' + String(e)); }

  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ`;
    results.migrations.push('blocked_until OK');
  } catch (e) { results.migrations.push('blocked_until FAIL: ' + String(e)); }

  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS block_reason TEXT`;
    results.migrations.push('block_reason OK');
  } catch (e) { results.migrations.push('block_reason FAIL: ' + String(e)); }

  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_notes TEXT`;
    results.migrations.push('pipeline_notes OK');
  } catch (e) { results.migrations.push('pipeline_notes FAIL: ' + String(e)); }

  try {
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ`;
    results.migrations.push('exited_at OK');
  } catch (e) { results.migrations.push('exited_at FAIL: ' + String(e)); }

  // Step 3: Re-check columns after migration
  try {
    const cols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'leads'
        AND column_name IN ('paused_at', 'resume_at', 'pause_reason', 'blocked_until', 'block_reason', 'pipeline_notes', 'exited_at', 'sequence_status', 'pipeline_stage')
      ORDER BY column_name
    `;
    results.columns_after = cols.map(c => c.column_name);
  } catch (e) {
    results.columns_after_error = String(e);
  }

  // Step 4: Test UPDATE query (dry run with a non-existent ID)
  try {
    await sql`
      UPDATE leads SET
        sequence_status = 'paused',
        paused_at = NOW(),
        resume_at = '2026-04-09'::timestamp,
        pause_reason = 'test_only'
      WHERE id = -999
    `;
    results.update_test = 'SQL syntax OK (0 rows affected)';
  } catch (e) {
    results.update_test_error = String(e);
  }

  // Step 5: Find a test lead
  try {
    const leads = await sql`
      SELECT id, first_name, last_name, company, sequence_status
      FROM leads
      WHERE sequence_status = 'active'
      LIMIT 3
    `;
    results.active_leads = leads;
  } catch (e) {
    results.active_leads_error = String(e);
  }

  return NextResponse.json(results);
}
