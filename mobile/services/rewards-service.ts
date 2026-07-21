import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {
  Behavior,
  BehaviorInput,
  Reward,
  RewardInput,
  PointEvent,
  PointEventFilter,
  DailySummary,
  EligibilityResult,
} from '../models';
import { databaseService } from './database';

export class RewardsService {
  // ==================== BEHAVIOR MANAGEMENT ====================

  /**
   * Create a new behavior
   */
  async createBehavior(input: BehaviorInput): Promise<Behavior> {
    const behavior: Behavior = {
      id: uuidv4(),
      childProfileId: input.childProfileId,
      title: input.title,
      emoji: input.emoji,
      pointValue: input.pointValue,
      category: input.category,
      timeWindow: input.timeWindow,
      limitRule: input.limitRule,
      exitCriteria: input.exitCriteria,
      notes: input.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    await databaseService.createBehavior(behavior);
    return behavior;
  }

  /**
   * Get all behaviors for a child profile
   * By default, excludes archived behaviors for Quick Log
   */
  async getBehaviors(childProfileId: string, includeArchived: boolean = false): Promise<Behavior[]> {
    const allBehaviors = await databaseService.getBehaviorsByProfile(childProfileId);
    if (includeArchived) {
      return allBehaviors;
    }
    return allBehaviors.filter(b => !b.archived);
  }

  /**
   * Get behaviors filtered by category
   */
  async getBehaviorsByCategory(
    childProfileId: string,
    category: string
  ): Promise<Behavior[]> {
    const allBehaviors = await this.getBehaviors(childProfileId);
    return allBehaviors.filter((b) => b.category === category);
  }

  /**
   * Update an existing behavior
   */
  async updateBehavior(
    id: string,
    updates: Partial<BehaviorInput>
  ): Promise<void> {
    const updateData: any = { ...updates };
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
    }
    await databaseService.updateBehavior(id, updateData);
  }

  /**
   * Delete a behavior
   */
  async deleteBehavior(id: string): Promise<void> {
    await databaseService.deleteBehavior(id);
  }

  /**
   * Archive a behavior (hides from Quick Log)
   */
  async archiveBehavior(id: string): Promise<void> {
    await databaseService.archiveBehavior(id);
  }

  /**
   * Unarchive a behavior (shows in Quick Log again)
   */
  async unarchiveBehavior(id: string): Promise<void> {
    await databaseService.unarchiveBehavior(id);
  }

  // ==================== REWARD MANAGEMENT ====================

  /**
   * Create a new reward
   */
  async createReward(input: RewardInput): Promise<Reward> {
    const reward: Reward = {
      id: uuidv4(),
      childProfileId: input.childProfileId,
      title: input.title,
      emoji: input.emoji,
      pointCost: input.pointCost,
      availabilityRule: input.availabilityRule,
      parentApprovalRequired: input.parentApprovalRequired,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    await databaseService.createReward(reward);
    return reward;
  }

  /**
   * Get all rewards for a child profile, sorted by point cost (lowest to highest)
   * By default, excludes archived rewards for Quick Redeem
   */
  async getRewards(childProfileId: string, includeArchived: boolean = false): Promise<Reward[]> {
    // Database service already sorts by point_cost ASC
    const allRewards = await databaseService.getRewardsByProfile(childProfileId);
    if (includeArchived) {
      return allRewards;
    }
    return allRewards.filter(r => !r.archived);
  }

  /**
   * Update an existing reward
   */
  async updateReward(id: string, updates: Partial<RewardInput>): Promise<void> {
    const updateData: any = { ...updates };
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
    }
    await databaseService.updateReward(id, updateData);
  }

  /**
   * Delete a reward
   */
  async deleteReward(id: string): Promise<void> {
    await databaseService.deleteReward(id);
  }

  /**
   * Archive a reward (hides from Quick Redeem)
   */
  async archiveReward(id: string): Promise<void> {
    await databaseService.archiveReward(id);
  }

  /**
   * Unarchive a reward (shows in Quick Redeem again)
   */
  async unarchiveReward(id: string): Promise<void> {
    await databaseService.unarchiveReward(id);
  }

  // ==================== POINT EVENT LOGGING ====================

  /**
   * Validate that adding a new redemption won't cause negative balance at any point
   * This checks the FULL timeline including events after the redemption date
   */
  private async validateFullTimeline(
    childProfileId: string,
    newRedemption: { timestamp: Date; pointValue: number }
  ): Promise<{ valid: boolean; reason?: string; debugInfo?: string }> {
    // Get ALL existing events (entire history)
    const allEvents = await databaseService.getPointEvents({ childProfileId });
    
    // Add the new redemption
    const eventsWithNew = [...allEvents, { ...newRedemption, id: 'temp' } as PointEvent];
    
    // Sort chronologically (oldest first)
    eventsWithNew.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Calculate running balance through entire timeline
    let runningBalance = 0;
    let wouldGoNegative = false;
    let negativeAmount = 0;
    let negativeAtDate = null;
    const timeline: string[] = [];
    
    for (const event of eventsWithNew) {
      runningBalance += event.pointValue;
      const eventDate = new Date(event.timestamp).toLocaleDateString();
      timeline.push(`${eventDate}: ${event.pointValue > 0 ? '+' : ''}${event.pointValue} → ${runningBalance}`);
      
      if (runningBalance < 0 && !wouldGoNegative) {
        wouldGoNegative = true;
        negativeAmount = runningBalance;
        negativeAtDate = eventDate;
      }
    }
    
    if (wouldGoNegative) {
      const debugInfo = timeline.slice(0, 10).join('\n'); // First 10 events
      return {
        valid: false,
        reason: `Cannot redeem: balance would be ${negativeAmount} on ${negativeAtDate}. Timeline (first 10):\n${debugInfo}`,
        debugInfo,
      };
    }
    
    return { valid: true };
  }

  /**
   * Log a behavior (creates a point event)
   * Requirements: 10.1, 10.2
   */
  async logBehavior(behaviorId: string, timestamp?: Date): Promise<PointEvent> {
    const behavior = await databaseService.getBehavior(behaviorId);
    if (!behavior) {
      throw new Error('Behavior not found');
    }

    const eventTimestamp = timestamp || new Date();
    
    // No need to validate for positive points - they can never cause negative balance
    // Only validate when spending points (negative values)

    const pointEvent: PointEvent = {
      id: uuidv4(),
      childProfileId: behavior.childProfileId,
      type: 'behavior',
      behaviorId: behavior.id,
      pointValue: behavior.pointValue,
      timestamp: eventTimestamp,
      createdAt: new Date(),
      synced: false,
    };

    await databaseService.createPointEvent(pointEvent);
    return pointEvent;
  }

  /**
   * Redeem a reward (creates a negative point event)
   * Requirements: 15.1, 15.2, 15.3, 15.4
   */
  async redeemReward(rewardId: string, timestamp?: Date): Promise<PointEvent> {
    const reward = await databaseService.getReward(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    let eventTimestamp = timestamp || new Date();
    
    // Simple check: verify current balance is sufficient for this redemption
    const currentBalance = await this.calculatePointBalance(reward.childProfileId);
    if (currentBalance < reward.pointCost) {
      throw new Error(`Insufficient points: need ${reward.pointCost}, have ${currentBalance}`);
    }
    
    // For PAST dates, place the redemption at END of that day (last event chronologically)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const redemptionDate = new Date(eventTimestamp);
    redemptionDate.setHours(0, 0, 0, 0);
    
    const isPastDate = redemptionDate.getTime() < today.getTime();
    
    if (isPastDate) {
      // Place at end of the target day so it's the last event chronologically
      eventTimestamp = new Date(redemptionDate);
      eventTimestamp.setHours(23, 59, 59, 999);
      
      // Note: We skip timeline validation because:
      // 1. Current balance check already prevents overspending
      // 2. Past timeline issues shouldn't block new valid redemptions
      // 3. Parents need flexibility for retrospective logging during daily review
    }

    const pointEvent: PointEvent = {
      id: uuidv4(),
      childProfileId: reward.childProfileId,
      type: 'redemption',
      rewardId: reward.id,
      pointValue: -reward.pointCost,
      timestamp: eventTimestamp,
      createdAt: new Date(),
      synced: false,
    };

    await databaseService.createPointEvent(pointEvent);
    return pointEvent;
  }

  /**
   * Undo a point event (delete it)
   * Requirements: 10.4, 10.5
   */
  async undoPointEvent(pointEventId: string): Promise<void> {
    await databaseService.deletePointEvent(pointEventId);
  }

  // ==================== POINT EVENT MANAGEMENT ====================

  /**
   * Get point events with optional filtering
   */
  async getPointEvents(
    childProfileId: string,
    filter?: PointEventFilter
  ): Promise<PointEvent[]> {
    const fullFilter: PointEventFilter = {
      childProfileId,
      ...filter,
    };
    return await databaseService.getPointEvents(fullFilter);
  }

  /**
   * Update a point event
   */
  async updatePointEvent(id: string, updates: Partial<PointEvent>): Promise<void> {
    await databaseService.updatePointEvent(id, updates);
  }

  /**
   * Delete a point event
   */
  async deletePointEvent(id: string): Promise<void> {
    await databaseService.deletePointEvent(id);
  }

  // ==================== POINT BALANCE CALCULATION ====================

  /**
   * Calculate the current point balance for a child profile
   * Requirements: 2.2, 2.3
   */
  async calculatePointBalance(childProfileId: string): Promise<number> {
    return await databaseService.calculatePointBalance(childProfileId);
  }

  /**
   * Get daily summary for a specific date
   * Requirements: 3.2, 3.3, 3.4
   */
  async getDailySummary(childProfileId: string, date: Date): Promise<DailySummary> {
    const events = await databaseService.getDailyPointEvents(childProfileId, date);

    let pointsEarned = 0;
    let pointsSpent = 0;

    events.forEach((event) => {
      if (event.pointValue > 0) {
        pointsEarned += event.pointValue;
      } else {
        pointsSpent += Math.abs(event.pointValue);
      }
    });

    return {
      date,
      pointsEarned,
      pointsSpent,
      netPoints: pointsEarned - pointsSpent,
      eventCount: events.length,
    };
  }

  // ==================== CONSTRAINT VALIDATION ====================

  /**
   * Check if a behavior is eligible to be logged
   * Requirements: 7.2, 7.3, 8.2, 8.3
   * 
   * NOTE: Time window is informational only and not enforced.
   * Parents often log points retrospectively when reviewing the day with their child.
   */
  async checkBehaviorEligibility(
    behaviorId: string,
    timestamp: Date
  ): Promise<EligibilityResult> {
    const behavior = await databaseService.getBehavior(behaviorId);
    if (!behavior) {
      return { eligible: false, reason: 'Behavior not found' };
    }

    // Time window is informational only - not enforced
    // Parents log points retrospectively when reviewing the day

    // Check limit rule constraint
    if (behavior.limitRule && behavior.limitRule.frequency !== 'unlimited') {
      const count = await this.getLogCountForPeriod(
        behaviorId,
        behavior.limitRule.frequency,
        timestamp
      );
      const maxCount = behavior.limitRule.maxCount || 0;
      if (count >= maxCount) {
        return {
          eligible: false,
          reason: `Limit of ${maxCount} per ${behavior.limitRule.frequency} reached`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Check if a reward can be redeemed
   * Requirements: 13.2, 13.3, 15.2
   */
  async checkRedemptionEligibility(
    rewardId: string,
    childProfileId: string
  ): Promise<EligibilityResult> {
    const reward = await databaseService.getReward(rewardId);
    if (!reward) {
      return { eligible: false, reason: 'Reward not found' };
    }

    // Check point balance
    const balance = await this.calculatePointBalance(childProfileId);
    if (balance < reward.pointCost) {
      return {
        eligible: false,
        reason: `Insufficient points (need ${reward.pointCost}, have ${balance})`,
      };
    }

    // Check availability rule
    if (reward.availabilityRule) {
      const { type, consecutiveDays } = reward.availabilityRule;

      if (type === 'weekends_only') {
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          return { eligible: false, reason: 'Available on weekends only' };
        }
      }

      if (type === 'after_consecutive_days' && consecutiveDays) {
        const hasConsecutiveDays = await this.checkConsecutivePositiveDays(
          childProfileId,
          consecutiveDays
        );
        if (!hasConsecutiveDays) {
          return {
            eligible: false,
            reason: `Requires ${consecutiveDays} consecutive positive days`,
          };
        }
      }
    }

    return { eligible: true };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get count of behavior logs for a specific period
   */
  private async getLogCountForPeriod(
    behaviorId: string,
    frequency: 'daily' | 'weekly',
    timestamp: Date
  ): Promise<number> {
    const behavior = await databaseService.getBehavior(behaviorId);
    if (!behavior) return 0;

    let startDate: Date;
    const endDate = new Date(timestamp);

    if (frequency === 'daily') {
      startDate = new Date(timestamp);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // weekly
      startDate = new Date(timestamp);
      // Go to start of week (Sunday)
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
      endDate.setHours(23, 59, 59, 999);
    }

    const events = await databaseService.getPointEvents({
      childProfileId: behavior.childProfileId,
      type: 'behavior',
      dateRange: { start: startDate, end: endDate },
    });

    return events.filter((e) => e.behaviorId === behaviorId).length;
  }

  /**
   * Check if child has consecutive positive days
   */
  private async checkConsecutivePositiveDays(
    childProfileId: string,
    requiredDays: number
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let consecutiveCount = 0;

    for (let i = 0; i < requiredDays + 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const summary = await this.getDailySummary(childProfileId, checkDate);

      if (summary.netPoints > 0) {
        consecutiveCount++;
        if (consecutiveCount >= requiredDays) {
          return true;
        }
      } else if (summary.eventCount > 0) {
        // Reset if there was activity but not positive
        consecutiveCount = 0;
      }
      // If no activity, don't reset (allow skipped days)
    }

    return false;
  }
}

// Singleton instance
export const rewardsService = new RewardsService();
