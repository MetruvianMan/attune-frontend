#!/usr/bin/env node

/**
 * Timezone-Safe Date Bucketing - One-Time Backfill Script
 *
 * Populates the `local_date` column on existing `events`, `diary_entries`,
 * and `point_events` rows that don't have it set yet (NULL). New rows
 * created after the write-path fix shipped already have local_date set
 * correctly at creation time - this script only backfills OLD rows.
 *
 * See .kiro/specs/timezone-safe-dates/ for the full background.
 *
 * Approach (per design.md "Data correction (backfill)"):
 *   For the large majority of rows (logged from a stable home timezone),
 *   assume Pacific time and compute local_date from the stored UTC
 *   timestamp/date column converted to Pacific. This is a heuristic, not
 *   a certainty - a handful of rows logged while traveling in a different
 *   timezone could get the wrong local_date from this backfill. The 3
 *   known-affected dates (Aug 1/2, June 13, July 9/10) should be manually
 *   verified after running this (see printAffectedDatesCheck below).
 *
 * SAFETY:
 *   - Defaults to DRY RUN: prints what it WOULD change, writes nothing.
 *   - Only ever touches rows where local_date IS NULL - never overwrites
 *     an already-set value.
 *   - Pass --write to actually perform the updates.
 *   - Run scripts/backup-supabase.js immediately before using --write.
 *
 * Usage:
 *   node scripts/backfill-local-date.js            # dry run (default)
 *   node scripts/backfill-local-date.js --write     # actually update rows
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration (same project ref as backup-supabase.js /
// restore-supabase.js - the anon key is fine for this since local_date is
// not sensitive and RLS is not yet configured on these tables per
// supabase-schema.sql's comments).
const SUPABASE_URL = 'https://qkvcwngwatfkhmjhzwvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmN3bmd3YXRma2htamh6d3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjY5NTEsImV4cCI6MjEwMDM0Mjk1MX0.PkdkaX-lMkwlRLFLmb6dr5xhwAKkqGRkxS-KI98yPUs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WRITE_MODE = process.argv.includes('--write');

// Which column each table's local_date should be derived from.
const TABLE_CONFIG = [
  { table: 'events', sourceColumn: 'timestamp' },
  { table: 'diary_entries', sourceColumn: 'date' },
  { table: 'point_events', sourceColumn: 'timestamp' },
];

/**
 * Converts a UTC epoch-ms timestamp to a 'YYYY-MM-DD' string AS IF viewed
 * from America/Los_Angeles (Pacific) - this is the backfill's stable-home-
 * timezone assumption, not a general-purpose timezone converter.
 */
function toPacificLocalDateString(epochMs) {
  const date = new Date(epochMs);
  // en-CA locale gives YYYY-MM-DD directly, avoiding manual date-part
  // parsing/reassembly.
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

async function backfillTable(table, sourceColumn) {
  console.log(`\n🔄 ${table}: fetching rows with local_date IS NULL...`);

  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${sourceColumn}, local_date`)
    .is('local_date', null);

  if (error) {
    console.error(`   ❌ Error fetching ${table}:`, error.message);
    return { table, total: 0, updated: 0, failed: 0 };
  }

  if (!rows || rows.length === 0) {
    console.log(`   ℹ️  No rows need backfilling in ${table}`);
    return { table, total: 0, updated: 0, failed: 0 };
  }

  console.log(`   📊 ${rows.length} row(s) need local_date`);

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const sourceValue = row[sourceColumn];
    if (sourceValue === null || sourceValue === undefined) {
      console.warn(`   ⚠️  Skipping ${table} id=${row.id} - ${sourceColumn} is null`);
      failed++;
      continue;
    }

    const localDate = toPacificLocalDateString(sourceValue);

    if (!WRITE_MODE) {
      console.log(`   [dry run] ${table} id=${row.id}: ${sourceColumn}=${new Date(sourceValue).toISOString()} -> local_date=${localDate}`);
      updated++;
      continue;
    }

    // Double-guard with .is('local_date', null) in the update filter too,
    // so this is safe to re-run and can never clobber a value that got
    // set (e.g. by real app usage) between the initial fetch and this write.
    const { error: updateError } = await supabase
      .from(table)
      .update({ local_date: localDate })
      .eq('id', row.id)
      .is('local_date', null);

    if (updateError) {
      console.error(`   ❌ Failed to update ${table} id=${row.id}:`, updateError.message);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`   ${WRITE_MODE ? '✅ Updated' : '✅ Would update'} ${updated} row(s)${failed > 0 ? `, ${failed} failed/skipped` : ''}`);
  return { table, total: rows.length, updated, failed };
}

/**
 * Prints the resulting local_date for the specific rows called out in
 * requirements.md / design.md as known-affected, so they can be manually
 * eyeballed against the diary content they actually describe. This is a
 * READ-ONLY check - it does not modify anything, and runs regardless of
 * --write so you can sanity-check dry-run output too.
 */
async function printAffectedDatesCheck() {
  console.log('\n🔍 Known-affected rows (manual verification per design.md):');

  const checks = [
    { table: 'diary_entries', column: 'date', timestampIso: '2026-08-02T06:38:56.000Z', expectedLocalDate: '2026-08-01', note: 'Aug 1/2 diary entry (nanny Gaby, Seafare parade, Shake Shack)' },
    { table: 'events', column: 'timestamp', timestampIso: '2026-06-14T06:57:35.000Z', expectedLocalDate: '2026-06-13', note: 'June 13 voice log' },
    { table: 'events', column: 'timestamp', timestampIso: '2026-07-10T04:27:41.000Z', expectedLocalDate: '2026-07-09', note: 'July 9/10 voice log #1' },
    { table: 'events', column: 'timestamp', timestampIso: '2026-07-11T06:44:45.000Z', expectedLocalDate: '2026-07-10', note: 'July 9/10 voice log #2' },
  ];

  for (const check of checks) {
    const epochMs = new Date(check.timestampIso).getTime();

    const { data, error } = await supabase
      .from(check.table)
      .select(`id, ${check.column}, local_date`)
      .eq(check.column, epochMs);

    if (error) {
      console.log(`   ❌ ${check.note}: query failed (${error.message})`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`   ⚠️  ${check.note}: no row found with ${check.column}=${epochMs} (timestamp may not match exactly - check manually)`);
      continue;
    }

    for (const row of data) {
      const status = row.local_date === check.expectedLocalDate ? '✅' : '❌';
      console.log(`   ${status} ${check.note}: id=${row.id} local_date=${row.local_date ?? '(null - not yet backfilled)'} (expected ${check.expectedLocalDate})`);
    }
  }
}

async function main() {
  console.log('🚀 Timezone-Safe Date Bucketing - Backfill');
  console.log('===========================================');
  console.log(`Mode: ${WRITE_MODE ? '⚠️  WRITE (will modify data)' : '🔍 DRY RUN (no changes will be made)'}`);
  if (!WRITE_MODE) {
    console.log('Pass --write to actually perform the updates once the dry-run output looks correct.');
  }

  const results = [];
  for (const { table, sourceColumn } of TABLE_CONFIG) {
    const result = await backfillTable(table, sourceColumn);
    results.push(result);
  }

  console.log('\n===========================================');
  console.log(WRITE_MODE ? '✅ Backfill Complete' : '✅ Dry Run Complete');
  console.log('===========================================');
  for (const r of results) {
    console.log(`   ${r.table}: ${r.updated}/${r.total} ${WRITE_MODE ? 'updated' : 'would update'}${r.failed > 0 ? `, ${r.failed} failed/skipped` : ''}`);
  }

  await printAffectedDatesCheck();

  if (!WRITE_MODE) {
    console.log('\n💡 This was a dry run - no data was changed. Re-run with --write to apply.');
  }
}

main().catch(error => {
  console.error('\n💥 Backfill failed with error:', error);
  process.exit(1);
});
