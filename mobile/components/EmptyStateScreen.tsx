import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

/**
 * EmptyStateScreen Component
 * 
 * Displays welcoming empty state when no behaviors or rewards exist.
 * Shows supportive, nonjudgmental language and guides first-time setup.
 * 
 * Requirements covered: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 25.1, 25.2, 25.3, 25.4
 * 
 * Task: 14.1 Create EmptyStateScreen component
 */

interface EmptyStateScreenProps {
  onAddBehavior?: () => void;
  onAddReward?: () => void;
  onSkip?: () => void;
}

export function EmptyStateScreen({
  onAddBehavior,
  onAddReward,
  onSkip,
}: EmptyStateScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Welcoming Emoji */}
        <Text style={styles.emoji}>🎯</Text>

        {/* Welcome Title */}
        <Text style={styles.title}>Welcome to Rewards!</Text>

        {/* Explanation Text */}
        <Text style={styles.description}>
          Create behaviors to encourage and track your child's growth. Celebrate
          achievements with positive points and work together on challenges.
          Build a system that supports your family's journey.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Primary Action: Add Behavior */}
          <Button
            mode="contained"
            onPress={onAddBehavior}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonLabel}
            icon="star"
          >
            Add First Behavior
          </Button>

          {/* Secondary Action: Add Reward */}
          <Button
            mode="outlined"
            onPress={onAddReward}
            style={styles.secondaryButton}
            labelStyle={styles.secondaryButtonLabel}
            icon="gift"
          >
            Add First Reward
          </Button>
        </View>

        {/* Optional Skip Link */}
        {onSkip && (
          <Button
            mode="text"
            onPress={onSkip}
            style={styles.skipButton}
            labelStyle={styles.skipButtonLabel}
            compact
          >
            Skip for now
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding + 12, // Extra padding for centered content
    paddingVertical: 40,
  },

  // Emoji
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },

  // Title
  title: {
    ...typography.h1,
    fontSize: 26, // Slightly larger for welcome screen
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },

  // Description
  description: {
    ...typography.body,
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 8,
    maxWidth: 400, // Constrain width for readability
  },

  // Button Container
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },

  // Primary Button (Add First Behavior)
  primaryButton: {
    borderRadius: radius.button,
    backgroundColor: colors.accent,
    paddingVertical: 4,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Secondary Button (Add First Reward)
  secondaryButton: {
    borderRadius: radius.button,
    borderColor: colors.accent,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.2,
  },

  // Skip Button
  skipButton: {
    marginTop: 20,
  },
  skipButtonLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '400',
  },
});
