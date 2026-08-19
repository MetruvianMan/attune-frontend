import React, { createContext, useContext, useReducer } from 'react';
import {
  Behavior,
  Reward,
  PointEvent,
  DailySummary,
  BehaviorInput,
  RewardInput,
} from '../models';
import { UndoableAction } from '../utils/undo-manager';
import { ProfileContext } from './ProfileContext';

/**
 * RewardsContext - State management for the Rewards tab
 * 
 * This context manages all rewards-related state using React's useReducer pattern.
 * It stores behaviors, rewards, point events, point balance, daily summary, and recent activity.
 * It also manages loading/error states and undoable actions with the UndoManager.
 * 
 * Requirements covered: 1.4, 1.5, 2.3, 3.5, 4.3, 4.4, 20.5
 */

// ==================== STATE INTERFACE ====================

export interface RewardsState {
  selectedChildProfileId: string | null;
  behaviors: Behavior[];
  rewards: Reward[];
  pointEvents: PointEvent[];
  pointBalance: number;
  todaysSummary: DailySummary | null;
  recentActivity: PointEvent[];       // Last 5 events
  loading: boolean;
  // `loading` is reused across every async action in this context (create/
  // update/delete/archive behavior or reward, refreshData, switchChildProfile
  // - not just the initial fetch). That makes it unreliable on its own for
  // "should the empty-state screen show", since it flips true/false during
  // routine actions too, not only during the very first load. hasLoadedOnce
  // is a separate one-way flag: false until the initial fetch has settled
  // (success or failure) exactly once, then permanently true. Consumers
  // should gate their empty-state UI on hasLoadedOnce, not on !loading.
  hasLoadedOnce: boolean;
  error: string | null;
  undoableActions: Map<string, UndoableAction>;
}

// ==================== ACTION TYPES ====================

export type RewardsAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_HAS_LOADED_ONCE' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_CHILD_PROFILE'; childProfileId: string }
  | { type: 'SET_BEHAVIORS'; behaviors: Behavior[] }
  | { type: 'ADD_BEHAVIOR'; behavior: Behavior }
  | { type: 'UPDATE_BEHAVIOR'; id: string; updates: Partial<Behavior> }
  | { type: 'DELETE_BEHAVIOR'; id: string }
  | { type: 'SET_REWARDS'; rewards: Reward[] }
  | { type: 'ADD_REWARD'; reward: Reward }
  | { type: 'UPDATE_REWARD'; id: string; updates: Partial<Reward> }
  | { type: 'DELETE_REWARD'; id: string }
  | { type: 'SET_POINT_EVENTS'; pointEvents: PointEvent[] }
  | { type: 'ADD_POINT_EVENT'; pointEvent: PointEvent }
  | { type: 'UPDATE_POINT_EVENT'; id: string; updates: Partial<PointEvent> }
  | { type: 'DELETE_POINT_EVENT'; id: string }
  | { type: 'SET_POINT_BALANCE'; balance: number }
  | { type: 'SET_TODAYS_SUMMARY'; summary: DailySummary }
  | { type: 'SET_RECENT_ACTIVITY'; pointEvents: PointEvent[] }
  | { type: 'ADD_UNDOABLE_ACTION'; action: UndoableAction }
  | { type: 'REMOVE_UNDOABLE_ACTION'; actionId: string }
  | { type: 'CLEAR_EXPIRED_UNDO_ACTIONS' };

// ==================== CONTEXT VALUE INTERFACE ====================

export interface RewardsContextValue extends RewardsState {
  // Behavior Actions
  createBehavior: (input: BehaviorInput) => Promise<void>;
  updateBehavior: (id: string, updates: Partial<BehaviorInput>) => Promise<void>;
  deleteBehavior: (id: string) => Promise<void>;
  archiveBehavior: (id: string) => Promise<void>;
  unarchiveBehavior: (id: string) => Promise<void>;
  
  // Reward Actions
  createReward: (input: RewardInput) => Promise<void>;
  updateReward: (id: string, updates: Partial<RewardInput>) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  archiveReward: (id: string) => Promise<void>;
  unarchiveReward: (id: string) => Promise<void>;
  
  // Point Event Actions
  logBehavior: (behaviorId: string, timestamp?: Date) => Promise<void>;
  redeemReward: (rewardId: string, timestamp?: Date) => Promise<void>;
  updatePointEvent: (id: string, updates: Partial<PointEvent>) => Promise<void>;
  // knownPointValue lets callers that already have the event object (e.g. the
  // Daily Activity list, which may not be mirrored in context state) pass its
  // pointValue directly, so the optimistic balance reversal doesn't depend on
  // finding the event in state.pointEvents/recentActivity first.
  undoPointEvent: (pointEventId: string, knownPointValue?: number) => Promise<void>;
  
  // Refresh Actions
  refreshData: () => Promise<void>;
  switchChildProfile: (childProfileId: string) => Promise<void>;
}

// ==================== INITIAL STATE ====================

const initialState: RewardsState = {
  selectedChildProfileId: null,
  behaviors: [],
  rewards: [],
  pointEvents: [],
  pointBalance: 0,
  todaysSummary: null,
  recentActivity: [],
  // Starts true, not false: initializeChildProfile below fetches data
  // immediately on mount, so the very first render (before that effect has
  // a chance to run) should already reflect "loading", not "no data yet".
  // Otherwise consumers like RewardsTabScreen briefly render their empty
  // state (an empty behaviors/rewards array looks identical to "genuinely
  // has nothing set up") before the real data arrives.
  loading: true,
  hasLoadedOnce: false,
  error: null,
  undoableActions: new Map(),
};

// ==================== REDUCER FUNCTION ====================

function rewardsReducer(state: RewardsState, action: RewardsAction): RewardsState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.loading,
      };

    case 'SET_HAS_LOADED_ONCE':
      return {
        ...state,
        hasLoadedOnce: true,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        loading: false,
      };

    case 'SET_CHILD_PROFILE':
      return {
        ...state,
        selectedChildProfileId: action.childProfileId,
      };

    case 'SET_BEHAVIORS':
      return {
        ...state,
        behaviors: action.behaviors,
      };

    case 'ADD_BEHAVIOR':
      return {
        ...state,
        behaviors: [...state.behaviors, action.behavior],
      };

    case 'UPDATE_BEHAVIOR':
      return {
        ...state,
        behaviors: state.behaviors.map((behavior) =>
          behavior.id === action.id
            ? { ...behavior, ...action.updates }
            : behavior
        ),
      };

    case 'DELETE_BEHAVIOR':
      return {
        ...state,
        behaviors: state.behaviors.filter((behavior) => behavior.id !== action.id),
      };

    case 'SET_REWARDS':
      return {
        ...state,
        rewards: action.rewards,
      };

    case 'ADD_REWARD':
      return {
        ...state,
        rewards: [...state.rewards, action.reward],
      };

    case 'UPDATE_REWARD':
      return {
        ...state,
        rewards: state.rewards.map((reward) =>
          reward.id === action.id
            ? { ...reward, ...action.updates }
            : reward
        ),
      };

    case 'DELETE_REWARD':
      return {
        ...state,
        rewards: state.rewards.filter((reward) => reward.id !== action.id),
      };

    case 'SET_POINT_EVENTS':
      return {
        ...state,
        pointEvents: action.pointEvents,
      };

    case 'ADD_POINT_EVENT':
      return {
        ...state,
        pointEvents: [...state.pointEvents, action.pointEvent],
      };

    case 'UPDATE_POINT_EVENT':
      return {
        ...state,
        pointEvents: state.pointEvents.map((event) =>
          event.id === action.id
            ? { ...event, ...action.updates }
            : event
        ),
      };

    case 'DELETE_POINT_EVENT':
      return {
        ...state,
        pointEvents: state.pointEvents.filter((event) => event.id !== action.id),
      };

    case 'SET_POINT_BALANCE':
      return {
        ...state,
        pointBalance: action.balance,
      };

    case 'SET_TODAYS_SUMMARY':
      return {
        ...state,
        todaysSummary: action.summary,
      };

    case 'SET_RECENT_ACTIVITY':
      return {
        ...state,
        recentActivity: action.pointEvents,
      };

    case 'ADD_UNDOABLE_ACTION':
      return {
        ...state,
        undoableActions: new Map(state.undoableActions).set(
          action.action.id,
          action.action
        ),
      };

    case 'REMOVE_UNDOABLE_ACTION':
      const newUndoableActions = new Map(state.undoableActions);
      newUndoableActions.delete(action.actionId);
      return {
        ...state,
        undoableActions: newUndoableActions,
      };

    case 'CLEAR_EXPIRED_UNDO_ACTIONS': {
      const now = new Date();
      const newActions = new Map(state.undoableActions);
      for (const [id, action] of newActions.entries()) {
        if (now > action.expiresAt) {
          newActions.delete(id);
        }
      }
      return {
        ...state,
        undoableActions: newActions,
      };
    }

    default:
      return state;
  }
}

// ==================== CONTEXT CREATION ====================

const RewardsContext = createContext<RewardsContextValue | undefined>(undefined);

// ==================== HOOK ====================

export function useRewards() {
  const context = useContext(RewardsContext);
  if (context === undefined) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return context;
}

// ==================== PROVIDER COMPONENT ====================

interface RewardsProviderProps {
  children: React.ReactNode;
}

export function RewardsProvider({ children }: RewardsProviderProps) {
  const [state, dispatch] = useReducer(rewardsReducer, initialState);

  // Import services
  const { rewardsService } = require('../services/rewards-service');
  const { undoManager } = require('../utils/undo-manager');
  const { databaseService } = require('../services/database');

  // Soft lookup (not the throwing useProfile() hook): when a ProfileProvider
  // is present higher in the tree (true in the real app - it's mounted once
  // at root), this context is the single source of truth for which child
  // profile is active, so both RewardsProvider mount sites (the Rewards tab
  // and the rewards-forms route group) agree with each other and with every
  // other screen, instead of each independently self-electing profiles[0].
  // Falls back to undefined when rendered standalone (e.g. existing unit
  // tests render RewardsProvider without a ProfileProvider wrapper), in
  // which case the effect below reverts to the old independent lookup.
  const profileContext = useContext(ProfileContext);

  // ==================== INITIALIZE / FOLLOW ACTIVE CHILD PROFILE ====================

  React.useEffect(() => {
    const loadDataForProfile = async (childProfileId: string) => {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_CHILD_PROFILE', childProfileId });

      const [behaviors, rewards, pointEvents, balance, summary] = await Promise.all([
        rewardsService.getBehaviors(childProfileId, true), // Include archived for Manage screens
        rewardsService.getRewards(childProfileId, true),   // Include archived for Manage screens
        rewardsService.getPointEvents(childProfileId, {
          childProfileId,
          limit: 5,
        }),
        rewardsService.calculatePointBalance(childProfileId),
        rewardsService.getDailySummary(childProfileId, new Date()),
      ]);

      dispatch({ type: 'SET_BEHAVIORS', behaviors });
      dispatch({ type: 'SET_REWARDS', rewards });
      dispatch({ type: 'SET_RECENT_ACTIVITY', pointEvents });
      dispatch({ type: 'SET_POINT_BALANCE', balance });
      dispatch({ type: 'SET_TODAYS_SUMMARY', summary });
      dispatch({ type: 'SET_LOADING', loading: false });
    };

    const initializeChildProfile = async () => {
      try {
        if (profileContext) {
          // A ProfileProvider is present - defer entirely to its active
          // profile rather than doing our own lookup. Still loading there?
          // Wait; nothing to do yet. This effect re-runs whenever
          // profileContext.activeProfile changes (including profile
          // switches), which is what keeps this context in sync with the
          // rest of the app.
          if (profileContext.isLoading) {
            return;
          }
          if (profileContext.activeProfile) {
            if (state.selectedChildProfileId === profileContext.activeProfile.id) {
              return; // Already loaded for this profile
            }
            await loadDataForProfile(profileContext.activeProfile.id);
          }
          // No active profile (no profiles exist at all) - genuine empty
          // state, nothing to load.
          dispatch({ type: 'SET_LOADING', loading: false });
          dispatch({ type: 'SET_HAS_LOADED_ONCE' });
          return;
        }

        // No ProfileProvider in the tree (standalone/test usage) - fall
        // back to the original independent lookup so existing behavior and
        // tests are unaffected.
        if (state.selectedChildProfileId) {
          return;
        }

        const profiles = await databaseService.getAllChildProfiles();

        if (profiles.length > 0) {
          await loadDataForProfile(profiles[0].id);
        } else {
          dispatch({ type: 'SET_LOADING', loading: false });
        }
        dispatch({ type: 'SET_HAS_LOADED_ONCE' });
      } catch (error) {
        console.error('Failed to initialize child profile:', error);
        dispatch({ type: 'SET_ERROR', error: 'Failed to initialize child profile' });
        dispatch({ type: 'SET_LOADING', loading: false });
        dispatch({ type: 'SET_HAS_LOADED_ONCE' });
      }
    };

    initializeChildProfile();
    // Re-run whenever the app-wide active profile changes (switch, or
    // finishes its own initial load), in addition to running once on mount
    // for the standalone/no-ProfileProvider fallback path.
  }, [profileContext?.activeProfile?.id, profileContext?.isLoading]);

  // ==================== BEHAVIOR ACTIONS ====================

  const createBehavior = async (input: BehaviorInput): Promise<void> => {
    // Generate optimistic behavior
    const optimisticBehavior: Behavior = {
      id: `temp-${Date.now()}`,
      childProfileId: input.childProfileId,
      title: input.title,
      emoji: input.emoji,
      pointValue: input.pointValue,
      category: input.category,
      timeWindow: input.timeWindow,
      limitRule: input.limitRule,
      exitCriteria: input.exitCriteria,
      notes: input.notes,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    try {
      // Optimistically add to UI immediately
      dispatch({ type: 'ADD_BEHAVIOR', behavior: optimisticBehavior });
      dispatch({ type: 'SET_ERROR', error: null });

      // Save to database in background
      const savedBehavior = await rewardsService.createBehavior(input);
      
      // Replace optimistic with real data
      dispatch({ type: 'DELETE_BEHAVIOR', id: optimisticBehavior.id });
      dispatch({ type: 'ADD_BEHAVIOR', behavior: savedBehavior });
    } catch (error) {
      // Rollback optimistic update on error
      dispatch({ type: 'DELETE_BEHAVIOR', id: optimisticBehavior.id });
      const errorMessage = error instanceof Error ? error.message : 'Failed to create behavior';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  const updateBehavior = async (id: string, updates: Partial<BehaviorInput>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      await rewardsService.updateBehavior(id, updates);
      dispatch({ type: 'UPDATE_BEHAVIOR', id, updates });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update behavior';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const deleteBehavior = async (id: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      await rewardsService.deleteBehavior(id);
      dispatch({ type: 'DELETE_BEHAVIOR', id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete behavior';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const archiveBehavior = async (id: string): Promise<void> => {
    try {
      await rewardsService.archiveBehavior(id);
      await refreshData(); // Refresh to update UI
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive behavior';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  const unarchiveBehavior = async (id: string): Promise<void> => {
    try {
      await rewardsService.unarchiveBehavior(id);
      await refreshData(); // Refresh to update UI
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unarchive behavior';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  // ==================== REWARD ACTIONS ====================

  const createReward = async (input: RewardInput): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      console.log('🎁 Creating reward:', input.title);
      const reward = await rewardsService.createReward(input);
      console.log('🎁 Reward created successfully:', reward.id);
      
      dispatch({ type: 'ADD_REWARD', reward });
    } catch (error) {
      console.error('🎁 Failed to create reward:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reward';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const updateReward = async (id: string, updates: Partial<RewardInput>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      await rewardsService.updateReward(id, updates);
      dispatch({ type: 'UPDATE_REWARD', id, updates });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reward';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const deleteReward = async (id: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      await rewardsService.deleteReward(id);
      dispatch({ type: 'DELETE_REWARD', id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reward';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const archiveReward = async (id: string): Promise<void> => {
    try {
      await rewardsService.archiveReward(id);
      await refreshData(); // Refresh to update UI
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive reward';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  const unarchiveReward = async (id: string): Promise<void> => {
    try {
      await rewardsService.unarchiveReward(id);
      await refreshData(); // Refresh to update UI
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unarchive reward';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  // ==================== POINT EVENT ACTIONS ====================

  const logBehavior = async (behaviorId: string, timestamp?: Date): Promise<void> => {
    // Get behavior from local state - already loaded, avoids a DB round trip
    const behavior = state.behaviors.find(b => b.id === behaviorId);
    if (!behavior) {
      throw new Error('Behavior not found');
    }

    // Use provided timestamp or default to current time
    const eventTime = timestamp || new Date();

    // Optimistically bump the point balance and show a temp event immediately,
    // so the UI feels instant instead of waiting on the network round trip.
    // Uses the same add-temp-then-replace-on-settle pattern as createBehavior,
    // which guarantees the temp entry never lingers alongside the real one
    // (the bug that caused duplicates when this was tried before).
    const optimisticPointEvent: PointEvent = {
      id: `temp-${Date.now()}`,
      childProfileId: behavior.childProfileId,
      type: 'behavior',
      behaviorId: behavior.id,
      pointValue: behavior.pointValue,
      timestamp: eventTime,
      createdAt: new Date(),
      synced: false,
    };
    dispatch({ type: 'ADD_POINT_EVENT', pointEvent: optimisticPointEvent });
    dispatch({ type: 'SET_POINT_BALANCE', balance: state.pointBalance + behavior.pointValue });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // Check eligibility (only hits the DB if the behavior has a limit rule)
      const eligibility = await rewardsService.checkBehaviorEligibility(behavior, eventTime);
      if (!eligibility.eligible) {
        dispatch({ type: 'SET_ERROR', error: eligibility.reason || 'Behavior not eligible' });
        throw new Error(eligibility.reason || 'Behavior not eligible');
      }

      // Save to database (await completion to prevent duplicates)
      const realPointEvent = await rewardsService.logBehavior(behavior, eventTime);

      // Swap the optimistic event out for the real one
      dispatch({ type: 'DELETE_POINT_EVENT', id: optimisticPointEvent.id });
      dispatch({ type: 'ADD_POINT_EVENT', pointEvent: realPointEvent });
      
      // Update derived data (confirms the optimistic balance bump against the server)
      if (state.selectedChildProfileId) {
        const [newBalance, summary, recentEvents] = await Promise.all([
          rewardsService.calculatePointBalance(state.selectedChildProfileId),
          rewardsService.getDailySummary(state.selectedChildProfileId, new Date()),
          rewardsService.getPointEvents(state.selectedChildProfileId, { 
            childProfileId: state.selectedChildProfileId,
            limit: 5 
          }),
        ]);
        
        dispatch({ type: 'SET_POINT_BALANCE', balance: newBalance });
        dispatch({ type: 'SET_TODAYS_SUMMARY', summary });
        dispatch({ type: 'SET_RECENT_ACTIVITY', pointEvents: recentEvents });
      }

      // Register undoable action
      const undoAction: UndoableAction = {
        id: realPointEvent.id,
        type: 'point_event',
        entityId: realPointEvent.id,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5000),
        undoFn: async () => {
          await undoPointEvent(realPointEvent.id);
        },
      };
      undoManager.registerUndoableAction(undoAction);
      dispatch({ type: 'ADD_UNDOABLE_ACTION', action: undoAction });

    } catch (error) {
      // Roll back the optimistic event and balance bump
      dispatch({ type: 'DELETE_POINT_EVENT', id: optimisticPointEvent.id });
      dispatch({ type: 'SET_POINT_BALANCE', balance: state.pointBalance });
      const errorMessage = error instanceof Error ? error.message : 'Failed to log behavior';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  const redeemReward = async (rewardId: string, timestamp?: Date): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', error: null });

      if (!state.selectedChildProfileId) {
        throw new Error('No child profile selected');
      }

      // Use provided timestamp or default to current time
      const eventTime = timestamp || new Date();

      // Check eligibility first
      const eligibility = await rewardsService.checkRedemptionEligibility(rewardId, state.selectedChildProfileId);
      if (!eligibility.eligible) {
        dispatch({ type: 'SET_ERROR', error: eligibility.reason || 'Reward not available' });
        throw new Error(eligibility.reason || 'Reward not available');
      }

      // Redeem the reward with the specified timestamp
      const pointEvent = await rewardsService.redeemReward(rewardId, eventTime);
      
      // Update state
      dispatch({ type: 'ADD_POINT_EVENT', pointEvent });
      
      // Recalculate balance, today's summary, and recent activity in parallel -
      // these are independent reads and don't depend on each other
      const [newBalance, summary, recentEvents] = await Promise.all([
        rewardsService.calculatePointBalance(state.selectedChildProfileId),
        rewardsService.getDailySummary(state.selectedChildProfileId, new Date()),
        rewardsService.getPointEvents(state.selectedChildProfileId, {
          childProfileId: state.selectedChildProfileId,
          limit: 5
        }),
      ]);
      dispatch({ type: 'SET_POINT_BALANCE', balance: newBalance });
      dispatch({ type: 'SET_TODAYS_SUMMARY', summary });
      dispatch({ type: 'SET_RECENT_ACTIVITY', pointEvents: recentEvents });

      // Register undoable action
      const undoAction: UndoableAction = {
        id: pointEvent.id,
        type: 'redemption',
        entityId: pointEvent.id,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5000),
        undoFn: async () => {
          await undoPointEvent(pointEvent.id);
        },
      };
      undoManager.registerUndoableAction(undoAction);
      dispatch({ type: 'ADD_UNDOABLE_ACTION', action: undoAction });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to redeem reward';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  const undoPointEvent = async (pointEventId: string, knownPointValue?: number): Promise<void> => {
    // Prefer the value passed in by the caller (who usually already has the
    // full event object from whatever list they're deleting it out of).
    // Fall back to looking it up in context state for callers that don't
    // have it handy (e.g. the 5-second undo toast after logBehavior/redeemReward).
    const eventToRemove = state.pointEvents.find(e => e.id === pointEventId)
      ?? state.recentActivity.find(e => e.id === pointEventId);
    const pointValue = knownPointValue ?? eventToRemove?.pointValue;

    // Optimistically remove from the UI and reverse the balance right away,
    // rather than waiting on the delete + balance recalculation round trip.
    dispatch({ type: 'DELETE_POINT_EVENT', id: pointEventId });
    if (pointValue !== undefined) {
      dispatch({ type: 'SET_POINT_BALANCE', balance: state.pointBalance - pointValue });
    }
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // Delete the point event
      await rewardsService.undoPointEvent(pointEventId);

      // Recalculate balance, today's summary, and recent activity in parallel
      // (confirms the optimistic balance reversal against the server)
      if (state.selectedChildProfileId) {
        const [newBalance, summary, recentEvents] = await Promise.all([
          rewardsService.calculatePointBalance(state.selectedChildProfileId),
          rewardsService.getDailySummary(state.selectedChildProfileId, new Date()),
          rewardsService.getPointEvents(state.selectedChildProfileId, {
            childProfileId: state.selectedChildProfileId,
            limit: 5
          }),
        ]);
        dispatch({ type: 'SET_POINT_BALANCE', balance: newBalance });
        dispatch({ type: 'SET_TODAYS_SUMMARY', summary });
        dispatch({ type: 'SET_RECENT_ACTIVITY', pointEvents: recentEvents });
      }

      // Remove undoable action
      dispatch({ type: 'REMOVE_UNDOABLE_ACTION', actionId: pointEventId });

    } catch (error) {
      // Roll back the balance reversal. We don't re-add the deleted event to
      // context state here since it likely never lived there for the Daily
      // Activity list case - the screen's own reload (loadDailyEvents) is
      // what restores it on failure there.
      if (pointValue !== undefined) {
        dispatch({ type: 'SET_POINT_BALANCE', balance: state.pointBalance });
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to undo point event';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  const updatePointEvent = async (id: string, updates: Partial<PointEvent>): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', error: null });

      // Update the point event
      await rewardsService.updatePointEvent(id, updates);
      
      // Update state
      dispatch({ type: 'UPDATE_POINT_EVENT', id, updates });
      
      // Recalculate balance, today's summary, and recent activity in parallel
      if (state.selectedChildProfileId) {
        const [newBalance, summary, recentEvents] = await Promise.all([
          rewardsService.calculatePointBalance(state.selectedChildProfileId),
          rewardsService.getDailySummary(state.selectedChildProfileId, new Date()),
          rewardsService.getPointEvents(state.selectedChildProfileId, {
            childProfileId: state.selectedChildProfileId,
            limit: 5
          }),
        ]);
        dispatch({ type: 'SET_POINT_BALANCE', balance: newBalance });
        dispatch({ type: 'SET_TODAYS_SUMMARY', summary });
        dispatch({ type: 'SET_RECENT_ACTIVITY', pointEvents: recentEvents });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update point event';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  // ==================== REFRESH AND PROFILE SWITCHING ====================

  const refreshData = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      if (!state.selectedChildProfileId) {
        return;
      }

      // Load all data for the selected child profile
      const [behaviors, rewards, pointEvents, balance, summary] = await Promise.all([
        rewardsService.getBehaviors(state.selectedChildProfileId, true), // Include archived for Manage screens
        rewardsService.getRewards(state.selectedChildProfileId, true),   // Include archived for Manage screens
        rewardsService.getPointEvents(state.selectedChildProfileId, {
          childProfileId: state.selectedChildProfileId,
          limit: 5,
        }),
        rewardsService.calculatePointBalance(state.selectedChildProfileId),
        rewardsService.getDailySummary(state.selectedChildProfileId, new Date()),
      ]);

      // Update state
      dispatch({ type: 'SET_BEHAVIORS', behaviors });
      dispatch({ type: 'SET_REWARDS', rewards });
      dispatch({ type: 'SET_RECENT_ACTIVITY', pointEvents });
      dispatch({ type: 'SET_POINT_BALANCE', balance });
      dispatch({ type: 'SET_TODAYS_SUMMARY', summary });

      // Clear expired undo actions
      undoManager.clearExpiredActions();
      dispatch({ type: 'CLEAR_EXPIRED_UNDO_ACTIONS' });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const switchChildProfile = async (childProfileId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });
      dispatch({ type: 'SET_CHILD_PROFILE', childProfileId });

      // Load all data for the new child profile
      const [behaviors, rewards, pointEvents, balance, summary] = await Promise.all([
        rewardsService.getBehaviors(childProfileId, true), // Include archived for Manage screens
        rewardsService.getRewards(childProfileId, true),   // Include archived for Manage screens
        rewardsService.getPointEvents(childProfileId, {
          childProfileId,
          limit: 5,
        }),
        rewardsService.calculatePointBalance(childProfileId),
        rewardsService.getDailySummary(childProfileId, new Date()),
      ]);

      // Update state
      dispatch({ type: 'SET_BEHAVIORS', behaviors });
      dispatch({ type: 'SET_REWARDS', rewards });
      dispatch({ type: 'SET_RECENT_ACTIVITY', pointEvents });
      dispatch({ type: 'SET_POINT_BALANCE', balance });
      dispatch({ type: 'SET_TODAYS_SUMMARY', summary });

      // Clear expired undo actions
      undoManager.clearExpiredActions();
      dispatch({ type: 'CLEAR_EXPIRED_UNDO_ACTIONS' });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch child profile';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  // ==================== AUTO-CLEAR EXPIRED UNDO ACTIONS ====================

  React.useEffect(() => {
    // Set up interval to clear expired undo actions every second
    const intervalId = setInterval(() => {
      undoManager.clearExpiredActions();
      dispatch({ type: 'CLEAR_EXPIRED_UNDO_ACTIONS' });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // ==================== CONTEXT VALUE ====================

  const contextValue: RewardsContextValue = {
    ...state,
    createBehavior,
    updateBehavior,
    deleteBehavior,
    archiveBehavior,
    unarchiveBehavior,
    createReward,
    updateReward,
    deleteReward,
    archiveReward,
    unarchiveReward,
    logBehavior,
    redeemReward,
    updatePointEvent,
    undoPointEvent,
    refreshData,
    switchChildProfile,
  };

  return (
    <RewardsContext.Provider value={contextValue}>
      {children}
    </RewardsContext.Provider>
  );
}

// ==================== EXPORT ====================

export { RewardsContext, rewardsReducer, initialState };
