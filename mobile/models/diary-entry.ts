export interface DiaryEntry {
  id: string;
  childProfileId: string;
  date: Date;
  content: string;
  timestamp: Date;
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
