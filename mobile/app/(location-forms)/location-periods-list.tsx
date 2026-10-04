import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { PaperFAB as FAB } from '../../components/PaperText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import { databaseService } from '../../services/database';
import { getSavedPlaceIcon } from '../../services/location-service';
import { LocationPeriod, SavedPlace, HouseholdMember } from '../../models';
import { colors, shadows, radius, spacing, typography } from '../../constants/theme';
// Pressable is imported from react-native-gesture-handler (not plain
// 'react-native') for every Pressable nested inside a Swipeable below -
// see saved-places-list.tsx's import comment for the full "ghost tap"
// explanation.
import { Swipeable, Pressable } from 'react-native-gesture-handler';

// 'Child' is replaced with the active profile's actual first name
// everywhere this is used - see householdMemberLabels below, built
// per-render from this static fallback.
const STATIC_HOUSEHOLD_MEMBER_LABELS: Record<HouseholdMember, string> = {
  child: 'Child',
  mom: 'Mom',
  dad: 'Dad',
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKeyForDisplay(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * One underlying LocationPeriod row per HouseholdMember is still required
 * (location-service.ts's resolution algorithm, overlap checks, and
 * close-out all operate per-person), but there's no reason the Parent
 * needs to see "Aspen / Child" and "Aspen / Mom" as two separate cards
 * when they share the exact same place and date range - that reads as
 * two unrelated trips rather than one family trip. This groups rows that
 * share the same savedPlaceId + startDate + endDate into a single
 * PeriodGroup, rendered as one card listing every member in it (e.g.
 * "Child, Mom"). Edit/Close Out/Delete then operate on every row in the
 * group together - see location-period-form.tsx's periodIds param and
 * handleDeleteGroup below.
 */
interface PeriodGroup {
  key: string;
  savedPlaceId: string;
  startDate: string;
  endDate?: string;
  periods: LocationPeriod[];
}

function groupPeriods(periods: LocationPeriod[]): PeriodGroup[] {
  const groups = new Map<string, PeriodGroup>();
  for (const period of periods) {
    const key = `${period.savedPlaceId}|${period.startDate}|${period.endDate ?? 'ONGOING'}`;
    const existing = groups.get(key);
    if (existing) {
      existing.periods.push(period);
    } else {
      groups.set(key, {
        key,
        savedPlaceId: period.savedPlaceId,
        startDate: period.startDate,
        endDate: period.endDate,
        periods: [period],
      });
    }
  }
  // periods is already ordered by start_date DESC (getLocationPeriodsByProfile),
  // and Map preserves insertion order, so the first period encountered
  // for each group determines that group's position - groups come out in
  // the same chronological-descending order the ungrouped list had.
  return Array.from(groups.values());
}

/**
 * Lists all Location Periods for the active profile, in chronological
 * descending order (most recent start date first) - design.md leaves the
 * display choice open, this picks chronological descending to match
 * EventsView's own default sort. Ongoing periods (no end date) show an
 * "Ongoing" badge and a "Close out" action that opens the form pre-filled
 * to add an end date (Requirement 2.4).
 */
export default function LocationPeriodsListScreen() {
  const router = useRouter();
  const { activeProfile } = useProfile();
  const childProfileId = activeProfile?.id || null;
  const householdMemberLabels: Record<HouseholdMember, string> = {
    ...STATIC_HOUSEHOLD_MEMBER_LABELS,
    child: activeProfile?.displayName || STATIC_HOUSEHOLD_MEMBER_LABELS.child,
  };

  const [periods, setPeriods] = useState<LocationPeriod[]>([]);
  const [placesById, setPlacesById] = useState<Record<string, SavedPlace>>({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const swipeableRefs = React.useRef<Map<string, Swipeable>>(new Map());

  const loadData = useCallback(async () => {
    if (!childProfileId) {
      setHasLoadedOnce(true);
      return;
    }
    try {
      const [loadedPeriods, loadedPlaces] = await Promise.all([
        databaseService.getLocationPeriodsByProfile(childProfileId),
        databaseService.getSavedPlacesByProfile(childProfileId),
      ]);
      // getLocationPeriodsByProfile already orders by start_date DESC
      // (see database.ts) - no re-sort needed here.
      setPeriods(loadedPeriods);
      setPlacesById(Object.fromEntries(loadedPlaces.map((p: SavedPlace) => [p.id, p])));
    } catch (error) {
      console.error('Failed to load location periods:', error);
    } finally {
      setHasLoadedOnce(true);
    }
  }, [childProfileId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Close any swipeable row left open from before navigating away -
      // see saved-places-list.tsx's identical comment.
      swipeableRefs.current.forEach((ref) => ref.close());
    }, [loadData])
  );

  const handleAddPeriod = () => {
    router.push('/(location-forms)/location-period-form');
  };

  const handleEditGroup = (group: PeriodGroup) => {
    const ids = group.periods.map((p) => p.id).join(',');
    router.push(`/(location-forms)/location-period-form?periodIds=${ids}`);
  };

  const handleCloseOutGroup = (group: PeriodGroup) => {
    // Opens the same edit form, pre-filled with every member in this
    // group - the Parent sets a real end date there and saves, applying
    // to every row in the group at once (Requirement 2.4).
    handleEditGroup(group);
  };

  const handleDeleteGroup = (group: PeriodGroup) => {
    const memberCount = group.periods.length;
    Alert.alert(
      'Delete Location Period',
      memberCount > 1
        ? `Are you sure you want to delete this location period for all ${memberCount} people?`
        : 'Are you sure you want to delete this location period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(group.periods.map((p) => databaseService.deleteLocationPeriod(p.id)));
              swipeableRefs.current.get(group.key)?.close();
              await loadData();
            } catch (error) {
              swipeableRefs.current.get(group.key)?.close();
              Alert.alert('Error', 'Failed to delete location period');
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (group: PeriodGroup) => {
    return (
      <View style={styles.swipeActions}>
        {!group.endDate && (
          <Pressable
            style={styles.closeOutAction}
            onPress={() => {
              swipeableRefs.current.get(group.key)?.close();
              handleCloseOutGroup(group);
            }}
          >
            <IconButton icon="calendar-check" color="#FFFFFF" size={24} />
            <Text style={styles.actionText}>Close Out</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.editAction}
          onPress={() => {
            swipeableRefs.current.get(group.key)?.close();
            handleEditGroup(group);
          }}
        >
          <IconButton icon="pencil" color="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.deleteAction}
          onPress={() => handleDeleteGroup(group)}
        >
          <IconButton icon="delete" color="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  const renderPeriodGroup = (group: PeriodGroup) => {
    const place = placesById[group.savedPlaceId];
    const isOngoing = !group.endDate;
    // "Child, Mom" / "Dad" etc. - every member in this group, in the
    // fixed Child/Mom/Dad display order rather than insertion order.
    const memberLabel = (['child', 'mom', 'dad'] as HouseholdMember[])
      .filter((m) => group.periods.some((p) => p.householdMember === m))
      .map((m) => householdMemberLabels[m])
      .join(', ');

    return (
      <Swipeable
        key={group.key}
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(group.key, ref);
        }}
        renderRightActions={() => renderRightActions(group)}
        overshootRight={false}
      >
        <Pressable
          onPress={() => handleEditGroup(group)}
          style={({ pressed }) => [styles.periodCard, pressed && styles.cardPressed]}
        >
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.mainInfo}>
                <Text style={styles.emoji}>{place ? getSavedPlaceIcon(place) : '📍'}</Text>
                <View style={styles.textInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.periodTitle}>{place?.name ?? 'Unknown place'}</Text>
                    {isOngoing && (
                      <View style={styles.ongoingBadge}>
                        <Text style={styles.ongoingBadgeText}>Ongoing</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.periodMember}>{memberLabel}</Text>
                </View>
              </View>
              <Text style={styles.dateRangeText}>
                {formatDateKeyForDisplay(group.startDate)}
                {' – '}
                {group.endDate ? formatDateKeyForDisplay(group.endDate) : 'Present'}
              </Text>
            </View>
          </Card>
        </Pressable>
      </Swipeable>
    );
  };

  if (!childProfileId) {
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
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>Location Periods</Text>
        <IconButton
          icon="map-marker-outline"
          size={22}
          onPress={() => router.push('/(location-forms)/saved-places-list')}
          style={styles.placesLink}
        />
      </View>

      {hasLoadedOnce && periods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Location Periods Yet</Text>
          <Text style={styles.emptySubtitle}>
            Record a trip or stay - like "Mom, Grandma's House, July 1–14" -
            to start tracking where everyone's been.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {groupPeriods(periods).map((group) => renderPeriodGroup(group))}
        </ScrollView>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddPeriod}
        label="Add Period"
        color="#FFFFFF"
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
    width: 48,
  },
  placesLink: {
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
  periodCard: {
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
    marginBottom: 10,
  },
  emoji: {
    fontSize: 36,
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
  periodTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  ongoingBadge: {
    backgroundColor: colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ongoingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  periodMember: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
  },
  dateRangeText: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    fontWeight: '500',
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  closeOutAction: {
    backgroundColor: colors.sage,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
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
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: -8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.accent,
  },
});
