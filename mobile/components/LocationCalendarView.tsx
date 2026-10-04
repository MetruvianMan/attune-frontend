import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDailyLocations, getSavedPlaceIcon, DailyLocations, HOME_ICON, TRANSITION_TINT } from '../services/location-service';
import { databaseService } from '../services/database';
import { LocationDetailSheet, LocationDetailSheetContent } from './LocationDetailSheet';
import { colors } from '../constants/theme';

const DAY_HEADERS = ['M', 'T', 'W', 'Th', 'F', 'S', 'S'];

interface LocationCalendarViewProps {
  childProfileId: string;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function previousDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
}

/**
 * Visual design, settled after two rounds of feedback: the first pass
 * (every day showing its place icon + green/rose M-D dots) had
 * personality but felt busy; a second pass that stripped repeated icons
 * and color from M/D overcorrected into a flat "status grid" look. The
 * settled design keeps the repeated per-day place icon (🏠 on every Home
 * day, the place's own emoji on every away day - repetition at this
 * density reads as a pattern at a glance, e.g. 🏠🏠🏠→🏔️🏔️🏔️→🏠🏠🏠)
 * and keeps GREEN for "present" (fits the app's existing visual
 * language), while keeping ONE improvement from the simplification pass:
 * an absent parent is now a hollow/outlined dot rather than a second
 * color (rose), since "green filled + hollow" reads as more intuitively
 * "who's missing" than two different colors meaning "together"/"apart."
 * Visual weight was pulled out of the cell chrome instead (softer
 * border, no shadow, smaller/lighter date number) rather than out of the
 * data itself.
 *
 * TRANSITION_TINT and HOME_ICON are now defined in location-service.ts
 * (not here) so TodayLocationIndicator can share the exact same
 * away-day visual language rather than inventing its own.
 */

/**
 * Month-grid Location Calendar - copies WeatherView.tsx's skeleton
 * exactly (month nav header, day-of-week header row, currentMonth state,
 * useFocusEffect reload, week-row grid, isLoading-gates-first-load-only
 * pattern) per tasks.md item 10.1, with loadMoodDataInternal replaced by
 * a single getDailyLocations call for the visible month and
 * handleDayPress repointed to open LocationDetailSheet instead of
 * navigating to the Today tab.
 */
export function LocationCalendarView({ childProfileId }: LocationCalendarViewProps) {
  const router = useRouter();
  const [weeks, setWeeks] = useState<Array<Array<{ date: Date; dateKey: string } | null>>>([]);
  const [dailyLocationsMap, setDailyLocationsMap] = useState<Map<string, DailyLocations>>(new Map());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = React.useRef(false);
  const [hasAnyData, setHasAnyData] = useState<boolean | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetContent, setSheetContent] = useState<LocationDetailSheetContent | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadLocationData();
    }, [childProfileId, currentMonth])
  );

  const loadLocationData = async () => {
    const isFirstLoad = !hasLoadedOnce.current;
    if (isFirstLoad) {
      setIsLoading(true);
    }
    try {
      await loadLocationDataInternal();
    } finally {
      if (isFirstLoad) {
        setIsLoading(false);
      }
      hasLoadedOnce.current = true;
    }
  };

  const loadLocationDataInternal = async () => {
    const viewingMonth = currentMonth.getMonth();
    const viewingYear = currentMonth.getFullYear();

    const startDate = new Date(viewingYear, viewingMonth, 1);
    const endDate = new Date(viewingYear, viewingMonth + 1, 0);

    const dailyLocations = await getDailyLocations(childProfileId, {
      start: toDateKey(startDate),
      end: toDateKey(endDate),
    });

    const map = new Map(dailyLocations.map((d) => [d.dateKey, d]));
    setDailyLocationsMap(map);

    // Empty state (Requirement 3.7): no SavedPlace/LocationPeriod data at
    // all for this profile, checked directly via getSavedPlacesByProfile
    // rather than "nothing resolved this visible month" - that
    // month-local approximation broke once forward navigation into
    // future months was allowed (see goToNextMonth's comment): a
    // profile with a full history of past data but nothing yet planned
    // for a future month would otherwise show "No Location Data Yet"
    // while viewing that future month, which is wrong - the profile
    // clearly has data, just not in this particular month.
    const anyPlaces = await databaseService.getSavedPlacesByProfile(childProfileId);
    setHasAnyData(anyPlaces.length > 0);

    // Build weeks starting from the first Monday on/before the 1st,
    // through the last day of the month - identical to WeatherView.
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

  // Unlike WeatherView/HeatMapView (which cap navigation at the current
  // month, since mood/event data can't exist for days that haven't
  // happened yet), the Location Calendar deliberately allows navigating
  // into future months without limit. A planned trip or absence is
  // recorded as a LocationPeriod with a future startDate (Requirement
  // 2.1 places no restriction on start dates being in the past only),
  // so a Parent pre-registering a November trip in October should be
  // able to flip forward and see it reflected immediately - capping
  // forward navigation here would make that data invisible until the
  // calendar's "current month" caught up to it.
  const goToNextMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDayPress = (daySlot: { date: Date; dateKey: string }) => {
    const dayData = dailyLocationsMap.get(daySlot.dateKey);
    if (!dayData) return;
    setSheetContent({ kind: 'day', day: dayData });
    setSheetVisible(true);
  };

  const handleManageLocations = () => {
    router.push('/(location-forms)/saved-places-list');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.gridLoadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (hasAnyData === false) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Location Data Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a few Saved Places and a Home Place to start seeing where
            your family's been.
          </Text>
          <TouchableOpacity style={styles.manageButton} onPress={handleManageLocations}>
            <Text style={styles.manageButtonText}>Manage Locations</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        </View>

        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.navButtonText}>›</Text>
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

      {/* Calendar grid */}
      <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((daySlot, dayIndex) => {
              if (!daySlot) {
                return <View key={dayIndex} style={styles.emptyCell} />;
              }

              const dayData = dailyLocationsMap.get(daySlot.dateKey);
              const childEntry = dayData?.entries.find((e) => e.householdMember === 'child');
              const prevDayData = dailyLocationsMap.get(previousDateKey(daySlot.dateKey));

              const isAway = !!dayData?.isTransitionDay;
              const tint = isAway ? TRANSITION_TINT : 'transparent';
              // Icon shown on EVERY resolved day, not just trip-starts -
              // the Home icon on ordinary days, the place's own icon
              // (custom emoji or PlaceType default, via getSavedPlaceIcon)
              // on away days. Repetition here is the point: a run of 🏠
              // visually blocks together as "home," a run of 🏔️ as "the
              // Aspen trip," without needing to isolate just the first
              // day of each stretch.
              const icon = childEntry?.savedPlace
                ? isAway
                  ? getSavedPlaceIcon(childEntry.savedPlace)
                  : HOME_ICON
                : null;

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[styles.dayCell, { backgroundColor: tint }]}
                  onPress={() => handleDayPress(daySlot)}
                  activeOpacity={0.7}
                >
                  {icon && <Text style={styles.placeIcon}>{icon}</Text>}
                  <Text style={styles.dateLabel}>{daySlot.date.getDate()}</Text>
                  {/* Parent presence indicators (Requirement 3.4) - green
                      filled M/D = present (co-located that day), rose
                      hollow/outlined M/D = absent. Fill-vs-outline is
                      what reads as "who's missing" at a glance; rose
                      adds a second, warmer signal on top of that shape
                      difference without competing with the yellow
                      away-day tint or the green present dots. A presence
                      CHANGE from the previous day (a parent becoming
                      absent or returning) gets a highlighted ring so
                      that transition itself is what catches the eye, not
                      every normal day. Only shown once we actually have
                      a resolved day (dayData present). */}
                  {dayData && (
                    <View style={styles.parentDotsRow}>
                      {(['mom', 'dad'] as const).map((member) => {
                        const isPresent = !dayData.separatedFrom.includes(member);
                        const wasPresent = prevDayData ? !prevDayData.separatedFrom.includes(member) : isPresent;
                        const presenceChanged = !!prevDayData && isPresent !== wasPresent;
                        return (
                          <View
                            key={member}
                            style={[
                              styles.parentDot,
                              isPresent ? styles.parentDotPresent : styles.parentDotAbsent,
                              presenceChanged && styles.parentDotChanged,
                            ]}
                          >
                            <Text style={[styles.parentDotLabel, !isPresent && styles.parentDotLabelAbsent]}>
                              {member === 'mom' ? 'M' : 'D'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Legend - Away-state tint, Present, Absent. The presence-change
          highlight ring isn't a separate legend entry - it's a
          variation of Present/Absent, not a third state. */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendTint, { backgroundColor: TRANSITION_TINT }]} />
          <Text style={styles.legendText}>Away</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.parentDot, styles.parentDotPresent]}>
            <Text style={styles.parentDotLabel}>M</Text>
          </View>
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.parentDot, styles.parentDotAbsent]}>
            <Text style={[styles.parentDotLabel, styles.parentDotLabelAbsent]}>M</Text>
          </View>
          <Text style={styles.legendText}>Absent</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.manageLink} onPress={handleManageLocations}>
        <Text style={styles.manageLinkText}>Manage Locations</Text>
      </TouchableOpacity>

      <LocationDetailSheet
        visible={sheetVisible}
        content={sheetContent}
        onDismiss={() => setSheetVisible(false)}
      />
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
    // Softened per feedback: this is where visual weight was pulled OUT
    // (cell chrome), rather than out of the data shown inside the cell -
    // a barely-there border and no shadow, so individual cells don't
    // each read as their own separate "card."
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  placeIcon: {
    fontSize: 16,
    lineHeight: 18,
  },
  // Smaller and lighter than before - the place icon and M/D presence
  // are the interesting information at a glance; the date number is
  // just reference information for cross-checking against a specific
  // day, so it recedes rather than competing for attention.
  dateLabel: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 1,
    fontWeight: '400',
  },
  parentDotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  parentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Present = filled GREEN dot with a white letter (green, not black,
  // per feedback - fits Attune's existing visual language). Absent =
  // hollow (transparent fill, ROSE outline + rose letter) - keeps the
  // fill-vs-outline grammar from the simplification pass (that's what
  // reads as "who's missing" at a glance), but uses rose instead of a
  // muted gray outline per feedback that gray read as dull. Rose was
  // chosen over orange: away-day cells already use a yellow tint, so an
  // orange dot would have weak contrast sitting on that background (and
  // absence is often shown ON an away-day cell); rose contrasts cleanly
  // against both the yellow tint and the green present dots.
  parentDotPresent: {
    backgroundColor: colors.sage,
  },
  parentDotAbsent: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.rose,
  },
  // A ring highlight applied ON TOP of present/absent when THIS day's
  // presence differs from the previous day's - i.e. the moment a parent
  // becomes absent or returns, not every day they happen to be absent.
  // This is what makes "Dad becoming absent midway through a trip" easy
  // to spot without making every normal M+D day visually loud.
  parentDotChanged: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  parentDotLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 8,
  },
  parentDotLabelAbsent: {
    color: colors.rose,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 8,
    paddingVertical: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendTint: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: colors.textDim,
  },
  manageLink: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
