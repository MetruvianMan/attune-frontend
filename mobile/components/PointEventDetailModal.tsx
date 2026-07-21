import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import {
  Text,
  Button,
  Portal,
  Surface,
  IconButton,
  Divider,
} from 'react-native-paper';
import { PointEvent, Behavior, Reward } from '../models';
import { PointEventEditModal } from './PointEventEditModal';
import { PointEventDeleteDialog } from './PointEventDeleteDialog';

/**
 * PointEventDetailModal Component
 * 
 * Displays full point event details:
 * - Behavior/reward information
 * - Point value
 * - Timestamp
 * - Notes (if any)
 * - Edit and delete buttons
 * 
 * Requirements covered: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 * 
 * @param visible - Whether the modal is visible
 * @param event - The point event to display
 * @param behaviors - All behaviors (for lookup)
 * @param rewards - All rewards (for lookup)
 * @param onUpdateEvent - Callback to update the event
 * @param onDeleteEvent - Callback to delete the event
 * @param onClose - Callback to close modal
 */

interface PointEventDetailModalProps {
  visible: boolean;
  event: PointEvent | null;
  behaviors: Behavior[];
  rewards: Reward[];
  onUpdateEvent?: (id: string, updates: Partial<PointEvent>) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
  onClose: () => void;
}

export function PointEventDetailModal({
  visible,
  event,
  behaviors,
  rewards,
  onUpdateEvent,
  onDeleteEvent,
  onClose,
}: PointEventDetailModalProps) {
  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!event) {
    return null;
  }

  // Helper to find behavior or reward by ID
  const getBehaviorById = (id: string | undefined) =>
    behaviors.find((b) => b.id === id);
  const getRewardById = (id: string | undefined) =>
    rewards.find((r) => r.id === id);

  // Get event details
  const behavior = event.behaviorId ? getBehaviorById(event.behaviorId) : null;
  const reward = event.rewardId ? getRewardById(event.rewardId) : null;
  const emoji = behavior?.emoji || reward?.emoji || '📝';
  const title =
    behavior?.title ||
    reward?.title ||
    (event.type === 'behavior' ? 'Behavior' : 'Reward');

  // Format date and time
  const formatDateTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const dateStr = date.toLocaleDateString('en-US', dateOptions);
    const timeStr = date.toLocaleTimeString('en-US', timeOptions);
    return { date: dateStr, time: timeStr };
  };

  const { date, time } = formatDateTime(event.timestamp);

  // Handle edit
  const handleEdit = () => {
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  // Handle edit save
  const handleEditSave = async (id: string, updates: Partial<PointEvent>) => {
    if (onUpdateEvent) {
      await onUpdateEvent(id, updates);
      setShowEditModal(false);
      onClose(); // Close detail modal after edit
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async (id: string) => {
    if (onDeleteEvent) {
      await onDeleteEvent(id);
      setShowDeleteDialog(false);
      onClose(); // Close detail modal after delete
    }
  };

  // Get point color
  const getPointColor = (points: number) => {
    if (points > 0) return '#4CAF50'; // Green
    if (points < 0) return '#FF9800'; // Muted orange
    return '#757575'; // Neutral
  };

  // Format point value with sign
  const formatPoints = (points: number) => {
    if (points > 0) return `+${points}`;
    return `${points}`;
  };

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onClose}
          contentContainerStyle={styles.modalContainer}
        >
        <Surface style={styles.surface} elevation={4}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Event Details
            </Text>
            <IconButton icon="close" onPress={onClose} />
          </View>

          <Divider />

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              {/* Emoji and Title */}
              <View style={styles.titleSection}>
                <Text style={styles.emoji}>{emoji}</Text>
                <Text variant="headlineSmall" style={styles.title}>
                  {title}
                </Text>
              </View>

              {/* Point Value Badge */}
              <View style={styles.pointBadge}>
                <Text
                  variant="displaySmall"
                  style={[
                    styles.pointValue,
                    { color: getPointColor(event.pointValue) },
                  ]}
                >
                  {formatPoints(event.pointValue)} points
                </Text>
              </View>

              <Divider style={styles.divider} />

              {/* Event Type */}
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Type:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {event.type === 'behavior' ? '⭐ Behavior' : '🎁 Redemption'}
                </Text>
              </View>

              {/* Date */}
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Date:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {date}
                </Text>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Time:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {time}
                </Text>
              </View>

              {/* Parent ID (if applicable) */}
              {event.parentId && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.label}>
                    Logged by:
                  </Text>
                  <Text variant="bodyMedium" style={styles.value}>
                    Parent
                  </Text>
                </View>
              )}

              {/* Behavior/Reward Details */}
              {behavior && (
                <>
                  <Divider style={styles.divider} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Behavior Details
                  </Text>
                  <View style={styles.detailRow}>
                    <Text variant="bodyMedium" style={styles.label}>
                      Category:
                    </Text>
                    <Text variant="bodyMedium" style={styles.value}>
                      {behavior.category}
                    </Text>
                  </View>
                  {behavior.exitCriteria && (
                    <View style={styles.detailColumn}>
                      <Text variant="bodyMedium" style={styles.label}>
                        Exit Criteria:
                      </Text>
                      <Text variant="bodySmall" style={styles.notes}>
                        {behavior.exitCriteria}
                      </Text>
                    </View>
                  )}
                  {behavior.notes && (
                    <View style={styles.detailColumn}>
                      <Text variant="bodyMedium" style={styles.label}>
                        Notes:
                      </Text>
                      <Text variant="bodySmall" style={styles.notes}>
                        {behavior.notes}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {reward && (
                <>
                  <Divider style={styles.divider} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Reward Details
                  </Text>
                  <View style={styles.detailRow}>
                    <Text variant="bodyMedium" style={styles.label}>
                      Cost:
                    </Text>
                    <Text variant="bodyMedium" style={styles.value}>
                      {reward.pointCost} points
                    </Text>
                  </View>
                  {reward.parentApprovalRequired && (
                    <View style={styles.detailRow}>
                      <Text variant="bodyMedium" style={styles.label}>
                        Approval:
                      </Text>
                      <Text variant="bodyMedium" style={styles.value}>
                        🔒 Required
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>

          <Divider />

          {/* Actions */}
          <View style={styles.actions}>
            {onDeleteEvent && (
              <Button
                mode="outlined"
                onPress={handleDelete}
                style={styles.deleteButton}
                textColor="#f44336"
              >
                Delete
              </Button>
            )}
            <View style={styles.rightActions}>
              {onUpdateEvent && (
                <Button
                  mode="outlined"
                  onPress={handleEdit}
                  style={styles.actionButton}
                >
                  Edit
                </Button>
              )}
              <Button
                mode="contained"
                onPress={onClose}
                style={styles.actionButton}
              >
                Close
              </Button>
            </View>
          </View>
        </Surface>
      </Modal>
    </Portal>

      {/* Edit Modal */}
      <PointEventEditModal
        visible={showEditModal}
        event={event}
        onSave={handleEditSave}
        onCancel={() => setShowEditModal(false)}
      />

      {/* Delete Dialog */}
      <PointEventDeleteDialog
        visible={showDeleteDialog}
        event={event}
        behaviors={behaviors}
        rewards={rewards}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    maxHeight: '90%',
  },
  surface: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollView: {
    maxHeight: 500,
  },
  content: {
    padding: 24,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pointBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  pointValue: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#212121',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailColumn: {
    marginBottom: 12,
  },
  label: {
    color: '#757575',
    fontWeight: '500',
  },
  value: {
    color: '#212121',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  notes: {
    color: '#212121',
    marginTop: 4,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minWidth: 80,
  },
});
