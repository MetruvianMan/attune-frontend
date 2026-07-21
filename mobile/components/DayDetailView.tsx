import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { PointEvent, Behavior, Reward } from '../models';

/**
 * DayDetailView Component
 * 
 * Displays all point events for a selected day with:
 * - Date header
 * - List of all events (emoji, title, point value, timestamp)
 * - Day total at bottom
 * 
 * Used in Ledger view when a day is tapped.
 * 
 * Requirements covered: 17.4, 17.5
 * 
 * @param date - The date being displayed
 * @param events - All point events for this date
 * @param behaviors - All behaviors (for lookup)
 * @param rewards - All rewards (for lookup)
 * @param onEventPress - Callback when event is tapped
 */

interface DayDetailViewProps {
  date: Date;
  events: PointEvent[];
  behaviors: Behavior[];
  rewards: Reward[];
  onEventPress?: (event: PointEvent) => void;
}

export function DayDetailView({
  date,
  events,
  behaviors,
  rewards,
  onEventPress,
}: DayDetailViewProps) {
  // Helper to find behavior or reward by ID
  const getBehaviorById = (id: string | undefined) =>
    behaviors.find((b) => b.id === id);
  const getRewardById = (id: string | undefined) =>
    rewards.find((r) => r.id === id);

  // Calculate day total
  const dayTotal = events.reduce(
    (sum, event) => sum + event.pointValue,
    0
  );

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

  // Helper to format time
  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Format date header
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <View style={styles.container}>
      {/* Date Header */}
      <Text variant="titleLarge" style={styles.dateHeader}>
        {formatDate(date)}
      </Text>

      {events.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No activity on this day</Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Events List */}
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
                    <View
                      style={[
                        styles.eventItem,
                        onEventPress && styles.eventItemClickable,
                      ]}
                      onTouchEnd={
                        onEventPress
                          ? () => onEventPress(event)
                          : undefined
                      }
                    >
                      <View style={styles.eventLeft}>
                        <Text style={styles.eventEmoji}>{emoji}</Text>
                        <View style={styles.eventDetails}>
                          <Text
                            variant="bodyMedium"
                            style={styles.eventTitle}
                          >
                            {title}
                          </Text>
                          <Text variant="bodySmall" style={styles.eventTime}>
                            {formatTime(event.timestamp)}
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
                    </View>

                    {/* Divider between items (but not after last item) */}
                    {index < events.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </React.Fragment>
                );
              })}
            </Card.Content>
          </Card>

          {/* Day Total */}
          <Card style={styles.totalCard}>
            <Card.Content style={styles.totalContent}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Day Total:
              </Text>
              <Text
                variant="headlineSmall"
                style={[
                  styles.totalValue,
                  { color: getPointColor(dayTotal) },
                ]}
              >
                {formatPoints(dayTotal)} points
              </Text>
            </Card.Content>
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateHeader: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212121',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 1,
    marginBottom: 12,
  },
  cardContent: {
    padding: 0,
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  eventItemClickable: {
    // Add visual feedback if clickable
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    color: '#212121',
    fontWeight: '500',
    marginBottom: 2,
  },
  eventTime: {
    color: '#757575',
  },
  eventPoints: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  totalCard: {
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    elevation: 1,
  },
  totalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontWeight: '600',
    color: '#212121',
  },
  totalValue: {
    fontWeight: 'bold',
  },
});
