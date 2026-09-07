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
import { BehaviorInput, TimeWindow, LimitRule } from '../../models';
import { CategorizedEmojiPicker } from '../../components/CategorizedEmojiPicker';
import { colors, radius } from '../../constants/theme';

// Small emoji per category, purely cosmetic (does not change the stored
// category string) - makes the chip row feel less like a settings form.
const CATEGORIES: { label: string; emoji: string }[] = [
  { label: 'Self-Care', emoji: '🧼' },
  { label: 'School', emoji: '🎒' },
  { label: 'Kindness', emoji: '💛' },
  { label: 'Chores', emoji: '🧹' },
  { label: 'Social', emoji: '🧑\u200d🤝\u200d🧑' },
  { label: 'Health', emoji: '🩺' },
  { label: 'Creativity', emoji: '🎨' },
  { label: 'Working On', emoji: '🌱' },
];

const LIMIT_OPTIONS: { label: string; value: 'unlimited' | 'daily' | 'weekly' }[] = [
  { label: 'Unlimited', value: 'unlimited' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

/**
 * Behavior Form Screen
 * Full-screen form for creating or editing a behavior
 */
export default function BehaviorFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { createBehavior, updateBehavior, behaviors, selectedChildProfileId, loading } = useRewards();
  
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // If behaviorId is provided, we're editing
  const behaviorId = params.behaviorId as string | undefined;
  const behavior = behaviorId ? behaviors.find(b => b.id === behaviorId) : null;

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
      }
      
      if (behavior.limitRule) {
        setLimitFrequency(behavior.limitRule.frequency);
        setMaxCount(behavior.limitRule.maxCount?.toString() || '3');
      }
      
      setExitCriteria(behavior.exitCriteria || '');
      setNotes(behavior.notes || '');
    }
  }, [behavior]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
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

  const handleSave = () => {
    if (!validate() || !selectedChildProfileId) {
      return;
    }

    const input: BehaviorInput = {
      childProfileId: selectedChildProfileId,
      title: title.trim(),
      emoji,
      pointValue: parseInt(pointValue),
      category,
    };

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

    // Navigate back immediately - optimistic UI will handle the update
    router.back();
    
    // Fire save operation in background (don't await, don't catch)
    if (behaviorId && behavior) {
      updateBehavior(behaviorId, input).catch(err => {
        console.error('Failed to update behavior:', err);
      });
    } else {
      createBehavior(input).catch(err => {
        console.error('Failed to create behavior:', err);
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
              {behavior ? 'Edit Behavior' : 'New Behavior'}
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
                outlineColor={colors.inputBorder}
                activeOutlineColor={colors.accent}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}

              {/* Emoji Picker - shared category-tabbed picker, same
                  experience as the Custom Behavior quick-log modal
                  (CustomQuickLogModal.tsx via CategorizedEmojiPicker),
                  instead of a flat 32-button grid. */}
              <View style={styles.emojiLabelRow}>
                <Text style={styles.label}>
                  Emoji
                </Text>
                {/* Framed in a circle with a "Selected" caption so it
                    unambiguously reads as "here's your current pick" -
                    without a label it looked like an unexplained loose
                    element, especially when the grid below is scrolled to
                    a different category than the current selection. */}
                <View style={styles.emojiPreviewContainer}>
                  <View style={styles.emojiPreviewCircle}>
                    <Text style={styles.emojiPreview}>{emoji}</Text>
                  </View>
                  <Text style={styles.emojiPreviewLabel}>Selected</Text>
                </View>
              </View>
              <CategorizedEmojiPicker
                selectedEmoji={emoji}
                onSelectEmoji={setEmoji}
              />

              {/* Point Value */}
              {/* Static label above the field rather than react-native-
                  paper's floating `label` prop - the box is intentionally
                  narrow (it's just a short number), and the floating label
                  doesn't fit at that width without getting clipped at the
                  top edge. A plain Text label above avoids that and
                  matches the Category label's styling below. */}
              <Text style={styles.label}>
                Point Value *
              </Text>
              {/* keyboardType="numeric" shows iOS's Number Pad, which has
                  no minus/dash key at all - making it impossible to type a
                  negative point value (used for demerit/"working on"
                  behaviors) even though the model and validation already
                  support negatives. "numbers-and-punctuation" shows the
                  keyboard that includes a dash, at the cost of also
                  showing letter keys up top (still fine for a numeric
                  field - users just tap the number row). */}
              <TextInput
                value={pointValue}
                onChangeText={setPointValue}
                mode="outlined"
                dense
                keyboardType="numbers-and-punctuation"
                error={!!errors.pointValue}
                style={[styles.input, styles.pointValueInput]}
                placeholder="10 or -5"
                outlineColor={colors.inputBorder}
                activeOutlineColor={colors.accent}
              />
              {errors.pointValue && (
                <Text style={styles.errorText}>{errors.pointValue}</Text>
              )}

              {/* Category - compact rounded chips instead of rectangular
                  uppercase buttons. Title case, subtle neutral background
                  when unselected, Attune blue + white text when selected -
                  same chip visual language already used in
                  event-form.tsx/relationship-form.tsx. A small emoji per
                  category is purely cosmetic and doesn't change the
                  stored category string. */}
              <Text style={styles.label}>
                Category
              </Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.label}
                      onPress={() => setCategory(cat.label)}
                      activeOpacity={0.7}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {cat.emoji} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional: Time Window - a single switch instead of a
                  "Disabled"/"Enabled" button, with the time inputs only
                  appearing once enabled. */}
              <View style={styles.sectionSpacer}>
                <View style={styles.switchRow}>
                  <Text style={styles.sectionTitle}>
                    Time Window
                  </Text>
                  <Switch
                    value={hasTimeWindow}
                    onValueChange={setHasTimeWindow}
                    color={colors.accent}
                  />
                </View>

                {hasTimeWindow && (
                  <View style={styles.timeWindowInputs}>
                    <TextInput
                      label="Start Time (HH:MM)"
                      value={startTime}
                      onChangeText={setStartTime}
                      mode="outlined"
                      style={[styles.input, styles.halfInput]}
                      placeholder="18:00"
                      outlineColor={colors.inputBorder}
                      activeOutlineColor={colors.accent}
                    />
                    <TextInput
                      label="End Time (HH:MM)"
                      value={endTime}
                      onChangeText={setEndTime}
                      mode="outlined"
                      style={[styles.input, styles.halfInput]}
                      placeholder="20:00"
                      outlineColor={colors.inputBorder}
                      activeOutlineColor={colors.accent}
                    />
                  </View>
                )}
              </View>

              {/* Optional: Earning Limit (was "Limit Rule") - a single
                  compact segmented control instead of three separate
                  buttons. react-native-paper v4 (the version installed
                  here) doesn't ship SegmentedButtons, so this is a small
                  custom segmented control built on the same chip colors. */}
              <View style={styles.sectionSpacer}>
                <Text style={styles.sectionTitle}>
                  Earning Limit
                </Text>
                <View style={styles.segmentedControl}>
                  {LIMIT_OPTIONS.map((option) => {
                    const isSelected = limitFrequency === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setLimitFrequency(option.value)}
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

                {limitFrequency !== 'unlimited' && (
                  <TextInput
                    label="Max Count"
                    value={maxCount}
                    onChangeText={setMaxCount}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="3"
                    outlineColor={colors.inputBorder}
                    activeOutlineColor={colors.accent}
                  />
                )}
              </View>

              {/* Optional: Exit Criteria */}
              <View style={styles.sectionSpacer}>
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
                  outlineColor={colors.inputBorder}
                  activeOutlineColor={colors.accent}
                />
                {errors.exitCriteria && (
                  <Text style={styles.errorText}>{errors.exitCriteria}</Text>
                )}
                <Text style={styles.helperText}>
                  {exitCriteria.length}/500 characters
                </Text>
              </View>

              {/* Optional: Notes */}
              <View style={styles.sectionSpacer}>
                <TextInput
                  label="Notes (Optional)"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  placeholder="Any additional notes or context"
                  outlineColor={colors.inputBorder}
                  activeOutlineColor={colors.accent}
                />
              </View>

              {errors.submit && (
                <Text style={styles.errorText}>{errors.submit}</Text>
              )}
            </View>
          </ScrollView>

          {/* Actions - Create Behavior is the clear primary action;
              Cancel is a lower-emphasis text action, not a button of
              equal visual weight. */}
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
              {behavior ? 'Save Changes' : 'Create Behavior'}
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
  halfInput: {
    flex: 1,
  },
  // Point Value is just a short number - no need for it to stretch the
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
  emojiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emojiPreviewContainer: {
    alignItems: 'center',
  },
  emojiPreviewCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPreview: {
    fontSize: 20,
  },
  emojiPreviewLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  // Category chips - rounded, title case, subtle neutral when unselected,
  // Attune blue + white text when selected. Same visual language as the
  // chip pattern already used in event-form.tsx/relationship-form.tsx.
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderRadius: radius.chip,
    minHeight: 36,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionSpacer: {
    marginTop: 18,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.textDim,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeWindowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  // Segmented control replacing the three separate Unlimited/Daily/Weekly
  // buttons - a single pill-shaped track with one moving selected segment.
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
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -2,
    marginBottom: 6,
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
