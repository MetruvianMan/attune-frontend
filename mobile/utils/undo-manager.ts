/**
 * UndoManager - Manages undoable actions with time-based expiration
 * 
 * This utility tracks actions (like point events) that can be reversed within
 * a 5-second window. After 5 seconds, actions expire and can no longer be undone.
 * 
 * Requirements covered: 10.4, 10.5, 11.3, 15.6
 */

export interface UndoableAction {
  id: string;
  type: 'point_event' | 'redemption';
  entityId: string;
  timestamp: Date;
  expiresAt: Date;  // timestamp + 5 seconds
  undoFn: () => Promise<void>;
}

export class UndoManager {
  private actions: Map<string, UndoableAction>;
  private readonly EXPIRATION_WINDOW_MS = 5000; // 5 seconds

  constructor() {
    this.actions = new Map();
  }

  /**
   * Register a new undoable action
   * @param action - The action to register
   */
  registerUndoableAction(action: Omit<UndoableAction, 'timestamp' | 'expiresAt'>): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.EXPIRATION_WINDOW_MS);

    const undoableAction: UndoableAction = {
      ...action,
      timestamp: now,
      expiresAt,
    };

    this.actions.set(action.id, undoableAction);
  }

  /**
   * Undo an action by its ID
   * @param actionId - The ID of the action to undo
   * @throws Error if action not found or expired
   */
  async undo(actionId: string): Promise<void> {
    const action = this.actions.get(actionId);

    if (!action) {
      throw new Error(`Action with id ${actionId} not found`);
    }

    const now = new Date();
    if (now > action.expiresAt) {
      this.actions.delete(actionId);
      throw new Error(`Action with id ${actionId} has expired`);
    }

    // Execute the undo function
    await action.undoFn();

    // Remove the action after successful undo
    this.actions.delete(actionId);
  }

  /**
   * Clear all expired actions from the manager
   * This should be called periodically to free up memory
   */
  clearExpiredActions(): void {
    const now = new Date();
    const expiredIds: string[] = [];

    // Find all expired actions
    for (const [id, action] of this.actions.entries()) {
      if (now > action.expiresAt) {
        expiredIds.push(id);
      }
    }

    // Remove expired actions
    expiredIds.forEach(id => this.actions.delete(id));
  }

  /**
   * Check if an action is available for undo
   * @param actionId - The ID of the action to check
   * @returns true if the action exists and has not expired
   */
  canUndo(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) {
      return false;
    }

    const now = new Date();
    return now <= action.expiresAt;
  }

  /**
   * Get all currently registered actions (for debugging/testing)
   * @returns Map of all actions
   */
  getAllActions(): Map<string, UndoableAction> {
    return new Map(this.actions);
  }

  /**
   * Clear all actions (useful for cleanup or testing)
   */
  clear(): void {
    this.actions.clear();
  }

  /**
   * Get the number of registered actions
   * @returns Count of actions
   */
  getActionCount(): number {
    return this.actions.size;
  }
}

// Export a singleton instance for use across the app
export const undoManager = new UndoManager();
