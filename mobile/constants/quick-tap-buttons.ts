import { EventType } from '../models';

export interface QuickTapButtonConfig {
  eventType: EventType;
  label: string;
  emoji: string;
}

// Default quick-tap buttons based on web app with EXACT emoji mappings.
// This is the canonical "Quick Log" list shown on the Today tab, and is
// also used as the source of selectable event types when editing an
// event's type (see app/event-form.tsx) - i.e. "any saved quick log event".
export const DEFAULT_QUICK_TAP_BUTTONS: QuickTapButtonConfig[] = [
  { eventType: 'meltdown', label: 'Meltdown', emoji: '🌊' },
  { eventType: 'shutdown', label: 'Shutdown', emoji: '🔇' },
  { eventType: 'conflict', label: 'Sibling Conflict', emoji: '⚡' },
  { eventType: 'school_incident', label: 'School Incident', emoji: '🏫' },
  { eventType: 'school_trip', label: 'School Trip', emoji: '🚌' },
  { eventType: 'great_day', label: 'Great Day', emoji: '🌟' },
  { eventType: 'good_sleep', label: 'Good Sleep', emoji: '😴' },
  { eventType: 'poor_sleep', label: 'Poor Sleep', emoji: '😵' },
  { eventType: 'medication', label: 'Medication Given', emoji: '💊' },
  { eventType: 'wet_bed', label: 'Wet Bed', emoji: '🛏️' },
  { eventType: 'didnt_eat_dinner', label: "Didn't Eat Dinner", emoji: '🍽️' },
  { eventType: 'playdate', label: 'Playdate', emoji: '👫' },
  { eventType: 'watched_tv', label: 'Watched TV', emoji: '📺' },
  { eventType: 'sick', label: 'Sick', emoji: '🤒' },
  { eventType: 'family_adventure', label: 'Family Adventure', emoji: '🎡' },
  { eventType: 'camp', label: 'Camp', emoji: '🏕️' },
  { eventType: 'played_outside', label: 'Played Outside', emoji: '🌳' },
  { eventType: 'good_dinner', label: 'Good Dinner', emoji: '😋' },
  { eventType: 'drew_comics', label: 'Drew Comics', emoji: '🦸' },
  { eventType: 'stayed_home', label: 'Stayed Home', emoji: '🏠' },
  { eventType: 'aggression', label: 'Aggression', emoji: '😠' },
  { eventType: 'good_breakfast', label: 'Good Breakfast', emoji: '🍳' },
  { eventType: 'tired', label: 'Tired', emoji: '🥱' },
  { eventType: 'fast_food', label: 'Fast Food', emoji: '🍟' },
  { eventType: 'sports', label: 'Sports', emoji: '🏀' },
  { eventType: 'party', label: 'Party', emoji: '🎉' },
  { eventType: 'bounceback', label: 'Bounceback', emoji: '🐦‍🔥' },
  { eventType: 'sugar', label: 'Sugar', emoji: '🍬' },
  { eventType: 'poor_transitions', label: 'Poor Transitions', emoji: '🎢' },
  { eventType: 'chores', label: 'Chores', emoji: '🧹' },
  { eventType: 'focus', label: 'Focus', emoji: '🔎' },
  { eventType: 'reading', label: 'Reading', emoji: '📚' },
  { eventType: 'kindness', label: 'Kindness', emoji: '🫶' },
  { eventType: 'overwhelm', label: 'Overwhelm', emoji: '😢' },
  { eventType: 'naughty', label: 'Naughty', emoji: '😈' },
  { eventType: 'refusal', label: 'Refusal', emoji: '🙅' },
  { eventType: 'sibling_harmony', label: 'Sibling Harmony', emoji: '🫂' },
  { eventType: 'bad_language', label: 'Bad Language', emoji: '🤬' },
  { eventType: 'injury', label: 'Injury', emoji: '🤕' },
  { eventType: 'sneaky', label: 'Sneaky', emoji: '🥷' },
  { eventType: 'messy', label: 'Messy', emoji: '🫗' },
  { eventType: 'helpful', label: 'Helpful', emoji: '🤝🏻' },
  { eventType: 'video_games', label: 'Video Games', emoji: '🎮' },
  { eventType: 'toilet_issue', label: 'Toilet Issue', emoji: '🚽' },
  { eventType: 'dad_bonding', label: 'Dad Bonding', emoji: '👨🏻' },
  { eventType: 'mom_bonding', label: 'Mom Bonding', emoji: '👩🏼' },
  { eventType: 'travel', label: 'Travel', emoji: '✈️' },
  { eventType: 'barfed', label: 'Barfed', emoji: '🤮' },
  { eventType: 'vacation', label: 'Vacation', emoji: '🌴' },
  { eventType: 'sporting_event', label: 'Sporting Event', emoji: '🏟️' },
  { eventType: 'brave', label: 'Brave', emoji: '🦁' },
  { eventType: 'parent_out_of_town', label: 'Parent(s) Away', emoji: '💺' },
];
