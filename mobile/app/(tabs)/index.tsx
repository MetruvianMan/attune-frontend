import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthContext } from '../../contexts/AuthContext';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { QuickTapButton } from '../../components/QuickTapButton';
import { InsightCard } from '../../components/InsightCard';
import { DiaryEntryCard } from '../../components/DiaryEntryCard';
import { DraggableEventList } from '../../components/DraggableEventList';
import { QuickNotesModal } from '../../components/QuickNotesModal';
import { ProfileHeader } from '../../components/ProfileHeader';
import { VoiceLogger } from '../../components/VoiceLogger';
import { FullEmojiPicker } from '../../components/FullEmojiPicker';
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

// Compute auto mood from events - matches web app logic exactly
function computeAutoMood(events: Event[]): MoodColor {
  if (events.length === 0) return 'green'; // no events = benefit of the doubt
  
  let score = 0; // positive = green, negative = red
  for (const event of events) {
    if (RED_EVENTS.includes(event.eventType)) {
      score -= (event.severity ?? 3); // default weight 3 for unrated
    } else if (GREEN_EVENTS.includes(event.eventType)) {
      score += 2;
    }
    // neutral events don't shift the score
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
  { eventType: 'family_adventure' as EventType, label: 'Family Adventure', emoji: '🏕️' },
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
  { eventType: 'helpful' as EventType, label: 'Helpful', emoji: '🤝' },
  { eventType: 'video_games' as EventType, label: 'Video Games', emoji: '🎮' },
  { eventType: 'toilet_issue' as EventType, label: 'Toilet Issue', emoji: '🚽' },
  { eventType: 'dad_bonding' as EventType, label: 'Dad Bonding', emoji: '👨' },
  { eventType: 'mom_bonding' as EventType, label: 'Mom Bonding', emoji: '👩' },
  { eventType: 'travel' as EventType, label: 'Travel', emoji: '✈️' },
  { eventType: 'barfed' as EventType, label: 'Barfed', emoji: '🤮' },
  { eventType: 'vacation' as EventType, label: 'Vacation', emoji: '🌴' },
  { eventType: 'sporting_event' as EventType, label: 'Sporting Event', emoji: '🏟️' },
  { eventType: 'brave' as EventType, label: 'Brave', emoji: '🦁' },
];

export default function TodayScreen() {
  const router = useRouter();
  const { userEmail } = useAuthContext();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
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
      }
      
      setTodaysEvents(events);
      
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
      await databaseService.updateEvent(editingEventId, { customEmoji: emoji });
      await loadDataForDate(selectedDate);
      setEmojiPickerVisible(false);
      setEditingEventId(null);
    } catch (error) {
      console.error('Failed to update emoji:', error);
      setSnackbarMessage('Failed to update emoji');
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
              onPress={() => {
                setTempDate(selectedDate);
                setShowDatePicker(true);
              }}
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

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setTempDate(date);
                  }
                }}
                maximumDate={new Date()}
              />
              <View style={styles.datePickerButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowDatePicker(false);
                    setTempDate(selectedDate); // Reset to original
                  }}
                  style={styles.datePickerCancelButton}
                  textColor="#666"
                  compact
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setSelectedDate(tempDate);
                    setShowDatePicker(false);
                  }}
                  style={styles.datePickerConfirmButton}
                  buttonColor="#4A90E2"
                  compact
                >
                  Confirm
                </Button>
              </View>
            </View>
          )}

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
                        onPress={() => {
                          Alert.alert('Edit Diary', 'Diary editing coming soon');
                        }}
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

          {/* Quick Log Section - Horizontal scrolling with paging */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>QUICK LOG</Text>
            <ScrollView 
              horizontal 
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.quickLogScroll}
              contentContainerStyle={styles.quickLogScrollContent}
              snapToInterval={392} // Updated: 376 (page) + 16 (margin) = 392
              decelerationRate="fast"
            >
              {/* Create pages of 2 columns × 5 rows each */}
              {Array.from({ length: Math.ceil(sortedButtons.length / 10) }).map((_, pageIndex) => {
                const pageButtons = sortedButtons.slice(pageIndex * 10, (pageIndex + 1) * 10);
                const isLastPage = pageIndex === Math.ceil(sortedButtons.length / 10) - 1;
                const hasPartialPage = isLastPage && pageButtons.length <= 5;
                
                return (
                  <View key={`page-${pageIndex}`} style={styles.quickLogPage}>
                    {hasPartialPage ? (
                      /* Single column for 5 or fewer buttons on last page */
                      <View style={styles.quickLogColumn}>
                        {pageButtons.map((button, index) => (
                          <View key={`page${pageIndex}-single-${index}`} style={styles.quickLogPill}>
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
                    ) : (
                      /* Two columns for full pages */
                      <>
                        {/* Left column (even indices within page) */}
                        <View style={styles.quickLogColumn}>
                          {pageButtons.filter((_, i) => i % 2 === 0).map((button, index) => (
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
                        {/* Right column (odd indices within page) */}
                        <View style={styles.quickLogColumn}>
                          {pageButtons.filter((_, i) => i % 2 === 1).map((button, index) => (
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
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Voice Log Button - Polished with state changes */}
          {childProfileId && (
            <VoiceLogger 
              childProfileId={childProfileId} 
              onComplete={() => loadDataForDate(selectedDate)}
            />
          )}

          {/* Manual Entry Button */}
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => router.push('/event-form')}
          >
            <Text style={styles.manualButtonText}>✏️ Manual Entry</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12, // Reduced from 14
    paddingBottom: 24,
  },
  // Date picker row - compact but larger
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8, // Reduced from 10
  },
  dateLabel: {
    fontSize: typography.body.fontSize, // Larger (was bodySmall)
    color: colors.textDim,
    fontWeight: '500',
  },
  dateInputButton: {
    flex: 1,
    padding: 10, // Larger padding
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  dateInputText: {
    fontSize: typography.body.fontSize, // Larger (was bodySmall)
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
  datePickerContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  datePickerCancelButton: {
    flex: 1,
    borderColor: '#DDD',
  },
  datePickerConfirmButton: {
    flex: 1,
  },
  backfillNote: {
    textAlign: 'center',
    padding: 6,
    fontSize: typography.caption.fontSize,
    color: colors.warm,
    marginBottom: 8,
    fontWeight: '500',
  },
  // Mood strip - prominent
  moodStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 10, // Reduced from 12
    borderRadius: 14,
    borderWidth: 1,
  },
  moodLabel: {
    flex: 1,
    fontSize: typography.bodyLarge.fontSize, // Larger
    fontWeight: '600',
  },
  moodButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  moodButton: {
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minWidth: 44, // Larger touch target
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodButtonEmoji: {
    fontSize: 18, // Larger emoji
  },
  // Soft card - for events
  softCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14, // Slightly reduced for more content
    marginBottom: 10, // Reduced from 12
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  // Section container - for Quick Log (whitish background)
  sectionContainer: {
    backgroundColor: '#FFFFFF', // White background matching web
    borderRadius: radius.card,
    paddingTop: 14, // Reduced from 16
    paddingHorizontal: 16,
    paddingBottom: 8, // Reduced bottom padding
    marginBottom: 10, // Reduced from 12
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: typography.h2.fontWeight,
    fontSize: typography.h2.fontSize,
    color: colors.textDim,
    textTransform: typography.h2.textTransform,
    letterSpacing: typography.h2.letterSpacing,
  },
  // Horizontal scrolling container - fixed height for 5 rows
  quickLogScroll: {
    height: 280, // Fixed height for exactly 5 rows (5 × 52px + gaps)
    overflow: 'hidden', // Clip content to prevent third column showing
  },
  quickLogScrollContent: {
    paddingHorizontal: 0, // Remove padding for centering
    alignItems: 'center', // Center the pages
  },
  // Each "page" shows 2 columns × 5 rows (fixed width with spacing)
  quickLogPage: {
    flexDirection: 'row',
    flexWrap: 'nowrap', // Prevent columns from wrapping
    gap: 16,
    width: 376, // 180px × 2 + 16px gap = 376px
    marginRight: 16,
    justifyContent: 'flex-start',
  },
  quickLogColumn: {
    flexDirection: 'column',
    flexWrap: 'nowrap', // Prevent buttons from wrapping within column
    gap: 8,
    justifyContent: 'flex-start',
    width: 180, // Fixed width matching button width
    flexShrink: 0, // Prevent column from shrinking
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
    backgroundColor: '#FFF9E6', // Slightly yellow tint for diary
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 12,
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
    paddingVertical: 12, // Reduced from 20
    marginBottom: 8, // Reduced from 12
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: typography.bodyLarge.fontSize, // Larger
    color: colors.text,
  },
  // Quick-tap buttons - PROMINENT (matching web emphasis)
  // Manual entry button - prominent
  manualButton: {
    width: '100%',
    padding: 16, // Larger padding
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    marginBottom: 10, // Reduced from 12
    minHeight: 56, // Larger touch target
  },
  manualButtonText: {
    color: colors.accent,
    fontSize: typography.bodyLarge.fontSize, // Larger
    fontWeight: '700',
    textAlign: 'center',
  },
  snackbar: {
    backgroundColor: colors.sage,
  },
});
