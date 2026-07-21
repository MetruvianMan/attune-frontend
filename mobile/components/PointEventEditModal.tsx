import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Portal,
  Surface,
  IconButton,
  Divider,
} from 'react-native-paper';
import { PointEvent } from '../models';

/**
 * PointEventEditModal Component
 * 
 * Modal for editing point event details.
 * Only allows editing:
 * - Timestamp (date and time)
 * - Notes
 * 
 * Does NOT allow editing:
 * - Behavior/reward reference
 * - Point value
 * 
 * Requirements covered: 16.2, 16.3, 16.6
 * 
 * @param visible - Whether the modal is visible
 * @param event - The point event to edit
 * @param onSave - Callback with updated event data
 * @param onCancel - Callback to close modal
 */

interface PointEventEditModalProps {
  visible: boolean;
  event: PointEvent | null;
  onSave: (id: string, updates: Partial<PointEvent>) => Promise<void>;
  onCancel: () => void;
}

export function PointEventEditModal({
  visible,
  event,
  onSave,
  onCancel,
}: PointEventEditModalProps) {
  // Form state
  const [timestamp, setTimestamp] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when event changes
  useEffect(() => {
    if (event) {
      // Format timestamp for display (ISO string for simplicity)
      const date = new Date(event.timestamp);
      setTimestamp(date.toISOString());
      setNotes(''); // Events don't currently have notes field, but we'll add support
    } else {
      setTimestamp('');
      setNotes('');
    }
    setError(null);
  }, [event, visible]);

  // Handle save
  const handleSave = async () => {
    if (!event) return;

    try {
      setSaving(true);
      setError(null);

      // Parse and validate timestamp
      const newTimestamp = new Date(timestamp);
      if (isNaN(newTimestamp.getTime())) {
        setError('Invalid date format');
        return;
      }

      // Prepare updates
      const updates: Partial<PointEvent> = {
        timestamp: newTimestamp,
      };

      // Note: The PointEvent model doesn't currently have a notes field
      // This would need to be added to the schema if required
      // For now, we'll just update the timestamp

      await onSave(event.id, updates);
      onCancel();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Format timestamp for display
  const formatDateTimeForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to format readable datetime
  const formatReadableDateTime = (date: Date) => {
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

  if (!event) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Surface style={styles.surface} elevation={4}>
            {/* Header */}
            <View style={styles.header}>
              <Text variant="titleLarge" style={styles.headerTitle}>
                Edit Point Event
              </Text>
              <IconButton icon="close" onPress={onCancel} />
            </View>

            <Divider />

            <View style={styles.content}>
              {/* Info Text */}
              <Text variant="bodyMedium" style={styles.infoText}>
                You can only edit the timestamp of this event. The behavior/reward and
                point value cannot be changed.
              </Text>

              {/* Current Timestamp Display */}
              <View style={styles.currentValueSection}>
                <Text variant="bodySmall" style={styles.label}>
                  Current Time:
                </Text>
                <Text variant="bodyLarge" style={styles.currentValue}>
                  {formatReadableDateTime(new Date(event.timestamp))}
                </Text>
              </View>

              <Divider style={styles.divider} />

              {/* Timestamp Input */}
              <Text variant="bodyMedium" style={styles.sectionLabel}>
                New Timestamp
              </Text>
              <TextInput
                label="Date and Time"
                value={timestamp}
                onChangeText={setTimestamp}
                mode="outlined"
                style={styles.input}
                placeholder="2026-07-16T10:30"
                error={!!error}
              />
              <Text variant="bodySmall" style={styles.helperText}>
                Format: YYYY-MM-DDTHH:MM (e.g., 2026-07-16T10:30)
              </Text>

              {/* Error Message */}
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Note: Notes field would go here if added to schema */}
              {/* <TextInput
                label="Notes (Optional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Add any notes about this event"
              /> */}

              {/* Warning Box */}
              <View style={styles.warningBox}>
                <Text variant="bodySmall" style={styles.warningText}>
                  ⚠️ Changing the timestamp will affect when this event appears in your
                  ledger and daily summaries.
                </Text>
              </View>
            </View>

            <Divider />

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={onCancel}
                style={styles.actionButton}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.actionButton}
                loading={saving}
                disabled={saving}
              >
                Save Changes
              </Button>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
  },
  keyboardAvoid: {
    flex: 1,
  },
  surface: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
  content: {
    padding: 24,
  },
  infoText: {
    color: '#757575',
    marginBottom: 16,
    lineHeight: 20,
  },
  currentValueSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  label: {
    color: '#757575',
    marginBottom: 4,
  },
  currentValue: {
    color: '#212121',
    fontWeight: '500',
  },
  divider: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#212121',
  },
  input: {
    marginBottom: 8,
  },
  helperText: {
    color: '#757575',
    marginBottom: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    color: '#FF9800',
    lineHeight: 18,
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
});
