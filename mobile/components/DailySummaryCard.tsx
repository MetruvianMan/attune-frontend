import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { DailySummary } from '../models';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

/**
 * DailySummaryCard Component
 * 
 * Displays today's point activity summary:
 * - Points earned (positive behaviors)
 * - Points spent (redemptions)
 * - Net total for the day
 * 
 * Updates within 200ms when new events are logged.
 * Uses rounded card styling consistent with Attune design.
 * 
 * Requirements covered: 3.1, 3.2, 3.3, 3.4, 3.5, 24.1
 * 
 * @param summary - Today's daily summary (or null if no activity today)
 */

interface DailySummaryCardProps {
  summary: DailySummary | null;
}

export function DailySummaryCard({ summary }: DailySummaryCardProps) {
  // Default to zeros if no summary exists
  const earned = summary?.pointsEarned ?? 0;
  const spent = summary?.pointsSpent ?? 0;
  const net = summary?.netPoints ?? 0;

  // Determine net color
  const getNetColor = () => {
    if (net > 0) return '#4CAF50'; // Green for positive
    if (net < 0) return '#FF9800'; // Muted orange for negative
    return '#757575'; // Neutral gray for zero
  };

  return (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Today's Summary
        </Text>

        <View style={styles.summaryRow}>
          {/* Points Earned */}
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.label}>
              Earned
            </Text>
            <Text
              variant="titleLarge"
              style={[styles.value, styles.earnedValue]}
            >
              +{earned}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Points Spent */}
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.label}>
              Spent
            </Text>
            <Text
              variant="titleLarge"
              style={[styles.value, styles.spentValue]}
            >
              {spent > 0 ? `-${spent}` : '0'}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Net Total */}
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.label}>
              Net
            </Text>
            <Text
              variant="titleLarge"
              style={[styles.value, { color: getNetColor() }]}
            >
              {net > 0 ? `+${net}` : net}
            </Text>
          </View>
        </View>

        {/* Supportive message */}
        {net > 0 && (
          <Text variant="bodySmall" style={styles.message}>
            🌟 Great progress today!
          </Text>
        )}
        {net === 0 && earned === 0 && spent === 0 && (
          <Text variant="bodySmall" style={styles.message}>
            Start your day with a fresh slate
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24, // Increased spacing like Attune
    borderRadius: radius.card, // 18px rounded
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card, // Soft shadow
  },
  title: {
    fontWeight: '600',
    marginBottom: 18, // More breathing room
    color: colors.text,
    fontSize: typography.bodyLarge.fontSize,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 44, // Taller for better proportion
    backgroundColor: colors.borderSubtle,
  },
  label: {
    color: colors.textDim,
    marginBottom: 6,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  value: {
    fontWeight: '700',
    fontSize: typography.h1.fontSize,
  },
  earnedValue: {
    color: '#4CAF50', // Green for earned points
  },
  spentValue: {
    color: '#2196F3', // Blue for spent (neutral, not negative)
  },
  message: {
    textAlign: 'center',
    color: colors.textDim,
    marginTop: 14,
    fontSize: typography.body.fontSize,
  },
});
