import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getDayAnalytics, DayAnalyticsSummary } from '../services/day-analytics-service';
import { colors, radius, shadows } from '../constants/theme';

interface MetricsViewProps {
  childProfileId: string;
}

/**
 * Stats dashboard for the Insights tab's "📈 Metrics" pill - shows the
 * exact same numbers day-analytics-service.ts computes for the Chat
 * tab's "VERIFIED STATISTICS" prompt block, so a Parent can visually
 * cross-check any count/percentage Chat gives them against this screen,
 * and the two can never disagree (one shared source of truth, not two
 * independent tallies). See day-analytics-service.ts's header comment
 * for the original Chat-accuracy bug this was built to fix alongside.
 */
export function MetricsView({ childProfileId }: MetricsViewProps) {
  const [summary, setSummary] = useState<DayAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      loadAnalytics();
    }, [childProfileId])
  );

  const loadAnalytics = async () => {
    const isFirstLoad = !hasLoadedOnce.current;
    if (isFirstLoad) setIsLoading(true);
    try {
      const result = await getDayAnalytics(childProfileId);
      setSummary(result);
    } catch (error) {
      console.error('[MetricsView] Failed to load day analytics:', error);
    } finally {
      if (isFirstLoad) setIsLoading(false);
      hasLoadedOnce.current = true;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!summary || summary.totalDaysWithEvents === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptySubtitle}>
            Log a few days of events and this dashboard will fill in with real statistics.
          </Text>
        </View>
      </View>
    );
  }

  const weekendPercent = summary.toughDayWeekendPercent;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top-line totals */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.totalEventsLogged}</Text>
          <Text style={styles.statLabel}>Events logged</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.totalDaysWithEvents}</Text>
          <Text style={styles.statLabel}>Days logged</Text>
        </View>
      </View>

      {/* Mood breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>DAY MOOD BREAKDOWN</Text>
        <View style={styles.moodRow}>
          <View style={styles.moodItem}>
            <Text style={styles.moodEmoji}>🟢</Text>
            <Text style={styles.moodCount}>{summary.goodDays}</Text>
            <Text style={styles.moodLabel}>Good</Text>
          </View>
          <View style={styles.moodItem}>
            <Text style={styles.moodEmoji}>🟡</Text>
            <Text style={styles.moodCount}>{summary.okDays}</Text>
            <Text style={styles.moodLabel}>Okay</Text>
          </View>
          <View style={styles.moodItem}>
            <Text style={styles.moodEmoji}>🔴</Text>
            <Text style={styles.moodCount}>{summary.toughDays}</Text>
            <Text style={styles.moodLabel}>Tough</Text>
          </View>
        </View>
      </View>

      {/* Weekend/weekday breakdown of tough days */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>TOUGH DAYS: WEEKEND VS. WEEKDAY</Text>
        {summary.toughDays === 0 ? (
          <Text style={styles.noDataText}>No tough days logged yet.</Text>
        ) : (
          <>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Weekend (Sat/Sun)</Text>
              <Text style={styles.breakdownValue}>{summary.toughDaysOnWeekend}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Weekday (Mon-Fri)</Text>
              <Text style={styles.breakdownValue}>{summary.toughDaysOnWeekday}</Text>
            </View>
            {weekendPercent !== null && (
              <Text style={styles.highlightText}>
                {weekendPercent}% of tough days fell on a weekend
              </Text>
            )}
          </>
        )}
      </View>

      {/* Travel/location correlation - only shown if the profile has
          opted into location tracking (Requirement 7.2's privacy
          default) - never a guessed 0 for a profile that never set this
          up. */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>TOUGH DAYS WHILE TRAVELING</Text>
        {!summary.hasLocationData ? (
          <Text style={styles.noDataText}>
            No location data available - set up Saved Places under Location to see this breakdown.
          </Text>
        ) : summary.toughDays === 0 ? (
          <Text style={styles.noDataText}>No tough days logged yet.</Text>
        ) : (
          <>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>While away from Home</Text>
              <Text style={styles.breakdownValue}>{summary.toughDaysChildAway}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>While Mom was away</Text>
              <Text style={styles.breakdownValue}>{summary.toughDaysMomAway}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>While Dad was away</Text>
              <Text style={styles.breakdownValue}>{summary.toughDaysDadAway}</Text>
            </View>
          </>
        )}
      </View>

      <Text style={styles.footnote}>
        These numbers are computed directly from logged events - the same figures Chat uses when answering questions about patterns or counts.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 12,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodItem: {
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  moodCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  moodLabel: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45,52,54,0.06)',
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.text,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    marginTop: 10,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 12,
    color: colors.textDim,
    fontStyle: 'italic',
  },
  footnote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
});
