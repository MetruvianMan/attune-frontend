import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { databaseService } from '../services/database';
import { DiaryEntry } from '../models';
import { colors } from '../constants/theme';

interface DiaryViewProps {
  childProfileId: string;
}

interface GroupedEntries {
  dateKey: string;
  date: Date;
  entries: DiaryEntry[];
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  
  if (isToday) {
    return `Today - ${date.toLocaleDateString(undefined, options)}`;
  } else if (isYesterday) {
    return `Yesterday - ${date.toLocaleDateString(undefined, options)}`;
  } else {
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

export function DiaryView({ childProfileId }: DiaryViewProps) {
  const [allEntries, setAllEntries] = useState<DiaryEntry[]>([]);
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntries[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<DiaryEntry | null>(null);

  // Reload data when component becomes visible
  useFocusEffect(
    React.useCallback(() => {
      loadDiaryEntries();
    }, [childProfileId])
  );

  const loadDiaryEntries = async () => {
    const entries = await databaseService.getDiaryEntries(childProfileId);
    setAllEntries(entries);

    // Group by date
    const entriesByDate = new Map<string, DiaryEntry[]>();
    for (const entry of entries) {
      const dateKey = toDateKey(entry.date);
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, []);
      }
      entriesByDate.get(dateKey)!.push(entry);
    }

    // Sort dates descending (most recent first)
    const sortedDates = Array.from(entriesByDate.keys()).sort((a, b) => b.localeCompare(a));
    
    const grouped: GroupedEntries[] = sortedDates.map(dateKey => {
      const entries = entriesByDate.get(dateKey)!;
      // Sort entries within each day by timestamp descending
      entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return {
        dateKey,
        date: new Date(dateKey + 'T12:00:00'),
        entries,
      };
    });

    setGroupedEntries(grouped);
  };

  const handleDeletePress = (entry: DiaryEntry) => {
    setEntryToDelete(entry);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (entryToDelete) {
      await databaseService.deleteDiaryEntry(entryToDelete.id);
      setDeleteModalVisible(false);
      setEntryToDelete(null);
      loadDiaryEntries();
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setEntryToDelete(null);
  };

  if (allEntries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📔</Text>
        <Text style={styles.emptyTitle}>No Diary Entries Yet</Text>
        <Text style={styles.emptySubtitle}>
          Use Voice Log and check "Save as diary entry" to capture daily narratives without affecting event tracking.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📔 DIARY</Text>
        <Text style={styles.subtitle}>
          {allEntries.length} {allEntries.length === 1 ? 'entry' : 'entries'} across {groupedEntries.length} {groupedEntries.length === 1 ? 'day' : 'days'}
        </Text>
      </View>

      {/* Scrollable entries */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {groupedEntries.map((group) => (
          <View key={group.dateKey}>
            {/* Date header */}
            <View style={styles.dateHeader}>
              <Text style={styles.dateTitle}>
                {formatDateHeader(group.date)} <Text style={styles.entryCount}>({group.entries.length})</Text>
              </Text>
            </View>

            {/* Entries for this date */}
            {group.entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                {/* Entry header with time and delete button */}
                <View style={styles.entryHeader}>
                  <View style={styles.timeLabel}>
                    <Text style={styles.timeIcon}>🕐</Text>
                    <Text style={styles.timeText}>
                      {entry.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePress(entry)}
                  >
                    <Text style={styles.deleteButtonText}>✕ Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* Entry content */}
                <Text style={styles.entryContent}>{entry.content}</Text>
              </View>
            ))}
          </View>
        ))}
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
            {/* Warning header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>⚠️</Text>
              <Text style={styles.modalTitle}>Delete Diary Entry?</Text>
              <Text style={styles.modalSubtitle}>This action cannot be undone</Text>
            </View>

            {/* Entry preview */}
            {entryToDelete && (
              <View style={styles.previewCard}>
                <Text style={styles.previewDate}>
                  {entryToDelete.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
                  {entryToDelete.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </Text>
                <Text style={styles.previewContent} numberOfLines={6}>
                  {entryToDelete.content.length > 150
                    ? entryToDelete.content.substring(0, 150) + '...'
                    : entryToDelete.content}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelDelete}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteButton} onPress={confirmDelete}>
                <Text style={styles.confirmDeleteButtonText}>Delete Entry</Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
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
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  dateHeader: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255, 248, 225, 0.5)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 193, 7, 0.6)',
    borderRadius: 4,
  },
  dateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  entryCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '400',
  },
  entryCard: {
    marginBottom: 7,
    padding: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  timeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeIcon: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 6,
    backgroundColor: 'rgba(199, 92, 92, 0.08)',
  },
  deleteButtonText: {
    fontSize: 10,
    color: colors.danger,
    fontWeight: '600',
  },
  entryContent: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
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
    backgroundColor: 'rgba(255, 248, 225, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 150,
  },
  previewDate: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  previewContent: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
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
});
