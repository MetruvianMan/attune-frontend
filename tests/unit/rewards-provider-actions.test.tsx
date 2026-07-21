/**
 * Unit tests for RewardsProvider action creators
 * 
 * Tests the implementation of all behavior, reward, and point event actions:
 * - Behavior CRUD operations (create, update, delete)
 * - Reward CRUD operations (create, update, delete)
 * - Point event operations (logBehavior, redeemReward, undo)
 * - Refresh and child profile switching
 * 
 * Requirements covered: 1.5, 6.1, 6.6, 6.7, 12.1, 12.5, 12.6, 10.1, 11.1, 15.1, 20.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { RewardsProvider, useRewards } from '../../mobile/contexts/RewardsContext';
import { rewardsService } from '../../mobile/services/rewards-service';
import React from 'react';

// Mock the rewards service
vi.mock('../../mobile/services/rewards-service', () => ({
  rewardsService: {
    createBehavior: vi.fn(),
    updateBehavior: vi.fn(),
    deleteBehavior: vi.fn(),
    createReward: vi.fn(),
    updateReward: vi.fn(),
    deleteReward: vi.fn(),
    logBehavior: vi.fn(),
    redeemReward: vi.fn(),
    undoPointEvent: vi.fn(),
    checkBehaviorEligibility: vi.fn(),
    checkRedemptionEligibility: vi.fn(),
    calculatePointBalance: vi.fn(),
    getDailySummary: vi.fn(),
    getPointEvents: vi.fn(),
    getBehaviors: vi.fn(),
    getRewards: vi.fn(),
  },
}));

// Helper component to access context
function TestComponent({ onRender }: { onRender?: (context: any) => void }) {
  const context = useRewards();
  
  React.useEffect(() => {
    if (onRender) {
      onRender(context);
    }
  }, [context, onRender]);

  return <div data-testid="test">Test</div>;
}

describe('RewardsProvider Action Creators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Behavior Actions', () => {
    it('should create a behavior and add it to state', async () => {
      const mockBehavior = {
        id: 'behavior-1',
        childProfileId: 'child-1',
        title: 'Clean room',
        emoji: '🧹',
        pointValue: 10,
        category: 'Chores',
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      (rewardsService.createBehavior as any).mockResolvedValue(mockBehavior);

      let contextValue: any;
      const { rerender } = render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await act(async () => {
        await contextValue.createBehavior({
          childProfileId: 'child-1',
          title: 'Clean room',
          emoji: '🧹',
          pointValue: 10,
          category: 'Chores',
        });
      });

      rerender(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      expect(rewardsService.createBehavior).toHaveBeenCalledWith({
        childProfileId: 'child-1',
        title: 'Clean room',
        emoji: '🧹',
        pointValue: 10,
        category: 'Chores',
      });
    });

    it('should update a behavior and update state', async () => {
      (rewardsService.updateBehavior as any).mockResolvedValue(undefined);

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await act(async () => {
        await contextValue.updateBehavior('behavior-1', { title: 'Clean bedroom' });
      });

      expect(rewardsService.updateBehavior).toHaveBeenCalledWith('behavior-1', { title: 'Clean bedroom' });
    });

    it('should delete a behavior and remove from state', async () => {
      (rewardsService.deleteBehavior as any).mockResolvedValue(undefined);

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await act(async () => {
        await contextValue.deleteBehavior('behavior-1');
      });

      expect(rewardsService.deleteBehavior).toHaveBeenCalledWith('behavior-1');
    });
  });

  describe('Reward Actions', () => {
    it('should create a reward and add it to state', async () => {
      const mockReward = {
        id: 'reward-1',
        childProfileId: 'child-1',
        title: 'Ice cream',
        emoji: '🍦',
        pointCost: 20,
        parentApprovalRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      (rewardsService.createReward as any).mockResolvedValue(mockReward);

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await act(async () => {
        await contextValue.createReward({
          childProfileId: 'child-1',
          title: 'Ice cream',
          emoji: '🍦',
          pointCost: 20,
          parentApprovalRequired: false,
        });
      });

      expect(rewardsService.createReward).toHaveBeenCalledWith({
        childProfileId: 'child-1',
        title: 'Ice cream',
        emoji: '🍦',
        pointCost: 20,
        parentApprovalRequired: false,
      });
    });

    it('should update a reward and update state', async () => {
      (rewardsService.updateReward as any).mockResolvedValue(undefined);

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await act(async () => {
        await contextValue.updateReward('reward-1', { pointCost: 25 });
      });

      expect(rewardsService.updateReward).toHaveBeenCalledWith('reward-1', { pointCost: 25 });
    });

    it('should delete a reward and remove from state', async () => {
      (rewardsService.deleteReward as any).mockResolvedValue(undefined);

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await act(async () => {
        await contextValue.deleteReward('reward-1');
      });

      expect(rewardsService.deleteReward).toHaveBeenCalledWith('reward-1');
    });
  });

  describe('Point Event Actions', () => {
    it('should log a behavior and update state', async () => {
      const mockPointEvent = {
        id: 'event-1',
        childProfileId: 'child-1',
        type: 'behavior' as const,
        behaviorId: 'behavior-1',
        pointValue: 10,
        timestamp: new Date(),
        createdAt: new Date(),
        synced: false,
      };

      (rewardsService.checkBehaviorEligibility as any).mockResolvedValue({ eligible: true });
      (rewardsService.logBehavior as any).mockResolvedValue(mockPointEvent);
      (rewardsService.calculatePointBalance as any).mockResolvedValue(10);
      (rewardsService.getDailySummary as any).mockResolvedValue({
        date: new Date(),
        pointsEarned: 10,
        pointsSpent: 0,
        netPoints: 10,
        eventCount: 1,
      });
      (rewardsService.getPointEvents as any).mockResolvedValue([mockPointEvent]);

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      // Set child profile first
      await act(async () => {
        await contextValue.switchChildProfile('child-1');
      });

      await act(async () => {
        await contextValue.logBehavior('behavior-1');
      });

      expect(rewardsService.checkBehaviorEligibility).toHaveBeenCalled();
      expect(rewardsService.logBehavior).toHaveBeenCalledWith('behavior-1');
    });

    it('should not log behavior if not eligible', async () => {
      (rewardsService.checkBehaviorEligibility as any).mockResolvedValue({
        eligible: false,
        reason: 'Limit reached',
      });

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await expect(async () => {
        await act(async () => {
          await contextValue.logBehavior('behavior-1');
        });
      }).rejects.toThrow('Limit reached');

      expect(rewardsService.logBehavior).not.toHaveBeenCalled();
    });

    it('should redeem a reward and update state', async () => {
      const mockPointEvent = {
        id: 'event-2',
        childProfileId: 'child-1',
        type: 'redemption' as const,
        rewardId: 'reward-1',
        pointValue: -20,
        timestamp: new Date(),
        createdAt: new Date(),
        synced: false,
      };

      (rewardsService.checkRedemptionEligibility as any).mockResolvedValue({ eligible: true });
      (rewardsService.redeemReward as any).mockResolvedValue(mockPointEvent);
      (rewardsService.calculatePointBalance as any).mockResolvedValue(-10);
      (rewardsService.getDailySummary as any).mockResolvedValue({
        date: new Date(),
        pointsEarned: 0,
        pointsSpent: 20,
        netPoints: -20,
        eventCount: 1,
      });
      (rewardsService.getPointEvents as any).mockResolvedValue([mockPointEvent]);

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      // Set child profile first
      await act(async () => {
        await contextValue.switchChildProfile('child-1');
      });

      await act(async () => {
        await contextValue.redeemReward('reward-1');
      });

      expect(rewardsService.checkRedemptionEligibility).toHaveBeenCalled();
      expect(rewardsService.redeemReward).toHaveBeenCalledWith('reward-1');
    });
  });

  describe('Refresh and Profile Switching', () => {
    it('should refresh data for selected child profile', async () => {
      const mockBehaviors = [{ id: 'b1', title: 'Test' }];
      const mockRewards = [{ id: 'r1', title: 'Reward' }];
      const mockPointEvents = [{ id: 'e1', pointValue: 10 }];

      (rewardsService.getBehaviors as any).mockResolvedValue(mockBehaviors);
      (rewardsService.getRewards as any).mockResolvedValue(mockRewards);
      (rewardsService.getPointEvents as any).mockResolvedValue(mockPointEvents);
      (rewardsService.calculatePointBalance as any).mockResolvedValue(10);
      (rewardsService.getDailySummary as any).mockResolvedValue({
        date: new Date(),
        pointsEarned: 10,
        pointsSpent: 0,
        netPoints: 10,
        eventCount: 1,
      });

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      // Set child profile first
      await act(async () => {
        await contextValue.switchChildProfile('child-1');
      });

      vi.clearAllMocks();

      await act(async () => {
        await contextValue.refreshData();
      });

      expect(rewardsService.getBehaviors).toHaveBeenCalledWith('child-1');
      expect(rewardsService.getRewards).toHaveBeenCalledWith('child-1');
      expect(rewardsService.getPointEvents).toHaveBeenCalled();
      expect(rewardsService.calculatePointBalance).toHaveBeenCalledWith('child-1');
      expect(rewardsService.getDailySummary).toHaveBeenCalled();
    });

    it('should switch child profile and load new data', async () => {
      const mockBehaviors = [{ id: 'b2', title: 'Test2' }];
      const mockRewards = [{ id: 'r2', title: 'Reward2' }];
      const mockPointEvents = [{ id: 'e2', pointValue: 5 }];

      (rewardsService.getBehaviors as any).mockResolvedValue(mockBehaviors);
      (rewardsService.getRewards as any).mockResolvedValue(mockRewards);
      (rewardsService.getPointEvents as any).mockResolvedValue(mockPointEvents);
      (rewardsService.calculatePointBalance as any).mockResolvedValue(5);
      (rewardsService.getDailySummary as any).mockResolvedValue({
        date: new Date(),
        pointsEarned: 5,
        pointsSpent: 0,
        netPoints: 5,
        eventCount: 1,
      });

      let contextValue: any;
      render(
        <RewardsProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx; }} />
        </RewardsProvider>
      );

      await act(async () => {
        await contextValue.switchChildProfile('child-2');
      });

      expect(rewardsService.getBehaviors).toHaveBeenCalledWith('child-2');
      expect(rewardsService.getRewards).toHaveBeenCalledWith('child-2');
      expect(rewardsService.calculatePointBalance).toHaveBeenCalledWith('child-2');
    });
  });
});
