import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useDateNavigation } from '../contexts/DateNavigationContext';
import { databaseService } from '../services/database';
import { EventType } from '../models';
import { colors } from '../constants/theme';

const DAYS_TO_SHOW = 60;
const DAY_HEADERS = ['M', 'T', 'W', 'Th', 'F', 'S', 'S'];

type MoodColor = 'green' | 'amber' | 'red';

// Event types matching web app
const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue', 'angry', 'didnt_eat_dinner', 'overwhelm'];
const GREEN_EVENTS: EventType[] = ['great_day', 'positive_behavior', 'good_sleep', 'good_dinner', 'played_outside', 'family_adventure', 'kindness', 'reading', 'focus', 'chores', 'drew_comics', 'playdate', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding', 'camp', 'creative'];

interface DayAggregate {
  dateKey: string;
  date: Date;
  effectiveMood: MoodColor | null;
  totalEventCount: number;
}

interface WeatherViewProps {
  childProfileId: string;
}

function moodToWeatherIcon(mood: MoodColor | null): string {
  switch (mood) {
    case 'red': return '⛈️';
    case 'amber': return '⛅';
    case 'green': return '☀️';
    default: return '·';
  }
}

function moodToTint(mood: MoodColor | null): string {
  switch (mood) {
    case 'red': return 'rgba(235,87,87,0.25)';
    case 'amber': return 'rgba(242,201,76,0.25)';
    case 'green': return 'rgba(127,191,159,0.25)';
    default: return 'transparent';
  }
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function computeAutoMoodFromEvents(events: { eventType: string; severity?: number | null; valence?: 'positive' | 'negative' | 'neutral' | null }[]): MoodColor | null {
  if (events.length === 0) return null;
  let score = 0;
  for (const e of events) {
    // First, check if event has a manually set valence (overrides type-based defaults)
    if (e.valence) {
      if (e.valence === 'positive') {
        score += 2;
      } else if (e.valence === 'negative') {
        score -= (e.severity ?? getDefaultSeverity(e.eventType));
      }
      // neutral valence doesn't shift score
    } else {
      // Fall back to type-based valence detection
      if (RED_EVENTS.includes(e.eventType as EventType)) {
        score -= (e.severity ?? getDefaultSeverity(e.eventType));
      } else if (GREEN_EVENTS.includes(e.eventType as EventType)) {
        score += 2;
      }
    }
  }
  if (score <= -3) return 'red';
  if (score < 3) return 'amber';
  return 'green';
}

// Get default severity for event types (some are less severe than others)
function getDefaultSeverity(eventType: string): number {
  // Moderate negative events get severity 2
  if (eventType === 'angry' || eventType === 'didnt_eat_dinner') {
    return 2;
  }
  // All other negative events default to severity 3
  return 3;
}

export function WeatherView({ childProfileId }: WeatherViewProps) {
  const router = useRouter();
  const { setSelectedDate } = useDateNavigation();
  const [aggregates, setAggregates] = useState<DayAggregate[]>([]);
  const [weeks, setWeeks] = useState<Array<Array<{ date: Date; dateKey: string } | null>>>([]);
  const [aggregateMap, setAggregateMap] = useState<Map<string, DayAggregate>>(new Map());
  const [analytics, setAnalytics] = useState({ good: 0, mixed: 0, difficult: 0, total: 0 });
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Track which month we're viewing
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Reload data when component becomes visible or when month changes
  useFocusEffect(
    React.useCallback(() => {
      loadMoodData();
    }, [childProfileId, currentMonth])
  );

  const loadMoodData = async () => {
    // Instead of last 60 days, show the entire current month plus some buffer
    const viewingMonth = currentMonth.getMonth();
    const viewingYear = currentMonth.getFullYear();
    
    // Start from the 1st of the viewing month
    const startDate = new Date(viewingYear, viewingMonth, 1);
    // End at the last day of the viewing month
    const endDate = new Date(viewingYear, viewingMonth + 1, 0, 23, 59, 59, 999);

    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    // Get all events in the range
    const events = await databaseService.getEvents({
      childProfileId,
      dateRange: { start: rangeStart, end: rangeEnd },
    });

    // Group events by date key
    const eventsByDate = new Map<string, typeof events>();
    for (const event of events) {
      const key = toDateKey(event.timestamp);
      const existing = eventsByDate.get(key) ?? [];
      existing.push(event);
      eventsByDate.set(key, existing);
    }

    // Build aggregates for each day
    const dayAggregates: DayAggregate[] = [];
    const current = new Date(rangeStart);
    const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

    while (current <= end) {
      const dateKey = toDateKey(current);
      const dayEvents = eventsByDate.get(dateKey) ?? [];

      // Compute mood from events (could be extended to check DayMood table in future)
      const effectiveMood = computeAutoMoodFromEvents(dayEvents);

      dayAggregates.push({
        dateKey,
        date: new Date(current),
        effectiveMood,
        totalEventCount: dayEvents.length,
      });

      current.setDate(current.getDate() + 1);
    }

    setAggregates(dayAggregates);

    // Calculate analytics for this month (not just last 14 days)
    const analyticsData = {
      good: dayAggregates.filter(d => d.effectiveMood === 'green').length,
      mixed: dayAggregates.filter(d => d.effectiveMood === 'amber').length,
      difficult: dayAggregates.filter(d => d.effectiveMood === 'red').length,
      total: dayAggregates.filter(d => d.effectiveMood !== null).length,
    };
    setAnalytics(analyticsData);

    // Build aggregate map
    const map = new Map(dayAggregates.map(a => [a.dateKey, a]));
    setAggregateMap(map);

    // Build weeks for calendar grid - start from first Monday of the month
    const firstDayOfMonth = new Date(viewingYear, viewingMonth, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const firstMonday = new Date(firstDayOfMonth);
    firstMonday.setDate(firstDayOfMonth.getDate() + mondayOffset);

    // Build weeks from firstMonday through end of month
    const weeksList: Array<Array<{ date: Date; dateKey: string } | null>> = [];
    const cursor = new Date(firstMonday);
    const lastDayOfMonth = new Date(viewingYear, viewingMonth + 1, 0);

    while (cursor <= lastDayOfMonth) {
      const week: Array<{ date: Date; dateKey: string } | null> = [];
      for (let d = 0; d < 7; d++) {
        if (cursor < startDate || cursor > endDate) {
          week.push(null); // empty cell for days outside month
        } else {
          const dateKey = toDateKey(cursor);
          week.push({ date: new Date(cursor), dateKey });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeksList.push(week);
    }

    setWeeks(weeksList);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };

  const goToNextMonth = () => {
    const today = new Date();
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      // Don't go past current month
      if (newMonth > today) {
        return prevMonth;
      }
      return newMonth;
    });
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear();
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDayPress = (daySlot: { date: Date; dateKey: string }) => {
    // Set the date in navigation context and switch to Today tab
    console.log('Navigate to date:', daySlot.dateKey);
    setSelectedDate(daySlot.date);
    router.push('/(tabs)/');
  };

  return (
    <View style={styles.container}>
      {/* Month navigation header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity 
          onPress={goToPreviousMonth}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.monthTitleContainer}>
          <Text style={styles.title}>{formatMonthYear(currentMonth)}</Text>
          {analytics.total > 0 && (
            <Text style={styles.analyticsText}>
              {analytics.good} good {analytics.good === 1 ? 'day' : 'days'}
            </Text>
          )}
        </View>

        <TouchableOpacity 
          onPress={goToNextMonth}
          style={[styles.navButton, isCurrentMonth() && styles.navButtonDisabled]}
          disabled={isCurrentMonth()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.navButtonText, isCurrentMonth() && styles.navButtonTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((dayName, index) => (
          <View key={index} style={styles.headerCell}>
            <Text style={styles.headerText}>{dayName}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid with vertical scroll - increased height for 5+ weeks */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
      >
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((daySlot, dayIndex) => {
              if (!daySlot) {
                return <View key={dayIndex} style={styles.emptyCell} />;
              }

              const agg = aggregateMap.get(daySlot.dateKey);
              const mood = agg?.effectiveMood ?? null;

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    { backgroundColor: moodToTint(mood) },
                  ]}
                  onPress={() => handleDayPress(daySlot)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.weatherIcon}>{moodToWeatherIcon(mood)}</Text>
                  <Text style={styles.dateLabel}>{daySlot.date.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>☀️</Text>
          <Text style={styles.legendText}>Good day</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>⛅</Text>
          <Text style={styles.legendText}>Mixed day</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>⛈️</Text>
          <Text style={styles.legendText}>Tough day</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>·</Text>
          <Text style={styles.legendText}>No data</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74,144,226,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  navButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.accent,
    lineHeight: 28,
  },
  navButtonTextDisabled: {
    color: colors.textMuted,
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  analyticsText: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textDim,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 3,
  },
  headerCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  gridScroll: {
    maxHeight: 380, // Increased from 260 to show 5+ weeks without cutoff
    borderRadius: 10,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  emptyCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  weatherIcon: {
    fontSize: 18,
    lineHeight: 18,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendIcon: {
    fontSize: 16,
  },
  legendText: {
    fontSize: 11,
    color: colors.textDim,
  },
});
