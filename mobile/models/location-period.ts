// Fixed to exactly 3 household members for this initial version - the
// child, and two parent roles - not a user-configurable list. See
// Requirement 9.4 (Non-Goals) in
// .kiro/specs/family-location-tracking/requirements.md.
export type HouseholdMember = 'child' | 'mom' | 'dad';

export interface LocationPeriod {
  id: string;
  childProfileId: string;
  householdMember: HouseholdMember;
  savedPlaceId: string;
  /** 'YYYY-MM-DD' local-date string - see mobile/utils/local-date.ts and
   * .kiro/specs/timezone-safe-dates/ for the convention this follows. */
  startDate: string;
  /** 'YYYY-MM-DD', or undefined/null if the period is still "ongoing" -
   * see Requirement 2.2/2.4. */
  endDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationPeriodInput {
  childProfileId: string;
  householdMember: HouseholdMember;
  savedPlaceId: string;
  startDate: string;
  endDate?: string;
}
