import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getObservationDays, getObservationEntriesForDay } from '../services/observation-service';
import { DiaryEntry } from '../models';
import { getEntryColors, getVisibleHighlightedRanges, OBSERVATION_HIGHLIGHT_STYLE } from '../constants/entry-colors';
import { HighlightedText } from './HighlightedText';
import { colors } from '../constants/theme';

const DAY_HEADERS = ['M', 'T', 'W', 'Th', 'F', 'S', 'S'];

interface ObservationCalendarViewProps {
  childProfileId: string;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Month-grid calendar marking days that contain at least one Observation
 * (or Both) entry - see .kiro/specs/parent-observations/ Requirement 4.
 * Follows the exact same month-grid skeleton as WeatherView.tsx (month
 * nav header, day-of-week header row, currentMonth state, useFocusEffect
 * reload, week-row grid), swapping mood-tint coloring for a simple
 * marked/unmarked boolean per day sourced from observation-service.ts.
 */
export function ObservationCalendarView({ childProfileId }: ObservationCalendarViewProps) {
  const [weeks, setWeeks] = useState<Array<Array<{ date: Date; dateKey: string } | null>>>([]);
  const [observationDays, setObservationDays] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = React.useRef(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedDayEntries, setSelectedDayEntries] = useState<DiaryEntry[]>([]);
  const [popoverVisible, setPopoverVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadObservationData();
    }, [childProfileId, currentMonth])
  );

  const loadObservationData = async () => {
    const isFirstLoad = !hasLoadedOnce.current;
    if (isFirstLoad) {
      setIsLoading(true);
    }
    try {
      await loadObservationDataInternal();
    } finally {
      if (isFirstLoad) {
        setIsLoading(false);
      }
      hasLoadedOnce.current = true;
    }
  };

  const loadObservationDataInternal = async () => {
    const viewingMonth = currentMonth.getMonth();
    const viewingYear = currentMonth.getFullYear();

    const startDate = new Date(viewingYear, viewingMonth, 1);
    const endDate = new Date(viewingYear, viewingMonth + 1, 0);

    const days = await getObservationDays(childProfileId, {
      start: toDateKey(startDate),
      end: toDateKey(endDate),
    });
    setObservationDays(days);

    // Build weeks for the calendar grid - start from first Monday of the
    // month, same algorithm as WeatherView.tsx.
    const firstDayOfMonth = new Date(viewingYear, viewingMonth, 1);
    const dayOfWeek = firstDayOfMonth.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const firstMonday = new Date(firstDayOfMonth);
    firstMonday.setDate(firstDayOfMonth.getDate() + mondayOffset);

    const weeksList: Array<Array<{ date: Date; dateKey: string } | null>> = [];
    const cursor = new Date(firstMonday);
    const lastDayOfMonth = new Date(viewingYear, viewingMonth + 1, 0);

    while (cursor <= lastDayOfMonth) {
      const week: Array<{ date: Date; dateKey: string } | null> = [];
      for (let d = 0; d < 7; d++) {
        if (cursor < startDate || cursor > endDate) {
          week.push(null);
        } else {
          week.push({ date: new Date(cursor), dateKey: toDateKey(cursor) });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeksList.push(week);
    }

    setWeeks(weeksList);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };

  const goToNextMonth = () => {
    const today = new Date();
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      if (newMonth > today) {
        return prevMonth;
      }
      return newMonth;
    });
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDayPress = async (daySlot: { date: Date; dateKey: string }) => {
    if (!observationDays.has(daySlot.dateKey)) return;
    const entries = await getObservationEntriesForDay(childProfileId, daySlot.dateKey);
    setSelectedDayKey(daySlot.dateKey);
    setSelectedDayEntries(entries);
    setPopoverVisible(true);
  };

  const hasAnyObservationThisMonth = observationDays.size > 0;

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
          {hasAnyObservationThisMonth && (
            <Text style={styles.analyticsText}>
              {observationDays.size} {observationDays.size === 1 ? 'day' : 'days'} with observations
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

      {isLoading ? (
        <View style={styles.gridLoadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((daySlot, dayIndex) => {
                if (!daySlot) {
                  return <View key={dayIndex} style={styles.emptyCell} />;
                }

                const hasObservation = observationDays.has(daySlot.dateKey);

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      hasObservation && styles.dayCellMarked,
                    ]}
                    onPress={() => handleDayPress(daySlot)}
                    activeOpacity={hasObservation ? 0.7 : 1}
                  >
                    {hasObservation && <Text style={styles.observationIcon}>🌱</Text>}
                    <Text style={styles.dateLabel}>{daySlot.date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Empty state */}
      {!isLoading && observationDays.size === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No Observations logged this month. Mark a voice or text log as "Observation" to see it here.
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🌱</Text>
          <Text style={styles.legendText}>Has an observation</Text>
        </View>
      </View>

      {/* Day detail popover */}
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
          <ScrollView style={styles.popover} contentContainerStyle={styles.popoverContent}>
            <Text style={styles.popoverDate}>{selectedDayKey}</Text>
            {selectedDayEntries.length === 0 ? (
              <Text style={styles.popoverNoData}>No observations logged</Text>
            ) : (
              selectedDayEntries.map((entry) => {
                const entryColors = getEntryColors(entry);
                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.popoverEntry,
                      { backgroundColor: entryColors.background, borderColor: entryColors.border },
                    ]}
                  >
                    <Text style={[styles.popoverEntryLabel, { color: entryColors.titleColor }]}>
                      {entryColors.label}
                    </Text>
                    <HighlightedText
                      content={entry.content}
                      ranges={getVisibleHighlightedRanges(entry)}
                      style={styles.popoverEntryContent}
                      highlightStyle={OBSERVATION_HIGHLIGHT_STYLE}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
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
    maxHeight: 380,
    borderRadius: 10,
  },
  gridLoadingContainer: {
    maxHeight: 380,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
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
  dayCellMarked: {
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  observationIcon: {
    fontSize: 14,
    lineHeight: 16,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
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
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  popover: {
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: '70%',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  popoverContent: {
    padding: 14,
  },
  popoverDate: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  popoverNoData: {
    fontSize: 12,
    color: colors.textDim,
  },
  popoverEntry: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  popoverEntryLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  popoverEntryContent: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
});
