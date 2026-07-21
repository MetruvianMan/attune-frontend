import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../mobile/services/database';
import { Behavior, TimeWindow, LimitRule } from '../../mobile/models/behavior';

describe('Behavior CRUD Operations', () => {
  let db: DatabaseService;
  const testChildProfileId = 'test-child-profile-123';

  beforeEach(async () => {
    db = new DatabaseService();
    await db.initialize();

    // Create a test child profile
    await db.createChildProfile({
      id: testChildProfileId,
      displayName: 'Test Child',
      age: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    // Clean up: delete test data
    try {
      await db.deleteChildProfile(testChildProfileId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createBehavior', () => {
    it('should create a behavior with all fields', async () => {
      const behavior: Behavior = {
        id: 'behavior-1',
        childProfileId: testChildProfileId,
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

      await db.createBehavior(behavior);

      const retrieved = await db.getBehavior('behavior-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('behavior-1');
      expect(retrieved?.title).toBe('Clean room');
      expect(retrieved?.emoji).toBe('🧹');
      expect(retrieved?.pointValue).toBe(10);
      expect(retrieved?.category).toBe('Self-care');
      expect(retrieved?.timeWindow?.startTime).toBe('18:00');
      expect(retrieved?.timeWindow?.endTime).toBe('20:30');
      expect(retrieved?.limitRule?.frequency).toBe('daily');
      expect(retrieved?.limitRule?.maxCount).toBe(1);
      expect(retrieved?.exitCriteria).toBe('Room is clean and organized');
      expect(retrieved?.notes).toBe('Remember to check under the bed');
      expect(retrieved?.synced).toBe(false);
    });

    it('should create a behavior with only required fields', async () => {
      const behavior: Behavior = {
        id: 'behavior-2',
        childProfileId: testChildProfileId,
        title: 'Homework done',
        emoji: '📚',
        pointValue: 15,
        category: 'School',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);

      const retrieved = await db.getBehavior('behavior-2');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('behavior-2');
      expect(retrieved?.title).toBe('Homework done');
      expect(retrieved?.timeWindow).toBeUndefined();
      expect(retrieved?.limitRule).toBeUndefined();
      expect(retrieved?.exitCriteria).toBeNull();
      expect(retrieved?.notes).toBeNull();
    });

    it('should create a demerit behavior with negative points', async () => {
      const behavior: Behavior = {
        id: 'behavior-3',
        childProfileId: testChildProfileId,
        title: 'Sibling conflict',
        emoji: '😤',
        pointValue: -10,
        category: 'Needs Work',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);

      const retrieved = await db.getBehavior('behavior-3');
      expect(retrieved).toBeDefined();
      expect(retrieved?.pointValue).toBe(-10);
    });
  });

  describe('getBehavior', () => {
    it('should return null for non-existent behavior', async () => {
      const retrieved = await db.getBehavior('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('getBehaviorsByProfile', () => {
    it('should return all behaviors for a child profile', async () => {
      const behavior1: Behavior = {
        id: 'behavior-4',
        childProfileId: testChildProfileId,
        title: 'Clean room',
        emoji: '🧹',
        pointValue: 10,
        category: 'Self-care',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      const behavior2: Behavior = {
        id: 'behavior-5',
        childProfileId: testChildProfileId,
        title: 'Brushed teeth',
        emoji: '🪥',
        pointValue: 5,
        category: 'Self-care',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      const behavior3: Behavior = {
        id: 'behavior-6',
        childProfileId: testChildProfileId,
        title: 'Homework done',
        emoji: '📚',
        pointValue: 15,
        category: 'School',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior1);
      await db.createBehavior(behavior2);
      await db.createBehavior(behavior3);

      const behaviors = await db.getBehaviorsByProfile(testChildProfileId);
      expect(behaviors).toHaveLength(3);
      
      // Should be ordered by category, then title
      expect(behaviors[0].category).toBe('School');
      expect(behaviors[1].category).toBe('Self-care');
      expect(behaviors[2].category).toBe('Self-care');
    });

    it('should return empty array for profile with no behaviors', async () => {
      const behaviors = await db.getBehaviorsByProfile(testChildProfileId);
      expect(behaviors).toHaveLength(0);
    });
  });

  describe('updateBehavior', () => {
    it('should update behavior title and emoji', async () => {
      const behavior: Behavior = {
        id: 'behavior-7',
        childProfileId: testChildProfileId,
        title: 'Clean room',
        emoji: '🧹',
        pointValue: 10,
        category: 'Self-care',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);

      await db.updateBehavior('behavior-7', {
        title: 'Clean bedroom',
        emoji: '🛏️',
      });

      const updated = await db.getBehavior('behavior-7');
      expect(updated?.title).toBe('Clean bedroom');
      expect(updated?.emoji).toBe('🛏️');
      expect(updated?.pointValue).toBe(10); // Unchanged
      expect(updated?.synced).toBe(false);
    });

    it('should update timeWindow', async () => {
      const behavior: Behavior = {
        id: 'behavior-8',
        childProfileId: testChildProfileId,
        title: 'Evening routine',
        emoji: '🌙',
        pointValue: 5,
        category: 'Self-care',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);

      await db.updateBehavior('behavior-8', {
        timeWindow: {
          startTime: '19:00',
          endTime: '21:00',
        },
      });

      const updated = await db.getBehavior('behavior-8');
      expect(updated?.timeWindow?.startTime).toBe('19:00');
      expect(updated?.timeWindow?.endTime).toBe('21:00');
    });

    it('should remove timeWindow when set to undefined', async () => {
      const behavior: Behavior = {
        id: 'behavior-9',
        childProfileId: testChildProfileId,
        title: 'Evening routine',
        emoji: '🌙',
        pointValue: 5,
        category: 'Self-care',
        timeWindow: {
          startTime: '19:00',
          endTime: '21:00',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);

      await db.updateBehavior('behavior-9', {
        timeWindow: undefined,
      });

      const updated = await db.getBehavior('behavior-9');
      expect(updated?.timeWindow).toBeUndefined();
    });

    it('should update limitRule', async () => {
      const behavior: Behavior = {
        id: 'behavior-10',
        childProfileId: testChildProfileId,
        title: 'Screen time',
        emoji: '📱',
        pointValue: 5,
        category: 'Rewards',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);

      await db.updateBehavior('behavior-10', {
        limitRule: {
          frequency: 'daily',
          maxCount: 2,
        },
      });

      const updated = await db.getBehavior('behavior-10');
      expect(updated?.limitRule?.frequency).toBe('daily');
      expect(updated?.limitRule?.maxCount).toBe(2);
    });
  });

  describe('deleteBehavior', () => {
    it('should delete a behavior', async () => {
      const behavior: Behavior = {
        id: 'behavior-11',
        childProfileId: testChildProfileId,
        title: 'Clean room',
        emoji: '🧹',
        pointValue: 10,
        category: 'Self-care',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);

      const beforeDelete = await db.getBehavior('behavior-11');
      expect(beforeDelete).toBeDefined();

      await db.deleteBehavior('behavior-11');

      const afterDelete = await db.getBehavior('behavior-11');
      expect(afterDelete).toBeNull();
    });

    it('should not throw error when deleting non-existent behavior', async () => {
      await expect(db.deleteBehavior('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('JSON serialization', () => {
    it('should correctly serialize and deserialize TimeWindow', async () => {
      const timeWindow: TimeWindow = {
        startTime: '18:00',
        endTime: '20:30',
      };

      const behavior: Behavior = {
        id: 'behavior-12',
        childProfileId: testChildProfileId,
        title: 'Evening task',
        emoji: '🌙',
        pointValue: 5,
        category: 'Self-care',
        timeWindow,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);
      const retrieved = await db.getBehavior('behavior-12');

      expect(retrieved?.timeWindow).toEqual(timeWindow);
    });

    it('should correctly serialize and deserialize LimitRule', async () => {
      const limitRule: LimitRule = {
        frequency: 'weekly',
        maxCount: 3,
      };

      const behavior: Behavior = {
        id: 'behavior-13',
        childProfileId: testChildProfileId,
        title: 'Special reward',
        emoji: '🎁',
        pointValue: 20,
        category: 'Rewards',
        limitRule,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      await db.createBehavior(behavior);
      const retrieved = await db.getBehavior('behavior-13');

      expect(retrieved?.limitRule).toEqual(limitRule);
    });
  });
});
