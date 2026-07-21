import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radius, shadows } from '../../constants/theme';
import { useRewards } from '../../contexts/RewardsContext';
import { PointEvent } from '../../models';

/**
 * Ledger Screen - Complete History
 * Shows all point events in chronological order (most recent first)
 * Grouped by date with daily summaries
 * 
 * Requirements: Historical point event tracking, complete activity log
 */

interface DayGroup {
  date: Date;
  dateStr: string;
  events: PointEvent[];
  pointsEarned: number;
  pointsSpent: number;
  netPoints: number;
}

export default function LedgerScreen() {
  const router = useRouter();
  const { selectedChildProfileId, behaviors, rewards, updatePointEvent } = useRewards();
  const [groupedEvents, setGroupedEvents] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all events and group by day
  useEffect(() => {
    const loadAllEvents = async () => {
      if (!selectedChildProfileId) return;

      setLoading(true);
      try {
        const { databaseService } = require('../../services/database');
        
        // Get all point events for this profile, sorted chronologically
        const allEvents = await databaseService.getPointEvents({
          childProfileId: selectedChildProfileId,
        });

        // Sort all events chronologically (oldest first for balance calculation)
        const sortedEvents = allEvents.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Calculate running balance for each event
        let runningBalance = 0;
        const eventsWithBalance = sortedEvents.map(event => {
          runningBalance += event.pointValue;
          return {
            ...event,
            balanceAfter: runningBalance,
          };
        });

        // Reverse for display (most recent first)
        const displayEvents = [...eventsWithBalance].reverse();

        // Group by date
        const groups: Map<string, DayGroup & { events: Array<PointEvent & { balanceAfter: number }> }> = new Map();
        
        for (const event of displayEvents) {
          const eventDate = new Date(event.timestamp);
          eventDate.setHours(0, 0, 0, 0);
          const dateKey = eventDate.toISOString();
          
          if (!groups.has(dateKey)) {
            groups.set(dateKey, {
              date: eventDate,
              dateStr: formatDateHeader(eventDate),
              events: [],
              pointsEarned: 0,
              pointsSpent: 0,
              netPoints: 0,
            });
          }
          
          const group = groups.get(dateKey)!;
          group.events.push(event);
          
          if (event.pointValue > 0) {
            group.pointsEarned += event.pointValue;
          } else {
            group.pointsSpent += Math.abs(event.pointValue);
          }
          group.netPoints += event.pointValue;
        }

        // Sort groups by date (most recent first)
        const sortedGroups = Array.from(groups.values()).sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );

        setGroupedEvents(sortedGroups as any);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllEvents();
  }, [selectedChildProfileId]);

  const formatDateHeader = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (checkDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getBehaviorName = (behaviorId: string): string => {
    const behavior = behaviors.find(b => b.id === behaviorId);
    return behavior ? `${behavior.emoji} ${behavior.title}` : 'Unknown Behavior';
  };

  const getRewardName = (rewardId: string): string => {
    const reward = rewards.find(r => r.id === rewardId);
    return reward ? `${reward.emoji} ${reward.title}` : 'Unknown Reward';
  };

  const handleEditEventTimestamp = (event: PointEvent) => {
    Alert.prompt(
      'Edit Time',
      'Enter new time (HH:MM in 24-hour format)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (input) => {
            if (!input) return;
            
            try {
              const [hours, minutes] = input.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                Alert.alert('Invalid Time', 'Please enter time in HH:MM format (e.g., 14:30)');
                return;
              }

              const newTimestamp = new Date(event.timestamp);
              newTimestamp.setHours(hours, minutes, 0, 0);

              await updatePointEvent(event.id, { timestamp: newTimestamp });
              
              Alert.alert('Success', 'Event time updated');
              
              // Reload events
              const newDate = new Date();
              setLoading(true);
              // Trigger re-render by updating a dummy state
              setGroupedEvents([]);
              setTimeout(() => setLoading(false), 100);
            } catch (error) {
              Alert.alert('Error', 'Failed to update event time');
              console.error(error);
            }
          },
        },
      ],
      'plain-text',
      formatTime(event.timestamp).replace(/\s[AP]M/, '')
    );
  };

  const handleDeleteEvent = (event: PointEvent) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this point event? This will affect the point balance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { databaseService } = require('../../services/database');
              await databaseService.deletePointEvent(event.id);
              
              Alert.alert('Success', 'Event deleted');
              
              // Reload events
              setLoading(true);
              setGroupedEvents([]);
              setTimeout(() => setLoading(false), 100);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
              console.error(error);
            }
          },
        },
      ]
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
        <Text style={styles.headerTitle}>All Activity</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Complete History */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : groupedEvents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyCardTitle}>No Activity Yet</Text>
              <Text style={styles.emptyCardText}>
                Start logging behaviors and redeeming rewards to build your history
              </Text>
            </Card.Content>
          </Card>
        ) : (
          groupedEvents.map((day) => (
            <View key={day.date.toISOString()} style={styles.daySection}>
              {/* Date Header with Daily Summary */}
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>{day.dateStr}</Text>
                <View style={styles.dateSummary}>
                  {day.pointsEarned > 0 && (
                    <Text style={styles.earnedBadge}>+{day.pointsEarned}</Text>
                  )}
                  {day.pointsSpent > 0 && (
                    <Text style={styles.spentBadge}>-{day.pointsSpent}</Text>
                  )}
                  {day.netPoints !== 0 && (
                    <View style={[
                      styles.netBadge,
                      day.netPoints > 0 ? styles.netBadgePositive : styles.netBadgeNegative
                    ]}>
                      <Text style={[
                        styles.netBadgeText,
                        day.netPoints > 0 ? styles.netBadgeTextPositive : styles.netBadgeTextNegative
                      ]}>
                        {day.netPoints > 0 ? '+' : ''}{day.netPoints}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Events for this day */}
              {day.events.map((event: any) => (
                <Pressable
                  key={event.id}
                  onLongPress={() => {
                    Alert.alert(
                      'Edit Event',
                      'What would you like to do?',
                      [
                        {
                          text: 'Change Time',
                          onPress: () => handleEditEventTimestamp(event),
                        },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => handleDeleteEvent(event),
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Card style={styles.eventCard}>
                    <View style={styles.eventContent}>
                      <View style={styles.eventMain}>
                        <Text style={styles.eventTime}>
                          {formatTime(event.timestamp)}
                        </Text>
                        <Text style={styles.eventTitle}>
                          {event.type === 'behavior' 
                            ? getBehaviorName(event.behaviorId || '')
                            : getRewardName(event.rewardId || '')}
                        </Text>
                      </View>
                      <View style={styles.eventRight}>
                        <View style={[
                          styles.pointsChip,
                          event.type === 'behavior' ? styles.pointsChipEarned : styles.pointsChipSpent
                        ]}>
                          <Text style={[
                            styles.pointsChipText,
                            event.type === 'behavior' ? styles.pointsChipTextEarned : styles.pointsChipTextSpent
                          ]}>
                            {event.type === 'behavior' ? '+' : '-'}{Math.abs(event.pointValue)} pts
                          </Text>
                        </View>
                        <Text style={styles.balanceAfter}>→ {event.balanceAfter}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ))
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  loadingText: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: 32,
  },
  emptyCard: {
    borderRadius: radius.card,
    backgroundColor: colors.cardBg,
    ...shadows.card,
  },
  emptyCardTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCardText: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    textAlign: 'center',
  },
  daySection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dateText: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  dateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earnedBadge: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
    color: '#4CAF50',
  },
  spentBadge: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
    color: '#FF9800',
  },
  netBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  netBadgePositive: {
    backgroundColor: '#E8F5E9',
    borderColor: 'rgba(76,175,80,0.3)',
  },
  netBadgeNegative: {
    backgroundColor: '#FFF3E0',
    borderColor: 'rgba(255,152,0,0.3)',
  },
  netBadgeText: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
  },
  netBadgeTextPositive: {
    color: '#4CAF50',
  },
  netBadgeTextNegative: {
    color: '#FF9800',
  },
  eventCard: {
    borderRadius: radius.card,
    backgroundColor: colors.cardBg,
    marginBottom: 8,
    ...shadows.card,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  eventMain: {
    flex: 1,
  },
  eventRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  eventTime: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  pointsChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  pointsChipEarned: {
    backgroundColor: '#E8F5E9',
    borderColor: 'rgba(76,175,80,0.3)',
  },
  pointsChipSpent: {
    backgroundColor: '#FFF3E0',
    borderColor: 'rgba(255,152,0,0.3)',
  },
  pointsChipText: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
  },
  pointsChipTextEarned: {
    color: '#4CAF50',
  },
  pointsChipTextSpent: {
    color: '#FF9800',
  },
  balanceAfter: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    minWidth: 48,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    textAlign: 'center',
  },
});
