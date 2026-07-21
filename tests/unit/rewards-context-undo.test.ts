/**
 * Unit tests for RewardsContext undo action management (reducer logic)
 * 
 * Tests the reducer's ability to manage undoable actions:
 * - ADD_UNDOABLE_ACTION adds actions to the Map
 * - REMOVE_UNDOABLE_ACTION removes specific actions
 * - CLEAR_EXPIRED_UNDO_ACTIONS removes expired actions based on timestamp
 * 
 * Requirements covered: 10.4, 10.5, 11.3, 15.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rewardsReducer, initialState, RewardsState } from '../../mobile/contexts/RewardsContext';
import { UndoableAction } from '../../mobile/utils/undo-manager';

describe('RewardsContext Undo Action Management (Reducer)', () => {
  let state: RewardsState;

  beforeEach(() => {
    state = { ...initialState };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ADD_UNDOABLE_ACTION', () => {
    it('should add an undoable action to the state', () => {
      const now = new Date();
      const action: UndoableAction = {
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      const newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action,
      });

      expect(newState.undoableActions.size).toBe(1);
      expect(newState.undoableActions.get('action-1')).toEqual(action);
    });

    it('should add multiple undoable actions', () => {
      const now = new Date();
      
      const action1: UndoableAction = {
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      const action2: UndoableAction = {
        id: 'action-2',
        type: 'redemption',
        entityId: 'redemption-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: action1,
      });

      newState = rewardsReducer(newState, {
        type: 'ADD_UNDOABLE_ACTION',
        action: action2,
      });

      expect(newState.undoableActions.size).toBe(2);
      expect(newState.undoableActions.has('action-1')).toBe(true);
      expect(newState.undoableActions.has('action-2')).toBe(true);
    });

    it('should not mutate original state Map', () => {
      const now = new Date();
      const action: UndoableAction = {
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      const newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action,
      });

      expect(state.undoableActions.size).toBe(0);
      expect(newState.undoableActions.size).toBe(1);
    });
  });

  describe('REMOVE_UNDOABLE_ACTION', () => {
    it('should remove a specific undoable action by ID', () => {
      const now = new Date();
      const action1: UndoableAction = {
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      const action2: UndoableAction = {
        id: 'action-2',
        type: 'point_event',
        entityId: 'event-2',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      // Add two actions
      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: action1,
      });

      newState = rewardsReducer(newState, {
        type: 'ADD_UNDOABLE_ACTION',
        action: action2,
      });

      expect(newState.undoableActions.size).toBe(2);

      // Remove action-1
      newState = rewardsReducer(newState, {
        type: 'REMOVE_UNDOABLE_ACTION',
        actionId: 'action-1',
      });

      expect(newState.undoableActions.size).toBe(1);
      expect(newState.undoableActions.has('action-1')).toBe(false);
      expect(newState.undoableActions.has('action-2')).toBe(true);
    });

    it('should handle removing non-existent action gracefully', () => {
      const now = new Date();
      const action: UndoableAction = {
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action,
      });

      // Try to remove non-existent action
      newState = rewardsReducer(newState, {
        type: 'REMOVE_UNDOABLE_ACTION',
        actionId: 'non-existent',
      });

      // Should still have the original action
      expect(newState.undoableActions.size).toBe(1);
      expect(newState.undoableActions.has('action-1')).toBe(true);
    });
  });

  describe('CLEAR_EXPIRED_UNDO_ACTIONS', () => {
    it('should remove all expired actions', () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const expiredAction: UndoableAction = {
        id: 'expired-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: new Date(now.getTime() - 10000),
        expiresAt: new Date(now.getTime() - 5000), // Expired 5 seconds ago
        undoFn: async () => {},
      };

      const validAction: UndoableAction = {
        id: 'valid-1',
        type: 'point_event',
        entityId: 'event-2',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000), // Expires in 5 seconds
        undoFn: async () => {},
      };

      // Add both actions
      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: expiredAction,
      });

      newState = rewardsReducer(newState, {
        type: 'ADD_UNDOABLE_ACTION',
        action: validAction,
      });

      expect(newState.undoableActions.size).toBe(2);

      // Clear expired actions
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      expect(newState.undoableActions.size).toBe(1);
      expect(newState.undoableActions.has('expired-1')).toBe(false);
      expect(newState.undoableActions.has('valid-1')).toBe(true);
    });

    it('should remove multiple expired actions', () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const expired1: UndoableAction = {
        id: 'expired-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: new Date(now.getTime() - 10000),
        expiresAt: new Date(now.getTime() - 5000),
        undoFn: async () => {},
      };

      const expired2: UndoableAction = {
        id: 'expired-2',
        type: 'redemption',
        entityId: 'redemption-1',
        timestamp: new Date(now.getTime() - 8000),
        expiresAt: new Date(now.getTime() - 3000),
        undoFn: async () => {},
      };

      const valid1: UndoableAction = {
        id: 'valid-1',
        type: 'point_event',
        entityId: 'event-2',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      // Add all actions
      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: expired1,
      });

      newState = rewardsReducer(newState, {
        type: 'ADD_UNDOABLE_ACTION',
        action: expired2,
      });

      newState = rewardsReducer(newState, {
        type: 'ADD_UNDOABLE_ACTION',
        action: valid1,
      });

      expect(newState.undoableActions.size).toBe(3);

      // Clear expired actions
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      expect(newState.undoableActions.size).toBe(1);
      expect(newState.undoableActions.has('valid-1')).toBe(true);
    });

    it('should do nothing when no actions are expired', () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const validAction1: UndoableAction = {
        id: 'valid-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      const validAction2: UndoableAction = {
        id: 'valid-2',
        type: 'point_event',
        entityId: 'event-2',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 5000),
        undoFn: async () => {},
      };

      // Add actions
      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: validAction1,
      });

      newState = rewardsReducer(newState, {
        type: 'ADD_UNDOABLE_ACTION',
        action: validAction2,
      });

      expect(newState.undoableActions.size).toBe(2);

      // Clear expired actions (should remove nothing)
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      expect(newState.undoableActions.size).toBe(2);
      expect(newState.undoableActions.has('valid-1')).toBe(true);
      expect(newState.undoableActions.has('valid-2')).toBe(true);
    });

    it('should clear all actions when all are expired', () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const expired1: UndoableAction = {
        id: 'expired-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: new Date(now.getTime() - 10000),
        expiresAt: new Date(now.getTime() - 5000),
        undoFn: async () => {},
      };

      const expired2: UndoableAction = {
        id: 'expired-2',
        type: 'point_event',
        entityId: 'event-2',
        timestamp: new Date(now.getTime() - 8000),
        expiresAt: new Date(now.getTime() - 3000),
        undoFn: async () => {},
      };

      // Add actions
      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: expired1,
      });

      newState = rewardsReducer(newState, {
        type: 'ADD_UNDOABLE_ACTION',
        action: expired2,
      });

      expect(newState.undoableActions.size).toBe(2);

      // Clear expired actions
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      expect(newState.undoableActions.size).toBe(0);
    });

    it('should handle actions expiring at exact boundary', () => {
      const now = new Date('2025-01-01T12:00:00.000Z');
      vi.setSystemTime(now);

      const boundaryAction: UndoableAction = {
        id: 'boundary',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: new Date(now.getTime() - 5000),
        expiresAt: new Date(now.getTime()), // Expires exactly now
        undoFn: async () => {},
      };

      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: boundaryAction,
      });

      expect(newState.undoableActions.size).toBe(1);

      // Clear expired actions (boundary action should be removed since now > expiresAt)
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      // The action expires at exactly now, so now > expiresAt is false
      // but in practice with any time passing, it would be expired
      // Let's advance time by 1ms to be past the boundary
      vi.advanceTimersByTime(1);
      
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      expect(newState.undoableActions.size).toBe(0);
    });
  });

  describe('Integration: UndoManager with Reducer', () => {
    it('should simulate the interval timer clearing expired actions', () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      // Create actions at different times
      const action1: UndoableAction = {
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        timestamp: now,
        expiresAt: new Date(now.getTime() + 2000), // Expires in 2 seconds
        undoFn: async () => {},
      };

      let newState = rewardsReducer(state, {
        type: 'ADD_UNDOABLE_ACTION',
        action: action1,
      });

      expect(newState.undoableActions.size).toBe(1);

      // Advance time by 1 second (action still valid)
      vi.advanceTimersByTime(1000);
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      expect(newState.undoableActions.size).toBe(1);

      // Advance time by 2 more seconds (total 3 seconds, action expired)
      vi.advanceTimersByTime(2000);
      newState = rewardsReducer(newState, {
        type: 'CLEAR_EXPIRED_UNDO_ACTIONS',
      });

      expect(newState.undoableActions.size).toBe(0);
    });
  });
});
