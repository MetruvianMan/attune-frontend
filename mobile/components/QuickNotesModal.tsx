import React, { useState } from 'react';
import { Modal, View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';

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

  const handleSave = () => {
    onSave(notes);
    setNotes('');
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
          <Text variant="titleMedium" style={styles.title}>
            Quick Notes
          </Text>
          
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a quick note..."
            multiline
            numberOfLines={4}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    marginBottom: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    minWidth: 80,
  },
});
