import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput as RNTextInput, Modal, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Text, Button, Snackbar, TextInput } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthContext } from '../../contexts/AuthContext';
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
import { EventType, Insight, DiaryEntry, Event, ChildProfile } from '../../models';
import { colors, shadows, radius, spacing, typography } from '../../constants/theme';

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
const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue'];

// Event types that push the day toward green  
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
        score -= (event.severity ?? 3);
      }
      // neutral valence doesn't shift score
    } else {
      // Fall back to type-based valence detection
      if (RED_EVENTS.includes(event.eventType)) {
        score -= (event.severity ?? 3); // default weight 3 for unrated
      } else if (GREEN_EVENTS.includes(event.eventType)) {
        score += 2;
      }
      // neutral events don't shift the score
    }
  }
  
  if (score <= -3) return 'red';
  if (score < 3) return 'amber';
  return 'green';
}

// Default quick-tap buttons based on web app with EXACT emoji mappings
const DEFAULT_QUICK_TAP_BUTTONS = [
  { eventType: 'meltdown' as EventType, label: 'Meltdown', emoji: '🌊' },
  { eventType: 'shutdown' as EventType, label: 'Shutdown', emoji: '🔇' },
  { eventType: 'conflict' as EventType, label: 'Sibling Conflict', emoji: '⚡' },
  { eventType: 'school_incident' as EventType, label: 'School Incident', emoji: '🏫' },
  { eventType: 'school_trip' as EventType, label: 'School Trip', emoji: '🚌' },
  { eventType: 'great_day' as EventType, label: 'Great Day', emoji: '🌟' },
  { eventType: 'good_sleep' as EventType, label: 'Good Sleep', emoji: '😴' },
  { eventType: 'poor_sleep' as EventType, label: 'Poor Sleep', emoji: '😵' },
  { eventType: 'medication' as EventType, label: 'Medication Given', emoji: '💊' },
  { eventType: 'wet_bed' as EventType, label: 'Wet Bed', emoji: '🛏️' },
  { eventType: 'didnt_eat_dinner' as EventType, label: "Didn't Eat Dinner", emoji: '🍽️' },
  { eventType: 'playdate' as EventType, label: 'Playdate', emoji: '👫' },
  { eventType: 'watched_tv' as EventType, label: 'Watched TV', emoji: '📺' },
  { eventType: 'sick' as EventType, label: 'Sick', emoji: '🤒' },
  { eventType: 'family_adventure' as EventType, label: 'Family Adventure', emoji: '🎡' },
  { eventType: 'camp' as EventType, label: 'Camp', emoji: '🏕️' },
  { eventType: 'played_outside' as EventType, label: 'Played Outside', emoji: '🌳' },
  { eventType: 'good_dinner' as EventType, label: 'Good Dinner', emoji: '😋' },
  { eventType: 'drew_comics' as EventType, label: 'Drew Comics', emoji: '🦸' },
  { eventType: 'stayed_home' as EventType, label: 'Stayed Home', emoji: '🏠' },
  { eventType: 'aggression' as EventType, label: 'Aggression', emoji: '😠' },
  { eventType: 'good_breakfast' as EventType, label: 'Good Breakfast', emoji: '🍳' },
  { eventType: 'tired' as EventType, label: 'Tired', emoji: '🥱' },
  { eventType: 'fast_food' as EventType, label: 'Fast Food', emoji: '🍟' },
  { eventType: 'sports' as EventType, label: 'Sports', emoji: '🏀' },
  { eventType: 'party' as EventType, label: 'Party', emoji: '🎉' },
  { eventType: 'bounceback' as EventType, label: 'Bounceback', emoji: '🐦‍🔥' },
  { eventType: 'sugar' as EventType, label: 'Sugar', emoji: '🍬' },
  { eventType: 'poor_transitions' as EventType, label: 'Poor Transitions', emoji: '🎢' },
  { eventType: 'chores' as EventType, label: 'Chores', emoji: '🧹' },
  { eventType: 'focus' as EventType, label: 'Focus', emoji: '🔎' },
  { eventType: 'reading' as EventType, label: 'Reading', emoji: '📚' },
  { eventType: 'kindness' as EventType, label: 'Kindness', emoji: '🫶' },
  { eventType: 'overwhelm' as EventType, label: 'Overwhelm', emoji: '😢' },
  { eventType: 'naughty' as EventType, label: 'Naughty', emoji: '😈' },
  { eventType: 'refusal' as EventType, label: 'Refusal', emoji: '🙅' },
  { eventType: 'sibling_harmony' as EventType, label: 'Sibling Harmony', emoji: '🫂' },
  { eventType: 'bad_language' as EventType, label: 'Bad Language', emoji: '🤬' },
  { eventType: 'injury' as EventType, label: 'Injury', emoji: '🤕' },
  { eventType: 'sneaky' as EventType, label: 'Sneaky', emoji: '🥷' },
  { eventType: 'messy' as EventType, label: 'Messy', emoji: '🫗' },
  { eventType: 'helpful' as EventType, label: 'Helpful', emoji: '🤝🏻' },
  { eventType: 'video_games' as EventType, label: 'Video Games', emoji: '🎮' },
  { eventType: 'toilet_issue' as EventType, label: 'Toilet Issue', emoji: '🚽' },
  { eventType: 'dad_bonding' as EventType, label: 'Dad Bonding', emoji: '👨🏻' },
  { eventType: 'mom_bonding' as EventType, label: 'Mom Bonding', emoji: '👩🏼' },
  { eventType: 'travel' as EventType, label: 'Travel', emoji: '✈️' },
  { eventType: 'barfed' as EventType, label: 'Barfed', emoji: '🤮' },
  { eventType: 'vacation' as EventType, label: 'Vacation', emoji: '🌴' },
  { eventType: 'sporting_event' as EventType, label: 'Sporting Event', emoji: '🏟️' },
  { eventType: 'brave' as EventType, label: 'Brave', emoji: '🦁' },
  { eventType: 'parent_out_of_town' as EventType, label: 'Parent(s) Away', emoji: '💺' },
];

export default function TodayScreen() {
  const router = useRouter();
  const { userEmail } = useAuthContext();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [todaysEvents, setTodaysEvents] = useState<Event[]>([]);
  const [recentInsight, setRecentInsight] = useState<Insight | null>(null);
  const [todaysDiaryEntries, setTodaysDiaryEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [dayMood, setDayMood] = useState<MoodColor>('green');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isMoodOverride, setIsMoodOverride] = useState(false);
  const [customEventModalVisible, setCustomEventModalVisible] = useState(false);
  const [editingDiaryEntry, setEditingDiaryEntry] = useState<DiaryEntry | null>(null);
  const [diaryEditModalVisible, setDiaryEditModalVisible] = useState(false);
  const [diaryEditContent, setDiaryEditContent] = useState('');

  const childProfileId = activeProfile?.id || null;

  // Reload profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Today tab focused, reloading data...');
      loadActiveProfile();
      // Also reload events if we have a profile already
      if (childProfileId) {
        loadDataForDate(selectedDate);
      }
    }, [childProfileId, selectedDate])
  );

  useEffect(() => {
    if (childProfileId) {
      loadDataForDate(selectedDate);
    }
  }, [selectedDate, childProfileId]);

  const loadActiveProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      console.log('Loaded profiles:', profiles.length);
      if (profiles.length > 0) {
        console.log('Active profile:', profiles[0].id, profiles[0].displayName);
        setActiveProfile(profiles[0]); // Use first profile for now
        
        // Load profile photo
        const photos = await databaseService.getPhotosByProfileId(profiles[0].id);
        if (photos.length > 0) {
          setProfilePhotoUri(photos[0].filePath);
        }
      } else {
        console.log('No profiles found');
      }
    } catch (error) {
      console.error('Failed to load active profile:', error);
    }
  };

  const loadDataForDate = async (date: Date) => {
    if (!childProfileId) {
      console.log('loadDataForDate: No childProfileId yet');
      return;
    }

    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        console.log('Database not ready yet, skipping load');
        return;
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('Loading events for date range:', {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
        profileId: childProfileId
      });

      const events = await databaseService.getEvents({
        childProfileId,
        dateRange: { start: startOfDay, end: endOfDay },
      });
      
      console.log(`✅ Loaded ${events.length} events for ${date.toLocaleDateString()}`);
      if (events.length > 0) {
        console.log('Event types:', events.map(e => e.eventType).join(', '));
        console.log('Custom emojis:', events.map(e => e.customEmoji || 'none').join(', '));
      }
      
      // Force re-render by creating new array reference
      setTodaysEvents([...events]);
      
      // Compute mood from events
      const autoMood = computeAutoMood(events);
      setDayMood(autoMood);
      setIsMoodOverride(false); // Reset override flag when events change

      const entries = await databaseService.getDiaryEntriesByDate(childProfileId, startOfDay);
      console.log(`✅ Loaded ${entries.length} diary entries`);
      setTodaysDiaryEntries(entries);

      if (isToday(date)) {
        const insights = await databaseService.getRecentInsights(childProfileId, 1);
        if (insights.length > 0) {
          setRecentInsight(insights[0]);
        }
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
    if (isLoading || !childProfileId) {
      if (!childProfileId) {
        Alert.alert('No Profile', 'Please create a profile first in the Profile tab');
      }
      return;
    }
    
    setIsLoading(true);
    try {
      const logDate = isToday(selectedDate) ? new Date() : new Date(selectedDate.setHours(12, 0, 0, 0));
      console.log('Creating event:', { childProfileId, eventType, label, logDate });
      await eventService.createQuickTapEvent(childProfileId, eventType, label, logDate);
      // Suppress snackbar notification
      // setSnackbarMessage(`✓ ${label} logged`);
      // setSnackbarVisible(true);
      await loadDataForDate(selectedDate);
    } catch (error) {
      console.error('Failed to log event:', error);
      setSnackbarMessage('Failed to log event');
      setSnackbarVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteEvent(eventId);
              await loadDataForDate(selectedDate);
              // Suppress snackbar notification
              // setSnackbarMessage('Event deleted');
              // setSnackbarVisible(true);
            } catch (error) {
              console.error('Failed to delete event:', error);
              setSnackbarMessage('Failed to delete event');
              setSnackbarVisible(true);
            }
          },
        },
      ]
    );
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
      setSelectedDate(date);
    }
  };

  const resetToToday = () => {
    setSelectedDate(new Date());
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

  useEffect(() => {
    if (!childProfileId) {
      setSortedButtons(DEFAULT_QUICK_TAP_BUTTONS);
      return;
    }

    const sortButtonsByFrequency = async () => {
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
      } catch (error) {
        console.error('Failed to sort buttons by frequency:', error);
        setSortedButtons(DEFAULT_QUICK_TAP_BUTTONS);
      }
    };

    sortButtonsByFrequency();
  }, [childProfileId, todaysEvents]); // Re-sort when events change


  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Profile Header */}
      <ProfileHeader
        emoji="🌿"
        title="Today"
        profileName={activeProfile?.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      <ScrollView style={styles.scrollView} scrollEnabled={scrollEnabled}>
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
              setSelectedDate(date);
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
            <ScrollView 
              horizontal 
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.quickLogScroll}
              contentContainerStyle={styles.quickLogScrollContent}
              snapToInterval={396} // 376 page width + 20 margin = 396px
              decelerationRate="fast"
            >
              {/* Create pages of 2 columns × 5 rows each */}
              {Array.from({ length: Math.ceil(sortedButtons.length / 10) }).map((_, pageIndex) => {
                const pageButtons = sortedButtons.slice(pageIndex * 10, (pageIndex + 1) * 10);
                // Split into columns - left column gets first 5, right column gets next 5
                const leftColumnButtons = pageButtons.slice(0, 5);
                const rightColumnButtons = pageButtons.slice(5, 10);
                
                return (
                  <View key={`page-${pageIndex}`} style={styles.quickLogPage}>
                    {/* Left column (first 5 buttons) */}
                    <View style={styles.quickLogColumn}>
                      {leftColumnButtons.map((button, index) => (
                        <View key={`page${pageIndex}-left-${index}`} style={styles.quickLogPill}>
                          <QuickTapButton
                            eventType={button.eventType}
                            label={button.label}
                            emoji={button.emoji}
                            onPress={() => handleQuickTap(button.eventType, button.label)}
                            disabled={isLoading}
                          />
                        </View>
                      ))}
                    </View>
                    {/* Right column (next 5 buttons) */}
                    <View style={styles.quickLogColumn}>
                      {rightColumnButtons.map((button, index) => (
                        <View key={`page${pageIndex}-right-${index}`} style={styles.quickLogPill}>
                          <QuickTapButton
                            eventType={button.eventType}
                            label={button.label}
                            emoji={button.emoji}
                            onPress={() => handleQuickTap(button.eventType, button.label)}
                            disabled={isLoading}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Voice Log Button - Polished with state changes */}
          {childProfileId && (
            <VoiceLogger 
              childProfileId={childProfileId} 
              initialDate={selectedDate}
              onComplete={() => loadDataForDate(selectedDate)}
            />
          )}

          {/* Add Custom Event Button */}
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setCustomEventModalVisible(true)}
          >
            <Text style={styles.manualButtonText}>📝 Add Custom Event</Text>
          </TouchableOpacity>
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
                      textColor="#666"
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleSaveDiary}
                      style={styles.diaryEditSaveButton}
                      buttonColor="#4A90E2"
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
    paddingBottom: 80, // Sufficient padding for scrollable content
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
    marginBottom: 32, // Increased spacing to next section
    borderWidth: 0, // Remove border for cleaner look
  },
  sectionTitle: {
    marginBottom: 10, // Reduced from 12
    fontWeight: typography.h2.fontWeight,
    fontSize: 11, // Slightly reduced from 12.5
    color: colors.textMuted, // Lighter color for less prominence
    textTransform: typography.h2.textTransform,
    letterSpacing: typography.h2.letterSpacing,
  },
  // Horizontal scrolling container - Fixed height for 5 rows with clipPath
  quickLogScroll: {
    height: 268, // Slightly increased from 260 to prevent bottom clipping
    overflow: 'hidden', // Clip any overflow
  },
  quickLogScrollContent: {
    paddingLeft: 16, // Nudge all content right slightly
    alignItems: 'flex-start', // Align pages to the top
  },
  // Each "page" shows 2 columns × 5 rows - centered and equal spacing
  quickLogPage: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 20, // Gap between columns within a page
    width: 376, // Two columns (178 × 2) + gap (20) = 376px
    paddingLeft: 0,
    paddingRight: 0,
    marginRight: 20, // Same as gap - creates equal spacing to next page
    justifyContent: 'flex-start', // Align columns to the left
    alignItems: 'flex-start', // Align columns to the top
  },
  quickLogColumn: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: 8, // Space between buttons
    justifyContent: 'flex-start',
    width: 178, // Wide columns for full text visibility
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
    width: '100%',
    padding: 14, // Reduced from 16
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border, // Changed from accent for less prominence
    backgroundColor: colors.card, // Changed from accentLight
    marginBottom: 24, // Increased spacing between major sections
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
