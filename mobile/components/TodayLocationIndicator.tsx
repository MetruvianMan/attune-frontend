import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { databaseService } from '../services/database';
import { getDailyLocationForDay, getSavedPlaceIcon, HOME_ICON, TRANSITION_TINT } from '../services/location-service';
import { colors, radius, spacing, typography } from '../constants/theme';

interface TodayLocationIndicatorProps {
  childProfileId: string;
  /** 'YYYY-MM-DD', the Today tab's currently selected logging date - NOT
   * always the real-world "today," per Requirement 7.7. Pass the
   * selected date converted via toLocalDateString, not a fresh
   * new Date(). */
  dateKey: string;
}

interface AbsentParent {
  label: 'M' | 'D';
  /** The absent parent's OWN resolved place, e.g. "Lindy's House" -
   * null if even their own location is unresolved. */
  placeName: string | null;
  /** That place's icon (customEmoji override or PlaceType default, via
   * getSavedPlaceIcon) - shown after the name, e.g. "Lindy's House 👵".
   * null whenever placeName is null (nothing to attach an icon to). */
  placeIcon: string | null;
}

interface ResolvedState {
  placeName: string;
  icon: string;
  isTransitionDay: boolean;
  /** Only the parents who are NOT co-located with the child today - a
   * present parent adds nothing worth showing (per feedback: showing
   * "With Robbie" for both parents every single day was pure repetition
   * on the common case, and was what pushed this indicator to 2 lines
   * and broke the "Switch to Text Log above the fold" layout). Normal/
   * repeated states recede; only the exception (an absence) earns a
   * place in this indicator. Empty array when both parents are present
   * - the ordinary, most common day. */
  absentParents: AbsentParent[];
}

/**
 * Small tappable strip on the Today tab showing the child's resolved
 * location for the currently selected logging date (Requirement 7.1-7.8).
 *
 * Privacy default (Requirement 7.2): renders null entirely unless the
 * profile has at least one SavedPlace configured - checked via a
 * lightweight getSavedPlacesByProfile count on every prop change, not
 * inferred from a null getDailyLocationForDay result (a profile could
 * have a Home_Place designated but this specific day still resolve to
 * null for some other reason - that's handled separately below).
 *
 * Shows the child's resolved place on EVERY day including ordinary
 * Home_Place days (Requirement 7.3) - e.g. "Home 🏠" - not just on
 * away/transition days. Shares the exact same away-day tint/icon
 * language as LocationCalendarView via location-service.ts's shared
 * TRANSITION_TINT/HOME_ICON constants (Requirement 7.4, 7.5), rather
 * than inventing a second visual treatment for the same concept.
 *
 * Renders null if the day resolves to no SavedPlace at all (no
 * Home_Place designated AND no covering LocationPeriod) - Requirement
 * 7.6's "unknown, not a guess" handling, same as Requirement 2.9.
 */
export function TodayLocationIndicator({ childProfileId, dateKey }: TodayLocationIndicatorProps) {
  const router = useRouter();
  const [resolved, setResolved] = useState<ResolvedState | null>(null);
  // Separate from `resolved === null` - distinguishes "profile has no
  // SavedPlace at all" (never show anything, ever) from "this specific
  // day resolved to null" (also show nothing, but for a different
  // reason) from "still loading" (also show nothing, to avoid a flash
  // of content before the opt-in check resolves).
  const [hasAnySavedPlace, setHasAnySavedPlace] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const places = await databaseService.getSavedPlacesByProfile(childProfileId);
        if (cancelled) return;

        if (places.length === 0) {
          setHasAnySavedPlace(false);
          setResolved(null);
          return;
        }
        setHasAnySavedPlace(true);

        const day = await getDailyLocationForDay(childProfileId, dateKey);
        if (cancelled) return;

        const childEntry = day?.entries.find((e) => e.householdMember === 'child');
        if (!childEntry?.savedPlace) {
          setResolved(null);
          return;
        }

        const absentParents: AbsentParent[] = (['mom', 'dad'] as const)
          .filter((member) => day!.separatedFrom.includes(member))
          .map((member) => {
            const entry = day!.entries.find((e) => e.householdMember === member);
            return {
              label: member === 'mom' ? 'M' : 'D',
              placeName: entry?.savedPlace?.name ?? null,
              placeIcon: entry?.savedPlace ? getSavedPlaceIcon(entry.savedPlace) : null,
            };
          });

        setResolved({
          placeName: childEntry.savedPlace.name,
          icon: day!.isTransitionDay ? getSavedPlaceIcon(childEntry.savedPlace) : HOME_ICON,
          isTransitionDay: day!.isTransitionDay,
          absentParents,
        });
      } catch (error) {
        console.error('[TodayLocationIndicator] Failed to load location:', error);
        if (!cancelled) {
          setResolved(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childProfileId, dateKey]);

  if (!hasAnySavedPlace || !resolved) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, resolved.isTransitionDay && styles.containerTransition]}
      onPress={() => router.push('/(tabs)/insights?view=location')}
      activeOpacity={0.7}
    >
      <View style={styles.mainRow}>
        <Text style={styles.icon}>{resolved.icon}</Text>
        <Text style={styles.placeName}>{resolved.placeName}</Text>
        {resolved.isTransitionDay && (
          <View style={styles.awayBadge}>
            <Text style={styles.awayBadgeText}>Away</Text>
          </View>
        )}
        {/* Only an ABSENT parent shows up here at all (per feedback) - a
            present parent is the ordinary/repeated state and adds no
            information worth a chip. A rose-FILLED circle (not the
            Calendar's hollow/outlined absent dot) was requested
            specifically for this surface, since there's no adjacent
            "present" dot here to contrast against via fill-vs-outline -
            on its own, a hollow circle reads ambiguously, so a solid
            fill communicates "this is the state" unambiguously in a
            single-dot context. */}
        {resolved.absentParents.map((parent) => (
          <View key={parent.label} style={styles.absentChip}>
            <View style={styles.absentDot}>
              <Text style={styles.absentDotLabel}>{parent.label}</Text>
            </View>
            {parent.placeName && (
              <Text style={styles.absentChipText} numberOfLines={1}>
                {parent.placeName}
                {parent.placeIcon ? ` ${parent.placeIcon}` : ''}
              </Text>
            )}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Single row by design - on the ordinary day (both parents present,
  // no absence to report) this looks exactly like the original
  // one-line indicator. flexWrap lets an absence chip spill onto a
  // second line ONLY if there's genuinely not enough width (e.g. a long
  // place name + a long absent-parent place name together), rather than
  // reserving a second line's height on every day the way the previous
  // always-show-both-parents design did.
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.chip,
    // Trimmed vertical padding/margin (was 8/10) and dropped the
    // horizontal margin entirely - this sits inside index.tsx's own
    // `content` View, which already has its own screen-edge padding, so
    // marginHorizontal here was double-padding the sides on top of that.
    // Freeing up this vertical space was part of fixing "Switch to Text
    // Log" getting pushed below the fold once this indicator was added.
    paddingVertical: 6,
    paddingHorizontal: spacing.cardPadding,
    // Matches datePickerRow's marginBottom (14) so the gap above and
    // below this indicator reads as equal, per feedback.
    marginBottom: 14,
  },
  containerTransition: {
    backgroundColor: TRANSITION_TINT,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  icon: {
    fontSize: 18,
    marginRight: 2,
  },
  placeName: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  awayBadge: {
    backgroundColor: 'rgba(242,201,76,0.4)',
    borderRadius: radius.chip,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  awayBadgeText: {
    fontSize: typography.tiny.fontSize,
    fontWeight: '700',
    color: '#8A6D1F',
    textTransform: 'uppercase',
  },
  // Only rendered per absent parent (see absentParents filtering in the
  // load effect above) - never for a present one.
  absentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
    maxWidth: 150,
  },
  // Solid rose fill (not the Calendar's hollow/outlined absent dot) -
  // requested specifically for this single-dot context, where there's
  // no adjacent "present" dot to contrast against via fill-vs-outline,
  // so a solid fill communicates "this is the current state"
  // unambiguously on its own.
  absentDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absentDotLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 10,
  },
  absentChipText: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    flexShrink: 1,
  },
});
