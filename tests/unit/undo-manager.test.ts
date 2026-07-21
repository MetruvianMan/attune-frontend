/**
 * Unit tests for UndoManager utility
 * 
 * Tests the undo functionality for point events and redemptions
 * Requirements covered: 10.4, 10.5, 11.3, 15.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UndoManager, UndoableAction } from '../../mobile/utils/undo-manager';

describe('UndoManager', () => {
  let undoManager: UndoManager;

  beforeEach(() => {
    undoManager = new UndoManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('registerUndoableAction', () => {
    it('should register a new undoable action', () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      expect(undoManager.getActionCount()).toBe(1);
      expect(undoManager.canUndo('action-1')).toBe(true);
    });

    it('should set expiration time to 5 seconds from registration', () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      const action = undoManager.getAllActions().get('action-1');
      expect(action).toBeDefined();
      expect(action!.timestamp.getTime()).toBe(now.getTime());
      expect(action!.expiresAt.getTime()).toBe(now.getTime() + 5000);
    });

    it('should allow registering multiple actions', () => {
      const mockUndoFn1 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn2 = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn1,
      });

      undoManager.registerUndoableAction({
        id: 'action-2',
        type: 'redemption',
        entityId: 'redemption-1',
        undoFn: mockUndoFn2,
      });

      expect(undoManager.getActionCount()).toBe(2);
      expect(undoManager.canUndo('action-1')).toBe(true);
      expect(undoManager.canUndo('action-2')).toBe(true);
    });
  });

  describe('undo', () => {
    it('should successfully undo an action within expiration window', async () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      await undoManager.undo('action-1');

      expect(mockUndoFn).toHaveBeenCalledTimes(1);
      expect(undoManager.getActionCount()).toBe(0);
      expect(undoManager.canUndo('action-1')).toBe(false);
    });

    it('should throw error when trying to undo non-existent action', async () => {
      await expect(undoManager.undo('non-existent')).rejects.toThrow(
        'Action with id non-existent not found'
      );
    });

    it('should throw error when trying to undo expired action', async () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      // Advance time by 6 seconds (past 5-second expiration)
      vi.advanceTimersByTime(6000);

      await expect(undoManager.undo('action-1')).rejects.toThrow(
        'Action with id action-1 has expired'
      );

      expect(mockUndoFn).not.toHaveBeenCalled();
      expect(undoManager.getActionCount()).toBe(0);
    });

    it('should successfully undo at the last moment before expiration', async () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      // Advance time by 4.999 seconds (just before expiration)
      vi.advanceTimersByTime(4999);

      await undoManager.undo('action-1');

      expect(mockUndoFn).toHaveBeenCalledTimes(1);
      expect(undoManager.getActionCount()).toBe(0);
    });

    it('should remove action after successful undo', async () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      expect(undoManager.canUndo('action-1')).toBe(true);
      
      await undoManager.undo('action-1');

      expect(undoManager.canUndo('action-1')).toBe(false);
      expect(undoManager.getActionCount()).toBe(0);
    });

    it('should handle async undo functions', async () => {
      let undoExecuted = false;
      const mockUndoFn = vi.fn().mockImplementation(async () => {
        // Simulate async work without setTimeout (which conflicts with fake timers)
        await Promise.resolve();
        undoExecuted = true;
      });
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'redemption',
        entityId: 'redemption-1',
        undoFn: mockUndoFn,
      });

      await undoManager.undo('action-1');

      expect(undoExecuted).toBe(true);
      expect(mockUndoFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearExpiredActions', () => {
    it('should remove all expired actions', () => {
      const mockUndoFn1 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn2 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn3 = vi.fn().mockResolvedValue(undefined);
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);
      
      // Register three actions
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn1,
      });

      // Advance time by 3 seconds
      vi.advanceTimersByTime(3000);

      undoManager.registerUndoableAction({
        id: 'action-2',
        type: 'point_event',
        entityId: 'event-2',
        undoFn: mockUndoFn2,
      });

      // Advance time by 3 more seconds (total 6 seconds from action-1)
      vi.advanceTimersByTime(3000);

      undoManager.registerUndoableAction({
        id: 'action-3',
        type: 'redemption',
        entityId: 'redemption-1',
        undoFn: mockUndoFn3,
      });

      // At this point:
      // - action-1 is expired (6 seconds old)
      // - action-2 is still valid (3 seconds old)
      // - action-3 is still valid (just registered)

      undoManager.clearExpiredActions();

      expect(undoManager.getActionCount()).toBe(2);
      expect(undoManager.canUndo('action-1')).toBe(false);
      expect(undoManager.canUndo('action-2')).toBe(true);
      expect(undoManager.canUndo('action-3')).toBe(true);
    });

    it('should do nothing when no actions are expired', () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      // Advance time by 2 seconds (within 5-second window)
      vi.advanceTimersByTime(2000);

      undoManager.clearExpiredActions();

      expect(undoManager.getActionCount()).toBe(1);
      expect(undoManager.canUndo('action-1')).toBe(true);
    });

    it('should clear all actions when all are expired', () => {
      const mockUndoFn1 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn2 = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn1,
      });

      undoManager.registerUndoableAction({
        id: 'action-2',
        type: 'redemption',
        entityId: 'redemption-1',
        undoFn: mockUndoFn2,
      });

      // Advance time by 10 seconds (past both expirations)
      vi.advanceTimersByTime(10000);

      undoManager.clearExpiredActions();

      expect(undoManager.getActionCount()).toBe(0);
    });
  });

  describe('canUndo', () => {
    it('should return true for valid unexpired action', () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      expect(undoManager.canUndo('action-1')).toBe(true);
    });

    it('should return false for non-existent action', () => {
      expect(undoManager.canUndo('non-existent')).toBe(false);
    });

    it('should return false for expired action', () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      // Advance time by 6 seconds
      vi.advanceTimersByTime(6000);

      expect(undoManager.canUndo('action-1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all actions', () => {
      const mockUndoFn1 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn2 = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn1,
      });

      undoManager.registerUndoableAction({
        id: 'action-2',
        type: 'redemption',
        entityId: 'redemption-1',
        undoFn: mockUndoFn2,
      });

      expect(undoManager.getActionCount()).toBe(2);

      undoManager.clear();

      expect(undoManager.getActionCount()).toBe(0);
      expect(undoManager.canUndo('action-1')).toBe(false);
      expect(undoManager.canUndo('action-2')).toBe(false);
    });
  });

  describe('getAllActions', () => {
    it('should return a copy of all actions', () => {
      const mockUndoFn = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn,
      });

      const actions = undoManager.getAllActions();
      
      expect(actions.size).toBe(1);
      expect(actions.has('action-1')).toBe(true);
      
      // Verify it's a copy (modifying it doesn't affect the original)
      actions.clear();
      expect(undoManager.getActionCount()).toBe(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple undo operations in sequence', async () => {
      const mockUndoFn1 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn2 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn3 = vi.fn().mockResolvedValue(undefined);
      
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn1,
      });

      undoManager.registerUndoableAction({
        id: 'action-2',
        type: 'point_event',
        entityId: 'event-2',
        undoFn: mockUndoFn2,
      });

      undoManager.registerUndoableAction({
        id: 'action-3',
        type: 'redemption',
        entityId: 'redemption-1',
        undoFn: mockUndoFn3,
      });

      expect(undoManager.getActionCount()).toBe(3);

      await undoManager.undo('action-2');
      expect(mockUndoFn2).toHaveBeenCalledTimes(1);
      expect(undoManager.getActionCount()).toBe(2);

      await undoManager.undo('action-1');
      expect(mockUndoFn1).toHaveBeenCalledTimes(1);
      expect(undoManager.getActionCount()).toBe(1);

      await undoManager.undo('action-3');
      expect(mockUndoFn3).toHaveBeenCalledTimes(1);
      expect(undoManager.getActionCount()).toBe(0);
    });

    it('should handle expiration and cleanup during active usage', async () => {
      const mockUndoFn1 = vi.fn().mockResolvedValue(undefined);
      const mockUndoFn2 = vi.fn().mockResolvedValue(undefined);
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);
      
      // Register first action
      undoManager.registerUndoableAction({
        id: 'action-1',
        type: 'point_event',
        entityId: 'event-1',
        undoFn: mockUndoFn1,
      });

      // Advance time by 6 seconds (expire action-1)
      vi.advanceTimersByTime(6000);

      // Register second action
      undoManager.registerUndoableAction({
        id: 'action-2',
        type: 'point_event',
        entityId: 'event-2',
        undoFn: mockUndoFn2,
      });

      // Clear expired actions
      undoManager.clearExpiredActions();

      expect(undoManager.getActionCount()).toBe(1);
      expect(undoManager.canUndo('action-1')).toBe(false);
      expect(undoManager.canUndo('action-2')).toBe(true);

      // Successfully undo action-2
      await undoManager.undo('action-2');
      expect(mockUndoFn2).toHaveBeenCalledTimes(1);
      expect(undoManager.getActionCount()).toBe(0);
    });
  });
});
