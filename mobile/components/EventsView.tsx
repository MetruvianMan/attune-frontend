import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, TextInput, Text } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { databaseService } from '../services/database';
import { Event, EventType } from '../models';
import { colors } from '../constants/theme';
import { EVENT_EMOJIS, getEventLabel } from '../constants/events';

interface EventsViewProps {
  childProfileId: string;
}

type SortMode = 'day-order' | 'day-order-reversed' | 'logged-time' | 'logged-time-reversed';

export function EventsView({ childProfileId }: EventsViewProps) {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('day-order-reversed');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [childProfileId])
  );

  const loadEvents = async () => {
    const events = await databaseService.getEvents({ childProfileId });
    setAllEvents(events);
  };

  const getSortedEvents = (): Event[] => {
    const sorted = [...allEvents];
    
    switch (sortMode) {
      case 'day-order':
        // Most recent day first, last event of that day first
        return sorted.sort((a, b) => {
          const dayA = a.timestamp.toDateString();
          const dayB = b.timestamp.toDateString();
          if (dayA !== dayB) return b.timestamp.getTime() - a.timestamp.getTime();
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      
      case 'day-order-reversed':
        // Most recent day first, first event of that day first
        return sorted.sort((a, b) => {
          const dayA = a.timestamp.toDateString();
          const dayB = b.timestamp.toDateString();
          if (dayA !== dayB) return b.timestamp.getTime() - a.timestamp.getTime();
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
      
      case 'logged-time':
        // Most recently logged first
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      case 'logged-time-reversed':
        // Oldest logged first
        return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      default:
        return sorted;
    }
  };

  const getAccentColor = (eventType: EventType): string => {
    // Alert/Red events - negative behaviors and issues
    if (['meltdown', 'shutdown', 'conflict', 'school_incident', 'sick', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue'].includes(eventType)) {
      return '#EB5757';
    }
    // Positive/Green events - wellness and positive behaviors
    if (['mood', 'positive_behavior', 'great_day', 'good_dinner', 'drew_comics', 'stayed_home', 'chores', 'focus', 'reading', 'kindness', 'playdate', 'family_adventure', 'played_outside', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding'].includes(eventType)) {
      return '#7FBF9F';
    }
    // Physical events - Blue
    if (['sleep', 'good_sleep', 'poor_sleep', 'diet', 'didnt_eat_dinner', 'physical_wellness', 'wet_bed'].includes(eventType)) {
      return '#4A90E2';
    }
    // Medical - Purple
    if (eventType === 'medication') {
      return '#9b8ec4';
    }
    // Neutral - Amber
    if (['screen_time', 'watched_tv', 'fast_food', 'sugar', 'messy', 'video_games'].includes(eventType)) {
      return '#F2C94C';
    }
    // Default - Gray
    return '#B2BEC3';
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + 
      ' at ' + 
      date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const handleDeletePress = (event: Event) => {
    setEventToDelete(event);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      await databaseService.deleteEvent(eventToDelete.id);
      setDeleteModalVisible(false);
      setEventToDelete(null);
      loadEvents();
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setEventToDelete(null);
  };

  const handleEditPress = (event: Event) => {
    setEventToEdit(event);
    setEditNotes(event.notes || '');
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (eventToEdit) {
      await databaseService.updateEvent(eventToEdit.id, {
        notes: editNotes.trim() || undefined,
      });
      setEditModalVisible(false);
      setEventToEdit(null);
      setEditNotes('');
      loadEvents();
    }
  };

  const cancelEdit = () => {
    setEditModalVisible(false);
    setEventToEdit(null);
    setEditNotes('');
  };

  const sortedEvents = getSortedEvents();

  if (allEvents.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>No Events Yet</Text>
        <Text style={styles.emptySubtitle}>
          Events logged on the Today tab will appear here for easy browsing and review.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sort controls */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>SORT:</Text>
        <TouchableOpacity
          style={[
            styles.sortButton,
            (sortMode === 'day-order' || sortMode === 'day-order-reversed') && styles.sortButtonActive
          ]}
          onPress={() => setSortMode(prev => 
            prev === 'day-order' ? 'day-order-reversed' : 'day-order'
          )}
        >
          <Text style={[
            styles.sortButtonText,
            (sortMode === 'day-order' || sortMode === 'day-order-reversed') && styles.sortButtonTextActive
          ]}>
            🗓️ Day order {sortMode === 'day-order-reversed' ? '↓' : sortMode === 'day-order' ? '↑' : '↓'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.sortButton,
            (sortMode === 'logged-time' || sortMode === 'logged-time-reversed') && styles.sortButtonActive
          ]}
          onPress={() => setSortMode(prev => 
            prev === 'logged-time' ? 'logged-time-reversed' : 'logged-time'
          )}
        >
          <Text style={[
            styles.sortButtonText,
            (sortMode === 'logged-time' || sortMode === 'logged-time-reversed') && styles.sortButtonTextActive
          ]}>
            🕐 Logged time {sortMode === 'logged-time-reversed' ? '↓' : sortMode === 'logged-time' ? '↑' : '↓'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events list */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {sortedEvents.map((event) => {
          const accentColor = getAccentColor(event.eventType);
          const emoji = event.eventType === 'custom' && event.customEmoji 
            ? event.customEmoji 
            : EVENT_EMOJIS[event.eventType] || '📝';
          const label = event.eventType === 'custom' && event.customLabel 
            ? event.customLabel 
            : getEventLabel(event.eventType);

          return (
            <View key={event.id} style={[styles.eventCard, { borderLeftColor: accentColor }]}>
              {/* Header row matching web structure exactly */}
              <View style={styles.eventHeader}>
                <View style={styles.titleContainer}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{emoji} {label}</Text>
                  {event.severity && (
                    <Text style={styles.severityBadge}>severity {event.severity}/5</Text>
                  )}
                </View>
                
                <View style={styles.actionsContainer}>
                  <Text style={styles.eventTimestamp}>{formatTimestamp(event.timestamp)}</Text>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEditPress(event)}>
                    <Text style={styles.editButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePress(event)}>
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {event.notes && (
                <Text style={styles.eventNotes}>{event.notes}</Text>
              )}

              {event.tags && event.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {event.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>⚠️</Text>
              <Text style={styles.modalTitle}>Delete this event?</Text>
              <Text style={styles.modalSubtitle}>This action cannot be undone</Text>
            </View>

            {eventToDelete && (
              <View style={styles.previewCard}>
                <Text style={styles.previewText}>
                  {EVENT_EMOJIS[eventToDelete.eventType] || '📝'} {getEventLabel(eventToDelete.eventType)}
                </Text>
                <Text style={styles.previewTimestamp}>
                  {formatTimestamp(eventToDelete.timestamp)}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelDelete}>
                <Text style={styles.cancelButtonText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteButton} onPress={confirmDelete}>
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit event modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.editModalTitle}>✏️ Edit note</Text>
            
            {eventToEdit && (
              <View style={styles.editEventInfo}>
                <Text style={styles.editEventLabel}>
                  {EVENT_EMOJIS[eventToEdit.eventType] || '📝'} {getEventLabel(eventToEdit.eventType)}
                </Text>
                <Text style={styles.editEventTime}>
                  {formatTimestamp(eventToEdit.timestamp)}
                </Text>
              </View>
            )}
            
            <TextInput
              style={styles.editInput}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="What happened? Any context worth remembering..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              autoFocus
            />

            <View style={styles.editModalButtons}>
              <Button mode="outlined" onPress={cancelEdit} style={styles.editButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={saveEdit} style={styles.editButton}>
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 2,
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  sortButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textDim,
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 14,
  },
  eventCard: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: 145,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  severityBadge: {
    fontSize: 10,
    color: '#F2994A',
    marginLeft: 5,
  },
  eventTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
    flexShrink: 0,
  },
  editButton: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexShrink: 0,
  },
  editButtonText: {
    fontSize: 12,
    opacity: 0.5,
  },
  deleteButton: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 4,
    backgroundColor: 'rgba(235, 87, 87, 0.06)',
    flexShrink: 0,
  },
  deleteButtonText: {
    fontSize: 10,
    color: colors.danger,
    fontWeight: '600',
  },
  eventNotes: {
    fontSize: 13,
    color: colors.textDim,
    lineHeight: 19,
    marginTop: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 5,
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  tagText: {
    fontSize: 10,
    color: '#4A90E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  previewCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  previewTimestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  confirmDeleteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  editModalContent: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  editModalTitle: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 14,
    color: colors.text,
  },
  editEventInfo: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  editEventLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  editEventTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    lineHeight: 18,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    borderRadius: 10,
  },
});
