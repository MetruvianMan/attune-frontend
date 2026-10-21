import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, radius, typography } from '../constants/theme';
import { ResolvedTodayLocation } from '../hooks/useTodayLocation';

interface TodayLocationChipProps {
  resolved: ResolvedTodayLocation;
}

/**
 * Compact inline chip for the ORDINARY logging day - the child is at
 * their resolved place and no parent is separated from them (see
 * hasLocationAnomaly in hooks/useTodayLocation.ts). Sits inline in the
 * "Logging for:" row, after the Today button, instead of claiming a
 * full row the way TodayLocationIndicator does for an anomalous day.
 *
 * Per feedback: on the common "everyone's home" day, a whole row for
 * location was unnecessary chrome once the "Logging for" date field
 * shrank to fit - this chip is what replaces that row in that case.
 * Any day worth a second look (away from Home_Place, or a parent
 * absent) still gets the full TodayLocationIndicator row instead of
 * this chip, never both.
 */
export function TodayLocationChip({ resolved }: TodayLocationChipProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => router.push('/(tabs)/insights?view=location')}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{resolved.icon}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {resolved.placeName}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.chip,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: 110,
  },
  icon: {
    fontSize: 15,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
});
