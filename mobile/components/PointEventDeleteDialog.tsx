import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import {
  Text,
  Button,
  Portal,
  Surface,
  Divider,
} from 'react-native-paper';
import { PointEvent, Behavior, Reward } from '../models';

/**
 * PointEventDeleteDialog Component
 * 
 * Confirmation dialog for deleting a point event.
 * Shows:
 * - Event details (behavior/reward, point value)
 * - Warning about balance recalculation
 * - Confirmation required before deletion
 * 
 * Requirements covered: 16.4, 16.5
 * 
 * @param visible - Whether the dialog is visible
 * @param event - The point event to delete
 * @param behaviors - All behaviors (for lookup)
 * @param rewards - All rewards (for lookup)
 * @param onConfirm - Callback when deletion is confirmed
 * @param onCancel - Callback to close dialog
 */

interface PointEventDeleteDialogProps {
  visible: boolean;
  event: PointEvent | null;
  behaviors: Behavior[];
  rewards: Reward[];
  onConfirm: (eventId: string) => Promise<void>;
  onCancel: () => void;
}

export function PointEventDeleteDialog({
  visible,
  event,
  behaviors,
  rewards,
  onConfirm,
  onCancel,
}: PointEventDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!event) {
    return null;
  }

  // Get behavior or reward details
  const behavior = event.behaviorId
    ? behaviors.find((b) => b.id === event.behaviorId)
    : null;
  const reward = event.rewardId
    ? rewards.find((r) => r.id === event.rewardId)
    : null;

  const emoji = behavior?.emoji || reward?.emoji || '📝';
  const title =
    behavior?.title ||
    reward?.title ||
    (event.type === 'behavior' ? 'Behavior' : 'Reward');

  // Format point value
  const formatPoints = (points: number) => {
    if (points > 0) return `+${points}`;
    return `${points}`;
  };

  // Get point color
  const getPointColor = (points: number) => {
    if (points > 0) return '#4CAF50'; // Green
    if (points < 0) return '#FF9800'; // Muted orange
    return '#757575'; // Neutral
  };

  // Format date and time
  const formatDateTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Handle confirm
  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm(event.id);
      onCancel();
    } catch (error) {
      console.error('Failed to delete point event:', error);
      alert('Failed to delete point event. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.warningEmoji}>⚠️</Text>
            <Text variant="headlineSmall" style={styles.title}>
              Delete Point Event?
            </Text>
          </View>

          <Divider />

          {/* Content */}
          <View style={styles.content}>
            {/* Event Summary */}
            <View style={styles.eventSummary}>
              <Text style={styles.eventEmoji}>{emoji}</Text>
              <View style={styles.eventDetails}>
                <Text variant="bodyLarge" style={styles.eventTitle}>
                  {title}
                </Text>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.eventPoints,
                    { color: getPointColor(event.pointValue) },
                  ]}
                >
                  {formatPoints(event.pointValue)} points
                </Text>
                <Text variant="bodySmall" style={styles.eventTime}>
                  {formatDateTime(event.timestamp)}
                </Text>
              </View>
            </View>

            {/* Warning Message */}
            <View style={styles.warningBox}>
              <Text variant="bodyMedium" style={styles.warningText}>
                This action cannot be undone. Deleting this event will:
              </Text>
              <View style={styles.warningList}>
                <Text variant="bodySmall" style={styles.warningListItem}>
                  • Remove it from the ledger
                </Text>
                <Text variant="bodySmall" style={styles.warningListItem}>
                  • Update the point balance
                </Text>
                <Text variant="bodySmall" style={styles.warningListItem}>
                  • Recalculate daily summaries
                </Text>
              </View>
            </View>

            {/* Confirmation Text */}
            <Text variant="bodyLarge" style={styles.confirmText}>
              Are you sure you want to delete this point event?
            </Text>
          </View>

          <Divider />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.actionButton}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              style={[styles.actionButton, styles.deleteButton]}
              buttonColor="#f44336"
              loading={deleting}
              disabled={deleting}
            >
              Delete
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
  },
  surface: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  warningEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212121',
  },
  content: {
    padding: 24,
  },
  eventSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  eventEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontWeight: '500',
    color: '#212121',
    marginBottom: 4,
  },
  eventPoints: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventTime: {
    color: '#757575',
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    color: '#FF9800',
    marginBottom: 8,
    fontWeight: '500',
  },
  warningList: {
    marginLeft: 8,
  },
  warningListItem: {
    color: '#FF9800',
    lineHeight: 20,
    marginBottom: 2,
  },
  confirmText: {
    textAlign: 'center',
    color: '#212121',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
  },
  deleteButton: {
    // Button color set via buttonColor prop
  },
});
