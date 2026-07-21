import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, TouchableOpacity, Alert, Dimensions, FlatList } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton, FAB, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRewards } from '../contexts/RewardsContext';
import { PointEvent, Behavior, Reward } from '../models';
import { useRouter, useFocusEffect } from 'expo-router';
import { EmptyStateScreen } from './EmptyStateScreen';
import { colors, shadows, radius, spacing, typography } from '../constants/theme';
import { CalendarDatePicker } from './CalendarDatePicker';
import { rewardsService } from '../services/rewards-service';

/**
 * RewardsTabScreen Component
 * 
 * Redesigned for quick logging with:
 * - Toggle between behaviors and rewards
 * - Quick-tap to log (like Today tab)
 * - Compact point balance display
 * - Running tally in activity
 * - Link to full ledger
 */

export function RewardsTabScreen() {
  const router = useRouter();
  const {
    selectedChildProfileId,
    behaviors: allBehaviors,
    rewards: allRewards,
    pointBalance,
    todaysSummary,
    recentActivity,
    loading,
    error,
    refreshData,
    logBehavior,
    redeemReward,
    undoPointEvent,
  } = useRewards();

  // Filter out archived items for Quick Log/Quick Redeem
  const behaviors = allBehaviors.filter(b => !b.archived);
  const rewards = allRewards.filter(r => !r.archived);

  const [viewMode, setViewMode] = useState<'behaviors' | 'rewards'>('behaviors');
  const [checklistMode, setChecklistMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [dailyEvents, setDailyEvents] = useState<PointEvent[]>([]);
  const [dailyPointsEarned, setDailyPointsEarned] = useState(0);
  const [dailyPointsSpent, setDailyPointsSpent] = useState(0);
  const [priorBalance, setPriorBalance] = useState(0); // Balance before selected date
  
  // Animation for green flash
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // When switching view modes, just update the mode without changing date
  const handleViewModeChange = (mode: 'behaviors' | 'rewards') => {
    setViewMode(mode);
  };

  // Load daily events function - can be called from handlers
  const loadDailyEvents = async () => {
    if (!selectedChildProfileId) return;

    try {
      const summary = await rewardsService.getDailySummary(selectedChildProfileId, selectedDate);
      const { databaseService } = require('../services/database');
      const events = await databaseService.getDailyPointEvents(selectedChildProfileId, selectedDate);

      // Calculate balance before this day (for running balance display)
      const selectedDayStart = new Date(selectedDate);
      selectedDayStart.setHours(0, 0, 0, 0);
      
      const priorEvents = await databaseService.getPointEvents({ 
        childProfileId: selectedChildProfileId,
        dateRange: { start: new Date(0), end: new Date(selectedDayStart.getTime() - 1) }
      });
      
      const balanceBeforeDay = priorEvents.reduce((sum, event) => sum + event.pointValue, 0);

      setDailyEvents(events);
      setDailyPointsEarned(summary.pointsEarned);
      setDailyPointsSpent(summary.pointsSpent);
      setPriorBalance(balanceBeforeDay);
    } catch (error) {
      console.error('Failed to load daily events:', error);
    }
  };

  // Load daily events when selectedDate changes
  useEffect(() => {
    loadDailyEvents();
  }, [selectedChildProfileId, selectedDate]);

  // Trigger green flash animation
  const triggerFlash = () => {
    flashOpacity.setValue(0.3);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (selectedChildProfileId) {
        refreshData();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChildProfileId])
  );

  const handleManage = () => {
    // Navigate to management screen (behaviors/rewards list)
    if (viewMode === 'behaviors') {
      router.push('/(rewards-forms)/behaviors-list');
    } else {
      router.push('/(rewards-forms)/rewards-list');
    }
  };

  const handleViewLedger = () => {
    router.push('/(rewards-forms)/ledger');
  };

  const handleToggleChecklistMode = () => {
    setChecklistMode(!checklistMode);
    setCheckedItems(new Set());
  };

  const handleCheckItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleLogChecked = async () => {
    if (viewMode === 'behaviors') {
      for (const behaviorId of checkedItems) {
        try {
          await logBehavior(behaviorId, selectedDate);
        } catch (error) {
          console.error('Failed to log behavior:', error);
        }
      }
    } else {
      for (const rewardId of checkedItems) {
        try {
          await redeemReward(rewardId, selectedDate);
        } catch (error) {
          console.error('Failed to redeem reward:', error);
        }
      }
    }
    triggerFlash(); // Green flash after batch log
    await loadDailyEvents(); // Reload to show new events
    setCheckedItems(new Set());
    setChecklistMode(false);
  };

  const handleBehaviorTap = async (behavior: Behavior) => {
    try {
      await logBehavior(behavior.id, selectedDate);
      triggerFlash(); // Green flash on success
      // Reload daily events to show the new log immediately
      await loadDailyEvents();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to log';
      alert(errorMessage);
    }
  };

  const handleRewardTap = async (reward: Reward) => {
    try {
      await redeemReward(reward.id, selectedDate);
      // Reload daily events to show the new redemption immediately
      await loadDailyEvents();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to redeem';
      alert(errorMessage);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await undoPointEvent(eventId);
      await loadDailyEvents(); // Reload to reflect deletion
    } catch (error) {
      alert('Failed to delete event');
    }
  };

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

  // Calculate running balance for daily activity
  const activityWithRunningBalance = React.useMemo(() => {
    if (dailyEvents.length === 0) return [];
    
    // Events now come from database in chronological order (oldest first)
    // Display them in that order with balance accumulating downward
    
    // Use priorBalance (calculated from all events before selected date)
    const startingBalance = priorBalance;
    
    const result = [];
    let runningBalance = startingBalance;
    
    // Process events in order (oldest to newest)
    for (const event of dailyEvents) {
      runningBalance += event.pointValue;
      result.push({
        event,
        balanceAfter: runningBalance,
      });
    }
    
    return result;
  }, [dailyEvents, priorBalance]);

  // Loading state
  // Loading state
  if (loading && !pointBalance && recentActivity.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !pointBalance && recentActivity.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Button mode="contained" onPress={refreshData} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!loading && behaviors.length === 0 && rewards.length === 0) {
    return (
      <EmptyStateScreen
        onAddBehavior={() => router.push('/(rewards-forms)/behavior-form')}
        onAddReward={() => router.push('/(rewards-forms)/reward-form')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Green flash border overlay */}
      <Animated.View 
        style={[
          styles.flashBorder,
          { opacity: flashOpacity }
        ]}
        pointerEvents="none"
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Header: Points + Date Selector */}
        <View style={styles.compactHeader}>
          {/* Left: Title and Points */}
          <View style={styles.headerLeft}>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              🎁 Rewards
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceGradient}>
                <Text style={styles.balanceText}>{pointBalance}</Text>
              </View>
              <Text style={styles.balanceLabel}>Points</Text>
            </View>
          </View>

          {/* Right: Date Selector */}
          <View style={styles.datePickerCompact}>
            <View style={styles.dateButtonRow}>
              <TouchableOpacity 
                style={styles.dateCompactButton}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={styles.dateCompactText}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.todayButtonCompact}
                onPress={() => setSelectedDate(new Date())}
              >
                <Text style={styles.todayButtonCompactText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Segmented Control: Earn Points / Redeem Rewards */}
        <View style={styles.segmentedControlContainer}>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[styles.segment, viewMode === 'behaviors' && styles.segmentActive]}
              onPress={() => handleViewModeChange('behaviors')}
            >
              <Text style={[styles.segmentText, viewMode === 'behaviors' && styles.segmentTextActive]}>
                Earn Points
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segment, viewMode === 'rewards' && styles.segmentActive]}
              onPress={() => handleViewModeChange('rewards')}
            >
              <Text style={[styles.segmentText, viewMode === 'rewards' && styles.segmentTextActive]}>
                Redeem Rewards
              </Text>
            </Pressable>
          </View>

          {/* Batch Mode Toggle - Right Side */}
          <Pressable 
            style={[styles.batchModeToggle, checklistMode && styles.batchModeToggleActive]}
            onPress={handleToggleChecklistMode}
          >
            <IconButton
              icon={checklistMode ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={18}
              iconColor={checklistMode ? '#FFFFFF' : colors.accent}
              style={styles.batchModeIconSmall}
            />
          </Pressable>
        </View>

        {/* Quick Log Section - Limited to 2 rows */}
        <View style={styles.quickLogSection}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {viewMode === 'behaviors' ? 'Quick Log' : 'Quick Redeem'}
            </Text>
            <Button mode="text" onPress={handleManage} compact>
              Manage
            </Button>
          </View>

          {viewMode === 'behaviors' ? (
            behaviors.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>No behaviors yet</Text>
                  <Button mode="text" onPress={handleManage} style={styles.emptyButton}>
                    Add Behavior
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <View style={styles.carouselWrapper}>
                <FlatList
                  data={Array.from({ length: Math.ceil(behaviors.length / 6) })}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={Dimensions.get('window').width - (spacing.screenPadding * 2)}
                  snapToAlignment="start"
                  contentContainerStyle={styles.horizontalScrollContent}
                  style={styles.flatListStyle}
                  keyExtractor={(_, index) => `page-${index}`}
                  removeClippedSubviews={false}
                  renderItem={({ item, index: pageIndex }) => (
                    <View style={styles.itemsGridPage}>
                      {behaviors.slice(pageIndex * 6, pageIndex * 6 + 6).map((behavior) => (
                        <Pressable
                          key={behavior.id}
                          onPress={() => checklistMode ? handleCheckItem(behavior.id) : handleBehaviorTap(behavior)}
                          style={({ pressed }) => [
                            styles.quickLogItem,
                            pressed && styles.quickLogItemPressed,
                            checklistMode && checkedItems.has(behavior.id) && styles.quickLogItemChecked,
                          ]}
                        >
                          <Text style={styles.itemEmoji}>{behavior.emoji}</Text>
                          <Text style={styles.itemTitle} numberOfLines={2}>
                            {behavior.title}
                          </Text>
                          <Text style={styles.itemPoints}>+{behavior.pointValue}</Text>
                          
                          {checklistMode && checkedItems.has(behavior.id) && (
                            <View style={styles.checkOverlay}>
                              <Text style={styles.checkMark}>✓</Text>
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                />
              </View>
            )
          ) : (
            rewards.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>No rewards yet</Text>
                  <Button mode="text" onPress={handleManage} style={styles.emptyButton}>
                    Add Reward
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <View style={styles.carouselWrapper}>
                <FlatList
                  data={Array.from({ length: Math.ceil(rewards.length / 6) })}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={Dimensions.get('window').width - (spacing.screenPadding * 2)}
                  snapToAlignment="start"
                  contentContainerStyle={styles.horizontalScrollContent}
                  style={styles.flatListStyle}
                  keyExtractor={(_, index) => `page-${index}`}
                  removeClippedSubviews={false}
                  renderItem={({ item, index: pageIndex }) => (
                    <View style={styles.itemsGridPage}>
                      {rewards.slice(pageIndex * 6, pageIndex * 6 + 6).map((reward) => {
                        const canAfford = pointBalance >= reward.pointCost;
                        return (
                          <Pressable
                            key={reward.id}
                            onPress={() => checklistMode ? handleCheckItem(reward.id) : (canAfford && handleRewardTap(reward))}
                            disabled={!canAfford && !checklistMode}
                            style={({ pressed }) => [
                              styles.quickLogItem,
                              !canAfford && !checklistMode && styles.quickLogItemDisabled,
                              pressed && styles.quickLogItemPressed,
                              checklistMode && checkedItems.has(reward.id) && styles.quickLogItemChecked,
                            ]}
                          >
                            <Text style={[styles.itemEmoji, !canAfford && !checklistMode && styles.itemEmojiDisabled]}>
                              {reward.emoji}
                            </Text>
                            <Text style={[styles.itemTitle, !canAfford && !checklistMode && styles.itemTitleDisabled]} numberOfLines={2}>
                              {reward.title}
                            </Text>
                            <Text style={[styles.itemPoints, styles.itemCost, !canAfford && !checklistMode && styles.itemCostDisabled]}>
                              {reward.pointCost}
                            </Text>
                            
                            {checklistMode && checkedItems.has(reward.id) && (
                              <View style={styles.checkOverlay}>
                                <Text style={styles.checkMark}>✓</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                />
              </View>
            )
          )}
        </View>

        {/* Daily Activity with Running Balance */}
        <View style={styles.activitySection}>
          <Text variant="titleMedium" style={[styles.sectionTitle, styles.activitySectionTitle]}>
            Daily Activity
          </Text>

          {activityWithRunningBalance.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No activity on this day</Text>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.activityCard}>
              <Card.Content style={styles.activityCardContent}>
                {activityWithRunningBalance.map(({ event, balanceAfter }, index) => {
                  const behavior = event.behaviorId
                    ? behaviors.find((b) => b.id === event.behaviorId)
                    : null;
                  const reward = event.rewardId
                    ? rewards.find((r) => r.id === event.rewardId)
                    : null;

                  const emoji = behavior?.emoji || reward?.emoji || '📝';
                  const title = behavior?.title || reward?.title || 'Event';

                  return (
                    <React.Fragment key={event.id}>
                      <View style={styles.activityItem}>
                        <View style={styles.activityLeft}>
                          <Text style={styles.activityEmoji}>{emoji}</Text>
                          <View style={styles.activityDetails}>
                            <Text style={styles.activityTitle}>{title}</Text>
                            <Text style={styles.activityTime}>
                              {formatRelativeTime(event.timestamp)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.activityRight}>
                          <Text
                            style={[
                              styles.activityPoints,
                              { color: event.pointValue > 0 ? '#4CAF50' : '#FF9800' },
                            ]}
                          >
                            {event.pointValue > 0 ? '+' : ''}{event.pointValue}
                          </Text>
                          <Text style={styles.activityBalance}>→ {balanceAfter}</Text>
                          <IconButton
                            icon="delete-outline"
                            size={16}
                            iconColor={colors.danger}
                            onPress={() => handleDeleteEvent(event.id)}
                            style={styles.deleteButton}
                          />
                        </View>
                      </View>

                      {index < activityWithRunningBalance.length - 1 && (
                        <View style={styles.activityDivider} />
                      )}
                    </React.Fragment>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          <Pressable onPress={handleViewLedger} style={styles.ledgerLink}>
            <Text style={styles.ledgerLinkText}>View All Activity →</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Calendar Picker Modal */}
      <CalendarDatePicker
        visible={showCalendar}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setShowCalendar(false);
        }}
        onClose={() => setShowCalendar(false)}
        maxDate={new Date()}
      />

      {/* FAB for logging checked items in checklist mode only */}
      {checklistMode && checkedItems.size > 0 && (
        <FAB
          icon="check-all"
          style={[styles.fab, styles.fabChecklist]}
          onPress={handleLogChecked}
          label={`Log ${checkedItems.size} Selected`}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flashBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: '#4CAF50',
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.cardMargin,
    color: colors.textDim,
    fontSize: typography.body.fontSize,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.cardMargin,
    fontSize: typography.body.fontSize,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.button,
  },
  
  // Compact Header
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: typography.h1.fontSize,
    color: colors.text,
    letterSpacing: typography.h1.letterSpacing,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FF8C42',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  balanceText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  balanceLabel: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    fontWeight: '600',
  },
  
  // Compact Date Picker
  datePickerCompact: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  dateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateCompactButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  dateCompactText: {
    fontSize: typography.small.fontSize,
    color: colors.text,
    fontWeight: '600',
  },
  todayButtonCompact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    backgroundColor: colors.accentLight,
  },
  todayButtonCompactText: {
    fontSize: typography.caption.fontSize,
    color: colors.accent,
    fontWeight: '600',
  },
  
  // Segmented Control
  segmentedControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.borderSubtle,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: typography.small.fontSize,
    fontWeight: '600',
    color: colors.textDim,
    fontFamily: 'Chivo_700Bold',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  
  // Batch Mode Toggle (compact)
  batchModeToggle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchModeToggleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  batchModeIconSmall: {
    margin: 0,
  },
  quickLogSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: typography.h2.fontSize,
    textTransform: typography.h2.textTransform,
    letterSpacing: typography.h2.letterSpacing,
  },
  activitySectionTitle: {
    marginTop: -12, // Pull Daily Activity title upward
    marginBottom: 12, // Add bottom margin to compensate
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  horizontalContainer: {
    backgroundColor: colors.bg,
  },
  carouselWrapper: {
    backgroundColor: colors.bg,
    overflow: 'visible', // Prevent clipping that might cause visual artifacts
  },
  flatListStyle: {
    backgroundColor: 'transparent', // Make FlatList transparent so wrapper shows through
  },
  horizontalScrollView: {
    backgroundColor: colors.bg, // Match page background
    shadowColor: 'transparent', // Remove any shadow
    shadowOpacity: 0,
    elevation: 0,
  },
  horizontalScrollContent: {
    backgroundColor: colors.bg, // Match page background
  },
  itemsGridPage: {
    width: Dimensions.get('window').width - (spacing.screenPadding * 2), // Full screen width minus padding
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Align from top-left, not centered
    alignItems: 'flex-start', // Align to top
    gap: 12,
    paddingHorizontal: 8, // Add balanced horizontal padding
    backgroundColor: colors.bg, // Match page background
    shadowColor: 'transparent', // Remove any shadow
    shadowOpacity: 0,
    elevation: 0,
  },
  quickLogItem: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.card,
    padding: 12,
    width: '31%', // 3 columns per row (original layout)
    alignItems: 'center',
    ...shadows.card,
  },
  quickLogItemPressed: {
    opacity: 0.7,
  },
  quickLogItemChecked: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  quickLogItemDisabled: {
    opacity: 0.5,
  },
  checkOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkbox: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  itemEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  itemEmojiDisabled: {
    opacity: 0.5,
  },
  itemTitle: {
    fontSize: typography.small.fontSize,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 32,
  },
  itemTitleDisabled: {
    color: colors.textDim,
  },
  itemPoints: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
    color: '#4CAF50',
  },
  itemCost: {
    color: '#2196F3',
  },
  itemCostDisabled: {
    color: colors.textDim,
  },
  emptyCard: {
    borderRadius: radius.card,
    backgroundColor: colors.cardBg,
    ...shadows.card,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textDim,
    fontSize: typography.body.fontSize,
    marginBottom: 8,
  },
  emptyButton: {
    marginTop: 4,
  },
  activitySection: {
    marginBottom: 24,
    marginTop: 16,
  },
  activityCard: {
    borderRadius: radius.card,
    backgroundColor: colors.cardBg,
    ...shadows.card,
  },
  activityCardContent: {
    padding: 0,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.cardPadding,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
    marginBottom: 2,
  },
  activityTime: {
    color: colors.textDim,
    fontSize: typography.caption.fontSize,
  },
  activityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityPoints: {
    fontWeight: '700',
    fontSize: typography.body.fontSize,
    minWidth: 36,
    textAlign: 'right',
  },
  activityBalance: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    minWidth: 48,
    textAlign: 'right',
  },
  deleteButton: {
    margin: 0,
  },
  activityDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.cardPadding,
  },
  ledgerLink: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  ledgerLinkText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.accent,
  },
  fabChecklist: {
    backgroundColor: '#4CAF50',
  },
});
