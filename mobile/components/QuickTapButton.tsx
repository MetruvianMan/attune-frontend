import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { EventType } from '../models';

export interface QuickTapButtonProps {
  eventType: EventType;
  label: string;
  emoji?: string;
  onPress: () => void;
  disabled?: boolean;
}

export function QuickTapButton({
  eventType,
  label,
  emoji,
  onPress,
  disabled = false,
}: QuickTapButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text
          style={[styles.label, disabled && styles.labelDisabled]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
  },
  labelDisabled: {
    color: '#999',
  },
});
