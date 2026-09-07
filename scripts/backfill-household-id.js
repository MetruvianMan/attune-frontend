#!/usr/bin/env node

/**
 * Household ID Backfill Script
 *
 * Populates the `household_id` column on existing `child_profiles` rows
 * that don't have it set yet (NULL), pointing them at the single
 * "Passberger" household row created by the supabase-rls-hardening
 * schema migration (task 1). This is purely additive/preparatory - no
 * RLS policy reads household_id yet, so this script does not change
 * what anyone can currently see or do in the app.
 *
 * See .kiro/specs/supabase-rls-hardening/ for the full background.
 *
 * SAFETY:
 *   - Defaults to DRY RUN: prints what it WOULD change, writes nothing.
 *   - Only ever touches rows where household_id IS NULL - never
 *     overwrites an already-set value.
 *   - Refuses to run if there isn't EXACTLY ONE household row (0 means
 *     the schema migration wasn't run yet; 2+ means someone the intended
 *     "one household for this family" assumption no longer holds and
 *     which household to backfill to needs a human decision, not a
 *     script guessing).
 *   - Pass --write to actually perform the updates.
 *   - Run scripts/backup-supabase.js immediately before using --write.
 *
 * Usage:
 *   node scripts/backfill-household-id.js            # dry run (default)
 *   node scripts/backfill-household-id.js --write     # actually update rows
 */

import { createClient } from '@supabase/supabase-js';

// Same project ref as backfill-local-date.js / backfill-point-event-snapshots.js.
const SUPABASE_URL = 'https://qkvcwngwatfkhmjhzwvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmN3bmd3YXRma2htamh6d3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjY5NTEsImV4cCI6MjEwMDM0Mjk1MX0.PkdkaX-lMkwlRLFLmb6dr5xhwAKkqGRkxS-KI98yPUs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WRITE_MODE = process.argv.includes('--write');

async function main() {
  console.log('🚀 Household ID Backfill');
  console.log('===========================================');
  console.log(`Mode: ${WRITE_MODE ? '⚠️  WRITE (will modify data)' : '🔍 DRY RUN (no changes will be made)'}`);
  if (!WRITE_MODE) {
    console.log('Pass --write to actually perform the updates once the dry-run output looks correct.');
  }

  // Find the household to backfill to. Requires exactly one - see SAFETY
  // note above for why 0 or 2+ both abort rather than guessing.
  console.log('\n🔄 households: looking up the household row...');
  const { data: households, error: householdsError } = await supabase
    .from('households')
    .select('id, name, created_at');

  if (householdsError) {
    console.error('   ❌ Error fetching households:', householdsError.message);
    process.exit(1);
  }

  if (!households || households.length === 0) {
    console.error('   ❌ No household row found. Run the schema migration SQL (task 1) first, including the INSERT INTO households step.');
    process.exit(1);
  }

  if (households.length > 1) {
    console.error(`   ❌ Found ${households.length} household rows, expected exactly 1. Which one child_profiles should backfill to needs a manual decision - not proceeding automatically.`);
    console.error('   Households found:', households.map(h => `${h.id} (${h.name})`).join(', '));
    process.exit(1);
  }

  const household = households[0];
  console.log(`   ✅ Found household: id=${household.id} name="${household.name}"`);

  console.log('\n🔄 child_profiles: fetching rows with household_id IS NULL...');
  const { data: rows, error } = await supabase
    .from('child_profiles')
    .select('id, display_name, household_id')
    .is('household_id', null);

  if (error) {
    console.error('   ❌ Error fetching child_profiles:', error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('   ℹ️  No rows need backfilling - every child_profiles row already has household_id set.');
    return;
  }

  console.log(`   📊 ${rows.length} row(s) need household_id`);

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    if (!WRITE_MODE) {
      console.log(`   [dry run] child_profiles id=${row.id} (${row.display_name}): -> household_id=${household.id}`);
      updated++;
      continue;
    }

    // Double-guard with .is('household_id', null) in the update filter
    // too, so this is safe to re-run and can never clobber a value set
    // by real app usage between the initial fetch and this write.
    const { error: updateError } = await supabase
      .from('child_profiles')
      .update({ household_id: household.id })
      .eq('id', row.id)
      .is('household_id', null);

    if (updateError) {
      console.error(`   ❌ Failed to update child_profiles id=${row.id}:`, updateError.message);
      failed++;
    } else {
      console.log(`   ✅ Updated child_profiles id=${row.id} (${row.display_name})`);
      updated++;
    }
  }

  console.log('\n===========================================');
  console.log(WRITE_MODE ? '✅ Backfill Complete' : '✅ Dry Run Complete');
  console.log('===========================================');
  console.log(`   child_profiles: ${updated}/${rows.length} ${WRITE_MODE ? 'updated' : 'would update'}${failed > 0 ? `, ${failed} failed` : ''}`);

  if (!WRITE_MODE) {
    console.log('\n💡 This was a dry run - no data was changed. Re-run with --write to apply.');
  }
}

main().catch(error => {
  console.error('\n💥 Backfill failed with error:', error);
  process.exit(1);
});
