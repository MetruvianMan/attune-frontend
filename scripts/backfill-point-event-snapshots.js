#!/usr/bin/env node

/**
 * Point Event Emoji/Title Snapshot - One-Time Backfill Script
 *
 * Populates the `snapshot_emoji` and `snapshot_label` columns on existing
 * `point_events` rows that don't have them set yet (NULL). New rows
 * created after the write-path fix shipped already have these set
 * correctly at creation time (see rewards-service.ts logBehavior/
 * redeemReward) - this script only backfills OLD rows.
 *
 * Why this exists: point_events.behavior_id/reward_id are foreign keys
 * with ON DELETE SET NULL. Before this fix, the emoji/title shown for a
 * historical point event was resolved by joining behavior_id/reward_id
 * against the live behaviors/rewards tables at DISPLAY time - so deleting
 * a custom one-off Behavior/Reward (one not saved to Quick Log/Quick
 * Redeem) afterward silently broke every past log of it, replacing the
 * emoji with a generic "📝" placeholder. snapshot_emoji/snapshot_label
 * freeze that data onto the point_events row itself at write time,
 * making it immune to the source row being deleted later.
 *
 * Approach:
 *   For each point_event with snapshot_emoji IS NULL, look up its
 *   behavior_id or reward_id against the CURRENT (possibly already
 *   archived, but not yet deleted) behaviors/rewards row and copy its
 *   emoji + title onto the point_event.
 *
 *   Point events whose source Behavior/Reward has ALREADY been deleted
 *   (behavior_id/reward_id is already NULL due to the ON DELETE SET NULL
 *   foreign key, from before this fix existed) cannot be recovered by
 *   this script - that data is genuinely gone. These are reported
 *   separately so you know exactly how many (if any) are unrecoverable.
 *
 * SAFETY:
 *   - Defaults to DRY RUN: prints what it WOULD change, writes nothing.
 *   - Only ever touches rows where snapshot_emoji IS NULL - never
 *     overwrites an already-set value.
 *   - Pass --write to actually perform the updates.
 *   - Run scripts/backup-supabase.js immediately before using --write.
 *
 * Usage:
 *   node scripts/backfill-point-event-snapshots.js            # dry run (default)
 *   node scripts/backfill-point-event-snapshots.js --write     # actually update rows
 */

import { createClient } from '@supabase/supabase-js';

// Same project ref as backfill-local-date.js / backup-supabase.js.
const SUPABASE_URL = 'https://qkvcwngwatfkhmjhzwvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmN3bmd3YXRma2htamh6d3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjY5NTEsImV4cCI6MjEwMDM0Mjk1MX0.PkdkaX-lMkwlRLFLmb6dr5xhwAKkqGRkxS-KI98yPUs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WRITE_MODE = process.argv.includes('--write');

async function main() {
  console.log('🚀 Point Event Snapshot (emoji/title) - Backfill');
  console.log('===========================================');
  console.log(`Mode: ${WRITE_MODE ? '⚠️  WRITE (will modify data)' : '🔍 DRY RUN (no changes will be made)'}`);
  if (!WRITE_MODE) {
    console.log('Pass --write to actually perform the updates once the dry-run output looks correct.');
  }

  console.log('\n🔄 point_events: fetching rows with snapshot_emoji IS NULL...');
  const { data: rows, error } = await supabase
    .from('point_events')
    .select('id, type, behavior_id, reward_id, snapshot_emoji, snapshot_label')
    .is('snapshot_emoji', null);

  if (error) {
    console.error('   ❌ Error fetching point_events:', error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('   ℹ️  No rows need backfilling');
    return;
  }

  console.log(`   📊 ${rows.length} row(s) need snapshot_emoji/snapshot_label`);

  // Fetch ALL behaviors/rewards (including archived - archived rows
  // still exist and still have a valid emoji/title, only DELETED rows
  // are a problem) once, rather than one query per point event.
  const { data: allBehaviors, error: behaviorsError } = await supabase
    .from('behaviors')
    .select('id, emoji, title');
  const { data: allRewards, error: rewardsError } = await supabase
    .from('rewards')
    .select('id, emoji, title');

  if (behaviorsError || rewardsError) {
    console.error('   ❌ Error fetching behaviors/rewards:', (behaviorsError || rewardsError).message);
    process.exit(1);
  }

  const behaviorById = new Map(allBehaviors.map(b => [b.id, b]));
  const rewardById = new Map(allRewards.map(r => [r.id, r]));

  let updated = 0;
  let unrecoverable = 0;
  let failed = 0;

  for (const row of rows) {
    let emoji = null;
    let label = null;

    if (row.behavior_id) {
      const behavior = behaviorById.get(row.behavior_id);
      if (behavior) {
        emoji = behavior.emoji;
        label = behavior.title;
      }
    } else if (row.reward_id) {
      const reward = rewardById.get(row.reward_id);
      if (reward) {
        emoji = reward.emoji;
        label = reward.title;
      }
    }

    if (!emoji && !label) {
      // behavior_id/reward_id is already NULL (source row was deleted
      // before this fix existed) - nothing to recover here. Falls back
      // to the generic "📝ehavior/Reward" placeholder at display time,
      // same as before this backfill - not a regression, just a case
      // this script can't fix retroactively.
      console.warn(`   ⚠️  Unrecoverable: point_events id=${row.id} (type=${row.type}) - source ${row.type === 'behavior' ? 'behavior' : 'reward'} already deleted, no emoji/title to backfill`);
      unrecoverable++;
      continue;
    }

    if (!WRITE_MODE) {
      console.log(`   [dry run] point_events id=${row.id}: -> snapshot_emoji=${emoji} snapshot_label="${label}"`);
      updated++;
      continue;
    }

    // Double-guard with .is('snapshot_emoji', null) in the update filter
    // too, so this is safe to re-run and can never clobber a value set
    // by real app usage between the initial fetch and this write.
    const { error: updateError } = await supabase
      .from('point_events')
      .update({ snapshot_emoji: emoji, snapshot_label: label })
      .eq('id', row.id)
      .is('snapshot_emoji', null);

    if (updateError) {
      console.error(`   ❌ Failed to update point_events id=${row.id}:`, updateError.message);
      failed++;
    } else {
      updated++;
    }
  }

  console.log('\n===========================================');
  console.log(WRITE_MODE ? '✅ Backfill Complete' : '✅ Dry Run Complete');
  console.log('===========================================');
  console.log(`   point_events: ${updated}/${rows.length} ${WRITE_MODE ? 'updated' : 'would update'}${failed > 0 ? `, ${failed} failed` : ''}${unrecoverable > 0 ? `, ${unrecoverable} unrecoverable (source already deleted)` : ''}`);

  if (!WRITE_MODE) {
    console.log('\n💡 This was a dry run - no data was changed. Re-run with --write to apply.');
  }
}

main().catch(error => {
  console.error('\n💥 Backfill failed with error:', error);
  process.exit(1);
});
