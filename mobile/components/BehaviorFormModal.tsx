import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
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
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { BehaviorInput, TimeWindow, LimitRule } from '../models';

/**
 * BehaviorFormModal Component
 * 
 * Form for creating or editing behaviors with:
 * - Required fields: title, emoji, point value, category
 * - Optional fields: time window, limit rule, exit criteria, notes
 * 
 * Features:
 * - Emoji picker integration
 * - Category selection
 * - Time window configuration (start/end times)
 * - Limit rule configuration (daily/weekly/unlimited)
 * - Exit criteria text (up to 500 chars)
 * - Notes field
 * - Field validation before save
 * 
 * Requirements covered: 6.2, 6.3, 6.6, 6.8, 7.1, 8.1, 9.1, 9.2, 9.3, 9.4, 23.1, 23.3
 * 
 * @param visible - Whether the modal is visible
 * @param behavior - Existing behavior to edit (or null for create)
 * @param childProfileId - ID of child profile
 * @param onSave - Callback with behavior input data
 * @param onCancel - Callback to close modal
 */

interface BehaviorFormModalProps {
  visible: boolean;
  behavior?: BehaviorInput & { id?: string } | null;
  childProfileId: string;
  onSave: (input: BehaviorInput) => void;
  onCancel: () => void;
}

const EMOJI_OPTIONS = [
  '🧹', '🪥', '🛏️', '📚', '✏️', '🍎', '😊', '❤️',
  '🤝', '🙏', '🎯', '⭐', '🌟', '💪', '🎨', '🎵',
  '🏃', '⚽', '🏀', '🎮', '📱', '💻', '📖', '✍️',
  '😤', '🗣️', '😢', '😡', '📉', '⚠️', '🚫', '❌',
];

const CATEGORIES = [
  'Self-Care',
  'School',
  'Kindness',
  'Chores',
  'Social',
  'Health',
  'Creativity',
  'Working On',
];

export function BehaviorFormModal({
  visible,
  behavior,
  childProfileId,
  onSave,
  onCancel,
}: BehaviorFormModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('⭐');
  const [pointValue, setPointValue] = useState('10');
  const [category, setCategory] = useState('Self-Care');
  
  // Optional fields
  const [hasTimeWindow, setHasTimeWindow] = useState(false);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  
  const [limitFrequency, setLimitFrequency] = useState<'unlimited' | 'daily' | 'weekly'>('unlimited');
  const [maxCount, setMaxCount] = useState('3');
  
  const [exitCriteria, setExitCriteria] = useState('');
  const [notes, setNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when behavior changes
  useEffect(() => {
    if (behavior) {
      setTitle(behavior.title);
      setEmoji(behavior.emoji);
      setPointValue(behavior.pointValue.toString());
      setCategory(behavior.category);
      
      if (behavior.timeWindow) {
        setHasTimeWindow(true);
        setStartTime(behavior.timeWindow.startTime);
        setEndTime(behavior.timeWindow.endTime);
      } else {
        setHasTimeWindow(false);
      }
      
      if (behavior.limitRule) {
        setLimitFrequency(behavior.limitRule.frequency);
        setMaxCount(behavior.limitRule.maxCount?.toString() || '3');
      } else {
        setLimitFrequency('unlimited');
      }
      
      setExitCriteria(behavior.exitCriteria || '');
      setNotes(behavior.notes || '');
    } else {
      // Reset for new behavior
      setTitle('');
      setEmoji('⭐');
      setPointValue('10');
      setCategory('Self-Care');
      setHasTimeWindow(false);
      setStartTime('18:00');
      setEndTime('20:00');
      setLimitFrequency('unlimited');
      setMaxCount('3');
      setExitCriteria('');
      setNotes('');
    }
    setErrors({});
  }, [behavior, visible]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!emoji.trim()) {
      newErrors.emoji = 'Emoji is required';
    }

    const points = parseInt(pointValue);
    if (isNaN(points) || pointValue.trim() === '') {
      newErrors.pointValue = 'Point value must be a number';
    }

    if (exitCriteria.length > 500) {
      newErrors.exitCriteria = 'Exit criteria must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const input: BehaviorInput = {
      childProfileId,
      title: title.trim(),
      emoji,
      pointValue: parseInt(pointValue),
      category,
    };

    // Add optional fields
    if (hasTimeWindow) {
      input.timeWindow = { startTime, endTime };
    }

    if (limitFrequency !== 'unlimited') {
      input.limitRule = {
        frequency: limitFrequency,
        maxCount: parseInt(maxCount),
      };
    }

    if (exitCriteria.trim()) {
      input.exitCriteria = exitCriteria.trim();
    }

    if (notes.trim()) {
      input.notes = notes.trim();
    }

    onSave(input);
  };

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
                {behavior ? 'Edit Behavior' : 'New Behavior'}
              </Text>
              <IconButton icon="close" onPress={onCancel} />
            </View>

            <Divider />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                {/* Title */}
                <TextInput
                  label="Title *"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  error={!!errors.title}
                  style={styles.input}
                />
                {errors.title && (
                  <Text style={styles.errorText}>{errors.title}</Text>
                )}

                {/* Emoji Picker */}
                <Text variant="bodyMedium" style={styles.label}>
                  Emoji *
                </Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((e) => (
                    <Button
                      key={e}
                      mode={emoji === e ? 'contained' : 'outlined'}
                      onPress={() => setEmoji(e)}
                      style={styles.emojiButton}
                      labelStyle={styles.emojiLabel}
                    >
                      {e}
                    </Button>
                  ))}
                </View>
                {errors.emoji && (
                  <Text style={styles.errorText}>{errors.emoji}</Text>
                )}

                {/* Point Value */}
                <TextInput
                  label="Point Value *"
                  value={pointValue}
                  onChangeText={setPointValue}
                  mode="outlined"
                  keyboardType="numeric"
                  error={!!errors.pointValue}
                  style={styles.input}
                  placeholder="10 (earned) or -5 (working on)"
                />
                {errors.pointValue && (
                  <Text style={styles.errorText}>{errors.pointValue}</Text>
                )}

                {/* Category */}
                <Text variant="bodyMedium" style={styles.label}>
                  Category *
                </Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      mode={category === cat ? 'contained' : 'outlined'}
                      onPress={() => setCategory(cat)}
                      style={styles.categoryButton}
                      compact
                    >
                      {cat}
                    </Button>
                  ))}
                </View>

                <Divider style={styles.divider} />

                {/* Optional: Time Window */}
                <View style={styles.optionalSection}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Time Window (Optional)
                  </Text>
                  <Button
                    mode={hasTimeWindow ? 'contained' : 'outlined'}
                    onPress={() => setHasTimeWindow(!hasTimeWindow)}
                    style={styles.toggleButton}
                  >
                    {hasTimeWindow ? 'Enabled' : 'Disabled'}
                  </Button>

                  {hasTimeWindow && (
                    <View style={styles.timeWindowInputs}>
                      <TextInput
                        label="Start Time (HH:MM)"
                        value={startTime}
                        onChangeText={setStartTime}
                        mode="outlined"
                        style={[styles.input, styles.halfInput]}
                        placeholder="18:00"
                      />
                      <TextInput
                        label="End Time (HH:MM)"
                        value={endTime}
                        onChangeText={setEndTime}
                        mode="outlined"
                        style={[styles.input, styles.halfInput]}
                        placeholder="20:00"
                      />
                    </View>
                  )}
                </View>

                <Divider style={styles.divider} />

                {/* Optional: Limit Rule */}
                <View style={styles.optionalSection}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Limit Rule (Optional)
                  </Text>
                  <SegmentedButtons
                    value={limitFrequency}
                    onValueChange={(value) =>
                      setLimitFrequency(value as 'unlimited' | 'daily' | 'weekly')
                    }
                    buttons={[
                      { value: 'unlimited', label: 'Unlimited' },
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                    ]}
                    style={styles.segmentedButtons}
                  />

                  {limitFrequency !== 'unlimited' && (
                    <TextInput
                      label="Max Count"
                      value={maxCount}
                      onChangeText={setMaxCount}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.input}
                      placeholder="3"
                    />
                  )}
                </View>

                <Divider style={styles.divider} />

                {/* Optional: Exit Criteria */}
                <TextInput
                  label="Exit Criteria (Optional)"
                  value={exitCriteria}
                  onChangeText={setExitCriteria}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  placeholder="How does this behavior end? What does success look like?"
                  error={!!errors.exitCriteria}
                />
                {errors.exitCriteria && (
                  <Text style={styles.errorText}>{errors.exitCriteria}</Text>
                )}
                <Text variant="bodySmall" style={styles.helperText}>
                  {exitCriteria.length}/500 characters
                </Text>

                {/* Optional: Notes */}
                <TextInput
                  label="Notes (Optional)"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  placeholder="Any additional notes or context"
                />
              </View>
            </ScrollView>

            <Divider />

            {/* Actions */}
            <View style={styles.actions}>
              <Button mode="outlined" onPress={onCancel} style={styles.actionButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSave} style={styles.actionButton}>
                {behavior ? 'Save Changes' : 'Create Behavior'}
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
    maxHeight: '90%',
  },
  keyboardAvoid: {
    flex: 1,
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
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 8,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
    color: '#212121',
    fontWeight: '500',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  emojiButton: {
    minWidth: 50,
  },
  emojiLabel: {
    fontSize: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryButton: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  optionalSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  toggleButton: {
    marginBottom: 8,
  },
  timeWindowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  helperText: {
    color: '#757575',
    marginBottom: 8,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
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
