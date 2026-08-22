import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Text, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { colors } from '../constants/theme';
import { EMOJI_CATEGORIES } from './CustomEventModal';

export type CustomQuickLogMode = 'behavior' | 'reward';

interface CustomQuickLogModalProps {
  visible: boolean;
  mode: CustomQuickLogMode;
  onClose: () => void;
  onSave: (data: {
    title: string;
    emoji: string;
    points: number;
    savePermanently: boolean;
  }) => void;
}

/**
 * CustomQuickLogModal
 *
 * The Rewards tab equivalent of the Today tab's CustomEventModal: lets a
 * parent log a one-off behavior or reward that isn't already in the Quick
 * Log/Quick Redeem carousel. Always results in an immediately-logged point
 * event; the "Save to Quick Log"/"Save to Quick Redeem" checkbox controls
 * whether the underlying Behavior/Reward record sticks around afterward
 * (shows up in Manage / future Quick Log) or gets archived right after
 * logging. Either way, the point event's own snapshotEmoji/snapshotLabel
 * (see PointEvent model) preserve the emoji/title in history regardless.
 */
export function CustomQuickLogModal({ visible, mode, onClose, onSave }: CustomQuickLogModalProps) {
  const isReward = mode === 'reward';

  const [title, setTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(isReward ? '🎁' : '⭐');
  const [points, setPoints] = useState(isReward ? '20' : '10');
  const [savePermanently, setSavePermanently] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');

  const resetForm = () => {
    setTitle('');
    setSelectedEmoji(isReward ? '🎁' : '⭐');
    setPoints(isReward ? '20' : '10');
    setSavePermanently(false);
    setSelectedCategory(0);
    setShowCustomEmojiInput(false);
    setCustomEmoji('');
  };

  const parsedPoints = parseInt(points, 10);
  // When the custom-emoji input is open, that field's value is what actually
  // gets saved (falls back to selectedEmoji only if left blank), matching
  // the pattern used in behavior-form.tsx/reward-form.tsx.
  const finalEmoji = showCustomEmojiInput && customEmoji.trim() ? customEmoji.trim() : selectedEmoji;
  // Rewards always cost a positive number of points. Behaviors can be
  // negative (demerits/"working on" behaviors) - see behavior-form.tsx's
  // Point Value field, which supports the same thing.
  const isValid = title.trim().length > 0 && !isNaN(parsedPoints) && (isReward ? parsedPoints > 0 : parsedPoints !== 0);

  const handleSave = () => {
    if (!isValid) {
      return;
    }
    onSave({
      title: title.trim(),
      emoji: finalEmoji,
      points: parsedPoints,
      savePermanently,
    });
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Points input sits near the bottom of this modal - without this,
        // the keyboard opening (especially the taller
        // numbers-and-punctuation keyboard used for behaviors) covers it
        // entirely with no way to see what's being typed. Wraps the whole
        // overlay/card rather than just the ScrollView so the card shifts
        // up as one unit instead of just its inner content scrolling
        // underneath a keyboard that's still covering the visible area.
      >
        <View style={styles.modalCard}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={styles.title}>
              {isReward ? '🎁 Custom Reward' : '⭐ Custom Behavior'}
            </Text>

            {/* What is it input */}
            <Text style={styles.sectionLabel}>
              {isReward ? 'WHAT ARE THEY REDEEMING?' : 'WHAT DID THEY DO?'}
            </Text>
            <View style={styles.labelRow}>
              <Text style={styles.emojiPreview}>{finalEmoji}</Text>
              <TextInput
                style={styles.labelInput}
                value={title}
                onChangeText={setTitle}
                placeholder={isReward ? 'e.g. Extra screen time' : 'e.g. Helped a neighbor'}
                placeholderTextColor="#999"
              />
            </View>

            {/* Emoji picker */}
            <Text style={styles.sectionLabel}>CHOOSE AN EMOJI</Text>

            {!showCustomEmojiInput ? (
              <>
                {/* Category tabs - horizontal scroll */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryTabsContainer}
                  contentContainerStyle={styles.categoryTabsContent}
                >
                  {EMOJI_CATEGORIES.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.categoryTab,
                        selectedCategory === index && styles.categoryTabActive
                      ]}
                      onPress={() => setSelectedCategory(index)}
                    >
                      <Text style={styles.categoryTabIcon}>{category.icon}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Emoji grid - scrollable container */}
                <ScrollView
                  style={styles.emojiGridContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.emojiGrid}>
                    {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.emojiButton,
                          selectedEmoji === emoji && styles.emojiButtonSelected
                        ]}
                        onPress={() => setSelectedEmoji(emoji)}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Any emoji beyond this curated list is one tap away via
                    the iOS/Android keyboard's own emoji key - cheaper and
                    more complete than bundling the full Unicode emoji set. */}
                <TouchableOpacity
                  style={styles.customEmojiToggle}
                  onPress={() => setShowCustomEmojiInput(true)}
                >
                  <Text style={styles.customEmojiToggleText}>⌨️ Use any emoji from your keyboard</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.labelInput}
                  value={customEmoji}
                  onChangeText={setCustomEmoji}
                  placeholder="Tap here, then use your keyboard's emoji key"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.customEmojiToggle}
                  onPress={() => {
                    setShowCustomEmojiInput(false);
                    setCustomEmoji('');
                  }}
                >
                  <Text style={styles.customEmojiToggleText}>← Back to emoji picker</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Points input */}
            <Text style={styles.sectionLabel}>
              {isReward ? 'POINT COST' : 'POINTS EARNED'}
            </Text>
            {/* "number-pad" has no minus/dash key at all, which made it
                impossible to type a negative point value for a custom
                demerit behavior (e.g. -5) even though isValid above
                allows it. "numbers-and-punctuation" includes a dash -
                only needed for behaviors, since reward point costs are
                always positive. Matches the fix already applied to
                behavior-form.tsx's Point Value field. */}
            <TextInput
              style={styles.pointsInput}
              value={points}
              onChangeText={setPoints}
              keyboardType={isReward ? 'number-pad' : 'numbers-and-punctuation'}
              placeholder={isReward ? '20' : '10 (earned) or -5 (working on)'}
              placeholderTextColor="#999"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            {/* Save permanently toggle */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSavePermanently(!savePermanently)}
            >
              <View style={[
                styles.checkbox,
                savePermanently && styles.checkboxChecked
              ]}>
                {savePermanently && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                {isReward
                  ? 'Save to Quick Redeem'
                  : 'Save to Quick Log'}
              </Text>
            </TouchableOpacity>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={handleClose}
                style={styles.cancelButton}
                labelStyle={styles.cancelButtonText}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveButton}
                buttonColor="#4A90E2"
                labelStyle={styles.saveButtonText}
                disabled={!isValid}
              >
                Log It
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  scrollView: {
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  emojiPreview: {
    fontSize: 19,
    flexShrink: 0,
  },
  labelInput: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 12,
    color: colors.text,
    backgroundColor: 'white',
  },
  categoryTabsContainer: {
    marginBottom: 6,
  },
  categoryTabsContent: {
    gap: 4,
    paddingBottom: 6,
  },
  categoryTab: {
    height: 28,
    minWidth: 32,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#4A90E2',
  },
  categoryTabIcon: {
    fontSize: 16,
  },
  emojiGridContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    maxHeight: 156,
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    padding: 6,
  },
  emojiButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.12)',
  },
  emojiText: {
    fontSize: 18,
  },
  customEmojiToggle: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
  },
  customEmojiToggleText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
  },
  pointsInput: {
    width: '100%',
    padding: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 13,
    color: colors.text,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },
  checkmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    lineHeight: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 11.5,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
