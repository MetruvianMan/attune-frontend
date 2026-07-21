export interface Reward {
  id: string;                          // UUID
  childProfileId: string;
  title: string;
  emoji: string;
  pointCost: number;                   // Always positive
  availabilityRule?: AvailabilityRule;
  parentApprovalRequired: boolean;
  archived: boolean;                   // Whether reward is archived (hidden from quick redeem)
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
}

export interface RewardInput {
  childProfileId: string;
  title: string;
  emoji: string;
  pointCost: number;
  availabilityRule?: AvailabilityRule;
  parentApprovalRequired: boolean;
}

export interface AvailabilityRule {
  type: 'always' | 'weekends_only' | 'after_consecutive_days';
  consecutiveDays?: number;            // Required if type is 'after_consecutive_days'
}
