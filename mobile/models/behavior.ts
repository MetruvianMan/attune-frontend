export interface Behavior {
  id: string;                          // UUID
  childProfileId: string;
  title: string;
  emoji: string;
  pointValue: number;                  // positive for rewards, negative for demerits
  category: string;
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
