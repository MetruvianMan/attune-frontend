export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationSession {
  id: string;
  childProfileId: string;
  turns: ConversationTurn[];
  createdAt: Date;
  lastActivityAt: Date;
  archived?: boolean;
  title?: string;
}
