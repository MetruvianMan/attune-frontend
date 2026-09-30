import { EventType, EventValence } from '../models';

// Event types that push the day's auto-computed mood toward "difficult"/
// "good day" respectively - previously duplicated verbatim in
// app/(tabs)/index.tsx, components/WeatherView.tsx, and
// components/HeatMapView.tsx (all three used to define their own
// identical copies of RED_EVENTS/GREEN_EVENTS). Centralized here so
// getDefaultValenceForEventType (below) - and any future consumer - has
// one source of truth instead of a fourth copy.
export const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue', 'angry', 'didnt_eat_dinner', 'overwhelm'];
export const GREEN_EVENTS: EventType[] = ['great_day', 'positive_behavior', 'good_sleep', 'good_dinner', 'played_outside', 'family_adventure', 'kindness', 'reading', 'focus', 'chores', 'drew_comics', 'playdate', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding', 'camp', 'creative'];

/**
 * Derives a display-only valence for an event that has no explicit
 * `valence` field of its own - specifically Quick Log/quick-tap events,
 * which never captured valence (see event-form.tsx's Edit Event screen -
 * this is what backs the "Impact" indicator shown there for those
 * events). Falls back to RED_EVENTS/GREEN_EVENTS classification, the
 * same type-based rule already used for automatic day-mood scoring in
 * WeatherView/HeatMapView/the Today tab - so a Quick Log meltdown reads
 * as "Negative" here for the same reason it already counts against the
 * day's mood elsewhere, rather than introducing a second, different
 * notion of valence.
 *
 * Every event type gets a value - anything in neither list (e.g.
 * watched_tv, medication) falls through to 'neutral' rather than
 * undefined, so the Valence selector always shows a selection for Quick
 * Log events instead of leaving genuinely-neutral ones blank.
 */
export function getDefaultValenceForEventType(eventType: EventType): EventValence {
  if (RED_EVENTS.includes(eventType)) return 'negative';
  if (GREEN_EVENTS.includes(eventType)) return 'positive';
  return 'neutral';
}

export const EVENT_EMOJIS: Record<EventType, string> = {
  // Alert/negative events
  meltdown: '🌊',
  shutdown: '🔇',
  conflict: '⚡',
  school_incident: '🏫',
  aggression: '😠',
  poor_transitions: '🎢',
  overwhelm: '😢',
  naughty: '😈',
  refusal: '🙅',
  bad_language: '🤬',
  injury: '🤕',
  sneaky: '🥷',
  sick: '🤒',
  
  // Positive/wellness events
  great_day: '🌟',
  positive_behavior: '🌟',
  mood: '😊',
  good_dinner: '😋',
  drew_comics: '🦸',
  creative: '🧠',
  stayed_home: '🏠',
  chores: '🧹',
  focus: '🔎',
  reading: '📚',
  kindness: '🫶',
  sibling_harmony: '🫂',
  helpful: '🤝🏻',
  playdate: '👫',
  family_adventure: '🎡',
  played_outside: '🌳',
  bounceback: '🐦‍🔥',
  good_breakfast: '🍳',
  sports: '🏀',
  party: '🎉',
  dad_bonding: '👨🏻',
  mom_bonding: '👩🏼',
  angry: '😡',
  
  // Physical/health events
  sleep: '😴',
  good_sleep: '😴',
  poor_sleep: '😵',
  diet: '🍎',
  didnt_eat_dinner: '🍽️',
  physical_wellness: '🤒',
  wet_bed: '🛏️',
  tired: '🥱',
  barfed: '🤮',
  
  // Medical
  medication: '💊',
  missed_dose: '❌',
  
  // Emotional
  scared: '😨',
  
  // Neutral/other events
  screen_time: '📱',
  watched_tv: '📺',
  fast_food: '🍟',
  sugar: '🍬',
  messy: '🫗',
  video_games: '🎮',
  toilet_issue: '🚽',
  travel: '✈️',
  vacation: '🌴',
  sporting_event: '🏟️',
  school_trip: '🚌',
  camp: '🏕️',
  brave: '🦁',
  parent_out_of_town: '💺',
  
  // Custom (placeholder)
  custom: '📝',
};

export function getEventLabel(eventType: EventType): string {
  const labelMap: Record<EventType, string> = {
    meltdown: 'Meltdown',
    shutdown: 'Shutdown',
    conflict: 'Sibling Conflict',
    school_incident: 'School Incident',
    positive_behavior: 'Positive Behavior',
    great_day: 'Great Day',
    mood: 'Mood',
    overwhelm: 'Overwhelm',
    naughty: 'Naughty',
    sleep: 'Sleep',
    good_sleep: 'Good Sleep',
    poor_sleep: 'Poor Sleep',
    diet: 'Diet',
    screen_time: 'Screen Time',
    physical_wellness: 'Physical Wellness',
    medication: 'Medication',
    missed_dose: 'Missed Dose',
    playdate: 'Playdate',
    watched_tv: 'Watched TV',
    sick: 'Sick',
    family_adventure: 'Family Adventure',
    played_outside: 'Played Outside',
    didnt_eat_dinner: "Didn't Eat Dinner",
    wet_bed: 'Wet Bed',
    good_dinner: 'Good Dinner',
    drew_comics: 'Drew Comics',
    creative: 'Creative',
    stayed_home: 'Stayed Home',
    aggression: 'Aggression',
    fast_food: 'Fast Food',
    sugar: 'Sugar',
    poor_transitions: 'Poor Transitions',
    chores: 'Chores',
    focus: 'Focus',
    reading: 'Reading',
    kindness: 'Kindness',
    refusal: 'Refusal',
    sibling_harmony: 'Sibling Harmony',
    bad_language: 'Bad Language',
    injury: 'Injury',
    sneaky: 'Sneaky',
    messy: 'Messy',
    helpful: 'Helpful',
    video_games: 'Video Games',
    toilet_issue: 'Toilet Issue',
    dad_bonding: 'Dad Bonding',
    mom_bonding: 'Mom Bonding',
    travel: 'Travel',
    good_breakfast: 'Good Breakfast',
    tired: 'Tired',
    sports: 'Sports',
    party: 'Party',
    bounceback: 'Bounceback',
    barfed: 'Barfed',
    vacation: 'Vacation',
    sporting_event: 'Sporting Event',
    school_trip: 'School Trip',
    camp: 'Camp',
    brave: 'Brave',
    angry: 'Angry',
    scared: 'Scared',
    parent_out_of_town: 'Parent(s) Away',
    custom: 'Custom Event',
  };

  return labelMap[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
