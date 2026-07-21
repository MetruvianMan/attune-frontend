import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRewards } from '../contexts/RewardsContext';
import { Reward, AvailabilityRule } from '../models';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';
import { RewardCard } from './RewardCard';

/**
 * CatalogView Component
 * 
 * Displays rewards sorted by point cost (lowest to highest).
 * Separates available and unavailable rewards.
 * Shows "+ Add New" button in header.
 * 
 * Requirements covered: 12.1, 12.4, 13.4
 * 
 * Task: 10.1 Create CatalogView component
 */

interface CatalogViewProps {
  onAddNew?: () => void;
  onRewardPress?: (reward: Reward) => void;
}

export function CatalogView({ onAddNew, onRewardPress }: CatalogViewProps) {
  const { rewards, pointBalance, loading } = useRewards();

  // Check reward availability
  const checkAvailability = (reward: Reward): { available: boolean; reason?: string } => {
    // Check point balance
    if (pointBalance < reward.pointCost) {
      return {
        available: false,
        reason: `Insufficient points (need ${reward.pointCost}, have ${pointBalance})`,
      };
    }

    // Check availability rule
    if (reward.availabilityRule) {
      const rule = reward.availabilityRule;
      const now = new Date();

      switch (rule.type) {
        case 'weekends_only': {
          const dayOfWeek = now.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          if (!isWeekend) {
            return {
              available: false,
              reason: 'Weekends only 📅',
            };
          }
          break;
        }
        case 'after_consecutive_days': {
          // For now, we'll mark these as unavailable
          // Full implementation requires checking consecutive positive days
          return {
            available: false,
            reason: `After ${rule.consecutiveDays} consecutive days ⏳`,
          };
        }
        case 'always':
        default:
          // No additional constraints
          break;
      }
    }

    return { available: true };
  };

  // Separate and sort rewards
  const { availableRewards, unavailableRewards } = useMemo(() => {
    const available: Reward[] = [];
    const unavailable: Reward[] = [];

    rewards.forEach((reward) => {
      const availability = checkAvailability(reward);
      if (availability.available) {
        available.push(reward);
      } else {
        unavailable.push(reward);
      }
    });

    // Sort both arrays by point cost (lowest to highest)
    const sortByPointCost = (a: Reward, b: Reward) => a.pointCost - b.pointCost;
    available.sort(sortByPointCost);
    unavailable.sort(sortByPointCost);

    return { availableRewards: available, unavailableRewards: unavailable };
  }, [rewards, pointBalance]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rewards Catalog</Text>
        <Button
          mode="contained"
          onPress={onAddNew}
          style={styles.addButton}
          labelStyle={styles.addButtonLabel}
          compact
        >
          + Add New
        </Button>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {rewards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🎁</Text>
            <Text style={styles.emptyStateTitle}>No rewards yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first reward to give your child something to work towards
            </Text>
            <Button
              mode="contained"
              onPress={onAddNew}
              style={styles.emptyStateButton}
            >
              Add First Reward
            </Button>
          </View>
        ) : (
          <>
            {/* Available Rewards Section */}
            {availableRewards.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available</Text>
                <View style={styles.rewardsContainer}>
                  {availableRewards.map((reward) => (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      available={true}
                      onPress={() => onRewardPress?.(reward)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Unavailable Rewards Section */}
            {unavailableRewards.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, styles.sectionTitleMuted]}>
                  Unavailable
                </Text>
                <View style={styles.rewardsContainer}>
                  {unavailableRewards.map((reward) => {
                    const availability = checkAvailability(reward);
                    return (
                      <RewardCard
                        key={reward.id}
                        reward={reward}
                        available={false}
                        unavailableReason={availability.reason}
                        onPress={() => onRewardPress?.(reward)}
                      />
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
  },
  addButton: {
    borderRadius: radius.button,
    backgroundColor: colors.accent,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    borderRadius: radius.button,
    backgroundColor: colors.accent,
  },

  // Section
  section: {
    marginBottom: spacing.cardMargin * 2,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleMuted: {
    color: colors.textMuted,
  },
  rewardsContainer: {
    gap: 8,
  },
});
