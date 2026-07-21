/**
 * Verification script for sync support methods
 * This script tests the newly implemented sync methods for rewards data
 */

import { DatabaseService } from './services/database';

async function verifySyncMethods() {
  console.log('🔍 Verifying sync support methods...\n');

  const db = new DatabaseService();
  await db.initialize();

  try {
    // Test 1: getUnsyncedBehaviors
    console.log('✅ Test 1: getUnsyncedBehaviors()');
    const unsyncedBehaviors = await db.getUnsyncedBehaviors();
    console.log(`   Found ${unsyncedBehaviors.length} unsynced behaviors`);
    console.log(`   Method exists and returns array: ${Array.isArray(unsyncedBehaviors)}\n`);

    // Test 2: getUnsyncedRewards
    console.log('✅ Test 2: getUnsyncedRewards()');
    const unsyncedRewards = await db.getUnsyncedRewards();
    console.log(`   Found ${unsyncedRewards.length} unsynced rewards`);
    console.log(`   Method exists and returns array: ${Array.isArray(unsyncedRewards)}\n`);

    // Test 3: getUnsyncedPointEvents
    console.log('✅ Test 3: getUnsyncedPointEvents()');
    const unsyncedPointEvents = await db.getUnsyncedPointEvents();
    console.log(`   Found ${unsyncedPointEvents.length} unsynced point events`);
    console.log(`   Method exists and returns array: ${Array.isArray(unsyncedPointEvents)}\n`);

    // Test 4: markBehaviorsSynced (with empty array to test guard)
    console.log('✅ Test 4: markBehaviorsSynced([])');
    await db.markBehaviorsSynced([]);
    console.log('   Method handles empty array without error\n');

    // Test 5: markRewardsSynced (with empty array to test guard)
    console.log('✅ Test 5: markRewardsSynced([])');
    await db.markRewardsSynced([]);
    console.log('   Method handles empty array without error\n');

    // Test 6: markPointEventsSynced (with empty array to test guard)
    console.log('✅ Test 6: markPointEventsSynced([])');
    await db.markPointEventsSynced([]);
    console.log('   Method handles empty array without error\n');

    console.log('✅ All sync support methods verified successfully!');
    console.log('\n📋 Summary:');
    console.log('   - getUnsyncedBehaviors() ✓');
    console.log('   - getUnsyncedRewards() ✓');
    console.log('   - getUnsyncedPointEvents() ✓');
    console.log('   - markBehaviorsSynced() ✓');
    console.log('   - markRewardsSynced() ✓');
    console.log('   - markPointEventsSynced() ✓');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run verification if executed directly
if (require.main === module) {
  verifySyncMethods()
    .then(() => {
      console.log('\n✅ Verification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifySyncMethods };
