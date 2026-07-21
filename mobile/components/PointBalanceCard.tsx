import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

/**
 * PointBalanceCard Component
 * 
 * Displays the current point balance prominently with emoji and color coding.
 * Visual styling changes based on balance:
 * - Positive balance: Green with cheerful styling
 * - Zero balance: Neutral gray
 * - Negative balance: Muted orange (not harsh red)
 * 
 * Updates within 200ms when balance changes via animated transition.
 * 
 * Requirements covered: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 24.4
 * 
 * @param balance - Current point balance (positive, negative, or zero)
 */

interface PointBalanceCardProps {
  balance: number;
}

export function PointBalanceCard({ balance }: PointBalanceCardProps) {
  // Animation value for balance changes
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Trigger bounce animation when balance changes
  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [balance]);

  // Determine styling based on balance value
  const getBalanceStyle = () => {
    if (balance > 0) {
      return {
        color: '#4CAF50', // Green for positive
        backgroundColor: '#E8F5E9', // Light green background
        emoji: '🌟',
        label: 'Points',
      };
    }
    if (balance < 0) {
      return {
        color: '#FF9800', // Muted orange for negative
        backgroundColor: '#FFF3E0', // Light orange background
        emoji: '📉',
        label: 'Points',
      };
    }
    return {
      color: '#757575', // Neutral gray for zero
      backgroundColor: '#F5F5F5', // Light gray background
      emoji: '⭐',
      label: 'Points',
    };
  };

  const balanceStyle = getBalanceStyle();

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: balanceStyle.backgroundColor },
      ]}
      elevation={2}
    >
      <Card.Content style={styles.content}>
        {/* Emoji indicator */}
        <Text style={styles.emoji}>{balanceStyle.emoji}</Text>

        {/* Balance value - animated */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text
            variant="displayLarge"
            style={[styles.balanceText, { color: balanceStyle.color }]}
          >
            {balance}
          </Text>
        </Animated.View>

        {/* Label */}
        <Text
          variant="titleMedium"
          style={[styles.label, { color: balanceStyle.color }]}
        >
          {balanceStyle.label}
        </Text>

        {/* Supportive message based on balance */}
        {balance > 0 && (
          <Text variant="bodySmall" style={styles.message}>
            Wonderful progress! 🎉
          </Text>
        )}
        {balance === 0 && (
          <Text variant="bodySmall" style={styles.message}>
            Ready to start earning!
          </Text>
        )}
        {balance < 0 && (
          <Text variant="bodySmall" style={styles.message}>
            Let's work together to get back on track
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24, // Increased spacing between major sections
    borderRadius: radius.card, // 18px rounded like Attune
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card, // Soft shadow like Attune
  },
  content: {
    alignItems: 'center',
    paddingVertical: 28, // Spacious layout
    paddingHorizontal: spacing.cardPadding,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  balanceText: {
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 56,
    lineHeight: 64,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    fontSize: typography.bodyLarge.fontSize,
  },
  message: {
    textAlign: 'center',
    color: colors.textDim, // Muted but readable
    marginTop: 4,
    fontSize: typography.body.fontSize,
  },
});
