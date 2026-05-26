export type EventType = WellBeingEventType | BehavioralEventType | ActivityEventType | 'custom';

export type WellBeingEventType =
  | 'mood'
  | 'sleep'
  | 'good_sleep'
  | 'poor_sleep'
  | 'diet'
  | 'screen_time'
  | 'physical_wellness'
  | 'medication';

export type BehavioralEventType =
  | 'meltdown'
  | 'shutdown'
  | 'conflict'
  | 'school_incident'
  | 'positive_behavior'
  | 'overwhelm'
  | 'naughty';

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
  | 'bounceback';

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
  source: 'voice' | 'quick-tap' | 'manual' | 'custom';
  transcript?: string;
  customLabel?: string;
  customEmoji?: string;
  valence?: EventValence;
  contextEntryRefs: string[];
  createdAt: Date;
  sequenceOrder?: number;
}

export interface EventInput {
  childProfileId: string;
  eventType: EventType;
  timestamp?: Date;
  severity?: number;
  tags?: string[];
  notes?: string;
  persons?: string[];
  source: 'voice' | 'quick-tap' | 'manual' | 'custom';
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
