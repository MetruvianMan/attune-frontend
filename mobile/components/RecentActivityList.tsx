import React from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import { PointEvent, Behavior, Reward } from '../models';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';

/**
 * RecentActivityList Component
 * 
 * Displays the last 5 point events with:
 * - Emoji from the behavior/reward
 * - Title of the behavior/reward
 * - Point value (with + or - prefix)
 * - Relative timestamp
 * 
 * Shows "View Full Ledger" link at bottom.
 * Supports tap to navigate to point event detail.
 * 
 * Requirements covered: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * @param events - Last 5 point events (most recent first)
 * @param behaviors - All behaviors (for lookup)
 * @param rewards - All rewards (for lookup)
 * @param onEventPress - Callback when event is tapped
 * @param onViewLedger - Callback when "View Full Ledger" is tapped
 */

interface RecentActivityListProps {
  events: PointEvent[];
  behaviors: Behavior[];
  rewards: Reward[];
  onEventPress: (event: PointEvent) => void;
  onViewLedger: () => void;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

export function RecentActivityList({
  events,
  behaviors,
  rewards,
  onEventPress,
  onViewLedger,
  onDeleteEvent,
}: RecentActivityListProps) {
  // Helper to find behavior or reward by ID
  const getBehaviorById = (id: string | undefined) =>
    behaviors.find((b) => b.id === id);
  const getRewardById = (id: string | undefined) =>
    rewards.find((r) => r.id === id);

  // Helper to format relative time
  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Helper to get point color
  const getPointColor = (points: number) => {
    if (points > 0) return '#4CAF50'; // Green
    if (points < 0) return '#FF9800'; // Muted orange
    return '#757575'; // Neutral
  };

  // Helper to format point value with sign
  const formatPoints = (points: number) => {
    if (points > 0) return `+${points}`;
    return `${points}`;
  };

  // Handle delete with confirmation
  const handleDelete = (event: PointEvent) => {
    const behavior = event.behaviorId ? getBehaviorById(event.behaviorId) : null;
    const reward = event.rewardId ? getRewardById(event.rewardId) : null;
    const title = behavior?.title || reward?.title || 'this event';

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${title}"? This will ${event.pointValue > 0 ? 'remove' : 'restore'} ${Math.abs(event.pointValue)} points.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (onDeleteEvent) {
              try {
                await onDeleteEvent(event.id);
              } catch (error) {
                Alert.alert('Error', 'Failed to delete event');
              }
            }
          },
        },
      ]
    );
  };

  // Render empty state
  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Recent Activity
        </Text>
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Start tracking behaviors to see your progress here
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Recent Activity
      </Text>

      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {events.map((event, index) => {
            // Get behavior or reward details
            const behavior = event.behaviorId
              ? getBehaviorById(event.behaviorId)
              : null;
            const reward = event.rewardId
              ? getRewardById(event.rewardId)
              : null;

            const emoji = behavior?.emoji || reward?.emoji || '📝';
            const title =
              behavior?.title ||
              reward?.title ||
              (event.type === 'behavior' ? 'Behavior' : 'Reward');

            return (
              <React.Fragment key={event.id}>
                <Pressable
                  style={({ pressed }) => [
                    styles.eventItem,
                    pressed && styles.eventPressed,
                  ]}
                  onPress={() => onEventPress(event)}
                >
                  <View style={styles.eventLeft}>
                    <Text style={styles.eventEmoji}>{emoji}</Text>
                    <View style={styles.eventDetails}>
                      <Text variant="bodyMedium" style={styles.eventTitle}>
                        {title}
                      </Text>
                      <Text variant="bodySmall" style={styles.eventTime}>
                        {formatRelativeTime(event.timestamp)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    variant="titleMedium"
                    style={[
                      styles.eventPoints,
                      { color: getPointColor(event.pointValue) },
                    ]}
                  >
                    {formatPoints(event.pointValue)} pts
                  </Text>

                  {/* Delete button */}
                  {onDeleteEvent && (
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      iconColor={colors.danger}
                      onPress={() => handleDelete(event)}
                      style={styles.deleteButton}
                    />
                  )}
                </Pressable>

                {/* Divider between items (but not after last item) */}
                {index < events.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </Card.Content>
      </Card>

      {/* View Full Ledger Link */}
      <Pressable
        style={({ pressed }) => [
          styles.ledgerLink,
          pressed && styles.ledgerLinkPressed,
        ]}
        onPress={onViewLedger}
      >
        <Text variant="bodyMedium" style={styles.ledgerLinkText}>
          View Full Ledger →
        </Text>
      </Pressable>
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
  card: {
    borderRadius: radius.card, // 18px rounded
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card, // Soft shadow
  },
  cardContent: {
    padding: 0,
  },
  emptyCard: {
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textDim,
    marginBottom: 6,
    fontSize: typography.body.fontSize,
  },
  emptySubtext: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14, // More spacious
    paddingHorizontal: spacing.cardPadding,
  },
  eventPressed: {
    backgroundColor: colors.accentLight,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventEmoji: {
    fontSize: 36, // Larger emoji
    marginRight: 14,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
    fontSize: typography.bodyLarge.fontSize,
  },
  eventTime: {
    color: colors.textDim,
    fontSize: typography.caption.fontSize,
  },
  eventPoints: {
    fontWeight: '700',
    marginLeft: 12,
    fontSize: typography.bodyLarge.fontSize,
  },
  deleteButton: {
    margin: 0,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.cardPadding,
  },
  ledgerLink: {
    marginTop: 14,
    alignItems: 'center',
    padding: 10,
  },
  ledgerLinkPressed: {
    opacity: 0.6,
  },
  ledgerLinkText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
});
