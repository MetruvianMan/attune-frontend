import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Reward } from '../models';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

/**
 * RewardCard Component
 * 
 * Displays a single reward with:
 * - Emoji badge
 * - Title
 * - Point cost
 * - Visual indicators for special rules
 * 
 * Visual indicators:
 * - 🔒 for parent approval required
 * - 📅 for weekends only
 * - ⏳ for consecutive days requirement
 * 
 * Unavailable rewards are grayed out with reason displayed.
 * 
 * Interactions:
 * - Tap to redeem (if available) or view detail
 * - Long press to edit/delete (in management mode)
 * 
 * Requirements covered: 12.1, 12.2, 13.4, 13.5, 14.2, 24.5
 * 
 * @param reward - The reward to display
 * @param available - Whether the reward is currently available for redemption
 * @param unavailableReason - Reason if unavailable
 * @param onPress - Callback when card is tapped
 * @param onLongPress - Callback when card is long-pressed
 */

interface RewardCardProps {
  reward: Reward;
  available?: boolean;
  unavailableReason?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const RewardCard = React.memo(function RewardCard({
  reward,
  available = true,
  unavailableReason,
  onPress,
  onLongPress,
}: RewardCardProps) {
  // Get availability rule indicators
  const getIndicators = () => {
    const indicators: string[] = [];

    if (reward.parentApprovalRequired) {
      indicators.push('🔒');
    }

    if (reward.availabilityRule) {
      if (reward.availabilityRule.type === 'weekends_only') {
        indicators.push('📅');
      } else if (
        reward.availabilityRule.type === 'after_consecutive_days'
      ) {
        indicators.push('⏳');
      }
    }

    return indicators;
  };

  const indicators = getIndicators();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!available && !onLongPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        !available && styles.unavailablePressable,
      ]}
    >
      <Card
        style={[
          styles.card,
          !available && styles.unavailableCard,
        ]}
        elevation={available ? 1 : 0}
      >
        <Card.Content style={styles.content}>
          {/* Emoji Badge */}
          <View style={styles.emojiContainer}>
            <Text style={[styles.emoji, !available && styles.unavailableEmoji]}>
              {reward.emoji}
            </Text>
          </View>

          {/* Title and Cost */}
          <View style={styles.details}>
            <Text
              variant="bodyMedium"
              style={[styles.title, !available && styles.unavailableText]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {reward.title}
            </Text>

            <View style={styles.costRow}>
              <Text
                variant="titleSmall"
                style={[styles.cost, !available && styles.unavailableText]}
              >
                {reward.pointCost} pts
              </Text>

              {/* Indicators */}
              {indicators.length > 0 && (
                <View style={styles.indicators}>
                  {indicators.map((indicator, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.indicator,
                        !available && styles.unavailableIndicator,
                      ]}
                    >
                      {indicator}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Unavailable reason */}
            {!available && unavailableReason && (
              <Text variant="bodySmall" style={styles.unavailableReason}>
                {unavailableReason}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 12, // Spacious like Attune
  },
  pressed: {
    opacity: 0.7,
  },
  unavailablePressable: {
    opacity: 1,
  },
  card: {
    borderRadius: radius.card, // 18px rounded
    backgroundColor: '#E3F2FD', // Light blue for rewards
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.3)',
    ...shadows.card, // Soft shadow
  },
  unavailableCard: {
    backgroundColor: colors.borderSubtle, // Light gray background
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // Spacious padding
    paddingHorizontal: spacing.cardPadding,
  },
  emojiContainer: {
    marginRight: 16, // More breathing room
  },
  emoji: {
    fontSize: 36, // Larger emoji badge
  },
  unavailableEmoji: {
    opacity: 0.4,
  },
  details: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6, // More space
    fontSize: typography.bodyLarge.fontSize,
  },
  unavailableText: {
    color: colors.textMuted,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cost: {
    color: '#2196F3', // Blue for neutral cost
    fontWeight: '700',
    fontSize: typography.body.fontSize,
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    fontSize: 18,
  },
  unavailableIndicator: {
    opacity: 0.4,
  },
  unavailableReason: {
    color: '#FF9800', // Muted orange (not harsh)
    marginTop: 6,
    fontStyle: 'italic',
    fontSize: typography.caption.fontSize,
  },
});
