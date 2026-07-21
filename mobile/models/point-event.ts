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
