export interface DiaryEntry {
  id: string;
  childProfileId: string;
  date: Date;
  content: string;
  timestamp: Date;
  source: 'voice' | 'manual';
  createdAt: Date;
  /**
   * 'YYYY-MM-DD' calendar day this entry belongs to, frozen at write time
   * using the device's local timezone at that moment. Use this (not
   * `date`/`timestamp`) for any "get diary entries for day D" query - see
   * mobile/utils/local-date.ts and .kiro/specs/timezone-safe-dates/.
   * Optional because rows created before this field existed have it as
   * null until backfilled.
   */
  localDate?: string;
}

export interface DiaryEntryInput {
  childProfileId: string;
  date: Date;
  content: string;
  timestamp?: Date;
  source: 'voice' | 'manual';
}
