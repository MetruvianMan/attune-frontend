import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, Snackbar, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthContext } from '../../contexts/AuthContext';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { QuickTapButton } from '../../components/QuickTapButton';
import { InsightCard } from '../../components/InsightCard';
import { DiaryEntryCard } from '../../components/DiaryEntryCard';
import { DraggableEventList } from '../../components/DraggableEventList';
import { QuickNotesModal } from '../../components/QuickNotesModal';
import { eventService } from '../../services/event-service';
import { databaseService } from '../../services/database';
import { EventType, Insight, DiaryEntry, Event } from '../../models';

// Default quick-tap buttons based on web app
const DEFAULT_QUICK_TAP_BUTTONS = [
  { eventType: 'meltdown' as EventType, label: 'Meltdown', emoji: '😭' },
  { eventType: 'shutdown' as EventType, label: 'Shutdown', emoji: '🔇' },
  { eventType: 'conflict' as EventType, label: 'Sibling Conflict', emoji: '⚔️' },
  { eventType: 'school_incident' as EventType, label: 'School Incident', emoji: '🏫' },
  { eventType: 'great_day' as EventType, label: 'Great Day', emoji: '🌟' },
  { eventType: 'good_sleep' as EventType, label: 'Good Sleep', emoji: '😴' },
  { eventType: 'poor_sleep' as EventType, label: 'Poor Sleep', emoji: '😵' },
  { eventType: 'medication' as EventType, label: 'Medication Given', emoji: '💊' },
  { eventType: 'wet_bed' as EventType, label: 'Wet Bed', emoji: '💧' },
  { eventType: 'didnt_eat_dinner' as EventType, label: "Didn't Eat Dinner", emoji: '🚫' },
  { eventType: 'playdate' as EventType, label: 'Playdate', emoji: '🤝' },
  { eventType: 'watched_tv' as EventType, label: 'Watched TV', emoji: '📺' },
  { eventType: 'sick' as EventType, label: 'Sick', emoji: '🤒' },
  { eventType: 'family_adventure' as EventType, label: 'Family Adventure', emoji: '🚗' },
  { eventType: 'played_outside' as EventType, label: 'Played Outside', emoji: '⚽' },
  { eventType: 'good_dinner' as EventType, label: 'Good Dinner', emoji: '🍽️' },
  { eventType: 'drew_comics' as EventType, label: 'Drew Comics', emoji: '🎨' },
  { eventType: 'stayed_home' as EventType, label: 'Stayed Home', emoji: '🏠' },
  { eventType: 'aggression' as EventType, label: 'Aggression', emoji: '😡' },
  { eventType: 'good_breakfast' as EventType, label: 'Good Breakfast', emoji: '🥞' },
  { eventType: 'tired' as EventType, label: 'Tired', emoji: '😪' },
  { eventType: 'fast_food' as EventType, label: 'Fast Food', emoji: '🍔' },
  { eventType: 'sports' as EventType, label: 'Sports', emoji: '🏃' },
  { eventType: 'party' as EventType, label: 'Party', emoji: '🎉' },
  { eventType: 'bounceback' as EventType, label: 'Bounceback', emoji: '💪' },
  { eventType: 'sugar' as EventType, label: 'Sugar', emoji: '🍬' },
  { eventType: 'poor_transitions' as EventType, label: 'Poor Transitions', emoji: '🔄' },
  { eventType: 'chores' as EventType, label: 'Chores', emoji: '🧹' },
  { eventType: 'focus' as EventType, label: 'Focus', emoji: '🎯' },
  { eventType: 'reading' as EventType, label: 'Reading', emoji: '📚' },
  { eventType: 'kindness' as EventType, label: 'Kindness', emoji: '💝' },
  { eventType: 'overwhelm' as EventType, label: 'Overwhelm', emoji: '😰' },
  { eventType: 'naughty' as EventType, label: 'Naughty', emoji: '😈' },
  { eventType: 'refusal' as EventType, label: 'Refusal', emoji: '🙅' },
  { eventType: 'sibling_harmony' as EventType, label: 'Sibling Harmony', emoji: '🤗' },
  { eventType: 'bad_language' as EventType, label: 'Bad Language', emoji: '🤬' },
  { eventType: 'injury' as EventType, label: 'Injury', emoji: '🩹' },
  { eventType: 'sneaky' as EventType, label: 'Sneaky', emoji: '🕵️' },
  { eventType: 'messy' as EventType, label: 'Messy', emoji: '🗑️' },
  { eventType: 'helpful' as EventType, label: 'Helpful', emoji: '🙌' },
  { eventType: 'video_games' as EventType, label: 'Video Games', emoji: '🎮' },
  { eventType: 'toilet_issue' as EventType, label: 'Toilet Issue', emoji: '🚽' },
  { eventType: 'dad_bonding' as EventType, label: 'Dad Bonding', emoji: '👨' },
  { eventType: 'mom_bonding' as EventType, label: 'Mom Bonding', emoji: '👩' },
  { eventType: 'travel' as EventType, label: 'Travel', emoji: '✈️' },
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

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    loadDataForDate(selectedDate);
  }, [selectedDate]);

  const loadDataForDate = async (date: Date) => {
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

      const events = await databaseService.getEvents({
        childProfileId,
        dateRange: { start: startOfDay, end: endOfDay },
      });
      setTodaysEvents(events);

      const entries = await databaseService.getDiaryEntriesByDate(childProfileId, startOfDay);
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
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const logDate = isToday(selectedDate) ? new Date() : new Date(selectedDate.setHours(12, 0, 0, 0));
      await eventService.createQuickTapEvent(childProfileId, eventType, label, logDate);
      setSnackbarMessage(`✓ ${label} logged`);
      setSnackbarVisible(true);
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
              setSnackbarMessage('Event deleted');
              setSnackbarVisible(true);
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
      setSnackbarMessage('Events reordered');
      setSnackbarVisible(true);
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

  const handleSaveNotes = async (notes: string) => {
    if (!editingEvent) return;
    
    try {
      await databaseService.updateEvent(editingEvent.id, { notes });
      await loadDataForDate(selectedDate);
      setSnackbarMessage('Notes saved');
      setSnackbarVisible(true);
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

  const sortedButtons = [...DEFAULT_QUICK_TAP_BUTTONS].sort((a, b) => {
    const countA = todaysEvents.filter(e => e.eventType === a.eventType).length;
    const countB = todaysEvents.filter(e => e.eventType === b.eventType).length;
    return countB - countA;
  });


  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Header with Date Picker */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.welcome}>
                  Today 📅
                </Text>
                
                {/* Date Picker Row */}
                <View style={styles.dateRow}>
                  <Text variant="bodySmall" style={styles.dateLabel}>
                    Logging for:
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Chip style={styles.dateChip}>
                      {selectedDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })}
                    </Chip>
                  </TouchableOpacity>
                  {!isToday(selectedDate) && (
                    <Button mode="outlined" onPress={resetToToday} compact>
                      Today
                    </Button>
                  )}
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}

                {!isToday(selectedDate) && (
                  <Text variant="bodySmall" style={styles.backfillNote}>
                    📅 Backfilling for {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                )}
              </Card.Content>
            </Card>

            {/* Voice Logging Button - Prominent */}
            <Button
              mode="contained"
              icon="microphone"
              onPress={() => router.push('/voice-recording')}
              style={styles.voiceButton}
              contentStyle={styles.voiceButtonContent}
              labelStyle={styles.voiceButtonLabel}
            >
              Voice Log Events
            </Button>

            {/* Recent Insight */}
            {recentInsight && isToday(selectedDate) && (
              <View>
                <Text variant="titleMedium" style={styles.sectionHeader}>
                  Latest Insight
                </Text>
                <InsightCard insight={recentInsight} />
              </View>
            )}

            {/* Today's Events List with Drag-and-Drop */}
            {todaysEvents.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.eventListHeader}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Events ({todaysEvents.length})
                    </Text>
                    <Text variant="bodySmall" style={styles.dragHint}>
                      Hold ⠿ to reorder
                    </Text>
                  </View>
                  <View style={styles.eventListContainer}>
                    <DraggableEventList
                      events={todaysEvents}
                      onReorder={handleReorderEvents}
                      onEdit={handleEditEvent}
                      onEditDetails={handleEditDetails}
                      onDelete={handleDeleteEvent}
                      formatEventType={formatEventType}
                      getEventEmoji={getEventEmoji}
                    />
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Today's Diary Entries */}
            {todaysDiaryEntries.length > 0 && (
              <View>
                <Text variant="titleMedium" style={styles.sectionHeader}>
                  📔 Diary ({todaysDiaryEntries.length})
                </Text>
                {todaysDiaryEntries.map((entry) => (
                  <DiaryEntryCard key={entry.id} entry={entry} />
                ))}
              </View>
            )}

            {/* Empty State */}
            {todaysEvents.length === 0 && todaysDiaryEntries.length === 0 && (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    ☀️ No events logged{isToday(selectedDate) ? ' today' : ''}
                  </Text>
                  <Text variant="bodySmall" style={styles.emptyHint}>
                    Use quick-tap buttons or voice logging below
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Quick-Tap Buttons - Horizontal Scroll (EXACTLY like web app) */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Quick Log
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.buttonScrollView}
                  contentContainerStyle={styles.buttonScrollContent}
                  snapToInterval={130}
                  decelerationRate="fast"
                >
                  {sortedButtons.map((button, index) => (
                    <View key={index} style={styles.buttonWrapper}>
                      <QuickTapButton
                        eventType={button.eventType}
                        label={button.label}
                        emoji={button.emoji}
                        onPress={() => handleQuickTap(button.eventType, button.label)}
                        disabled={isLoading}
                      />
                    </View>
                  ))}
                </ScrollView>
              </Card.Content>
            </Card>

            {/* Manual Entry Button */}
            <Button
              mode="outlined"
              icon="pencil"
              onPress={() => router.push('/event-form')}
              style={styles.manualButton}
            >
              Manual Entry
            </Button>

            {/* Sync Status */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Sync Status
                </Text>
                <SyncStatusIndicator
                  showLastSync
                  showSyncButton
                />
              </Card.Content>
            </Card>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  welcome: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateLabel: {
    color: '#666',
    fontSize: 12,
  },
  dateChip: {
    backgroundColor: '#E3F2FD',
  },
  backfillNote: {
    marginTop: 8,
    color: '#F57C00',
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 4,
    fontWeight: 'bold',
    fontSize: 16,
  },
  voiceButton: {
    marginBottom: 16,
    borderRadius: 12,
  },
  voiceButtonContent: {
    paddingVertical: 8,
  },
  voiceButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dragHint: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 11,
  },
  eventListContainer: {
    minHeight: 100,
    maxHeight: 400,
  },
  emptyCard: {
    marginBottom: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
  // Horizontal scroll for quick-tap buttons (matching web app)
  buttonScrollView: {
    marginHorizontal: -12,
    marginBottom: 4,
  },
  buttonScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  buttonWrapper: {
    width: 120,
  },
  manualButton: {
    marginBottom: 16,
    borderRadius: 12,
  },
  snackbar: {
    backgroundColor: '#4CAF50',
  },
});
