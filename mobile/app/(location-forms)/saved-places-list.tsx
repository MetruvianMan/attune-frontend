import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { PaperFAB as FAB } from '../../components/PaperText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import { databaseService } from '../../services/database';
import { getSavedPlaceIcon } from '../../services/location-service';
import { SavedPlace, HouseholdMember } from '../../models';
import { colors, shadows, radius, spacing, typography } from '../../constants/theme';
// GHPressable (react-native-gesture-handler's own Pressable) is used only
// for the row/swipe-action Pressables immediately inside or adjacent to a
// Swipeable below - it shares Swipeable's own gesture-recognition system,
// avoiding a "ghost tap" where releasing a swipe gesture at full-open can
// register as a press on React Native's plain Pressable (a separate,
// legacy touch-responder system) and immediately navigate (the bug
// reported during the task 8 checkpoint). The Home Place picker's anchor
// below is NOT inside a Swipeable and uses TouchableOpacity instead (see
// its own comment) - neither Pressable variant is involved there.
import { Swipeable, Pressable as GHPressable } from 'react-native-gesture-handler';

const PLACE_TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  family_visit: 'Family Visit',
  vacation: 'Vacation',
  camp_or_school_trip: 'Camp / School Trip',
  other: 'Other',
};

const STATIC_HOUSEHOLD_MEMBER_LABELS: Record<HouseholdMember, string> = {
  child: "Child's Home",
  mom: "Mom's Home",
  dad: "Dad's Home",
};

/**
 * Lists all Saved Places for the active profile, with edit/delete (via
 * swipe, matching behaviors-list.tsx/rewards-list.tsx's existing
 * convention) and a per-HouseholdMember Home Place picker section
 * (Requirement 1.4). No shared context exists for this feature (see
 * app/(location-forms)/_layout.tsx) - data is fetched directly via
 * databaseService and reloaded on focus.
 */
export default function SavedPlacesListScreen() {
  const router = useRouter();
  const { activeProfile } = useProfile();
  const childProfileId = activeProfile?.id || null;

  // "Child's Home" becomes "Robbie's Home" once a child profile is
  // loaded, using the same possessive pattern as "Mom's Home"/"Dad's
  // Home" - falls back to the static "Child's Home" while the profile is
  // still loading, so this never shows a blank label.
  const householdMemberLabels: Record<HouseholdMember, string> = {
    ...STATIC_HOUSEHOLD_MEMBER_LABELS,
    child: activeProfile?.displayName ? `${activeProfile.displayName}'s Home` : STATIC_HOUSEHOLD_MEMBER_LABELS.child,
  };

  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [homePlaceIds, setHomePlaceIds] = useState<Record<HouseholdMember, string | undefined>>({
    child: undefined,
    mom: undefined,
    dad: undefined,
  });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // Which HouseholdMember's picker row is currently expanded - inline
  // expand/collapse rather than a react-native-paper Menu popup. Menu
  // renders its dropdown via a Portal, which requires reaching a
  // Portal.Host; on this screen (presented as a native modal - see
  // app/(location-forms)/_layout.tsx) that dropdown's state updated
  // correctly but never rendered visibly, even after giving the screen
  // its own local Portal.Host, confirmed during the task 8 checkpoint.
  // This inline chip-row expansion avoids Portal entirely, matching the
  // already-working chip-picker pattern used in
  // location-period-form.tsx/saved-place-form.tsx.
  const [homePlaceMenuFor, setHomePlaceMenuFor] = useState<HouseholdMember | null>(null);
  const swipeableRefs = React.useRef<Map<string, Swipeable>>(new Map());

  const loadData = useCallback(async () => {
    if (!childProfileId) {
      setHasLoadedOnce(true);
      return;
    }
    try {
      const [loadedPlaces, settings] = await Promise.all([
        databaseService.getSavedPlacesByProfile(childProfileId),
        databaseService.getHouseholdLocationSettings(childProfileId),
      ]);
      setPlaces(loadedPlaces);
      setHomePlaceIds({
        child: settings.childHomePlaceId,
        mom: settings.momHomePlaceId,
        dad: settings.dadHomePlaceId,
      });
    } catch (error) {
      console.error('Failed to load saved places:', error);
    } finally {
      setHasLoadedOnce(true);
    }
  }, [childProfileId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Close any swipeable row left open from before navigating away
      // (e.g. swiped a row, tapped Edit, saved, came back) - otherwise
      // the Edit/Delete actions stay visibly open on return even though
      // nothing is mid-swipe anymore.
      swipeableRefs.current.forEach((ref) => ref.close());
    }, [loadData])
  );

  const handleAddPlace = () => {
    router.push('/(location-forms)/saved-place-form');
  };

  const handleEditPlace = (placeId: string) => {
    router.push(`/(location-forms)/saved-place-form?placeId=${placeId}`);
  };

  const handleDeletePlace = (place: SavedPlace) => {
    Alert.alert(
      'Delete Place',
      `Are you sure you want to delete "${place.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteSavedPlace(place.id);
              swipeableRefs.current.get(place.id)?.close();
              await loadData();
            } catch (error) {
              // deleteSavedPlace throws a descriptive Error when the
              // place is still referenced by a LocationPeriod or Home
              // Place designation (Requirement 1.5) - surface that
              // message directly rather than a generic failure.
              swipeableRefs.current.get(place.id)?.close();
              Alert.alert('Cannot Delete', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const handleToggleHomePlacePicker = (member: HouseholdMember) => {
    setHomePlaceMenuFor((current) => (current === member ? null : member));
  };

  const handleSelectHomePlace = async (member: HouseholdMember, place: SavedPlace) => {
    if (!childProfileId) return;
    setHomePlaceMenuFor(null);
    try {
      await databaseService.setHomePlaceId(childProfileId, member, place.id);
      await loadData();
    } catch (error) {
      Alert.alert('Error', `Failed to set ${householdMemberLabels[member]}`);
    }
  };

  const handleClearHomePlace = async (member: HouseholdMember) => {
    if (!childProfileId) return;
    setHomePlaceMenuFor(null);
    try {
      await databaseService.setHomePlaceId(childProfileId, member, null);
      await loadData();
    } catch (error) {
      Alert.alert('Error', `Failed to clear ${householdMemberLabels[member]}`);
    }
  };

  const renderRightActions = (place: SavedPlace) => {
    return (
      <View style={styles.swipeActions}>
        <GHPressable
          style={styles.editAction}
          onPress={() => {
            swipeableRefs.current.get(place.id)?.close();
            handleEditPlace(place.id);
          }}
        >
          <IconButton icon="pencil" color="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Edit</Text>
        </GHPressable>
        <GHPressable
          style={styles.deleteAction}
          onPress={() => handleDeletePlace(place)}
        >
          <IconButton icon="delete" color="#FFFFFF" size={24} />
          <Text style={styles.actionText}>Delete</Text>
        </GHPressable>
      </View>
    );
  };

  const renderPlaceItem = (place: SavedPlace) => {
    const homeFor = (['child', 'mom', 'dad'] as HouseholdMember[]).filter(
      (m) => homePlaceIds[m] === place.id
    );

    return (
      <Swipeable
        key={place.id}
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(place.id, ref);
        }}
        renderRightActions={() => renderRightActions(place)}
        overshootRight={false}
      >
        <GHPressable
          onPress={() => handleEditPlace(place.id)}
          style={({ pressed }) => [styles.placeCard, pressed && styles.cardPressed]}
        >
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.mainInfo}>
                <Text style={styles.emoji}>{getSavedPlaceIcon(place)}</Text>
                <View style={styles.textInfo}>
                  <Text style={styles.placeTitle}>{place.name}</Text>
                  <Text style={styles.placeType}>{PLACE_TYPE_LABELS[place.placeType]}</Text>
                </View>
              </View>
              {homeFor.length > 0 && (
                <View style={styles.homeForRow}>
                  {homeFor.map((m) => (
                    <View key={m} style={styles.homeForBadge}>
                      <Text style={styles.homeForBadgeText}>{householdMemberLabels[m]}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card>
        </GHPressable>
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
        <Text style={styles.headerTitle}>Saved Places</Text>
        <IconButton
          icon="calendar-clock"
          size={22}
          onPress={() => router.push('/(location-forms)/location-periods-list')}
          style={styles.periodsLink}
        />
      </View>

      {hasLoadedOnce && places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>No Saved Places Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a place like "Home" or "Grandma's House" to start tracking
            where your family spends time.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Home Place picker section - one row per HouseholdMember,
              each an inline expand/collapse chip picker showing the
              currently designated place (or "Not set"). Only shown once
              at least one SavedPlace exists to pick from. */}
          {places.length > 0 && (
            <View style={styles.homeSection}>
              <Text style={styles.homeSectionTitle}>HOME PLACES</Text>
              {(['child', 'mom', 'dad'] as HouseholdMember[]).map((member) => {
                const currentPlace = places.find((p) => p.id === homePlaceIds[member]);
                const isExpanded = homePlaceMenuFor === member;
                return (
                  <View key={member}>
                    <View style={styles.homeRow}>
                      <Text style={styles.homeRowLabel}>{householdMemberLabels[member]}</Text>
                      <TouchableOpacity
                        onPress={() => handleToggleHomePlacePicker(member)}
                        style={styles.homePickerButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.homePickerButtonText}>
                          {currentPlace ? `${getSavedPlaceIcon(currentPlace)} ${currentPlace.name}` : 'Not set'}
                          {' '}
                          {isExpanded ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {isExpanded && (
                      <View style={styles.homePickerExpanded}>
                        <View style={styles.chipRow}>
                          {places.map((p) => {
                            const isSelected = homePlaceIds[member] === p.id;
                            return (
                              <TouchableOpacity
                                key={p.id}
                                onPress={() => handleSelectHomePlace(member, p)}
                                activeOpacity={0.7}
                                style={[styles.chip, isSelected && styles.chipSelected]}
                              >
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                  {getSavedPlaceIcon(p)} {p.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          {homePlaceIds[member] && (
                            <TouchableOpacity
                              onPress={() => handleClearHomePlace(member)}
                              activeOpacity={0.7}
                              style={styles.chip}
                            >
                              <Text style={styles.chipText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {places.map((place) => renderPlaceItem(place))}
        </ScrollView>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddPlace}
        label="Add Place"
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
  periodsLink: {
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
  homeSection: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: 20,
    ...shadows.card,
  },
  homeSectionTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 12,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  homeRowLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  homePickerButton: {
    backgroundColor: colors.chipBg,
    borderRadius: radius.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  homePickerButtonText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.text,
  },
  homePickerExpanded: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: radius.chip,
    minHeight: 36,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  placeCard: {
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
  },
  emoji: {
    fontSize: 36,
    marginRight: 16,
  },
  textInfo: {
    flex: 1,
  },
  placeTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  placeType: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
  },
  homeForRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  homeForBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  homeForBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 16,
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
