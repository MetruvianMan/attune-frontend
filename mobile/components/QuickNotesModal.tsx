import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

interface QuickNotesModalProps {
  visible: boolean;
  initialNotes: string;
  // Point value editing is optional - callers that only want the notes
  // field (if any exist) can omit these and the point value row won't
  // render at all. RewardsTabScreen's Daily Activity entry always passes
  // both, since editing a single logged instance's points (e.g. a one-off
  // "+5 bonus for great homework today") is a first-class use of this
  // modal now, not just notes.
  initialPointValue?: number;
  onSave: (notes: string, pointValue?: number) => void;
  onCancel: () => void;
}

export function QuickNotesModal({
  visible,
  initialNotes,
  initialPointValue,
  onSave,
  onCancel,
}: QuickNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  // Kept as text while editing (so an in-progress "-" or empty field
  // doesn't get force-parsed into 0 on every keystroke) - only parsed to a
  // number in handleSave.
  const [pointValueText, setPointValueText] = useState(
    initialPointValue !== undefined ? String(initialPointValue) : ''
  );

  // Sync notes with initialNotes whenever modal opens or initialNotes changes
  useEffect(() => {
    if (visible) {
      setNotes(initialNotes);
      setPointValueText(initialPointValue !== undefined ? String(initialPointValue) : '');
    }
  }, [visible, initialNotes, initialPointValue]);

  const showPointValue = initialPointValue !== undefined;

  const handleSave = () => {
    if (!showPointValue) {
      onSave(notes);
      return;
    }
    // Fall back to the original value if the field was left empty or
    // isn't a valid number, rather than silently saving 0/NaN.
    const parsed = parseInt(pointValueText, 10);
    const pointValue = pointValueText.trim() !== '' && !isNaN(parsed) ? parsed : initialPointValue;
    onSave(notes, pointValue);
    // Don't clear notes here - let the parent component close the modal first
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    setPointValueText(initialPointValue !== undefined ? String(initialPointValue) : '');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>✏️ Edit entry</Text>

          {showPointValue && (
            <>
              <Text style={styles.fieldLabel}>Points for this entry only</Text>
              {/* keyboardType="numbers-and-punctuation" (not "numeric") so
                  the minus sign is reachable - demerit behaviors have a
                  negative pointValue, and a one-off adjustment should be
                  able to go negative too (e.g. a same-day penalty),
                  matching the numeric keyboard choice already used for
                  Point Value in behavior-form.tsx. */}
              <TextInput
                style={styles.pointValueInput}
                value={pointValueText}
                onChangeText={setPointValueText}
                placeholder={String(initialPointValue)}
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.fieldHint}>
                Only changes this one logged entry - not the behavior/reward itself or any other day it was logged.
              </Text>
            </>
          )}

          <Text style={styles.fieldLabel}>Note</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="What happened?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttons}>
            <Button mode="outlined" onPress={handleCancel} style={styles.button}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSave} style={styles.button}>
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  title: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 13,
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDim,
    marginBottom: 4,
  },
  pointValueInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 90,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 10,
    lineHeight: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    lineHeight: 16.8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 10,
  },
});
