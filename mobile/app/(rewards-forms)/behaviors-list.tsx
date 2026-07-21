import React, { useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text, Card, FAB, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRewards } from '../../contexts/RewardsContext';
import { Behavior } from '../../models';
import { colors, shadows, radius, spacing, typography } from '../../constants/theme';
import { Swipeable } from 'react-native-gesture-handler';

/**
 * BehaviorsListScreen Component
 * 
 * Displays a list of all behaviors for the selected child profile.
 * Users can:
 * - View all behaviors
 * - Tap a behavior to log it (earn points)
 * - Edit or delete behaviors
 * - Add new behaviors via FAB
 * 
 * Requirements: 1.4, 6.1, 6.2, 6.3, 9.1
 */

export default function BehaviorsListScreen() {
  const router = useRouter();
  const { behaviors, logBehavior, deleteBehavior, archiveBehavior, unarchiveBehavior, selectedChildProfileId } = useRewards();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleBehaviorPress = async (behavior: Behavior) => {
    try {
      await logBehavior(behavior.id);
      // Success - show feedback but stay on screen for multiple logs
      Alert.alert(
        '🎉 Points Earned!',
        `+${behavior.pointValue} points for "${behavior.title}"`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      // Error - show user-friendly message, stay on screen
      const errorMessage = error instanceof Error ? error.message : 'Failed to log behavior';
      Alert.alert(
        'Cannot Log Behavior',
        errorMessage,
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  };

  const handleAddBehavior = () => {
    router.push('/(rewards-forms)/behavior-form');
  };

  const handleEditBehavior = (behaviorId: string) => {
    router.push(`/(rewards-forms)/behavior-form?behaviorId=${behaviorId}`);
  };

  const handleDeleteBehavior = (behavior: Behavior) => {
    Alert.alert(
      'Delete Behavior',
      `Are you sure you want to delete "${behavior.title}"? This will not affect past point events.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBehavior(behavior.id);
              // Close the swipeable
              swipeableRefs.current.get(behavior.id)?.close();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete behavior');
            }
          },
        },
      ]
    );
  };

  const handleArchiveBehavior = async (behavior: Behavior) => {
    try {
      if (behavior.archived) {
        await unarchiveBehavior(behavior.id);
      } else {
        await archiveBehavior(behavior.id);
      }
      // Close the swipeable
      swipeableRefs.current.get(behavior.id)?.close();
    } catch (error) {
      Alert.alert('Error', `Failed to ${behavior.archived ? 'unarchive' : 'archive'} behavior`);
    }
  };

  const renderRightActions = (behavior: Behavior) => {
    return (
      <View style={styles.swipeActions}>
        <Pressable
          style={styles.archiveAction}
          onPress={() => handleArchiveBehavior(behavior)}
        >
          <IconButton 
            icon={behavior.archived ? "package-up" : "package-down"} 
            iconColor="#FFFFFF" 
            size={24} 
          />
          <Text style={styles.actionText}>{behavior.archived ? 'Unarchive' : 'Archive'}</Text>
        </Pressable>
        <Pressable
          style={styles.editAction}
          onPress={() => {
            swipeableRefs.current.get(behavior.id)?.close();
            handleEditBehavior(behavior.id);
          }}
        >
          <IconButton icon="pencil" iconColor="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.deleteAction}
          onPress={() => handleDeleteBehavior(behavior)}
        >
          <IconButton icon="delete" iconColor="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  const renderBehaviorItem = (item: Behavior) => {
    const limitText = item.limitRule
      ? item.limitRule.frequency === 'unlimited'
        ? 'No limit'
        : `${item.limitRule.maxCount}/${item.limitRule.frequency}`
      : 'No limit';

    const timeText = item.timeWindow
      ? `${item.timeWindow.startTime} - ${item.timeWindow.endTime}`
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
          onPress={() => handleBehaviorPress(item)}
          style={({ pressed }) => [styles.behaviorCard, pressed && styles.cardPressed]}
        >
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              {/* Emoji and Title */}
              <View style={styles.mainInfo}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.textInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.behaviorTitle}>{item.title}</Text>
                    {item.archived && (
                      <View style={styles.archivedBadge}>
                        <Text style={styles.archivedBadgeText}>Archived</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.behaviorCategory}>{item.category}</Text>
                </View>
                {/* Tap hint */}
                <Text style={styles.tapHint}>Tap to log →</Text>
              </View>

              {/* Points and Constraints */}
              <View style={styles.detailsRow}>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>+{item.pointValue} pts</Text>
                </View>
                <Text style={styles.constraintText}>{limitText}</Text>
                <Text style={styles.constraintText}>{timeText}</Text>
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

  // Separate active and archived behaviors
  const activeBehaviors = behaviors.filter(b => !b.archived);
  const archivedBehaviors = behaviors.filter(b => b.archived);

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
        <Text style={styles.headerTitle}>Behaviors</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Behaviors List */}
      {behaviors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No Behaviors Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first behavior to start earning points!
          </Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Behaviors */}
          {activeBehaviors.map((item) => (
            <View key={item.id}>
              {renderBehaviorItem(item)}
            </View>
          ))}
          
          {/* Archived Section */}
          {archivedBehaviors.length > 0 && (
            <View style={styles.archivedSection}>
              <Text style={styles.archivedSectionTitle}>Archived</Text>
              {archivedBehaviors.map((item) => (
                <View key={item.id}>
                  {renderBehaviorItem(item)}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB for adding new behavior */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddBehavior}
        label="Add Behavior"
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
    width: 48, // Same width as back button for centering
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100, // Space for FAB
  },
  behaviorCard: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.card,
    ...shadows.card,
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
  tapHint: {
    fontSize: typography.small.fontSize,
    color: colors.accent,
    fontWeight: '600',
    marginLeft: 8,
  },
  behaviorTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  behaviorCategory: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  pointsBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    // Not interactive - display only
  },
  pointsText: {
    fontSize: typography.small.fontSize,
    fontWeight: '600',
    color: '#4CAF50',
  },
  constraintText: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
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
