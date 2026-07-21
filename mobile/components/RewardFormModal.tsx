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
  Switch,
  Divider,
} from 'react-native-paper';
import { RewardInput, AvailabilityRule } from '../models';

/**
 * RewardFormModal Component
 * 
 * Form for creating or editing rewards with:
 * - Required fields: title, emoji, point cost
 * - Optional fields: availability rule, parent approval toggle
 * 
 * Features:
 * - Emoji picker integration
 * - Point cost input (always positive)
 * - Availability rule selection (always/weekends only/consecutive days)
 * - Parent approval toggle
 * - Field validation before save
 * 
 * Requirements covered: 12.2, 12.3, 12.5, 12.7, 13.1, 14.1
 * 
 * @param visible - Whether the modal is visible
 * @param reward - Existing reward to edit (or null for create)
 * @param childProfileId - ID of child profile
 * @param onSave - Callback with reward input data
 * @param onCancel - Callback to close modal
 */

interface RewardFormModalProps {
  visible: boolean;
  reward?: RewardInput & { id?: string } | null;
  childProfileId: string;
  onSave: (input: RewardInput) => void;
  onCancel: () => void;
}

const EMOJI_OPTIONS = [
  '🍦', '🍕', '🍪', '🍰', '🎮', '📱', '💻', '🎬',
  '🎨', '🎵', '🎪', '🎡', '🎢', '🏖️', '🏕️', '⛺',
  '🎁', '🎉', '🎊', '🎈', '🎀', '🏆', '🥇', '⭐',
  '🚗', '🚲', '⚽', '🏀', '🎾', '🎯', '🎲', '🧩',
];

export function RewardFormModal({
  visible,
  reward,
  childProfileId,
  onSave,
  onCancel,
}: RewardFormModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [pointCost, setPointCost] = useState('20');
  const [parentApprovalRequired, setParentApprovalRequired] = useState(false);
  
  // Availability rule
  const [availabilityType, setAvailabilityType] = useState<'always' | 'weekends_only' | 'after_consecutive_days'>('always');
  const [consecutiveDays, setConsecutiveDays] = useState('3');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when reward changes
  useEffect(() => {
    if (reward) {
      setTitle(reward.title);
      setEmoji(reward.emoji);
      setPointCost(reward.pointCost.toString());
      setParentApprovalRequired(reward.parentApprovalRequired);
      
      if (reward.availabilityRule) {
        setAvailabilityType(reward.availabilityRule.type);
        setConsecutiveDays(reward.availabilityRule.consecutiveDays?.toString() || '3');
      } else {
        setAvailabilityType('always');
      }
    } else {
      // Reset for new reward
      setTitle('');
      setEmoji('🎁');
      setPointCost('20');
      setParentApprovalRequired(false);
      setAvailabilityType('always');
      setConsecutiveDays('3');
    }
    setErrors({});
  }, [reward, visible]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!emoji.trim()) {
      newErrors.emoji = 'Emoji is required';
    }

    const cost = parseInt(pointCost);
    if (isNaN(cost) || pointCost.trim() === '' || cost <= 0) {
      newErrors.pointCost = 'Point cost must be a positive number';
    }

    if (availabilityType === 'after_consecutive_days') {
      const days = parseInt(consecutiveDays);
      if (isNaN(days) || days < 1) {
        newErrors.consecutiveDays = 'Must be at least 1 day';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const input: RewardInput = {
      childProfileId,
      title: title.trim(),
      emoji,
      pointCost: parseInt(pointCost),
      parentApprovalRequired,
    };

    // Add availability rule if not "always"
    if (availabilityType !== 'always') {
      const rule: AvailabilityRule = { type: availabilityType };
      
      if (availabilityType === 'after_consecutive_days') {
        rule.consecutiveDays = parseInt(consecutiveDays);
      }
      
      input.availabilityRule = rule;
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
                {reward ? 'Edit Reward' : 'New Reward'}
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
                  placeholder="e.g., Ice cream trip, Extra screen time"
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

                {/* Point Cost */}
                <TextInput
                  label="Point Cost *"
                  value={pointCost}
                  onChangeText={setPointCost}
                  mode="outlined"
                  keyboardType="numeric"
                  error={!!errors.pointCost}
                  style={styles.input}
                  placeholder="20"
                />
                {errors.pointCost && (
                  <Text style={styles.errorText}>{errors.pointCost}</Text>
                )}
                <Text variant="bodySmall" style={styles.helperText}>
                  Point cost must be a positive number
                </Text>

                <Divider style={styles.divider} />

                {/* Availability Rule */}
                <View style={styles.optionalSection}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Availability Rule
                  </Text>
                  
                  {/* Button Group for Availability Type */}
                  <View style={styles.buttonGroup}>
                    <Button
                      mode={availabilityType === 'always' ? 'contained' : 'outlined'}
                      onPress={() => setAvailabilityType('always')}
                      style={styles.groupButton}
                      labelStyle={styles.groupButtonLabel}
                    >
                      Always
                    </Button>
                    <Button
                      mode={availabilityType === 'weekends_only' ? 'contained' : 'outlined'}
                      onPress={() => setAvailabilityType('weekends_only')}
                      style={styles.groupButton}
                      labelStyle={styles.groupButtonLabel}
                    >
                      Weekends
                    </Button>
                    <Button
                      mode={availabilityType === 'after_consecutive_days' ? 'contained' : 'outlined'}
                      onPress={() => setAvailabilityType('after_consecutive_days')}
                      style={styles.groupButton}
                      labelStyle={styles.groupButtonLabel}
                    >
                      Streak
                    </Button>
                  </View>

                  {availabilityType === 'weekends_only' && (
                    <Text variant="bodySmall" style={styles.infoText}>
                      📅 This reward can only be redeemed on Saturdays and Sundays
                    </Text>
                  )}

                  {availabilityType === 'after_consecutive_days' && (
                    <>
                      <TextInput
                        label="Consecutive Days Required"
                        value={consecutiveDays}
                        onChangeText={setConsecutiveDays}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.input}
                        placeholder="3"
                        error={!!errors.consecutiveDays}
                      />
                      {errors.consecutiveDays && (
                        <Text style={styles.errorText}>
                          {errors.consecutiveDays}
                        </Text>
                      )}
                      <Text variant="bodySmall" style={styles.infoText}>
                        ⏳ Requires {consecutiveDays} consecutive days with positive
                        point balance
                      </Text>
                    </>
                  )}
                </View>

                <Divider style={styles.divider} />

                {/* Parent Approval */}
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text variant="bodyLarge">Require Parent Approval</Text>
                    <Text variant="bodySmall" style={styles.switchHelper}>
                      Child must ask permission before redeeming
                    </Text>
                  </View>
                  <Switch
                    value={parentApprovalRequired}
                    onValueChange={setParentApprovalRequired}
                  />
                </View>
                {parentApprovalRequired && (
                  <Text variant="bodySmall" style={styles.infoText}>
                    🔒 Parent approval will be required at redemption
                  </Text>
                )}
              </View>
            </ScrollView>

            <Divider />

            {/* Actions */}
            <View style={styles.actions}>
              <Button mode="outlined" onPress={onCancel} style={styles.actionButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSave} style={styles.actionButton}>
                {reward ? 'Save Changes' : 'Create Reward'}
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
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  groupButton: {
    flex: 1,
  },
  groupButtonLabel: {
    fontSize: 12,
  },
  helperText: {
    color: '#757575',
    marginBottom: 8,
  },
  infoText: {
    color: '#2196F3',
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchHelper: {
    color: '#757575',
    marginTop: 2,
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
