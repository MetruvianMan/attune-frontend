import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useDateNavigation } from '../contexts/DateNavigationContext';
import { databaseService } from '../services/database';
import { EventType } from '../models';
import { colors } from '../constants/theme';

// Note: LinearGradient requires native rebuild with dev client
// Using solid colors for now - gradients will work after rebuild
// import { LinearGradient } from 'expo-linear-gradient';

type MoodColor = 'green' | 'amber' | 'red';

// Event types matching web app
const RED_EVENTS: EventType[] = ['meltdown', 'shutdown', 'conflict', 'school_incident', 'aggression', 'poor_transitions', 'refusal', 'naughty', 'bad_language', 'injury', 'sneaky', 'toilet_issue', 'angry', 'didnt_eat_dinner', 'overwhelm'];
const GREEN_EVENTS: EventType[] = ['great_day', 'positive_behavior', 'good_sleep', 'good_dinner', 'played_outside', 'family_adventure', 'kindness', 'reading', 'focus', 'chores', 'drew_comics', 'playdate', 'sibling_harmony', 'helpful', 'bounceback', 'dad_bonding', 'mom_bonding', 'camp', 'creative'];

interface DayData {
  dateKey: string;
  day: number;
  mood: MoodColor | null;
  eventCount: number;
  eventsByType: Record<string, number>;
}

interface HeatMapViewProps {
  childProfileId: string;
}

function moodToGradient(mood: MoodColor | null): [string, string] {
  switch (mood) {
    case 'red': return ['#EF5350', '#C62828'];
    case 'amber': return ['#FFCA28', '#F57F17'];
    case 'green': return ['#66BB6A', '#2E7D32'];
    default: return ['#EEEEEE', '#BDBDBD'];
  }
}

function moodToColor(mood: MoodColor | null): string {
  switch (mood) {
    case 'red': return '#E53935';
    case 'amber': return '#FFB300';
    case 'green': return '#43A047';
    default: return '#E8E8E8';
  }
}

function computeCellOpacity(eventCount: number, maxEventCount: number): number {
  if (maxEventCount <= 0) return 0.35;
  return Math.min(1.0, 0.5 + 0.5 * (eventCount / maxEventCount));
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HeatMapView({ childProfileId }: HeatMapViewProps) {
  const router = useRouter();
  const { setSelectedDate } = useDateNavigation();
  const [displayDate, setDisplayDate] = useState(new Date());
  const [monthData, setMonthData] = useState<DayData[]>([]);
  const [maxEventCount, setMaxEventCount] = useState(1);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [analytics, setAnalytics] = useState({ good: 0, mixed: 0, difficult: 0, total: 0 });

  // Reload data when component becomes visible
  useFocusEffect(
    React.useCallback(() => {
      loadMonthData();
    }, [childProfileId, displayDate])
  );

  const loadMonthData = async () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Get all events in the month
    const events = await databaseService.getEvents({
      childProfileId,
      dateRange: { start: startOfMonth, end: endOfMonth },
    });

    // Group events by date
    const eventsByDate = new Map<string, typeof events>();
    for (const event of events) {
      const key = toDateKey(event.timestamp);
      const existing = eventsByDate.get(key) ?? [];
      existing.push(event);
      eventsByDate.set(key, existing);
    }

    // Build day data for the month
    const daysInMonth = endOfMonth.getDate();
    const data: DayData[] = [];
    let maxCount = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDateKey(new Date(year, month, day));
      const dayEvents = eventsByDate.get(dateKey) ?? [];
      const mood = computeAutoMoodFromEvents(dayEvents);
      
      // Count events by type
      const eventsByType: Record<string, number> = {};
      for (const event of dayEvents) {
        eventsByType[event.eventType] = (eventsByType[event.eventType] ?? 0) + 1;
      }

      data.push({
        dateKey,
        day,
        mood,
        eventCount: dayEvents.length,
        eventsByType,
      });

      if (dayEvents.length > maxCount) {
        maxCount = dayEvents.length;
      }
    }

    setMonthData(data);
    setMaxEventCount(maxCount);

    // Calculate analytics
    const analyticsData = {
      good: data.filter(d => d.mood === 'green').length,
      mixed: data.filter(d => d.mood === 'amber').length,
      difficult: data.filter(d => d.mood === 'red').length,
      total: data.filter(d => d.mood !== null).length,
    };
    setAnalytics(analyticsData);
  };

  const handlePrevMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
  };

  const handleDayPress = (dayData: DayData) => {
    // Navigate to Today tab with this date
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const selectedDateObj = new Date(year, month, dayData.day);
    
    console.log('Navigate to date:', dayData.dateKey);
    setSelectedDate(selectedDateObj);
    router.push('/(tabs)/');
  };

  // Build calendar grid
  const firstDayOfWeek = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const cells: (DayData | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDayOfWeek + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      cells.push(monthData.find(d => d.day === dayNum) || null);
    }
  }

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <View style={styles.monthLabelContainer}>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[displayDate.getMonth()]} {displayDate.getFullYear()}
          </Text>
          {analytics.total > 0 && (
            <Text style={styles.analyticsText}>
              {analytics.good} good · {analytics.mixed} mixed · {analytics.difficult} difficult
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Day Labels */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((label, index) => (
          <Text key={index} style={styles.dayLabel}>{label}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {cells.map((dayData, index) => {
          if (!dayData) {
            return <View key={index} style={styles.emptyCell} />;
          }

          const opacity = computeCellOpacity(dayData.eventCount, maxEventCount);
          const cellColor = moodToColor(dayData.mood);

          return (
            <TouchableOpacity
              key={index}
              style={styles.cellWrapper}
              onPress={() => handleDayPress(dayData)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayCell,
                  { backgroundColor: cellColor, opacity }
                ]}
              >
                <Text style={[
                  styles.dayCellText,
                  { color: dayData.mood === null ? colors.textMuted : '#fff' }
                ]}>
                  {dayData.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#43A047' }]} />
          <Text style={styles.legendText}>Good day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FFB300' }]} />
          <Text style={styles.legendText}>Mixed day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#E53935' }]} />
          <Text style={styles.legendText}>Tough day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#E0E0E0' }]} />
          <Text style={styles.legendText}>No data</Text>
        </View>
      </View>

      {/* Popover Modal */}
      <Modal
        visible={popoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPopoverVisible(false)}
      >
        <TouchableOpacity
          style={styles.popoverOverlay}
          activeOpacity={1}
          onPress={() => setPopoverVisible(false)}
        >
          <View style={styles.popover}>
            {selectedDay && (
              <>
                <Text style={styles.popoverDate}>{selectedDay.dateKey}</Text>
                {selectedDay.eventCount === 0 ? (
                  <Text style={styles.popoverNoData}>No events logged</Text>
                ) : (
                  <>
                    {Object.entries(selectedDay.eventsByType).map(([type, count]) => (
                      <Text key={type} style={styles.popoverEvent}>
                        {type.replace(/_/g, ' ')}: {count}
                      </Text>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  navButton: {
    padding: 6,
  },
  navButtonText: {
    fontSize: 15,
    color: colors.primary,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  analyticsText: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 3,
    gap: 2,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: 6,
  },
  cellWrapper: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 1.5,
  },
  dayCell: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  legendColor: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: colors.textDim,
  },
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popover: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  popoverDate: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: colors.text,
  },
  popoverNoData: {
    fontSize: 12,
    color: colors.textDim,
  },
  popoverEvent: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 2,
  },
});
