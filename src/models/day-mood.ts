/** Red / Amber / Green daily mood classification. */
export type MoodColor = 'red' | 'amber' | 'green';

export interface DayMood {
  /** Composite key: `${childProfileId}:${dateKey}` where dateKey is YYYY-MM-DD */
  id: string;
  childProfileId: string;
  /** YYYY-MM-DD */
  dateKey: string;
  /** Auto-computed mood based on the day's events */
  autoMood: MoodColor;
  /** User override — if set, this takes precedence for display */
  overrideMood?: MoodColor;
  updatedAt: Date;
}
