import type { Event, EventType, QuickTapButton, QuickTapEventType } from '@src/models/index.js';
import type { DataStore } from '@src/data-store/data-store.js';
import type { EventCaptureSystem } from './event-capture-system.js';

export interface QuickTapLogger {
  getButtons(childProfileId: string): QuickTapButton[];
  logQuickTap(childProfileId: string, buttonType: QuickTapEventType, timestamp?: Date): Event;
  customizeButtons(childProfileId: string, buttons: QuickTapButton[]): void;
}

/**
 * Maps QuickTapEventType values to the corresponding core EventType.
 * Some quick-tap buttons represent convenience aliases for core event types.
 */
const QUICK_TAP_TO_EVENT_TYPE: Record<QuickTapEventType, EventType> = {
  meltdown: 'meltdown',
  shutdown: 'shutdown',
  conflict: 'conflict',
  school_incident: 'school_incident',
  great_day: 'great_day',
  good_sleep: 'good_sleep',
  poor_sleep: 'poor_sleep',
  medication_given: 'medication',
  wet_bed: 'wet_bed',
  didnt_eat_dinner: 'didnt_eat_dinner',
  playdate: 'playdate',
  watched_tv: 'watched_tv',
  sick: 'sick',
  family_adventure: 'family_adventure',
  played_outside: 'played_outside',
  good_dinner: 'good_dinner',
  drew_comics: 'drew_comics',
  stayed_home: 'stayed_home',
  aggression: 'aggression',
  fast_food: 'fast_food',
  sugar: 'sugar',
  poor_transitions: 'poor_transitions',
  chores: 'chores',
  focus: 'focus',
  reading: 'reading',
  kindness: 'kindness',
  overwhelm: 'overwhelm',
  naughty: 'naughty',
  refusal: 'refusal',
  sibling_harmony: 'sibling_harmony',
  bad_language: 'bad_language',
  injury: 'injury',
  sneak: 'sneak',
  messy: 'messy',
  helpful: 'helpful',
  dad_bonding: 'dad_bonding',
  mom_bonding: 'mom_bonding',
  travel: 'travel',
};

const DEFAULT_BUTTONS: QuickTapButton[] = [
  { id: 'default-meltdown', eventType: 'meltdown', label: 'Meltdown', order: 0 },
  { id: 'default-shutdown', eventType: 'shutdown', label: 'Shutdown', order: 1 },
  { id: 'default-conflict', eventType: 'conflict', label: 'Sibling Conflict', order: 2 },
  { id: 'default-school-incident', eventType: 'school_incident', label: 'School Incident', order: 3 },
  { id: 'default-great-day', eventType: 'great_day', label: 'Great Day', order: 4 },
  { id: 'default-good-sleep', eventType: 'good_sleep', label: 'Good Sleep', order: 5 },
  { id: 'default-poor-sleep', eventType: 'poor_sleep', label: 'Poor Sleep', order: 6 },
  { id: 'default-medication-given', eventType: 'medication_given', label: 'Medication Given', order: 7 },
  { id: 'default-wet-bed', eventType: 'wet_bed', label: 'Wet Bed', order: 8 },
  { id: 'default-didnt-eat-dinner', eventType: 'didnt_eat_dinner', label: "Didn't Eat Dinner", order: 9 },
  { id: 'default-playdate', eventType: 'playdate', label: 'Playdate', order: 10 },
  { id: 'default-watched-tv', eventType: 'watched_tv', label: 'Watched TV', order: 11 },
  { id: 'default-sick', eventType: 'sick', label: 'Sick', order: 12 },
  { id: 'default-family-adventure', eventType: 'family_adventure', label: 'Family Adventure', order: 13 },
  { id: 'default-played-outside', eventType: 'played_outside', label: 'Played Outside', order: 14 },
  { id: 'default-good-dinner', eventType: 'good_dinner', label: 'Good Dinner', order: 15 },
  { id: 'default-drew-comics', eventType: 'drew_comics', label: 'Drew Comics', order: 16 },
  { id: 'default-stayed-home', eventType: 'stayed_home', label: 'Stayed Home', order: 17 },
  { id: 'default-aggression', eventType: 'aggression', label: 'Aggression', order: 18 },
  { id: 'default-fast-food', eventType: 'fast_food', label: 'Fast Food', order: 19 },
  { id: 'default-sugar', eventType: 'sugar', label: 'Sugar', order: 20 },
  { id: 'default-poor-transitions', eventType: 'poor_transitions', label: 'Poor Transitions', order: 21 },
  { id: 'default-chores', eventType: 'chores', label: 'Chores', order: 22 },
  { id: 'default-focus', eventType: 'focus', label: 'Focus', order: 23 },
  { id: 'default-reading', eventType: 'reading', label: 'Reading', order: 24 },
  { id: 'default-kindness', eventType: 'kindness', label: 'Kindness', order: 25 },
  { id: 'default-overwhelm', eventType: 'overwhelm', label: 'Overwhelm', order: 26 },
  { id: 'default-naughty', eventType: 'naughty', label: 'Naughty', order: 27 },
  { id: 'default-refusal', eventType: 'refusal', label: 'Refusal', order: 28 },
  { id: 'default-sibling-harmony', eventType: 'sibling_harmony', label: 'Sibling Harmony', order: 29 },
  { id: 'default-bad-language', eventType: 'bad_language', label: 'Bad Language', order: 30 },
  { id: 'default-injury', eventType: 'injury', label: 'Injury', order: 31 },
  { id: 'default-sneak', eventType: 'sneak', label: 'Sneak', order: 32 },
  { id: 'default-messy', eventType: 'messy', label: 'Messy', order: 33 },
  { id: 'default-helpful', eventType: 'helpful', label: 'Helpful', order: 34 },
  { id: 'default-dad-bonding', eventType: 'dad_bonding', label: 'Dad Bonding', order: 35 },
  { id: 'default-mom-bonding', eventType: 'mom_bonding', label: 'Mom Bonding', order: 36 },
  { id: 'default-travel', eventType: 'travel', label: 'Travel', order: 37 },
];

export class QuickTapLoggerImpl implements QuickTapLogger {
  constructor(
    private readonly dataStore: DataStore,
    private readonly eventCaptureSystem: EventCaptureSystem,
  ) {}

  getButtons(childProfileId: string): QuickTapButton[] {
    const stored = this.dataStore.getQuickTapButtons(childProfileId);
    if (stored.length > 0) {
      return stored;
    }
    return [...DEFAULT_BUTTONS];
  }

  logQuickTap(childProfileId: string, buttonType: QuickTapEventType, timestamp?: Date): Event {
    const eventType = QUICK_TAP_TO_EVENT_TYPE[buttonType];

    const tags: string[] = [];
    if (buttonType !== eventType) {
      tags.push(buttonType);
    }

    const event = this.eventCaptureSystem.createEvent({
      childProfileId,
      eventType,
      timestamp: timestamp ?? new Date(),
      source: 'quick-tap',
      tags,
    });

    this.eventCaptureSystem.saveEvent(event);
    return event;
  }

  customizeButtons(childProfileId: string, buttons: QuickTapButton[]): void {
    this.dataStore.saveQuickTapButtons(childProfileId, buttons);
  }
}
