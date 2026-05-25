/**
 * Diary Entry model for high-level day descriptions from voice logs.
 * These entries are not included in day mood calculations but provide
 * context and narrative for the day.
 */

export interface DiaryEntry {
  id: string;
  childProfileId: string;
  date: Date; // The day this entry describes
  content: string; // The full transcription or written description
  timestamp: Date; // When the entry was created
  source: 'voice' | 'manual';
  createdAt: Date;
}

export interface DiaryEntryInput {
  childProfileId: string;
  date: Date;
  content: string;
  timestamp?: Date;
  source: 'voice' | 'manual';
}
