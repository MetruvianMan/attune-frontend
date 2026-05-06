import type { ConversationSession, ConversationTurn } from '@src/models/index.js';
import type { DataStore } from '@src/data-store/data-store.js';

export interface ConversationSessionManager {
  startSession(childProfileId: string): ConversationSession;
  getActiveSession(childProfileId: string): ConversationSession | null;
  addTurn(sessionId: string, turn: ConversationTurn): void;
  clearSession(sessionId: string): void;
  getRecentQueries(childProfileId: string, limit: number): ConversationTurn[];
}

export class ConversationSessionManagerImpl implements ConversationSessionManager {
  private dataStore: DataStore;
  /** Tracks the most recent session ID per child profile for quick lookup. */
  private activeSessionIds = new Map<string, string>();

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
  }

  startSession(childProfileId: string): ConversationSession {
    const now = new Date();
    const session: ConversationSession = {
      id: crypto.randomUUID(),
      childProfileId,
      turns: [],
      createdAt: now,
      lastActivityAt: now,
    };
    this.dataStore.saveConversationSession(session);
    this.activeSessionIds.set(childProfileId, session.id);
    return session;
  }

  getActiveSession(childProfileId: string): ConversationSession | null {
    const sessionId = this.activeSessionIds.get(childProfileId);
    if (!sessionId) {
      return null;
    }
    return this.dataStore.getConversationSession(sessionId);
  }

  addTurn(sessionId: string, turn: ConversationTurn): void {
    const session = this.dataStore.getConversationSession(sessionId);
    if (!session) {
      throw new Error(`Conversation session not found: ${sessionId}`);
    }
    const updatedSession: ConversationSession = {
      ...session,
      turns: [...session.turns, turn],
      lastActivityAt: new Date(),
    };
    this.dataStore.saveConversationSession(updatedSession);
  }

  clearSession(sessionId: string): void {
    const session = this.dataStore.getConversationSession(sessionId);
    if (!session) {
      return;
    }
    const clearedSession: ConversationSession = {
      ...session,
      turns: [],
      lastActivityAt: new Date(),
    };
    this.dataStore.saveConversationSession(clearedSession);
  }

  getRecentQueries(childProfileId: string, limit: number): ConversationTurn[] {
    // Fetch more turns than needed since we'll filter out assistant turns
    const fetchLimit = Math.max(limit * 2, 20);
    const allRecentTurns = this.dataStore.getRecentConversationTurns(childProfileId, fetchLimit);
    return allRecentTurns.filter((turn) => turn.role === 'parent').slice(0, limit);
  }
}
