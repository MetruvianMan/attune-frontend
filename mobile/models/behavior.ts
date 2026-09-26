// General time-of-day category for a behavior, independent of timeWindow
// (an exact HH:MM eligibility window used for limiting *when a behavior
// can be logged*). This is purely for default Quick Log ordering - see
// RewardsTabScreen.tsx - so future behaviors can slot into a sensible
// position in the carousel without needing an explicit, manually-updated
// ordering list. 'none' means "not time-of-day specific" and sorts to the
// end, same as omitting timeOfDay entirely.
export type TimeOfDay = 'morning' | 'afternoon' | 'night' | 'none';

export interface Behavior {
  id: string;                          // UUID
  childProfileId: string;
  title: string;
  emoji: string;
  pointValue: number;                  // positive for rewards, negative for demerits
  category: string;
  timeOfDay?: TimeOfDay;                // Defaults to 'none' if unset - see TimeOfDay above
  timeWindow?: TimeWindow;
  limitRule?: LimitRule;
  exitCriteria?: string;               // Up to 500 chars
  notes?: string;
  archived: boolean;                   // Whether behavior is archived (hidden from quick log)
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;                     // For sync tracking
}

export interface BehaviorInput {
  childProfileId: string;
  title: string;
  emoji: string;
  pointValue: number;
  category: string;
  timeOfDay?: TimeOfDay;
  timeWindow?: TimeWindow;
  limitRule?: LimitRule;
  exitCriteria?: string;
  notes?: string;
}

export interface TimeWindow {
  startTime: string;                   // HH:MM format (e.g., "18:00")
  endTime: string;                     // HH:MM format (e.g., "20:30")
}

export interface LimitRule {
  frequency: 'unlimited' | 'daily' | 'weekly';
  maxCount?: number;                   // Required if frequency is not 'unlimited'
}
