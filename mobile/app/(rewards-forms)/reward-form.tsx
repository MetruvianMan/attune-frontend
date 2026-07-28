import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  TextInput,
  Button,
  Surface,
  IconButton,
  Divider,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRewards } from '../../contexts/RewardsContext';
import { RewardInput, AvailabilityRule } from '../../models';

const EMOJI_OPTIONS = [
  '🍦', '🍕', '🍪', '🍰', '🎮', '📱', '💻', '🎬',
  '🎨', '🎵', '🎪', '🎡', '🎢', '🏖️', '🏕️', '⛺',
  '🎁', '🎉', '🎊', '🎈', '🎀', '🏆', '🥇', '⭐',
  '🚗', '🚲', '⚽', '🏀', '🎾', '🎯', '🎲', '🧩',
];

/**
 * Reward Form Screen
 * Full-screen form for creating or editing a reward
 */
export default function RewardFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { createReward, updateReward, rewards, selectedChildProfileId, loading } = useRewards();
  
  // Form state
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [customEmoji, setCustomEmoji] = useState('');
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [pointCost, setPointCost] = useState('20');
  const [parentApprovalRequired, setParentApprovalRequired] = useState(false);
  
  // Availability rule
  const [availabilityType, setAvailabilityType] = useState<'always' | 'weekends_only' | 'after_consecutive_days'>('always');
  const [consecutiveDays, setConsecutiveDays] = useState('3');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // If rewardId is provided, we're editing
  const rewardId = params.rewardId as string | undefined;
  const reward = rewardId ? rewards.find(r => r.id === rewardId) : null;

  // Initialize form when reward changes
  useEffect(() => {
    if (reward) {
      setTitle(reward.title);
      setEmoji(reward.emoji);
      // Check if emoji is in preset options
      if (!EMOJI_OPTIONS.includes(reward.emoji)) {
        setCustomEmoji(reward.emoji);
        setShowCustomEmojiInput(true);
      }
      setPointCost(reward.pointCost.toString());
      setParentApprovalRequired(reward.parentApprovalRequired);
      
      if (reward.availabilityRule) {
        setAvailabilityType(reward.availabilityRule.type);
        setConsecutiveDays(reward.availabilityRule.consecutiveDays?.toString() || '3');
      } else {
        setAvailabilityType('always');
      }
    }
  }, [reward]);

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
    if (!validate() || !selectedChildProfileId) {
      return;
    }

    // Use custom emoji if provided, otherwise use selected emoji
    const finalEmoji = showCustomEmojiInput && customEmoji.trim() 
      ? customEmoji.trim() 
      : emoji;

    const input: RewardInput = {
      childProfileId: selectedChildProfileId,
      title: title.trim(),
      emoji: finalEmoji,
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

    // Navigate back immediately - optimistic UI will handle the update
    router.back();
    
    // Fire save operation in background (don't await, don't catch)
    if (rewardId && reward) {
      updateReward(rewardId, input).catch(err => {
        console.error('Failed to update reward:', err);
      });
    } else {
      createReward(input).catch(err => {
        console.error('Failed to create reward:', err);
      });
    }
  };

  const handleClose = () => {
    router.back();
  };

  // Show loading state
  if (loading && !selectedChildProfileId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if no child profile
  if (!selectedChildProfileId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text variant="titleLarge" style={styles.errorTitle}>No Child Selected</Text>
          <Text style={styles.errorText}>Please select a child profile first.</Text>
          <Button mode="contained" onPress={handleClose} style={styles.button}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <IconButton icon="close" onPress={handleClose} />
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
              
              {!showCustomEmojiInput ? (
                <>
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
                  <Button
                    mode="outlined"
                    onPress={() => setShowCustomEmojiInput(true)}
                    style={styles.customEmojiButton}
                    icon="pencil"
                    compact
                  >
                    Use Custom Emoji
                  </Button>
                </>
              ) : (
                <>
                  <TextInput
                    label="Custom Emoji"
                    value={customEmoji}
                    onChangeText={setCustomEmoji}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Paste any emoji here (e.g., 🎮)"
                  />
                  <Text variant="bodySmall" style={styles.helperText}>
                    Paste any emoji from your keyboard
                  </Text>
                  <Button
                    mode="text"
                    onPress={() => {
                      setShowCustomEmojiInput(false);
                      setCustomEmoji('');
                    }}
                    compact
                  >
                    ← Back to Emoji Picker
                  </Button>
                </>
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
                    compact
                  >
                    Always
                  </Button>
                  <Button
                    mode={availabilityType === 'weekends_only' ? 'contained' : 'outlined'}
                    onPress={() => setAvailabilityType('weekends_only')}
                    style={styles.groupButton}
                    compact
                  >
                    Weekends
                  </Button>
                  <Button
                    mode={availabilityType === 'after_consecutive_days' ? 'contained' : 'outlined'}
                    onPress={() => setAvailabilityType('after_consecutive_days')}
                    style={styles.groupButton}
                    compact
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

              {errors.submit && (
                <Text style={styles.errorText}>{errors.submit}</Text>
              )}
            </View>
          </ScrollView>

          <Divider />

          {/* Actions */}
          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleClose} style={styles.actionButton} disabled={saving}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSave} style={styles.actionButton} loading={saving} disabled={saving}>
              {reward ? 'Save Changes' : 'Create Reward'}
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoid: {
    flex: 1,
    padding: 20,
  },
  surface: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flex: 1,
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
    flex: 1,
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
  customEmojiButton: {
    marginBottom: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  errorTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  button: {
    minWidth: 120,
  },
});
