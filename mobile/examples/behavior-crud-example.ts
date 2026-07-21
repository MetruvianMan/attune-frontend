/**
 * Example usage of Behavior CRUD operations in DatabaseService
 * 
 * This demonstrates how to use the new Behavior CRUD methods that implement:
 * - Requirements 6.1, 6.2, 6.6, 6.7, 21.1
 * - Prepared statements for all database operations
 * - JSON serialization for TimeWindow and LimitRule
 */

import { databaseService } from '../services/database';
import { Behavior, TimeWindow, LimitRule } from '../models/behavior';
import { v4 as uuidv4 } from 'uuid';

export async function exampleBehaviorCRUD() {
  // Initialize database
  await databaseService.initialize();

  const childProfileId = 'example-child-123';

  // ==================== CREATE BEHAVIOR ====================
  
  // Example 1: Create a positive behavior with time window and limit rule
  const cleanRoomBehavior: Behavior = {
    id: uuidv4(),
    childProfileId,
    title: 'Clean room',
    emoji: '🧹',
    pointValue: 10,
    category: 'Self-care',
    timeWindow: {
      startTime: '18:00',
      endTime: '20:30',
    },
    limitRule: {
      frequency: 'daily',
      maxCount: 1,
    },
    exitCriteria: 'Room is clean and organized',
    notes: 'Remember to check under the bed',
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
  };

  await databaseService.createBehavior(cleanRoomBehavior);
  console.log('✅ Created behavior:', cleanRoomBehavior.title);

  // Example 2: Create a simple behavior (only required fields)
  const homeworkBehavior: Behavior = {
    id: uuidv4(),
    childProfileId,
    title: 'Homework done',
    emoji: '📚',
    pointValue: 15,
    category: 'School',
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
  };

  await databaseService.createBehavior(homeworkBehavior);
  console.log('✅ Created behavior:', homeworkBehavior.title);

  // Example 3: Create a demerit behavior (negative points)
  const demeritBehavior: Behavior = {
    id: uuidv4(),
    childProfileId,
    title: 'Sibling conflict',
    emoji: '😤',
    pointValue: -10,
    category: 'Needs Work',
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
  };

  await databaseService.createBehavior(demeritBehavior);
  console.log('✅ Created demerit behavior:', demeritBehavior.title);

  // ==================== GET BEHAVIOR ====================
  
  const retrieved = await databaseService.getBehavior(cleanRoomBehavior.id);
  console.log('✅ Retrieved behavior:', retrieved?.title);
  console.log('   TimeWindow:', retrieved?.timeWindow);
  console.log('   LimitRule:', retrieved?.limitRule);

  // ==================== GET BEHAVIORS BY PROFILE ====================
  
  const allBehaviors = await databaseService.getBehaviorsByProfile(childProfileId);
  console.log(`✅ Found ${allBehaviors.length} behaviors for child profile`);
  allBehaviors.forEach((b) => {
    console.log(`   - ${b.emoji} ${b.title} (${b.pointValue} pts, ${b.category})`);
  });

  // ==================== UPDATE BEHAVIOR ====================
  
  // Update title and emoji
  await databaseService.updateBehavior(cleanRoomBehavior.id, {
    title: 'Clean bedroom',
    emoji: '🛏️',
  });
  console.log('✅ Updated behavior title and emoji');

  // Update time window
  await databaseService.updateBehavior(homeworkBehavior.id, {
    timeWindow: {
      startTime: '16:00',
      endTime: '18:00',
    },
  });
  console.log('✅ Added time window to homework behavior');

  // Remove time window
  await databaseService.updateBehavior(cleanRoomBehavior.id, {
    timeWindow: undefined,
  });
  console.log('✅ Removed time window from clean room behavior');

  // Update limit rule
  await databaseService.updateBehavior(homeworkBehavior.id, {
    limitRule: {
      frequency: 'weekly',
      maxCount: 5,
    },
  });
  console.log('✅ Updated limit rule for homework behavior');

  // ==================== DELETE BEHAVIOR ====================
  
  await databaseService.deleteBehavior(demeritBehavior.id);
  console.log('✅ Deleted behavior:', demeritBehavior.title);

  // Verify deletion
  const deletedBehavior = await databaseService.getBehavior(demeritBehavior.id);
  console.log('   Deleted behavior exists:', deletedBehavior !== null); // Should be false

  // ==================== JSON SERIALIZATION ====================
  
  // Verify TimeWindow serialization
  const behaviorWithTimeWindow = await databaseService.getBehavior(homeworkBehavior.id);
  console.log('✅ TimeWindow serialization working:', {
    startTime: behaviorWithTimeWindow?.timeWindow?.startTime,
    endTime: behaviorWithTimeWindow?.timeWindow?.endTime,
  });

  // Verify LimitRule serialization
  console.log('✅ LimitRule serialization working:', {
    frequency: behaviorWithTimeWindow?.limitRule?.frequency,
    maxCount: behaviorWithTimeWindow?.limitRule?.maxCount,
  });

  console.log('\n✅ All Behavior CRUD operations completed successfully!');
}

// Run example (uncomment to test)
// exampleBehaviorCRUD().catch(console.error);
