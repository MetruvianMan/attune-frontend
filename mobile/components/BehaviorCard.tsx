import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Behavior } from '../models';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

/**
 * BehaviorCard Component
 * 
 * Displays a single behavior with:
 * - Emoji badge
 * - Title
 * - Point value
 * 
 * Visual styling:
 * - Green styling for positive behaviors
 * - Muted orange styling for demerits (negative points)
 * 
 * Interactions:
 * - Tap to edit behavior
 * - Long press to delete behavior
 * 
 * Requirements covered: 6.1, 6.2, 6.4, 24.6, 25.5
 * 
 * @param behavior - The behavior to display
 * @param onPress - Callback when card is tapped (edit)
 * @param onLongPress - Callback when card is long-pressed (delete)
 */

interface BehaviorCardProps {
  behavior: Behavior;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

export const BehaviorCard = React.memo(function BehaviorCard({
  behavior,
  onPress,
  onLongPress,
  disabled = false,
}: BehaviorCardProps) {
  // Determine styling based on point value
  const isPositive = behavior.pointValue > 0;
  const cardStyle = isPositive ? styles.positiveCard : styles.demeritCard;
  const pointColor = isPositive ? '#4CAF50' : '#FF9800';
  const borderColor = isPositive ? '#81C784' : '#FFB74D';

  // Format point value with sign
  const formatPoints = (points: number) => {
    if (points > 0) return `+${points}`;
    return `${points}`;
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Card
        style={[
          styles.card,
          cardStyle,
          { borderColor },
          disabled && styles.disabledCard,
        ]}
        elevation={1}
      >
        <Card.Content style={styles.content}>
          {/* Emoji Badge */}
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{behavior.emoji}</Text>
          </View>

          {/* Title and Points */}
          <View style={styles.details}>
            <Text
              variant="bodyMedium"
              style={styles.title}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {behavior.title}
            </Text>

            <Text
              variant="titleSmall"
              style={[styles.points, { color: pointColor }]}
            >
              {formatPoints(behavior.pointValue)} pts
            </Text>
          </View>

          {/* Optional indicators */}
          <View style={styles.indicators}>
            {behavior.timeWindow && (
              <Text style={styles.indicator}>⏰</Text>
            )}
            {behavior.limitRule &&
              behavior.limitRule.frequency !== 'unlimited' && (
                <Text style={styles.indicator}>🔢</Text>
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
  disabled: {
    opacity: 0.5,
  },
  card: {
    borderRadius: radius.card, // 18px rounded
    borderWidth: 1,
    ...shadows.card, // Soft shadow
  },
  positiveCard: {
    backgroundColor: '#E8F5E9', // Light green for positive behaviors
  },
  demeritCard: {
    backgroundColor: '#FFF3E0', // Light orange for demerits (not harsh)
  },
  disabledCard: {
    opacity: 0.6,
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
  details: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6, // More space
    fontSize: typography.bodyLarge.fontSize,
  },
  points: {
    fontWeight: '700',
    fontSize: typography.body.fontSize,
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
  },
  indicator: {
    fontSize: 18,
  },
});
