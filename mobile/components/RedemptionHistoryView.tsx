import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { PointEvent, Reward } from '../models';

/**
 * RedemptionHistoryView Component
 * 
 * Displays redemption events with:
 * - Reward title and emoji
 * - Point cost
 * - Timestamp
 * - Parent who approved (if applicable)
 * 
 * Optimized with FlatList for large datasets.
 * 
 * Requirements covered: 18.1, 18.2, 18.3, 18.4
 * 
 * @param redemptions - List of redemption point events
 * @param rewards - All rewards (for lookup)
 * @param onRedemptionPress - Callback when redemption is tapped
 */

interface RedemptionHistoryViewProps {
  redemptions: PointEvent[];
  rewards: Reward[];
  onRedemptionPress?: (redemption: PointEvent) => void;
}

export function RedemptionHistoryView({
  redemptions,
  rewards,
  onRedemptionPress,
}: RedemptionHistoryViewProps) {
  // Helper to find reward by ID
  const getRewardById = (id: string | undefined) =>
    rewards.find((r) => r.id === id);

  // Helper to format date and time
  const formatDateTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Render individual redemption item
  const renderRedemption = ({ item }: { item: PointEvent }) => {
    const reward = item.rewardId ? getRewardById(item.rewardId) : null;
    const emoji = reward?.emoji || '🎁';
    const title = reward?.title || 'Reward';
    const cost = Math.abs(item.pointValue);

    return (
      <Card
        style={styles.card}
        onPress={onRedemptionPress ? () => onRedemptionPress(item) : undefined}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.redemptionLeft}>
            <Text style={styles.emoji}>{emoji}</Text>
            <View style={styles.redemptionDetails}>
              <Text variant="bodyLarge" style={styles.title}>
                {title}
              </Text>
              <Text variant="bodySmall" style={styles.timestamp}>
                {formatDateTime(item.timestamp)}
              </Text>
              {item.parentId && (
                <Text variant="bodySmall" style={styles.approvedText}>
                  🔒 Parent approved
                </Text>
              )}
            </View>
          </View>

          <Text variant="titleMedium" style={styles.cost}>
            {cost} pts
          </Text>
        </Card.Content>
      </Card>
    );
  };

  // Empty state
  if (redemptions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎁</Text>
        <Text variant="bodyLarge" style={styles.emptyText}>
          No redemptions yet
        </Text>
        <Text variant="bodySmall" style={styles.emptySubtext}>
          Redeemed rewards will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={redemptions}
      renderItem={renderRedemption}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  redemptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 40,
    marginRight: 12,
  },
  redemptionDetails: {
    flex: 1,
  },
  title: {
    color: '#212121',
    fontWeight: '500',
    marginBottom: 4,
  },
  timestamp: {
    color: '#757575',
    marginBottom: 2,
  },
  approvedText: {
    color: '#2196F3',
    fontStyle: 'italic',
  },
  cost: {
    color: '#FF9800', // Muted orange for spent points
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#757575',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#BDBDBD',
    textAlign: 'center',
  },
});
