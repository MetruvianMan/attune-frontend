import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

/**
 * QuickActionsSection Component
 * 
 * Displays two primary action buttons side-by-side:
 * - "Earn Points" - Navigate to behaviors view or quick log interface
 * - "Redeem Reward" - Navigate to catalog view
 * 
 * Uses rounded button styling with appropriate icons.
 * Follows Attune's visual design with spacious layouts.
 * 
 * Requirements covered: 4.1, 4.2, 4.3, 4.4, 4.5, 24.5
 * 
 * @param onEarnPoints - Callback when "Earn Points" button is pressed
 * @param onRedeemReward - Callback when "Redeem Reward" button is pressed
 */

interface QuickActionsSectionProps {
  onEarnPoints: () => void;
  onRedeemReward: () => void;
}

export function QuickActionsSection({
  onEarnPoints,
  onRedeemReward,
}: QuickActionsSectionProps) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Quick Actions
      </Text>

      <View style={styles.buttonsRow}>
        {/* Earn Points Button */}
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.earnButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onEarnPoints}
        >
          <Text style={styles.emoji}>⭐</Text>
          <Text style={[styles.buttonText, styles.earnButtonText]}>
            Earn Points
          </Text>
        </Pressable>

        {/* Redeem Reward Button */}
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.redeemButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onRedeemReward}
        >
          <Text style={styles.emoji}>🎁</Text>
          <Text style={[styles.buttonText, styles.redeemButtonText]}>
            Redeem Reward
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24, // Increased spacing like Attune
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 14,
    color: colors.text,
    fontSize: typography.h2.fontSize,
    textTransform: typography.h2.textTransform,
    letterSpacing: typography.h2.letterSpacing,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16, // More breathing room
  },
  actionButton: {
    flex: 1,
    borderRadius: radius.card, // 18px rounded like other cards
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96, // Slightly taller for comfort
    ...shadows.card, // Soft shadow like Attune
  },
  earnButton: {
    backgroundColor: '#E8F5E9', // Light green for positive action
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
  },
  redeemButton: {
    backgroundColor: '#E3F2FD', // Light blue for neutral action
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.3)',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  emoji: {
    fontSize: 44, // Larger emoji for visibility
    marginBottom: 10,
  },
  buttonText: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  earnButtonText: {
    color: '#4CAF50', // Green for earning
  },
  redeemButtonText: {
    color: '#2196F3', // Blue for redeeming
  },
});
