import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  TextInput,
  Button,
  Surface,
  IconButton,
  Switch,
  ActivityIndicator,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRewards } from '../../contexts/RewardsContext';
import { RewardInput, AvailabilityRule } from '../../models';
import { colors, radius } from '../../constants/theme';

const EMOJI_OPTIONS = [
  '🍦', '🍕', '🍪', '🍰', '🎮', '📱', '💻', '🎬',
  '🎨', '🎵', '🎪', '🎡', '🎢', '🏖️', '🏕️', '⛺',
  '🎁', '🎉', '🎊', '🎈', '🎀', '🏆', '🥇', '⭐',
  '🚗', '🚲', '⚽', '🏀', '🎾', '🎯', '🎲', '🧩',
];

const AVAILABILITY_OPTIONS: { label: string; value: 'always' | 'weekends_only' | 'after_consecutive_days' }[] = [
  { label: 'Always', value: 'always' },
  { label: 'Weekends', value: 'weekends_only' },
  { label: 'Streak', value: 'after_consecutive_days' },
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
          <Button
            mode="contained"
            onPress={handleClose}
            style={styles.button}
            color={colors.accent}
            dark
            uppercase={false}
          >
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
                outlineColor={colors.inputBorder}
                activeOutlineColor={colors.accent}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}

              {/* Emoji Picker */}
              <Text style={styles.label}>
                Emoji
              </Text>
              
              {!showCustomEmojiInput ? (
                <>
                  <View style={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map((e) => {
                      const isSelected = emoji === e;
                      return (
                        <TouchableOpacity
                          key={e}
                          onPress={() => setEmoji(e)}
                          activeOpacity={0.7}
                          style={[styles.emojiChip, isSelected && styles.emojiChipSelected]}
                        >
                          <Text style={styles.emojiChipText}>{e}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.emoji && (
                    <Text style={styles.errorText}>{errors.emoji}</Text>
                  )}
                  <TouchableOpacity onPress={() => setShowCustomEmojiInput(true)}>
                    <Text style={styles.linkText}>✏️ Use Custom Emoji</Text>
                  </TouchableOpacity>
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
                    outlineColor={colors.inputBorder}
                    activeOutlineColor={colors.accent}
                  />
                  <Text style={styles.helperText}>
                    Paste any emoji from your keyboard
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCustomEmojiInput(false);
                      setCustomEmoji('');
                    }}
                  >
                    <Text style={styles.linkText}>← Back to Emoji Picker</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Point Cost */}
              <View style={styles.sectionSpacer}>
                {/* Static label above the field rather than react-native-
                    paper's floating `label` prop - the box is intentionally
                    narrow (it's just a short number), and the floating
                    label doesn't fit at that width without getting clipped
                    at the top edge. A plain Text label above avoids that. */}
                <Text style={styles.label}>
                  Point Cost *
                </Text>
                <TextInput
                  value={pointCost}
                  onChangeText={setPointCost}
                  mode="outlined"
                  dense
                  keyboardType="numeric"
                  error={!!errors.pointCost}
                  style={[styles.input, styles.pointValueInput]}
                  placeholder="20"
                  outlineColor={colors.inputBorder}
                  activeOutlineColor={colors.accent}
                />
                {errors.pointCost && (
                  <Text style={styles.errorText}>{errors.pointCost}</Text>
                )}
                <Text style={styles.helperText}>
                  Point cost must be a positive number
                </Text>
              </View>

              {/* Availability Rule - a single compact segmented control
                  instead of three separate Always/Weekends/Streak buttons.
                  react-native-paper v4 (the version installed here)
                  doesn't ship SegmentedButtons, so this is a small custom
                  segmented control built on the same chip colors used
                  elsewhere in the app. */}
              <View style={styles.sectionSpacer}>
                <Text style={styles.sectionTitle}>
                  Availability
                </Text>
                <View style={styles.segmentedControl}>
                  {AVAILABILITY_OPTIONS.map((option) => {
                    const isSelected = availabilityType === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setAvailabilityType(option.value)}
                        activeOpacity={0.7}
                        style={[styles.segment, isSelected && styles.segmentSelected]}
                      >
                        <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {availabilityType === 'weekends_only' && (
                  <Text style={styles.infoText}>
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
                      outlineColor={colors.inputBorder}
                      activeOutlineColor={colors.accent}
                    />
                    {errors.consecutiveDays && (
                      <Text style={styles.errorText}>
                        {errors.consecutiveDays}
                      </Text>
                    )}
                    <Text style={styles.infoText}>
                      ⏳ Requires {consecutiveDays} consecutive days with positive
                      point balance
                    </Text>
                  </>
                )}
              </View>

              {/* Parent Approval */}
              <View style={styles.sectionSpacer}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Require Parent Approval</Text>
                    <Text style={styles.switchHelper}>
                      Child must ask permission before redeeming
                    </Text>
                  </View>
                  <Switch
                    value={parentApprovalRequired}
                    onValueChange={setParentApprovalRequired}
                    color={colors.accent}
                  />
                </View>
                {parentApprovalRequired && (
                  <Text style={styles.infoText}>
                    🔒 Parent approval will be required at redemption
                  </Text>
                )}
              </View>

              {errors.submit && (
                <Text style={styles.errorText}>{errors.submit}</Text>
              )}
            </View>
          </ScrollView>

          {/* Actions - Create Reward is the clear primary action; Cancel
              is a lower-emphasis text action, not a button of equal
              visual weight. */}
          <View style={styles.actions}>
            <Button
              mode="text"
              onPress={handleClose}
              disabled={saving}
              uppercase={false}
              color={colors.textDim}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.primaryButton}
              color={colors.accent}
              dark
              loading={saving}
              disabled={saving}
              uppercase={false}
            >
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
    borderRadius: 20,
    backgroundColor: colors.bg,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    paddingBottom: 12,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 18,
    paddingTop: 4,
  },
  input: {
    marginBottom: 6,
    // Opaque background - react-native-paper's outlined TextInput needs
    // a solid color (not colors.inputBg's translucent tint) to properly
    // mask its border behind the floating label, otherwise the border
    // shows through the label text once it floats up.
    backgroundColor: colors.inputBgSolid,
  },
  // Point Cost is just a short number - no need for it to stretch the
  // full row width like text fields, or be as tall as a normal text
  // input (paired with the `dense` prop, which drops react-native-paper's
  // default 64px min-height down to 48px).
  pointValueInput: {
    width: 110,
  },
  label: {
    marginTop: 14,
    marginBottom: 10,
    color: colors.textDim,
    fontWeight: '600',
    fontSize: 13,
  },
  // Emoji grid - kept as a grid (unlike Category, this isn't a list of
  // named options) but restyled with the same soft chip look instead of
  // outlined/contained Paper buttons - subtle neutral background,
  // Attune blue ring when selected, no heavy borders.
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: radius.chip,
    backgroundColor: colors.chipBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  emojiChipText: {
    fontSize: 22,
  },
  linkText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionSpacer: {
    marginTop: 18,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.textDim,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.chipBg,
    borderRadius: radius.chip,
    padding: 3,
    marginTop: 10,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    borderRadius: radius.chip - 3,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textDim,
  },
  segmentTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  infoText: {
    color: colors.accent,
    fontSize: 12.5,
    marginTop: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -2,
    marginBottom: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchLabelText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  switchHelper: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  cancelButton: {
    marginRight: 4,
  },
  primaryButton: {
    borderRadius: radius.button,
    minWidth: 160,
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
