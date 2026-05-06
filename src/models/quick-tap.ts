export type QuickTapEventType =
  | 'meltdown'
  | 'shutdown'
  | 'conflict'
  | 'school_incident'
  | 'great_day'
  | 'good_sleep'
  | 'poor_sleep'
  | 'medication_given'
  | 'wet_bed'
  | 'didnt_eat_dinner'
  | 'playdate'
  | 'watched_tv'
  | 'sick'
  | 'family_adventure'
  | 'played_outside'
  | 'good_dinner'
  | 'drew_comics'
  | 'stayed_home'
  | 'aggression'
  | 'fast_food'
  | 'sugar'
  | 'poor_transitions'
  | 'chores'
  | 'focus'
  | 'reading'
  | 'kindness'
  | 'overwhelm'
  | 'naughty'
  | 'refusal'
  | 'sibling_harmony'
  | 'bad_language'
  | 'injury'
  | 'sneak'
  | 'messy'
  | 'helpful'
  | 'dad_bonding'
  | 'mom_bonding'
  | 'travel';

export interface QuickTapButton {
  id: string;
  eventType: QuickTapEventType;
  label: string;
  order: number;
}
