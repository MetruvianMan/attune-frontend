import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RewardsService } from '../../mobile/services/rewards-service';
import { DatabaseService } from '../../mobile/services/database';
import { BehaviorInput, RewardInput } from '../../mobile/models';

describe('RewardsService', () => {
  let rewardsService: RewardsService;
  let db: DatabaseService;
  const testChildProfileId = 'test-child-profile-rewards';

  beforeEach(async () => {
    rewardsService = new RewardsService();
    db = new DatabaseService();
    await db.initialize();

    // Create a test child profile
    await db.createChildProfile({
      id: testChildProfileId,
      displayName: 'Test Child Rewards',
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

  describe('Behavior Management', () => {
    describe('createBehavior', () => {
      it('should create a behavior with all fields', async () => {
        const input: BehaviorInput = {
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
        };

        const behavior = await rewardsService.createBehavior(input);

        expect(behavior.id).toBeDefined();
        expect(behavior.title).toBe('Clean room');
        expect(behavior.emoji).toBe('🧹');
        expect(behavior.pointValue).toBe(10);
        expect(behavior.category).toBe('Self-care');
        expect(behavior.timeWindow?.startTime).toBe('18:00');
        expect(behavior.limitRule?.frequency).toBe('daily');
        expect(behavior.synced).toBe(false);
      });

      it('should generate a UUID for behavior id', async () => {
        const input: BehaviorInput = {
          childProfileId: testChildProfileId,
          title: 'Test behavior',
          emoji: '✅',
          pointValue: 5,
          category: 'Test',
        };

        const behavior = await rewardsService.createBehavior(input);

        expect(behavior.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });
    });

    describe('getBehaviors', () => {
      it('should retrieve all behaviors for a child profile', async () => {
        const input1: BehaviorInput = {
          childProfileId: testChildProfileId,
          title: 'Homework',
          emoji: '📚',
          pointValue: 15,
          category: 'School',
        };

        const input2: BehaviorInput = {
          childProfileId: testChildProfileId,
          title: 'Brush teeth',
          emoji: '🪥',
          pointValue: 5,
          category: 'Self-care',
        };

        await rewardsService.createBehavior(input1);
        await rewardsService.createBehavior(input2);

        const behaviors = await rewardsService.getBehaviors(testChildProfileId);

        expect(behaviors).toHaveLength(2);
        expect(behaviors.some((b) => b.title === 'Homework')).toBe(true);
        expect(behaviors.some((b) => b.title === 'Brush teeth')).toBe(true);
      });
    });

    describe('getBehaviorsByCategory', () => {
      it('should filter behaviors by category', async () => {
        await rewardsService.createBehavior({
          childProfileId: testChildProfileId,
          title: 'Homework',
          emoji: '📚',
          pointValue: 15,
          category: 'School',
        });

        await rewardsService.createBehavior({
          childProfileId: testChildProfileId,
          title: 'Brush teeth',
          emoji: '🪥',
          pointValue: 5,
          category: 'Self-care',
        });

        await rewardsService.createBehavior({
          childProfileId: testChildProfileId,
          title: 'Reading',
          emoji: '📖',
          pointValue: 10,
          category: 'School',
        });

        const schoolBehaviors = await rewardsService.getBehaviorsByCategory(
          testChildProfileId,
          'School'
        );

        expect(schoolBehaviors).toHaveLength(2);
        expect(schoolBehaviors.every((b) => b.category === 'School')).toBe(true);
      });
    });

    describe('updateBehavior', () => {
      it('should update behavior fields', async () => {
        const behavior = await rewardsService.createBehavior({
          childProfileId: testChildProfileId,
          title: 'Clean room',
          emoji: '🧹',
          pointValue: 10,
          category: 'Self-care',
        });

        await rewardsService.updateBehavior(behavior.id, {
          title: 'Clean bedroom',
          pointValue: 15,
        });

        const behaviors = await rewardsService.getBehaviors(testChildProfileId);
        const updated = behaviors.find((b) => b.id === behavior.id);

        expect(updated?.title).toBe('Clean bedroom');
        expect(updated?.pointValue).toBe(15);
      });
    });

    describe('deleteBehavior', () => {
      it('should delete a behavior', async () => {
        const behavior = await rewardsService.createBehavior({
          childProfileId: testChildProfileId,
          title: 'Temporary task',
          emoji: '✅',
          pointValue: 5,
          category: 'Test',
        });

        await rewardsService.deleteBehavior(behavior.id);

        const behaviors = await rewardsService.getBehaviors(testChildProfileId);
        expect(behaviors.find((b) => b.id === behavior.id)).toBeUndefined();
      });
    });
  });

  describe('Reward Management', () => {
    describe('createReward', () => {
      it('should create a reward with all fields', async () => {
        const input: RewardInput = {
          childProfileId: testChildProfileId,
          title: 'Ice cream trip',
          emoji: '🍦',
          pointCost: 20,
          availabilityRule: {
            type: 'weekends_only',
          },
          parentApprovalRequired: true,
        };

        const reward = await rewardsService.createReward(input);

        expect(reward.id).toBeDefined();
        expect(reward.title).toBe('Ice cream trip');
        expect(reward.emoji).toBe('🍦');
        expect(reward.pointCost).toBe(20);
        expect(reward.availabilityRule?.type).toBe('weekends_only');
        expect(reward.parentApprovalRequired).toBe(true);
        expect(reward.synced).toBe(false);
      });

      it('should generate a UUID for reward id', async () => {
        const input: RewardInput = {
          childProfileId: testChildProfileId,
          title: 'Test reward',
          emoji: '🎁',
          pointCost: 50,
          parentApprovalRequired: false,
        };

        const reward = await rewardsService.createReward(input);

        expect(reward.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });
    });

    describe('getRewards', () => {
      it('should retrieve all rewards sorted by point cost (lowest to highest)', async () => {
        await rewardsService.createReward({
          childProfileId: testChildProfileId,
          title: 'Expensive reward',
          emoji: '🎪',
          pointCost: 100,
          parentApprovalRequired: false,
        });

        await rewardsService.createReward({
          childProfileId: testChildProfileId,
          title: 'Cheap reward',
          emoji: '🍬',
          pointCost: 10,
          parentApprovalRequired: false,
        });

        await rewardsService.createReward({
          childProfileId: testChildProfileId,
          title: 'Medium reward',
          emoji: '📱',
          pointCost: 50,
          parentApprovalRequired: false,
        });

        const rewards = await rewardsService.getRewards(testChildProfileId);

        expect(rewards).toHaveLength(3);
        expect(rewards[0].pointCost).toBe(10); // Lowest
        expect(rewards[1].pointCost).toBe(50);
        expect(rewards[2].pointCost).toBe(100); // Highest
      });

      it('should return empty array for profile with no rewards', async () => {
        const rewards = await rewardsService.getRewards(testChildProfileId);
        expect(rewards).toHaveLength(0);
      });
    });

    describe('updateReward', () => {
      it('should update reward fields', async () => {
        const reward = await rewardsService.createReward({
          childProfileId: testChildProfileId,
          title: 'Ice cream',
          emoji: '🍦',
          pointCost: 20,
          parentApprovalRequired: false,
        });

        await rewardsService.updateReward(reward.id, {
          title: 'Ice cream sundae',
          pointCost: 25,
          parentApprovalRequired: true,
        });

        const rewards = await rewardsService.getRewards(testChildProfileId);
        const updated = rewards.find((r) => r.id === reward.id);

        expect(updated?.title).toBe('Ice cream sundae');
        expect(updated?.pointCost).toBe(25);
        expect(updated?.parentApprovalRequired).toBe(true);
      });
    });

    describe('deleteReward', () => {
      it('should delete a reward', async () => {
        const reward = await rewardsService.createReward({
          childProfileId: testChildProfileId,
          title: 'Temporary reward',
          emoji: '🎁',
          pointCost: 30,
          parentApprovalRequired: false,
        });

        await rewardsService.deleteReward(reward.id);

        const rewards = await rewardsService.getRewards(testChildProfileId);
        expect(rewards.find((r) => r.id === reward.id)).toBeUndefined();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should manage both behaviors and rewards independently', async () => {
      // Create behaviors
      await rewardsService.createBehavior({
        childProfileId: testChildProfileId,
        title: 'Homework',
        emoji: '📚',
        pointValue: 15,
        category: 'School',
      });

      // Create rewards
      await rewardsService.createReward({
        childProfileId: testChildProfileId,
        title: 'Video game time',
        emoji: '🎮',
        pointCost: 30,
        parentApprovalRequired: false,
      });

      const behaviors = await rewardsService.getBehaviors(testChildProfileId);
      const rewards = await rewardsService.getRewards(testChildProfileId);

      expect(behaviors).toHaveLength(1);
      expect(rewards).toHaveLength(1);
    });
  });
});
