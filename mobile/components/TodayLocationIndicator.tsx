import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { TRANSITION_TINT } from '../services/location-service';
import { colors, radius, spacing, typography } from '../constants/theme';
import { ResolvedTodayLocation } from '../hooks/useTodayLocation';

interface TodayLocationIndicatorProps {
  resolved: ResolvedTodayLocation;
}

/**
 * Full-width row on the Today tab surfacing a location ANOMALY for the
 * currently selected logging date - the child being away from their
 * Home_Place, and/or a parent being separated from the child (see
 * hasLocationAnomaly in hooks/useTodayLocation.ts, which the parent
 * screen uses to decide whether to render this at all).
 *
 * On the ordinary day - everyone home, no absences - this intentionally
 * renders nothing; that case is instead folded into the compact "🏠
 * Home" chip shown inline next to the date row (per feedback: giving a
 * whole row to "everyone's home, as usual" was unnecessary chrome on the
 * common case - a full row should be earned by something actually worth
 * flagging).
 *
 * Shares the exact same away-day tint/icon language as
 * LocationCalendarView via location-service.ts's shared
 * TRANSITION_TINT/HOME_ICON constants, rather than inventing a second
 * visual treatment for the same concept.
 */
export function TodayLocationIndicator({ resolved }: TodayLocationIndicatorProps) {
  const router = useRouter();

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
