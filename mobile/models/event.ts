export type EventType = WellBeingEventType | BehavioralEventType | ActivityEventType | 'custom';

export type WellBeingEventType =
  | 'mood'
  | 'sleep'
  | 'good_sleep'
  | 'poor_sleep'
  | 'diet'
  | 'screen_time'
  | 'physical_wellness'
  | 'medication'
  | 'missed_dose';

export type BehavioralEventType =
  | 'meltdown'
  | 'shutdown'
  | 'conflict'
  | 'school_incident'
  | 'school_trip'
  | 'positive_behavior'
  | 'overwhelm'
  | 'naughty'
  | 'scared';

export type ActivityEventType =
  | 'playdate'
  | 'watched_tv'
  | 'sick'
  | 'family_adventure'
  | 'played_outside'
  | 'didnt_eat_dinner'
  | 'wet_bed'
  | 'great_day'
  | 'good_dinner'
  | 'drew_comics'
  | 'creative'
  | 'stayed_home'
  | 'aggression'
  | 'angry'
  | 'fast_food'
  | 'sugar'
  | 'poor_transitions'
  | 'chores'
  | 'focus'
  | 'reading'
  | 'kindness'
  | 'refusal'
  | 'sibling_harmony'
  | 'bad_language'
  | 'injury'
  | 'sneaky'
  | 'messy'
  | 'helpful'
  | 'video_games'
  | 'toilet_issue'
  | 'dad_bonding'
  | 'mom_bonding'
  | 'travel'
  | 'good_breakfast'
  | 'tired'
  | 'sports'
  | 'party'
  | 'bounceback'
  | 'barfed'
  | 'vacation'
  | 'sporting_event'
  | 'brave'
  | 'camp'
  | 'parent_out_of_town';

export type EventValence = 'positive' | 'neutral' | 'negative';

export interface Event {
  id: string;
  childProfileId: string;
  eventType: EventType;
  timestamp: Date;
  severity?: number; // 1-5
  tags: string[];
  notes?: string;
  persons: string[];
  source: 'voice' | 'text' | 'quick-tap' | 'manual' | 'custom';
  transcript?: string;
  customLabel?: string;
  customEmoji?: string;
  valence?: EventValence;
  contextEntryRefs: string[];
  createdAt: Date;
  sequenceOrder?: number;
  /**
   * Whether this event has been synced to the backend - the events table
   * has always tracked this (see database.ts's CREATE TABLE + INSERT/
   * UPDATE statements), but it was never exposed on this model until now.
   * Optional so existing code constructing an Event without this field
   * (e.g. UI-side optimistic objects) still type-checks; row mappers in
   * database.ts/database-supabase.ts populate it from the real column.
   */
  synced?: boolean;
  /**
   * 'YYYY-MM-DD' calendar day this event belongs to, frozen at write time
   * using the device's local timezone at that moment. Use this (not
   * `timestamp`) for any "get events for day D" query - see
   * mobile/utils/local-date.ts and .kiro/specs/timezone-safe-dates/ for why.
   * Optional because rows created before this field existed have it as
   * null until backfilled.
   */
  localDate?: string;
}

export interface EventInput {
  childProfileId: string;
  eventType: EventType;
  timestamp?: Date;
  severity?: number;
  tags?: string[];
  notes?: string;
  persons?: string[];
  source: 'voice' | 'text' | 'quick-tap' | 'manual' | 'custom';
  transcript?: string;
  customLabel?: string;
  customEmoji?: string;
  valence?: EventValence;
}

export interface EventFilter {
  childProfileId: string;
  eventTypes?: EventType[];
  tags?: string[];
  persons?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}
