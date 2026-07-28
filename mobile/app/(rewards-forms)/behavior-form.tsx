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
  ActivityIndicator,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRewards } from '../../contexts/RewardsContext';
import { BehaviorInput, TimeWindow, LimitRule } from '../../models';

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
  const [customEmoji, setCustomEmoji] = useState('');
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
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
      // Check if emoji is in preset options
      if (!EMOJI_OPTIONS.includes(behavior.emoji)) {
        setCustomEmoji(behavior.emoji);
        setShowCustomEmojiInput(true);
      }
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

    // Use custom emoji if provided, otherwise use selected emoji
    const finalEmoji = showCustomEmojiInput && customEmoji.trim() 
      ? customEmoji.trim() 
      : emoji;

    const input: BehaviorInput = {
      childProfileId: selectedChildProfileId,
      title: title.trim(),
      emoji: finalEmoji,
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
              {behavior ? 'Edit Behavior' : 'New Behavior'}
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
                    placeholder="Paste any emoji here (e.g., 🍳)"
                  />
                  <Text variant="bodySmall" style={styles.helperText}>
                    Paste any emoji from your keyboard. Example: 🍳 for cooking
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
                <View style={styles.limitButtonGroup}>
                  <Button
                    mode={limitFrequency === 'unlimited' ? 'contained' : 'outlined'}
                    onPress={() => setLimitFrequency('unlimited')}
                    style={styles.limitButton}
                    compact
                  >
                    Unlimited
                  </Button>
                  <Button
                    mode={limitFrequency === 'daily' ? 'contained' : 'outlined'}
                    onPress={() => setLimitFrequency('daily')}
                    style={styles.limitButton}
                    compact
                  >
                    Daily
                  </Button>
                  <Button
                    mode={limitFrequency === 'weekly' ? 'contained' : 'outlined'}
                    onPress={() => setLimitFrequency('weekly')}
                    style={styles.limitButton}
                    compact
                  >
                    Weekly
                  </Button>
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
  customEmojiButton: {
    marginBottom: 12,
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
  limitButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  limitButton: {
    flex: 1,
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
