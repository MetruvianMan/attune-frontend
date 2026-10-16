import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getObservationEntries, getObservationExcerpt } from '../services/observation-service';
import { DiaryEntry } from '../models';
import { getEntryColors } from '../constants/entry-colors';
import { colors } from '../constants/theme';

interface ObservationListViewProps {
  childProfileId: string;
}

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };

  if (isToday) return `Today - ${date.toLocaleDateString(undefined, options)}`;
  if (isYesterday) return `Yesterday - ${date.toLocaleDateString(undefined, options)}`;
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Reverse-chronological list of every Observation-flagged (including
 * Both) entry - see .kiro/specs/parent-observations/ Requirement 4.4.
 * Follows the same reload/rendering skeleton as DiaryView.tsx, but
 * sources from observation-service.ts's getObservationEntries() instead
 * of all entries, and shows an excerpt (via getObservationExcerpt)
 * rather than the full entry content, since this is meant as a
 * quick-scan surface rather than a full-text browse.
 */
export function ObservationListView({ childProfileId }: ObservationListViewProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadEntries();
    }, [childProfileId])
  );

  const loadEntries = async () => {
    const result = await getObservationEntries(childProfileId);
    setEntries(result);
  };

  if (entries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🌱</Text>
        <Text style={styles.emptyTitle}>No Observations Yet</Text>
        <Text style={styles.emptySubtitle}>
          Mark a voice or text log as "Observation" (or "Both") to capture broader trends, reflections, or professional conversations here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱 OBSERVATIONS</Text>
        <Text style={styles.subtitle}>
          {entries.length} {entries.length === 1 ? 'observation' : 'observations'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {entries.map((entry) => {
          const entryColors = getEntryColors(entry);
          const excerpt = getObservationExcerpt(entry);

          return (
            <View
              key={entry.id}
              style={[
                styles.entryCard,
                { backgroundColor: entryColors.background, borderColor: entryColors.border },
              ]}
            >
              <View style={styles.entryHeader}>
                <Text style={[styles.entryLabel, { color: entryColors.titleColor }]}>
                  {entryColors.label}
                </Text>
                <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
              </View>

              {/* Quotation styling only when the excerpt is a direct
                  quote of the Parent's own words (Verbatim-sourced) -
                  never implied for an AI-summarized paraphrase. */}
              <Text style={styles.excerptText}>
                {excerpt.isVerbatim ? `"${excerpt.text}"` : excerpt.text}
              </Text>
              {!excerpt.isVerbatim && (
                <Text style={styles.summarizedTag}>AI summary</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  entryCard: {
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  entryDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  excerptText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  summarizedTag: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
});
