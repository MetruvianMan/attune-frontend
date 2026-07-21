import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { EventType } from '../models';
import { colors, typography } from '../constants/theme';

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
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text
        style={[styles.label, disabled && styles.labelDisabled]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', // Horizontal layout: emoji left, text right
    alignItems: 'center',
    backgroundColor: 'rgba(74,144,226,0.06)', // Lighter background
    borderRadius: 20, // Pill shape
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.12)', // Lighter border
    paddingVertical: 10, // Comfortable padding
    paddingHorizontal: 14, // Good padding for wider button
    gap: 7,
    minHeight: 44, // Keep at 44pt for accessibility
    width: '100%', // Full width of column (178px - much wider!)
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: 18, // Balanced size
  },
  label: {
    fontSize: 13, // Back to readable size with more room
    fontWeight: '600',
    color: colors.text,
    flex: 1, // Take remaining space
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});
