import React, { useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text, Card, FAB, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRewards } from '../../contexts/RewardsContext';
import { Reward } from '../../models';
import { colors, shadows, radius, spacing, typography } from '../../constants/theme';
import { Swipeable } from 'react-native-gesture-handler';

/**
 * RewardsListScreen Component
 * 
 * Displays a catalog of all available rewards for the selected child profile.
 * Users can:
 * - View all rewards sorted by point cost
 * - Tap a reward to redeem it (if they have enough points)
 * - Edit or delete rewards
 * - Add new rewards via FAB
 * 
 * Requirements: 1.4, 12.1, 12.2, 12.3, 13.1, 13.2, 13.3, 15.1
 */

export default function RewardsListScreen() {
  const router = useRouter();
  const { rewards, redeemReward, deleteReward, archiveReward, unarchiveReward, pointBalance, selectedChildProfileId } = useRewards();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleRewardPress = async (reward: Reward) => {
    // Check if user has enough points
    if (pointBalance < reward.pointCost) {
      console.log('Insufficient points');
      return;
    }

    try {
      await redeemReward(reward.id);
      // Show success feedback
      console.log('Reward redeemed successfully!');
      // Navigate back to rewards screen
      router.back();
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      // Show error feedback
    }
  };

  const handleAddReward = () => {
    router.push('/(rewards-forms)/reward-form');
  };

  const handleEditReward = (rewardId: string) => {
    router.push(`/(rewards-forms)/reward-form?rewardId=${rewardId}`);
  };

  const handleDeleteReward = (reward: Reward) => {
    Alert.alert(
      'Delete Reward',
      `Are you sure you want to delete "${reward.title}"? This will not affect past redemptions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReward(reward.id);
              // Close the swipeable
              swipeableRefs.current.get(reward.id)?.close();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reward');
            }
          },
        },
      ]
    );
  };

  const handleArchiveReward = async (reward: Reward) => {
    try {
      if (reward.archived) {
        await unarchiveReward(reward.id);
      } else {
        await archiveReward(reward.id);
      }
      // Close the swipeable
      swipeableRefs.current.get(reward.id)?.close();
    } catch (error) {
      Alert.alert('Error', `Failed to ${reward.archived ? 'unarchive' : 'archive'} reward`);
    }
  };

  const renderRightActions = (reward: Reward) => {
    return (
      <View style={styles.swipeActions}>
        <Pressable
          style={styles.archiveAction}
          onPress={() => handleArchiveReward(reward)}
        >
          <IconButton 
            icon={reward.archived ? "package-up" : "package-down"} 
            iconColor="#FFFFFF" 
            size={24} 
          />
          <Text style={styles.actionText}>{reward.archived ? 'Unarchive' : 'Archive'}</Text>
        </Pressable>
        <Pressable
          style={styles.editAction}
          onPress={() => {
            swipeableRefs.current.get(reward.id)?.close();
            handleEditReward(reward.id);
          }}
        >
          <IconButton icon="pencil" iconColor="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.deleteAction}
          onPress={() => handleDeleteReward(reward)}
        >
          <IconButton icon="delete" iconColor="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  const renderRewardItem = (item: Reward) => {
    const canAfford = pointBalance >= item.pointCost;
    const availabilityText = item.availabilityRule
      ? item.availabilityRule.type === 'weekends_only'
        ? 'Weekends only'
        : item.availabilityRule.type === 'after_consecutive_days'
        ? `After ${item.availabilityRule.consecutiveDays} days`
        : 'Anytime'
      : 'Anytime';

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          }
        }}
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <Pressable
          onPress={() => handleRewardPress(item)}
          disabled={!canAfford}
          style={({ pressed }) => [
            styles.rewardCard,
            !canAfford && styles.rewardCardDisabled,
            pressed && styles.cardPressed,
          ]}
        >
          <Card style={[styles.card, !canAfford && styles.cardDisabled]}>
            <View style={styles.cardContent}>
              {/* Emoji and Title */}
              <View style={styles.mainInfo}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.textInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.rewardTitle, !canAfford && styles.textDisabled]}>
                      {item.title}
                    </Text>
                    {item.archived && (
                      <View style={styles.archivedBadge}>
                        <Text style={styles.archivedBadgeText}>Archived</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.availabilityText}>{availabilityText}</Text>
                  {item.parentApprovalRequired && (
                    <Text style={styles.approvalText}>⚠️ Parent approval required</Text>
                  )}
                </View>
              </View>

              {/* Points Cost */}
              <View style={styles.detailsRow}>
                <View
                  style={[
                    styles.costBadge,
                    !canAfford && styles.costBadgeDisabled,
                  ]}
                >
                  <Text
                    style={[styles.costText, !canAfford && styles.costTextDisabled]}
                  >
                    {item.pointCost} pts
                  </Text>
                </View>
                {!canAfford && (
                  <Text style={styles.insufficientText}>
                    Need {item.pointCost - pointBalance} more pts
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </Pressable>
      </Swipeable>
    );
  };

  if (!selectedChildProfileId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No child profile selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Separate active and archived rewards
  const activeRewards = rewards.filter(r => !r.archived);
  const archivedRewards = rewards.filter(r => r.archived);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>Rewards Catalog</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Point Balance */}
      <View style={styles.balanceBar}>
        <Text style={styles.balanceLabel}>Your Points:</Text>
        <Text style={styles.balanceValue}>{pointBalance} pts</Text>
      </View>

      {/* Rewards List */}
      {rewards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={styles.emptyTitle}>No Rewards Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first reward to start building your catalog!
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Rewards */}
          {activeRewards.map((item) => (
            <View key={item.id}>
              {renderRewardItem(item)}
            </View>
          ))}
          
          {/* Archived Section */}
          {archivedRewards.length > 0 && (
            <View style={styles.archivedSection}>
              <Text style={styles.archivedSectionTitle}>Archived</Text>
              {archivedRewards.map((item) => (
                <View key={item.id}>
                  {renderRewardItem(item)}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB for adding new reward */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddReward}
        label="Add Reward"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    margin: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.screenPadding,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  balanceLabel: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
  },
  balanceValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.accent,
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
  rewardCard: {
    marginBottom: 16,
  },
  rewardCardDisabled: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.card,
    ...shadows.card,
  },
  cardDisabled: {
    backgroundColor: '#f5f5f5',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardContent: {
    padding: spacing.cardPadding,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 44,
    marginRight: 16,
  },
  textInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  archivedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  rewardTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  textDisabled: {
    color: colors.textDim,
  },
  availabilityText: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    marginBottom: 2,
  },
  approvalText: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    fontFamily: 'Chivo_400Regular_Italic',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  costBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.3)',
  },
  costBadgeDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  costText: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
    color: '#2196F3',
  },
  costTextDisabled: {
    color: colors.textDim,
  },
  insufficientText: {
    fontSize: typography.small.fontSize,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  archiveAction: {
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderTopLeftRadius: radius.card,
    borderBottomLeftRadius: radius.card,
  },
  editAction: {
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderTopRightRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: typography.small.fontSize,
    fontWeight: '600',
    marginTop: -8,
  },
  archivedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  archivedSectionTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600',
    color: colors.textDim,
    marginBottom: 16,
    paddingLeft: 4,
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
  emptyTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.accent,
  },
});
