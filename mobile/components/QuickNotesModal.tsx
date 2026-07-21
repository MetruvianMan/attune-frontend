import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

interface QuickNotesModalProps {
  visible: boolean;
  initialNotes: string;
  onSave: (notes: string) => void;
  onCancel: () => void;
}

export function QuickNotesModal({
  visible,
  initialNotes,
  onSave,
  onCancel,
}: QuickNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);

  // Sync notes with initialNotes whenever modal opens or initialNotes changes
  useEffect(() => {
    if (visible) {
      setNotes(initialNotes);
    }
  }, [visible, initialNotes]);

  const handleSave = () => {
    onSave(notes);
    // Don't clear notes here - let the parent component close the modal first
  };

  const handleCancel = () => {
    setNotes(initialNotes);
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
          <Text style={styles.title}>✏️ Add a note</Text>
          
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="What happened?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            autoFocus
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
