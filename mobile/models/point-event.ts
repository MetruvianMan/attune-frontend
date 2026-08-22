export interface PointEvent {
  id: string;                          // UUID
  childProfileId: string;
  type: 'behavior' | 'redemption';
  behaviorId?: string;                 // Present if type is 'behavior'
  rewardId?: string;                   // Present if type is 'redemption'
  pointValue: number;                  // Positive or negative
  timestamp: Date;
  notes?: string;                      // Optional notes added when logging or editing
  parentId?: string;                   // Optional: which parent logged this
  createdAt: Date;
  synced: boolean;
  /**
   * 'YYYY-MM-DD' calendar day this point event belongs to, frozen at write
   * time using the device's local timezone at that moment. Use this (not
   * `timestamp`) for any "get point events for day D" query - see
   * mobile/utils/local-date.ts and .kiro/specs/timezone-safe-dates/.
   * Optional because rows created before this field existed have it as
   * null until backfilled.
   */
  localDate?: string;
  /**
   * The behavior's/reward's emoji at the moment this point event was
   * logged, frozen permanently on this row. point_events.behaviorId/
   * rewardId are foreign keys with ON DELETE SET NULL - if the source
   * Behavior/Reward is later deleted (e.g. a one-off custom entry that
   * wasn't saved to Quick Log), the emoji/title can no longer be looked
   * up via that join. Prefer this field over resolving emoji through
   * behaviorId/rewardId wherever a point event is displayed. Optional
   * because rows created before this field existed have it as null until
   * backfilled.
   */
  snapshotEmoji?: string;
  /** Same rationale as snapshotEmoji, but for the behavior's/reward's title. */
  snapshotLabel?: string;
}

export interface PointEventFilter {
  childProfileId: string;
  type?: 'behavior' | 'redemption';
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

export interface DailySummary {
  date: Date;
  pointsEarned: number;               // Sum of positive point values
  pointsSpent: number;                // Absolute value of negative point values
  netPoints: number;                  // pointsEarned - pointsSpent
  eventCount: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;                    // Error message if not eligible
}
