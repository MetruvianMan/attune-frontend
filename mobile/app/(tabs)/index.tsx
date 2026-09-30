import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput as RNTextInput, Modal, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { Text, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import { PaperTextInput as TextInput } from '../../components/PaperText';
import { useRouter, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAppForegroundRefresh } from '../../hooks/useAppForegroundRefresh';
import { useAuthContext } from '../../contexts/AuthContext';
import { useDateNavigation } from '../../contexts/DateNavigationContext';
import { useProfile } from '../../contexts/ProfileContext';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { QuickTapButton } from '../../components/QuickTapButton';
import { InsightCard } from '../../components/InsightCard';
import { DiaryEntryCard } from '../../components/DiaryEntryCard';
import { DraggableEventList } from '../../components/DraggableEventList';
import { QuickNotesModal } from '../../components/QuickNotesModal';
import { ProfileHeader } from '../../components/ProfileHeader';
import { VoiceLogger } from '../../components/VoiceLogger';
import { CustomEventModal } from '../../components/CustomEventModal';
import { FullEmojiPicker } from '../../components/FullEmojiPicker';
import { CalendarDatePicker } from '../../components/CalendarDatePicker';
import { eventService } from '../../services/event-service';
import { databaseService } from '../../services/database';
import { EventType, Insight, DiaryEntry, Event } from '../../models';
import { colors, shadows, radius, spacing, typography } from '../../constants/theme';
import { DEFAULT_QUICK_TAP_BUTTONS } from '../../constants/quick-tap-buttons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persists the last computed Quick Log frequency order (just the ordered
// list of eventType strings, not the full button configs) per child
// profile, so a returning launch can paint the grid immediately from
// this cached order instead of waiting on the full-history
// getEvents() query - by far the slowest data fetch on this whole
// screen (unbounded, every event ever logged for the profile), which is
// why Quick Log was the last thing to appear even after every other
// loading/flicker fix. The real query still runs every time in the
// background and corrects the order if it's changed since the cached
// version was written - this is purely about what paints FIRST, not a
// replacement for the real sort.
const QUICK_LOG_ORDER_CACHE_KEY_PREFIX = 'attune:quickLogOrder:';

// Quick Log page/column sizing - derived from the Quick Log ScrollView's
// actual measured width (see quickLogPageWidth in the component body,
// fed by the ScrollView's onLayout), not a hardcoded pixel value or a
// windowWidth-minus-guessed-padding calculation. The previous hardcoded
// 376px page width (two fixed 178px columns + a 20px gap) only fit on
// wider phones. A later attempt replaced that with
// windowWidth - CONTENT_HORIZONTAL_PADDING*2, assuming only
// styles.content's own padding sits between the screen edge and this
// ScrollView - but on-device measurement showed the real viewport was
// 32px narrower than that assumption predicted (there's more inset in
// between than just that one padding value), so the "two columns"
// literally didn't fit inside the ScrollView's own visible/scrollable
// width, clipping the second column regardless of how correct the column
// math itself was. Measuring the ScrollView directly sidesteps needing
// to know or guess every layer of padding/inset between it and the
// screen edge.
// CONTENT_HORIZONTAL_PADDING is now only a same-render fallback (used for
// the very first render, before onLayout has fired) and must match
// styles.content's padding below.
const CONTENT_HORIZONTAL_PADDING = 16;
const QUICK_LOG_COLUMN_GAP = 20;

// Mood configuration matching web app
type MoodColor = 'green' | 'amber' | 'red';

interface MoodConfig {
  emoji: string;
  label: string;
  bg: string;
  border: string;
  text: string;
}

const MOOD_CONFIG: Record<MoodColor, MoodConfig> = {
  green: {
    emoji: '🟢',
    label: 'Good day',
    bg: 'rgba(127,191,159,0.15)',
    border: 'rgba(127,191,159,0.3)',
    text: '#7FBF9F',
  },
  amber: {
    emoji: '🟡',
    label: 'Mixed day',
    bg: 'rgba(242,201,76,0.15)',
    border: 'rgba(242,201,76,0.3)',
    text: '#F2C94C',
  },
  red: {
    emoji: '🔴',
    label: 'Tough day',
    bg: 'rgba(235,87,87,0.15)',
    border: 'rgba(235,87,87,0.3)',
    text: '#EB5757',
  },
};

// Event types that push the day toward red
const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue', 'angry', 'didnt_eat_dinner', 'overwhelm'];

// Event types that push the day toward green
// NOTE: intentionally different from RED_EVENTS/GREEN_EVENTS's canonical
// copy in constants/events.ts (used by getDefaultValenceForEventType) -
// this screen's own list is missing 'camp' and 'creative', which the
// canonical version (and WeatherView.tsx/HeatMapView.tsx) do include.
// Confirmed this predates tonight's changes rather than assuming the
// three copies were meant to be identical - not unifying them here to
// avoid silently changing this screen's mood-scoring behavior as a side
// effect of an unrelated fix.
const GREEN_EVENTS: EventType[] = ['great_day', 'positive_behavior', 'good_sleep', 'good_dinner', 'played_outside', 'family_adventure', 'kindness', 'reading', 'focus', 'chores', 'drew_comics', 'playdate', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding'];

// Compute auto mood from events - respects manual valence overrides
function computeAutoMood(events: Event[]): MoodColor {
  if (events.length === 0) return 'green'; // no events = benefit of the doubt
  
  let score = 0; // positive = green, negative = red
  for (const event of events) {
    // First, check if event has a manually set valence (overrides type-based defaults)
    if (event.valence) {
      if (event.valence === 'positive') {
        score += 2;
      } else if (event.valence === 'negative') {
        score -= (event.severity ?? getDefaultSeverity(event.eventType));
      }
      // neutral valence doesn't shift score
    } else {
      // Fall back to type-based valence detection
      if (RED_EVENTS.includes(event.eventType)) {
        score -= (event.severity ?? getDefaultSeverity(event.eventType));
      } else if (GREEN_EVENTS.includes(event.eventType)) {
        score += 2;
      }
      // neutral events don't shift the score
    }
  }
  
  if (score <= -3) return 'red';
  if (score < 2) return 'amber';
  return 'green';
}

// Get default severity for event types (some are less severe than others)
function getDefaultSeverity(eventType: EventType): number {
  // Moderate negative events get severity 2
  if (eventType === 'angry' || eventType === 'didnt_eat_dinner') {
    return 2;
  }
  // All other negative events default to severity 3
  return 3;
}

export default function TodayScreen() {
  const router = useRouter();
  const { userEmail } = useAuthContext();
  // Re-reads the true window width on every render (unlike a module-scope
  // Dimensions.get('window').width call, which only runs once at import
  // time and can be stale/wrong on some devices). Used below to size the
  // Quick Log carousel correctly on any screen width - see
  // QUICK_LOG_COLUMN_GAP/CONTENT_HORIZONTAL_PADDING above.
  const { width: windowWidth } = useWindowDimensions();
  // Real measured height of the bottom tab bar (icons + labels + the
  // device's own home-indicator safe-area inset), NOT a guessed constant.
  // styles.content used a hardcoded paddingBottom: 80 to keep scrollable
  // content (e.g. the "Switch to Text Log" link) from sitting underneath
  // the tab bar - that guess was enough clearance on some devices but not
  // others (different tab bar heights/safe-area insets per device), so
  // content at the bottom of the screen could end up hidden behind the
  // tab bar. Reusing the actual tab bar height guarantees exactly enough
  // clearance on every device, the same "measure, don't guess" fix
  // already applied to the Quick Log width bugs above.
  const tabBarHeight = useBottomTabBarHeight();
  // The ScrollView's actual rendered width (measured via onLayout below)
  // is the real source of truth for how much horizontal space a Quick Log
  // page has to work with - NOT windowWidth minus a guessed padding
  // constant. That guess (CONTENT_HORIZONTAL_PADDING*2) turned out to be
  // wrong on-device: measuring showed the real viewport was 32px narrower
  // than the guess predicted (there's more inset between the screen edge
  // and this ScrollView than just styles.content's own padding), which is
  // exactly why the second column was landing outside the visible/
  // scrollable area even though the math "added up" on paper. Starts at 0
  // before the first layout pass; the guessed fallback below is only used
  // for that first render, then immediately corrected once real
  // measurements come in.
  const [measuredScrollWidth, setMeasuredScrollWidth] = useState(0);
  const quickLogPageWidth = measuredScrollWidth > 0
    ? measuredScrollWidth
    : windowWidth - CONTENT_HORIZONTAL_PADDING * 2; // fallback for the very first render only
  const quickLogColumnWidth = (quickLogPageWidth - QUICK_LOG_COLUMN_GAP) / 2;
  const { selectedDate: navigationDate, clearSelectedDate } = useDateNavigation();
  // Renamed from the context's own `isLoading` - "the active profile
  // itself hasn't resolved yet", used below to tell that apart from
  // "confirmed there is no profile at all" (see the Quick Log sort
  // effect's childProfileId-is-null branch).
  const { activeProfile, profilePhotoUri, isLoading: profileLoading } = useProfile();
  const scrollViewRef = useRef<ScrollView>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [todaysEvents, setTodaysEvents] = useState<Event[]>([]);
  const [recentInsight, setRecentInsight] = useState<Insight | null>(null);
  const [todaysDiaryEntries, setTodaysDiaryEntries] = useState<DiaryEntry[]>([]);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // Debounce timer for load operations
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tracks which child profile loadDataForDate last loaded for, so it can
  // tell "switched to a different profile" (needs a hard clear - a
  // different child's events must never flash the previous child's data)
  // apart from "reloading the same profile/date after an add/delete/edit"
  // (must NOT clear - see the comment inside loadDataForDate for why this
  // distinction is the fix for the Quick Log/Events-list flicker).
  const lastLoadedProfileIdRef = useRef<string | null>(null);
  
  // Debounced load function to prevent rapid reloads
  const debouncedLoadDataForDate = useCallback((date: Date, delay: number = 300) => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
    }
    
    loadTimerRef.current = setTimeout(() => {
      loadDataForDate(date);
    }, delay);
  }, []);
  const [dayMood, setDayMood] = useState<MoodColor>('green');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isMoodOverride, setIsMoodOverride] = useState(false);
  const [customEventModalVisible, setCustomEventModalVisible] = useState(false);
  const [editingDiaryEntry, setEditingDiaryEntry] = useState<DiaryEntry | null>(null);
  const [diaryEditModalVisible, setDiaryEditModalVisible] = useState(false);
  const [diaryEditContent, setDiaryEditContent] = useState('');

  const childProfileId = activeProfile?.id || null;

  // Change the selected date AND clear the previous date's events/diary in
  // the same synchronous call, so React batches them into a single commit.
  // Clearing stale state only inside loadDataForDate() (the async fetch)
  // isn't enough - that clear happens in a later render than the date
  // label update, so the NEW date briefly paints alongside the OLD day's
  // events/diary before the fetch resolves. Routing every date change
  // through here closes that gap entirely instead of just shortening it.
  const changeSelectedDate = (date: Date) => {
    setSelectedDate(date);
    setTodaysEvents([]);
    setTodaysDiaryEntries([]);
    setRecentInsight(null);
  };

  // Scroll to bottom when switching to text mode
  const handleTextModeActivated = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Reload data when screen comes into focus, or when the active profile
  // changes (e.g. the user switched children)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Today tab focused, reloading data...');
      
      // If there's a navigation date from Insights tab, use it
      if (navigationDate) {
        console.log('Navigation date detected:', navigationDate);
        changeSelectedDate(navigationDate);
        clearSelectedDate(); // Clear it so it doesn't persist
      }
      
      if (childProfileId) {
        loadDataForDate(selectedDate);
      }
    }, [childProfileId, selectedDate, navigationDate])
  );

  useEffect(() => {
    if (childProfileId) {
      loadDataForDate(selectedDate);
    }
  }, [selectedDate, childProfileId]);

  // Also reload whenever the app comes back to the foreground (e.g. the
  // user switches back to Attune after being in another app or after the
  // phone was locked) - not just on navigation focus/mount above. This is
  // a shared two-parent app; without this, if one parent logs/deletes an
  // event while the other is already sitting on this screen (not
  // navigating away and back), the second parent wouldn't see it until
  // they happened to leave and re-enter the tab. See
  // hooks/useAppForegroundRefresh.ts for why this is foreground-triggered
  // rather than a polling timer.
  useAppForegroundRefresh(() => {
    if (childProfileId) {
      loadDataForDate(selectedDate);
    }
  });

  const loadDataForDate = async (date: Date) => {
    if (!childProfileId) {
      console.log('loadDataForDate: No childProfileId yet');
      return;
    }

    // Only hard-clear when the child profile actually changed since the
    // last load. Date switches are already cleared synchronously by
    // changeSelectedDate() before this function ever runs, so clearing
    // here too was redundant for that case - and actively harmful for
    // every other caller (handleQuickTap, handleDeleteEvent, and every
    // other post-mutation "await loadDataForDate(selectedDate)" reload):
    // those already do an optimistic update to todaysEvents, and the
    // Events list is only rendered while todaysEvents.length > 0 (see the
    // JSX below), so unconditionally resetting it to [] here - even for a
    // moment, while the refetch is in flight - unmounted the whole Events
    // card and made Quick Log reflow upward to fill the gap, then reflow
    // back down once real data arrived a beat later. That reflow was the
    // reported "Events list vanishes, Quick Log jumps to top" flicker on
    // every add/delete. Switching profiles is the one case that still
    // needs a hard clear (a different child's events must never flash the
    // previous child's data), so that's the only case this still does.
    const isProfileSwitch = lastLoadedProfileIdRef.current !== null
      && lastLoadedProfileIdRef.current !== childProfileId;
    lastLoadedProfileIdRef.current = childProfileId;
    if (isProfileSwitch) {
      setTodaysEvents([]);
      setTodaysDiaryEntries([]);
      setRecentInsight(null);
    }

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('🔵 TODAY TAB: Loading events for date range:', {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
        profileId: childProfileId
      });

      // getEvents/getDiaryEntriesByDate/getRecentInsights are three
      // independent queries - none of their results feed into another -
      // but were previously awaited one after another, stacking three
      // full DB round trips in a row on every load (part of the reported
      // Today tab choppiness, alongside the profile photo's own fetch in
      // ProfileContext - see that file's loadProfile for the equivalent
      // fix already applied there). Firing them together and awaiting
      // once cuts this to the duration of the single slowest query
      // instead of the sum of all three. getRecentInsights is only
      // relevant for today, so it's skipped (resolves to an empty array)
      // for past dates rather than firing a query whose result is never
      // used.
      const [events, entries, insights] = await Promise.all([
        databaseService.getEvents({
          childProfileId,
          dateRange: { start: startOfDay, end: endOfDay },
        }),
        databaseService.getDiaryEntriesByDate(childProfileId, startOfDay),
        isToday(date) ? databaseService.getRecentInsights(childProfileId, 1) : Promise.resolve([]),
      ]);
      
      console.log(`🔵 TODAY TAB: Loaded ${events.length} events for ${date.toLocaleDateString()}`);
      
      if (events.length > 0) {
        console.log('🔵 TODAY TAB: First event:', JSON.stringify(events[0], null, 2));
        console.log('🔵 TODAY TAB: Event types:', events.map(e => e.eventType).join(', '));
        console.log('🔵 TODAY TAB: Custom emojis:', events.map(e => e.customEmoji || 'none').join(', '));
      }
      
      // Force re-render by creating new array reference
      setTodaysEvents([...events]);
      console.log(`🔵 TODAY TAB: State updated with ${events.length} events`);
      
      // Compute mood from events
      const autoMood = computeAutoMood(events);
      setDayMood(autoMood);
      setIsMoodOverride(false); // Reset override flag when events change

      console.log(`✅ Loaded ${entries.length} diary entries`);
      setTodaysDiaryEntries(entries);

      if (insights.length > 0) {
        setRecentInsight(insights[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleQuickTap = async (eventType: EventType, label: string) => {
    if (!childProfileId) {
      Alert.alert('No Profile', 'Please create a profile first in the Profile tab');
      return;
    }

    // No isLoading gate/disable here anymore - previously this whole
    // function ran under setIsLoading(true)/false, and every Quick Log
    // button's `disabled` prop was wired to that same isLoading flag (see
    // the two QuickTapButton usages below). That meant the ENTIRE grid
    // grayed out for the full round trip - not just the create call, but
    // also the loadDataForDate reload after it - on every single tap,
    // which read as "the app is still thinking" even though the tapped
    // event already appeared instantly via the optimistic update below.
    // Dropping the disable and relying purely on the optimistic update
    // matches how the Rewards tab's own Quick Log/Quick Redeem taps
    // already behave (see RewardsTabScreen.tsx's handleBehaviorTap/
    // handleRewardTap) - its carousel never grays out either, for the
    // same reason: the temp event/entry already reflects the tap
    // immediately, so there's nothing left to gate the UI on.
    try {
      const logDate = isToday(selectedDate) ? new Date() : new Date(selectedDate.setHours(12, 0, 0, 0));
      console.log('🟢 TODAY TAB: Creating event:', { childProfileId, eventType, label, logDate: logDate.toISOString() });
      
      // Optimistic UI update: create temporary event and show immediately
      const tempEvent: Event = {
        id: `temp-${Date.now()}`, // Temporary ID
        childProfileId,
        eventType,
        timestamp: logDate,
        severity: undefined,
        tags: [],
        notes: undefined,
        persons: [],
        source: 'quick-tap',
        transcript: undefined,
        customLabel: label,
        customEmoji: undefined,
        valence: undefined,
        contextEntryRefs: [],
        createdAt: new Date(),
      };
      
      // Show event immediately (optimistic update)
      setTodaysEvents(prev => [...prev, tempEvent]);
      
      // Actually create the event in background
      await eventService.createQuickTapEvent(childProfileId, eventType, label, logDate);
      
      console.log('🟢 TODAY TAB: Event created successfully, reloading data...');
      
      // Reload to get real event with proper ID from database
      await loadDataForDate(selectedDate);
      console.log('🟢 TODAY TAB: Data reloaded after event creation');
    } catch (error) {
      console.error('🔴 TODAY TAB: Failed to log event:', error);
      console.error('🔴 TODAY TAB: Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      Alert.alert('Error', `Failed to create event: ${error instanceof Error ? error.message : String(error)}`);
      setSnackbarMessage('Failed to log event');
      setSnackbarVisible(true);
      
      // Rollback optimistic update on error
      await loadDataForDate(selectedDate);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Optimistically remove from UI immediately
      setTodaysEvents(prev => prev.filter(e => e.id !== eventId));

      // Delete from database in background
      await databaseService.deleteEvent(eventId);

      // Reload to ensure consistency (but UI already updated)
      await loadDataForDate(selectedDate);
    } catch (error) {
      console.error('Failed to delete event:', error);
      // Rollback on error
      await loadDataForDate(selectedDate);
      setSnackbarMessage('Failed to delete event');
      setSnackbarVisible(true);
    }
  };

  const handleReorderEvents = async (reorderedEvents: Event[]) => {
    try {
      for (let i = 0; i < reorderedEvents.length; i++) {
        const event = reorderedEvents[i];
        await databaseService.updateEvent(event.id, { sequenceOrder: i });
      }
      
      setTodaysEvents(reorderedEvents);
      // Suppress snackbar notification
      // setSnackbarMessage('Events reordered');
      // setSnackbarVisible(true);
    } catch (error) {
      console.error('Failed to reorder events:', error);
      setSnackbarMessage('Failed to reorder events');
      setSnackbarVisible(true);
    }
  };

  const handleEditEvent = (eventId: string) => {
    const event = todaysEvents.find(e => e.id === eventId);
    if (event) {
      setEditingEvent(event);
      setNotesModalVisible(true);
    }
  };

  const handleEditDetails = (eventId: string) => {
    router.push(`/event-form?eventId=${eventId}`);
  };

  const handleEmojiTap = (eventId: string) => {
    console.log('Emoji tapped for event:', eventId);
    setEditingEventId(eventId);
    setEmojiPickerVisible(true);
  };

  const handleEmojiSelect = async (emoji: string) => {
    console.log('Emoji selected:', emoji, 'for event:', editingEventId);
    if (!editingEventId) return;
    
    try {
      console.log('Updating event with customEmoji:', editingEventId, emoji);
      await databaseService.updateEvent(editingEventId, { customEmoji: emoji });
      console.log('Event updated, reloading data...');
      
      // Force state update by reloading events
      await loadDataForDate(selectedDate);
      
      console.log('Data reloaded, closing picker');
      setEmojiPickerVisible(false);
      setEditingEventId(null);
      
      // Show success message
      setSnackbarMessage('Emoji updated');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Failed to update emoji:', error);
      setSnackbarMessage('Failed to update emoji');
      setSnackbarVisible(true);
    }
  };

  const handleSaveCustomEvent = async (data: {
    label: string;
    emoji: string;
    valence: 'positive' | 'neutral' | 'negative';
    notes: string;
    saveForQuickAccess: boolean;
  }) => {
    if (!childProfileId) {
      Alert.alert('No Profile', 'Please create a profile first in the Profile tab');
      return;
    }

    try {
      const logDate = isToday(selectedDate) ? new Date() : new Date(selectedDate.setHours(12, 0, 0, 0));
      
      await eventService.createEvent({
        childProfileId,
        eventType: 'custom',
        timestamp: logDate,
        source: 'custom',
        customLabel: data.label,
        customEmoji: data.emoji,
        notes: data.notes || undefined,
        valence: data.valence,
      });

      // TODO: Implement saveForQuickAccess if needed
      
      setCustomEventModalVisible(false);
      await loadDataForDate(selectedDate);
    } catch (error) {
      console.error('Failed to create custom event:', error);
      setSnackbarMessage('Failed to create event');
      setSnackbarVisible(true);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!editingEvent) return;
    
    try {
      await databaseService.updateEvent(editingEvent.id, { notes });
      await loadDataForDate(selectedDate);
      // Suppress snackbar notification
      // setSnackbarMessage('Notes saved');
      // setSnackbarVisible(true);
      setNotesModalVisible(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setSnackbarMessage('Failed to save notes');
      setSnackbarVisible(true);
    }
  };

  const handleEditDiary = (entry: DiaryEntry) => {
    setEditingDiaryEntry(entry);
    setDiaryEditContent(entry.content);
    setDiaryEditModalVisible(true);
  };

  const handleSaveDiary = async () => {
    if (!editingDiaryEntry) return;
    
    try {
      await databaseService.updateDiaryEntry(editingDiaryEntry.id, diaryEditContent);
      await loadDataForDate(selectedDate);
      setSnackbarMessage('Diary updated');
      setSnackbarVisible(true);
      setDiaryEditModalVisible(false);
      setEditingDiaryEntry(null);
      setDiaryEditContent('');
    } catch (error) {
      console.error('Failed to update diary:', error);
      setSnackbarMessage('Failed to update diary');
      setSnackbarVisible(true);
    }
  };

  const handleCancelDiaryEdit = () => {
    setDiaryEditModalVisible(false);
    setEditingDiaryEntry(null);
    setDiaryEditContent('');
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      changeSelectedDate(date);
    }
  };

  const resetToToday = () => {
    changeSelectedDate(new Date());
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getEventEmoji = (eventType: string): string => {
    const button = DEFAULT_QUICK_TAP_BUTTONS.find(b => b.eventType === eventType);
    return button?.emoji || '📝';
  };

  // Sort buttons by usage frequency across ALL events (most used first)
  // This matches the web app behavior
  const [sortedButtons, setSortedButtons] = useState(DEFAULT_QUICK_TAP_BUTTONS);
  // False until the frequency sort has resolved at least once for the
  // CURRENT childProfileId. Without this, the Quick Log grid below
  // renders sortedButtons' initial value (the hardcoded declaration
  // order from DEFAULT_QUICK_TAP_BUTTONS) on first paint, then re-renders
  // a moment later once the async frequency sort resolves - a visible
  // "buttons appear in one order, then reshuffle" flash, most noticeable
  // right after the splash screen on a cold launch (nothing cached yet to
  // fall back on). Gating the grid's render on this flag means the very
  // first paint already shows the final frequency-sorted order.
  const [buttonsSorted, setButtonsSorted] = useState(false);
  // Same pattern as lastLoadedProfileIdRef above: lets the effect below
  // tell "profile actually changed" (must hide the grid - a different
  // child's frequency order must never flash under the previous child's
  // label) apart from "same profile, just re-sorting after a log/undo"
  // (must NOT hide - the buttons are already visible and correctly
  // ordered from the last sort; hiding them here would itself cause a
  // flicker on every single quick-tap).
  const lastSortedProfileIdRef = useRef<string | null>(null);

  // Applies a cached (or freshly computed) ordering of eventType strings
  // to DEFAULT_QUICK_TAP_BUTTONS - shared by both the instant cache-read
  // path and the real frequency-sort path below, so "paint from cache"
  // and "paint from the real query" produce button lists the same way.
  // Any eventType not present in orderedEventTypes (e.g. a button added
  // to DEFAULT_QUICK_TAP_BUTTONS after this cache was written) falls back
  // to its original declared position, appended in that relative order
  // after every explicitly-ordered button - so a newly-added button never
  // ends up missing, just un-prioritized until the real sort runs once.
  const applyEventTypeOrder = (orderedEventTypes: string[]) => {
    const rank = new Map(orderedEventTypes.map((eventType, index) => [eventType, index]));
    return [...DEFAULT_QUICK_TAP_BUTTONS].sort((a, b) => {
      const rankA = rank.get(a.eventType);
      const rankB = rank.get(b.eventType);
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;
      // Neither ranked - preserve original declared order between them.
      return DEFAULT_QUICK_TAP_BUTTONS.indexOf(a) - DEFAULT_QUICK_TAP_BUTTONS.indexOf(b);
    });
  };

  useEffect(() => {
    // Still finding out whether a profile exists (the app-wide profile
    // load hasn't settled yet) - NOT the same as "confirmed there is no
    // profile", which is the case right below. childProfileId is also
    // null during this brief window on every cold launch, so without
    // this check, the branch below fired immediately, painted the raw
    // DEFAULT_QUICK_TAP_BUTTONS order (unsorted), and marked itself
    // "done" - then a moment later the real profile resolved, this same
    // effect re-ran, hid the grid again, and re-sorted into the correct
    // order. That hide-then-reshuffle was the reported Quick Log flash.
    // Waiting here instead means the grid simply doesn't render at all
    // (buttonsSorted stays false) until there's a definitive answer.
    if (profileLoading) {
      return;
    }

    if (!childProfileId) {
      setSortedButtons(DEFAULT_QUICK_TAP_BUTTONS);
      setButtonsSorted(true);
      lastSortedProfileIdRef.current = null;
      return;
    }

    const isNewProfile = lastSortedProfileIdRef.current !== childProfileId;
    if (isNewProfile) {
      setButtonsSorted(false);
    }
    lastSortedProfileIdRef.current = childProfileId;

    const cacheKey = QUICK_LOG_ORDER_CACHE_KEY_PREFIX + childProfileId;

    const sortButtonsByFrequency = async () => {
      // Tracks whether something has already been painted to the grid
      // during THIS call (from the cache-read branch below) - a local
      // variable rather than reading the buttonsSorted state value,
      // since a closure over that state would still reflect whatever it
      // was when this effect started, not any setButtonsSorted(true)
      // call made earlier in this same async function.
      let paintedFromCache = false;

      // Only paint from cache on a genuine profile switch/first mount -
      // if this effect re-fired because todaysEvents changed (a log/undo
      // during this session), the grid is already showing the correct
      // live order from the LAST real sort, and overwriting it with a
      // now-stale cached snapshot would itself be a step backwards, not
      // an improvement. AsyncStorage reads are local (no network) but
      // still async - reading it first, before the real query, is what
      // lets the grid paint before the slow query has a chance to
      // resolve, rather than racing the two and hoping the cache wins.
      if (isNewProfile) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const orderedEventTypes: string[] = JSON.parse(cached);
            setSortedButtons(applyEventTypeOrder(orderedEventTypes));
            setButtonsSorted(true);
            paintedFromCache = true;
          }
        } catch (error) {
          console.error('Failed to read cached Quick Log order:', error);
        }
      }

      try {
        // Get all events for this profile to calculate frequency
        const allEvents = await databaseService.getEvents({ childProfileId });
        
        // Count occurrences by eventType
        const eventCounts = new Map<string, number>();
        for (const ev of allEvents) {
          eventCounts.set(ev.eventType, (eventCounts.get(ev.eventType) ?? 0) + 1);
        }
        
        // Sort buttons by frequency, with original order as tiebreaker
        const sorted = [...DEFAULT_QUICK_TAP_BUTTONS].sort((a, b) => {
          const countA = eventCounts.get(a.eventType) ?? 0;
          const countB = eventCounts.get(b.eventType) ?? 0;
          if (countB !== countA) return countB - countA;
          
          // Tie-break: preserve original order
          const indexA = DEFAULT_QUICK_TAP_BUTTONS.indexOf(a);
          const indexB = DEFAULT_QUICK_TAP_BUTTONS.indexOf(b);
          return indexA - indexB;
        });
        
        setSortedButtons(sorted);
        AsyncStorage.setItem(cacheKey, JSON.stringify(sorted.map(b => b.eventType))).catch((error) => {
          console.error('Failed to cache Quick Log order:', error);
        });
      } catch (error) {
        console.error('Failed to sort buttons by frequency:', error);
        // Only fall back to the unsorted default if nothing better is
        // already on screen from the cache-read branch above - otherwise
        // a transient query failure would overwrite a perfectly good
        // cached order with the raw declared order.
        if (!paintedFromCache) {
          setSortedButtons(DEFAULT_QUICK_TAP_BUTTONS);
        }
      } finally {
        setButtonsSorted(true);
      }
    };

    sortButtonsByFrequency();
  }, [childProfileId, profileLoading, todaysEvents]); // Re-sort when events change


  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Profile Header */}
      <ProfileHeader
        emoji="🌿"
        title="Today"
        profileName={activeProfile?.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Date Picker Row - Inline like web app */}
          <View style={styles.datePickerRow}>
            <Text style={styles.dateLabel}>Logging for:</Text>
            <TouchableOpacity 
              style={styles.dateInputButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateInputText}>
                {selectedDate.toLocaleDateString('en-US', { 
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric'
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.todayButton}
              onPress={resetToToday}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar Date Picker */}
          <CalendarDatePicker
            visible={showDatePicker}
            selectedDate={selectedDate}
            onSelect={(date) => {
              changeSelectedDate(date);
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
            maxDate={new Date()}
          />

          {/* Mood Strip - Key visual element from web app */}
          <View style={[styles.moodStrip, { 
            backgroundColor: MOOD_CONFIG[dayMood].bg,
            borderColor: MOOD_CONFIG[dayMood].border 
          }]}>
            <Text style={[styles.moodLabel, { color: MOOD_CONFIG[dayMood].text }]}>
              {MOOD_CONFIG[dayMood].emoji} {MOOD_CONFIG[dayMood].label}{isMoodOverride ? ' (Override)' : ''}
            </Text>
            <View style={styles.moodButtons}>
              {(['green', 'amber', 'red'] as MoodColor[]).map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={[
                    styles.moodButton,
                    dayMood === mood && {
                      backgroundColor: MOOD_CONFIG[mood].bg,
                      borderColor: MOOD_CONFIG[mood].text,
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => {
                    setDayMood(mood);
                    setIsMoodOverride(true);
                  }}
                >
                  <Text style={styles.moodButtonEmoji}>{MOOD_CONFIG[mood].emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Events List */}
          {todaysEvents.length > 0 && (
            <View style={styles.softCard}>
              <View style={styles.eventListHeader}>
                <Text style={styles.sectionTitle}>
                  EVENTS ({todaysEvents.length})
                </Text>
                <Text style={styles.dragHint}>
                  Hold ⠿ to reorder
                </Text>
              </View>
              <DraggableEventList
                events={todaysEvents}
                onReorder={handleReorderEvents}
                onEdit={handleEditEvent}
                onEditDetails={handleEditDetails}
                onDelete={handleDeleteEvent}
                onEmojiTap={handleEmojiTap}
                onDragStateChange={(isDragging) => setScrollEnabled(!isDragging)}
                formatEventType={formatEventType}
                getEventEmoji={getEventEmoji}
              />
            </View>
          )}

          {/* Diary Entries */}
          {todaysDiaryEntries.length > 0 && (
            <View style={styles.diaryCard}>
              <View style={styles.diaryHeader}>
                <Text style={styles.sectionTitle}>
                  📔 DIARY ({todaysDiaryEntries.length})
                </Text>
              </View>
              {todaysDiaryEntries.map((entry) => (
                <View key={entry.id} style={styles.diaryEntry}>
                  <View style={styles.diaryMeta}>
                    <Text style={styles.diaryTime}>
                      {entry.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    <View style={styles.diaryActions}>
                      <TouchableOpacity 
                        style={styles.diaryEditBtn}
                        onPress={() => handleEditDiary(entry)}
                      >
                        <Text style={styles.diaryEditBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.diaryDeleteBtn}
                        onPress={() => {
                          Alert.alert(
                            'Delete Diary Entry',
                            'Are you sure?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await databaseService.deleteDiaryEntry(entry.id);
                                    await loadDataForDate(selectedDate);
                                    setSnackbarMessage('Diary entry deleted');
                                    setSnackbarVisible(true);
                                  } catch (error) {
                                    console.error('Failed to delete diary entry:', error);
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.diaryDeleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.diaryContent}>{entry.content}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {todaysEvents.length === 0 && todaysDiaryEntries.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                ☀️ No events logged{isToday(selectedDate) ? ' today' : ''}
              </Text>
            </View>
          )}

          {/* Quick Log Section - Horizontal scrolling pages with 2 columns × 5 rows */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>QUICK LOG</Text>
            {!buttonsSorted ? (
              // Reserve the same height a page of buttons would occupy
              // (rather than rendering nothing, which would itself cause a
              // layout jump once the real grid mounts a moment later) -
              // no button content is shown at all here rather than
              // showing DEFAULT_QUICK_TAP_BUTTONS' declared order, which
              // is exactly the "shows one order, then reshuffles" flash
              // this is fixing.
              <View style={[styles.quickLogScroll, styles.quickLogPlaceholder]}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : (
            <ScrollView
              onLayout={(e) => setMeasuredScrollWidth(e.nativeEvent.layout.width)}
              horizontal 
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.quickLogScroll}
              contentContainerStyle={styles.quickLogScrollContent}
              snapToInterval={quickLogPageWidth + QUICK_LOG_COLUMN_GAP} // page width + margin (see quickLogPage style)
              decelerationRate="fast"
            >
              {/* Create pages of 2 columns × 5 rows each */}
              {Array.from({ length: Math.ceil(sortedButtons.length / 10) }).map((_, pageIndex) => {
                const pageButtons = sortedButtons.slice(pageIndex * 10, (pageIndex + 1) * 10);
                // Split into columns - left column gets first 5, right column gets next 5
                const leftColumnButtons = pageButtons.slice(0, 5);
                const rightColumnButtons = pageButtons.slice(5, 10);
                
                return (
                  <View
                    key={`page-${pageIndex}`}
                    style={[styles.quickLogPage, { width: quickLogPageWidth, marginRight: QUICK_LOG_COLUMN_GAP }]}
                  >
                    {/* Left column (first 5 buttons) */}
                    <View style={[styles.quickLogColumn, { width: quickLogColumnWidth }]}>
                      {leftColumnButtons.map((button, index) => (
                        <View key={`page${pageIndex}-left-${index}`} style={styles.quickLogPill}>
                          <QuickTapButton
                            eventType={button.eventType}
                            label={button.label}
                            emoji={button.emoji}
                            onPress={() => handleQuickTap(button.eventType, button.label)}
                          />
                        </View>
                      ))}
                    </View>
                    {/* Right column (next 5 buttons) */}
                    <View style={[styles.quickLogColumn, { width: quickLogColumnWidth }]}>
                      {rightColumnButtons.map((button, index) => (
                        <View key={`page${pageIndex}-right-${index}`} style={styles.quickLogPill}>
                          <QuickTapButton
                            eventType={button.eventType}
                            label={button.label}
                            emoji={button.emoji}
                            onPress={() => handleQuickTap(button.eventType, button.label)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            )}
          </View>

          {/* Add Custom Event Button */}
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setCustomEventModalVisible(true)}
          >
            <Text style={styles.manualButtonText}>📝 Add Custom Event</Text>
          </TouchableOpacity>

          {/* Voice Log Button - Polished with state changes */}
          {childProfileId && (
            <VoiceLogger 
              childProfileId={childProfileId} 
              initialDate={selectedDate}
              onComplete={() => loadDataForDate(selectedDate)}
              onKeyboardVisibilityChange={setKeyboardVisible}
              onTextModeActivated={handleTextModeActivated}
            />
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>

      <QuickNotesModal
        visible={notesModalVisible}
        initialNotes={editingEvent?.notes || ''}
        onSave={handleSaveNotes}
        onCancel={() => {
          setNotesModalVisible(false);
          setEditingEvent(null);
        }}
      />

      <FullEmojiPicker
        visible={emojiPickerVisible}
        onSelect={handleEmojiSelect}
        onClose={() => {
          setEmojiPickerVisible(false);
          setEditingEventId(null);
        }}
      />

      <CustomEventModal
        visible={customEventModalVisible}
        onClose={() => setCustomEventModalVisible(false)}
        onSave={handleSaveCustomEvent}
      />

      {/* Diary Edit Modal */}
      <Modal
        visible={diaryEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelDiaryEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={-100}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.diaryEditModal}>
                  <Text style={styles.diaryEditTitle}>Edit Diary Entry</Text>
                  <View style={styles.diaryEditInputWrapper}>
                    <RNTextInput
                      multiline
                      value={diaryEditContent}
                      onChangeText={setDiaryEditContent}
                      style={styles.diaryEditInput}
                      placeholder="Edit your diary entry..."
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.diaryEditButtons}>
                    <Button
                      mode="outlined"
                      onPress={handleCancelDiaryEdit}
                      style={styles.diaryEditCancelButton}
                      color="#666"
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleSaveDiary}
                      style={styles.diaryEditSaveButton}
                      color="#4A90E2"
                    >
                      Save
                    </Button>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    // No paddingBottom override here - the ScrollView's contentContainerStyle
    // applies dynamic bottom clearance (based on the real tab bar height)
    // on top of this base padding instead. See tabBarHeight in the
    // component body for why a hardcoded value here (previously 80) was
    // enough clearance on some devices but not others.
  },
  // Date picker row - compact but larger
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20, // Increased spacing after date picker
  },
  dateLabel: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    fontWeight: '500',
  },
  dateInputButton: {
    flex: 1,
    padding: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  dateInputText: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    fontWeight: '500',
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.input,
    backgroundColor: colors.accentLight,
  },
  todayButtonText: {
    fontSize: typography.caption.fontSize,
    color: colors.accent,
    fontWeight: '600',
  },
  backfillNote: {
    textAlign: 'center',
    padding: 6,
    fontSize: typography.caption.fontSize,
    color: colors.warm,
    marginBottom: 8,
    fontWeight: '500',
  },
  // Mood strip - COMPRESSED by ~30%
  moodStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8, // Reduced from 12
    paddingHorizontal: 10, // Reduced from 14
    marginBottom: 24, // Increased spacing to next section
    borderRadius: 12, // Slightly reduced
    borderWidth: 1,
  },
  moodLabel: {
    flex: 1,
    fontSize: 14, // Reduced from bodyLarge (16)
    fontWeight: '600',
  },
  moodButtons: {
    flexDirection: 'row',
    gap: 4, // Reduced from 6
  },
  moodButton: {
    padding: 4, // Reduced from 6
    paddingHorizontal: 8, // Reduced from 10
    borderRadius: 8, // Reduced from 10
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minWidth: 36, // Reduced from 44
    minHeight: 36, // Reduced from 44
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodButtonEmoji: {
    fontSize: 16, // Reduced from 18
  },
  // Soft card - for events
  softCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 24, // Increased spacing between major sections
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  // Section container - for Quick Log - TIGHTENED and less prominent
  sectionContainer: {
    backgroundColor: 'transparent', // Remove white background for lighter feel
    borderRadius: 0, // Remove border radius
    paddingTop: 0, // Remove top padding
    paddingHorizontal: 0, // Remove horizontal padding
    paddingBottom: 0, // Remove bottom padding
    marginBottom: 8, // Reduced from 16 to move buttons up
    borderWidth: 0, // Remove border for cleaner look
  },
  sectionTitle: {
    marginBottom: 10, // Reduced from 12
    fontWeight: '700', // Bolder - changed from typography.h2.fontWeight
    fontSize: 11, // Slightly reduced from 12.5
    color: colors.text, // Black text - changed from colors.textMuted
    textTransform: typography.h2.textTransform,
    letterSpacing: typography.h2.letterSpacing,
  },
  // Horizontal scrolling container - Fixed height for 5 rows with clipPath
  quickLogScroll: {
    height: 268, // Slightly increased from 260 to prevent bottom clipping
    overflow: 'hidden', // Clip any overflow
  },
  // Shown instead of quickLogScroll's ScrollView while the frequency sort
  // is still in flight (see buttonsSorted above) - reuses quickLogScroll's
  // own height so swapping between placeholder and real content doesn't
  // shift anything else on the page up/down.
  quickLogPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLogScrollContent: {
    paddingLeft: 0, // Remove left padding to maximize space
    paddingRight: 16, // Add right padding to prevent cutoff
    alignItems: 'flex-start', // Align pages to the top
  },
  // Each "page" shows 2 columns × 5 rows - centered and equal spacing.
  // width/marginRight are NOT set here - they're computed per-render from
  // useWindowDimensions() (see quickLogPageWidth in the component body)
  // and applied as an inline style override on the View, so they always
  // reflect the actual device width instead of a hardcoded/stale value.
  quickLogPage: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: QUICK_LOG_COLUMN_GAP, // Gap between columns within a page
    paddingLeft: 0,
    paddingRight: 0,
    justifyContent: 'flex-start', // Align columns to the left
    alignItems: 'flex-start', // Align columns to the top
  },
  // width is NOT set here - see quickLogPage comment above; applied inline
  // as quickLogColumnWidth instead.
  quickLogColumn: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: 8, // Space between buttons
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  quickLogPill: {
    // Pills have fixed width from button component
  },
  eventListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dragHint: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontSize: typography.tiny.fontSize,
  },
  // Diary card
  diaryCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 24, // Normal spacing between sections
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
    ...shadows.card,
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diaryTitle: {
    margin: 0,
    fontSize: typography.bodyLarge.fontSize, // Larger
    fontWeight: '600',
    color: colors.text,
  },
  diaryEntry: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
    ...shadows.card,
  },
  diaryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diaryTime: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
    fontWeight: '600',
  },
  diaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diaryEditBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    backgroundColor: colors.accentLight,
    minHeight: 32,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diaryEditBtnText: {
    fontSize: 14,
  },
  diaryDeleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    backgroundColor: 'rgba(199,92,92,0.08)',
    minHeight: 32,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diaryDeleteBtnText: {
    fontSize: 14,
  },
  diaryContent: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    lineHeight: 20,
  },
  // Empty state
  emptyCard: {
    textAlign: 'center',
    paddingVertical: 12,
    marginBottom: 24, // Increased spacing between major sections
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: typography.bodyLarge.fontSize,
    color: colors.text,
  },
  // Manual entry button - reduced prominence
  manualButton: {
    marginHorizontal: 16, // Match Quick Log padding
    padding: 14, // Reduced from 16
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border, // Changed from accent for less prominence
    backgroundColor: colors.card, // Changed from accentLight
    marginBottom: 8, // Reduced from 12 to bring closer
    minHeight: 52, // Reduced from 56
  },
  manualButtonText: {
    color: colors.textDim, // Changed from accent for less prominence
    fontSize: typography.body.fontSize, // Reduced from bodyLarge
    fontWeight: '600', // Reduced from 700
    textAlign: 'center',
  },
  snackbar: {
    backgroundColor: colors.sage,
  },
  // Diary Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  diaryEditModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  diaryEditTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2D3436',
  },
  diaryEditInputWrapper: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginBottom: 12,
    minHeight: 200,
  },
  diaryEditInput: {
    minHeight: 200,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 22,
    color: '#2D3436',
    textAlignVertical: 'top',
  },
  diaryEditButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  diaryEditCancelButton: {
    flex: 1,
    borderColor: '#DDD',
  },
  diaryEditSaveButton: {
    flex: 1,
  },
});
