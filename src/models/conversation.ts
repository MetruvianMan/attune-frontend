import type { DataReference } from './insight.js';

export interface ConversationSession {
  id: string;
  childProfileId: string;
  turns: ConversationTurn[];
  createdAt: Date;
  lastActivityAt: Date;
  archived?: boolean;
  title?: string;
}

export interface ConversationTurn {
  role: 'parent' | 'assistant';
  content: string;
  timestamp: Date;
  dataRefs?: DataReference[];
}
