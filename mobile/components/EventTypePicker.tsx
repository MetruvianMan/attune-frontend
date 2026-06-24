import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { EventType } from '../models/event';

interface EventTypeOption {
  eventType: EventType;
  label: string;
  emoji: string;
}

// Match the Quick Log buttons from index.tsx
const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { eventType: 'meltdown', label: 'Meltdown', emoji: '🌊' },
  { eventType: 'shutdown', label: 'Shutdown', emoji: '🔇' },
  { eventType: 'conflict', label: 'Sibling Conflict', emoji: '⚡' },
  { eventType: 'school_incident', label: 'School Incident', emoji: '🏫' },
  { eventType: 'school_trip', label: 'School Trip', emoji: '🚌' },
  { eventType: 'great_day', label: 'Great Day', emoji: '🌟' },
  { eventType: 'good_sleep', label: 'Good Sleep', emoji: '😴' },
  { eventType: 'poor_sleep', label: 'Poor Sleep', emoji: '😵' },
  { eventType: 'medication', label: 'Medication Given', emoji: '💊' },
  { eventType: 'wet_bed', label: 'Wet Bed', emoji: '🛏️' },
  { eventType: 'didnt_eat_dinner', label: "Didn't Eat Dinner", emoji: '🍽️' },
  { eventType: 'playdate', label: 'Playdate', emoji: '👫' },
  { eventType: 'watched_tv', label: 'Watched TV', emoji: '📺' },
  { eventType: 'sick', label: 'Sick', emoji: '🤒' },
  { eventType: 'family_adventure', label: 'Family Adventure', emoji: '🏕️' },
  { eventType: 'played_outside', label: 'Played Outside', emoji: '🌳' },
  { eventType: 'good_dinner', label: 'Good Dinner', emoji: '😋' },
  { eventType: 'drew_comics', label: 'Drew Comics', emoji: '🦸' },
  { eventType: 'creative', label: 'Creative', emoji: '🧠' },
  { eventType: 'stayed_home', label: 'Stayed Home', emoji: '🏠' },
  { eventType: 'aggression', label: 'Aggression', emoji: '😠' },
  { eventType: 'good_breakfast', label: 'Good Breakfast', emoji: '🍳' },
  { eventType: 'tired', label: 'Tired', emoji: '🥱' },
  { eventType: 'fast_food', label: 'Fast Food', emoji: '🍟' },
  { eventType: 'sports', label: 'Sports', emoji: '🏀' },
  { eventType: 'party', label: 'Party', emoji: '🎉' },
  { eventType: 'bounceback', label: 'Bounceback', emoji: '🐦‍🔥' },
  { eventType: 'sugar', label: 'Sugar', emoji: '🍬' },
  { eventType: 'poor_transitions', label: 'Poor Transitions', emoji: '🎢' },
  { eventType: 'chores', label: 'Chores', emoji: '🧹' },
  { eventType: 'focus', label: 'Focus', emoji: '🔎' },
  { eventType: 'reading', label: 'Reading', emoji: '📚' },
  { eventType: 'kindness', label: 'Kindness', emoji: '🫶' },
  { eventType: 'overwhelm', label: 'Overwhelm', emoji: '😢' },
  { eventType: 'naughty', label: 'Naughty', emoji: '😈' },
  { eventType: 'refusal', label: 'Refusal', emoji: '🙅' },
  { eventType: 'sibling_harmony', label: 'Sibling Harmony', emoji: '🫂' },
  { eventType: 'bad_language', label: 'Bad Language', emoji: '🤬' },
  { eventType: 'injury', label: 'Injury', emoji: '🤕' },
  { eventType: 'sneaky', label: 'Sneaky', emoji: '🥷' },
  { eventType: 'messy', label: 'Messy', emoji: '🫗' },
  { eventType: 'helpful', label: 'Helpful', emoji: '🤝🏻' },
  { eventType: 'video_games', label: 'Video Games', emoji: '🎮' },
  { eventType: 'toilet_issue', label: 'Toilet Issue', emoji: '🚽' },
  { eventType: 'dad_bonding', label: 'Dad Bonding', emoji: '👨🏻' },
  { eventType: 'mom_bonding', label: 'Mom Bonding', emoji: '👩🏼' },
  { eventType: 'travel', label: 'Travel', emoji: '✈️' },
  { eventType: 'barfed', label: 'Barfed', emoji: '🤮' },
  { eventType: 'vacation', label: 'Vacation', emoji: '🌴' },
  { eventType: 'sporting_event', label: 'Sporting Event', emoji: '🏟️' },
  { eventType: 'brave', label: 'Brave', emoji: '🦁' },
  { eventType: 'parent_out_of_town', label: 'Parent(s) Away', emoji: '💺' },
];

interface EventTypePickerProps {
  visible: boolean;
  currentEventType: EventType;
  onSelect: (eventType: EventType, label: string, emoji: string) => void;
  onClose: () => void;
}

export function EventTypePicker({ visible, currentEventType, onSelect, onClose }: EventTypePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = EVENT_TYPE_OPTIONS.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.eventType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (option: EventTypeOption) => {
    onSelect(option.eventType, option.label, option.emoji);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Event Type</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <RNTextInput
              style={styles.searchInput}
              placeholder="Search events..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <ScrollView style={styles.optionsList}>
            {filteredOptions.map((option) => (
              <TouchableOpacity
                key={option.eventType}
                style={[
                  styles.option,
                  option.eventType === currentEventType && styles.optionSelected
                ]}
                onPress={() => handleSelect(option)}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.eventType === currentEventType && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={styles.cancelButton}
              textColor="#666"
            >
              Cancel
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionSelected: {
    backgroundColor: '#F0F7FF',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    color: '#4A90E2',
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    paddingTop: 12,
  },
  cancelButton: {
    borderColor: '#E0E0E0',
  },
});
