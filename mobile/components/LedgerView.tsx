import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { PointEvent, Behavior, Reward, DailySummary } from '../models';
import { DayDetailView } from './DayDetailView';
import { LedgerFilterModal, LedgerFilterType } from './LedgerFilterModal';

/**
 * LedgerView Component
 * 
 * Displays complete point history with:
 * - Calendar interface with month navigation
 * - Daily summaries with color coding (green/orange/neutral)
 * - Tap on day to view detailed transactions
 * - Filter support for activity type
 * 
 * Requirements covered: 17.1, 17.2, 17.3, 17.4, 17.6, 17.7, 17.8
 * 
 * @param pointEvents - All point events for current child profile
 * @param behaviors - All behaviors (for lookup)
 * @param rewards - All rewards (for lookup)
 * @param onEventPress - Callback when event is tapped
 */

interface LedgerViewProps {
  pointEvents: PointEvent[];
  behaviors: Behavior[];
  rewards: Reward[];
  onEventPress?: (event: PointEvent) => void;
}

export function LedgerView({
  pointEvents,
  behaviors,
  rewards,
  onEventPress,
}: LedgerViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<LedgerFilterType>('all');

  // Filter events based on active filter
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') {
      return pointEvents;
    }
    if (activeFilter === 'earned') {
      return pointEvents.filter((e) => e.type === 'behavior' && e.pointValue > 0);
    }
    if (activeFilter === 'spent') {
      return pointEvents.filter((e) => e.type === 'redemption');
    }
    return pointEvents;
  }, [pointEvents, activeFilter]);

  // Calculate daily summaries for calendar
  const dailySummaries = useMemo(() => {
    const summaries: Record<string, DailySummary> = {};

    filteredEvents.forEach((event) => {
      const date = new Date(event.timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!summaries[dateKey]) {
        summaries[dateKey] = {
          date,
          pointsEarned: 0,
          pointsSpent: 0,
          netPoints: 0,
          eventCount: 0,
        };
      }

      const summary = summaries[dateKey];
      summary.eventCount++;

      if (event.pointValue > 0) {
        summary.pointsEarned += event.pointValue;
      } else {
        summary.pointsSpent += Math.abs(event.pointValue);
      }

      summary.netPoints = summary.pointsEarned - summary.pointsSpent;
    });

    return summaries;
  }, [filteredEvents]);

  // Convert summaries to calendar marked dates
  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    Object.keys(dailySummaries).forEach((dateKey) => {
      const summary = dailySummaries[dateKey];
      let color = '#E0E0E0'; // Neutral gray for zero

      if (summary.netPoints > 0) {
        color = '#4CAF50'; // Green for positive
      } else if (summary.netPoints < 0) {
        color = '#FF9800'; // Muted orange for negative
      }

      marked[dateKey] = {
        marked: true,
        dotColor: color,
        selected: dateKey === selectedDate,
        selectedColor: selectedDate === dateKey ? '#2196F3' : undefined,
      };
    });

    // Also mark selected date even if no events
    if (selectedDate && !marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#2196F3',
      };
    }

    return marked;
  }, [dailySummaries, selectedDate]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];

    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.timestamp);
      const eventDateKey = eventDate.toISOString().split('T')[0];
      return eventDateKey === selectedDate;
    });
  }, [filteredEvents, selectedDate]);

  // Handle day press
  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  // Handle month change
  const handleMonthChange = (month: DateData) => {
    setCurrentMonth(month.dateString.substring(0, 7));
  };

  // Navigate month
  const goToPreviousMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date.toISOString().substring(0, 7));
  };

  const goToNextMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date.toISOString().substring(0, 7));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.toISOString().substring(0, 7));
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Handle filter
  const handleFilterApply = (filter: LedgerFilterType) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
    setSelectedDate(null); // Reset selection when filter changes
  };

  // Format month display
  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Point Ledger
          </Text>
          {activeFilter !== 'all' && (
            <View style={styles.filterBadge}>
              <Text variant="bodySmall" style={styles.filterBadgeText}>
                {activeFilter === 'earned' ? 'Earned' : 'Spent'}
              </Text>
            </View>
          )}
        </View>
        <IconButton
          icon="filter-variant"
          size={24}
          onPress={() => setShowFilterModal(true)}
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <IconButton icon="chevron-left" onPress={goToPreviousMonth} />
          <Text variant="titleLarge" style={styles.monthText}>
            {formatMonth(currentMonth)}
          </Text>
          <IconButton icon="chevron-right" onPress={goToNextMonth} />
        </View>

        {/* Today Button */}
        <View style={styles.todayButtonContainer}>
          <Button
            mode="outlined"
            onPress={goToToday}
            compact
            style={styles.todayButton}
          >
            Today
          </Button>
        </View>

        {/* Calendar */}
        <Calendar
          current={currentMonth + '-15'}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          markedDates={markedDates}
          theme={{
            backgroundColor: '#FFFFFF',
            calendarBackground: '#FFFFFF',
            textSectionTitleColor: '#757575',
            selectedDayBackgroundColor: '#2196F3',
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: '#2196F3',
            dayTextColor: '#212121',
            textDisabledColor: '#BDBDBD',
            dotColor: '#2196F3',
            selectedDotColor: '#FFFFFF',
            arrowColor: '#2196F3',
            monthTextColor: '#212121',
            textDayFontWeight: '400',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 14,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 12,
          }}
          style={styles.calendar}
        />

        {/* Hint Text */}
        <Text variant="bodySmall" style={styles.hintText}>
          Tap a day to see details
        </Text>

        {/* Selected Day Detail */}
        {selectedDate && (
          <View style={styles.dayDetail}>
            <DayDetailView
              date={new Date(selectedDate + 'T12:00:00')}
              events={selectedDateEvents}
              behaviors={behaviors}
              rewards={rewards}
              onEventPress={onEventPress}
            />
          </View>
        )}

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No activity yet
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Point events will appear here
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <LedgerFilterModal
        visible={showFilterModal}
        currentFilter={activeFilter}
        onApply={handleFilterApply}
        onCancel={() => setShowFilterModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
  filterBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  filterBadgeText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  monthText: {
    fontWeight: 'bold',
    color: '#212121',
    minWidth: 200,
    textAlign: 'center',
  },
  todayButtonContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  todayButton: {
    borderColor: '#2196F3',
  },
  calendar: {
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 1,
  },
  hintText: {
    textAlign: 'center',
    color: '#757575',
    marginTop: 16,
    marginBottom: 8,
  },
  dayDetail: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#757575',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#BDBDBD',
    textAlign: 'center',
  },
});
