import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { Card, Switch, ActivityIndicator } from 'react-native-paper';
import { PaperText as Text, PaperButton as Button } from '../../components/PaperText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useProfile } from '../../contexts/ProfileContext';
import { databaseService } from '../../services/database';
import { getOverlappingPeriods, getSavedPlaceIcon } from '../../services/location-service';
import { toLocalDateString } from '../../utils/local-date';
import { HouseholdMember, SavedPlace, LocationPeriod } from '../../models';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';

// 'Child' is replaced with the active profile's actual first name
// (e.g. "Robbie") everywhere this label renders - see
// buildHouseholdMemberOptions below. Kept as a static fallback for the
// brief window before activeProfile has loaded.
const STATIC_HOUSEHOLD_MEMBERS: { value: HouseholdMember; label: string }[] = [
  { value: 'child', label: 'Child' },
  { value: 'mom', label: 'Mom' },
  { value: 'dad', label: 'Dad' },
];

function buildHouseholdMemberOptions(childDisplayName: string | undefined): { value: HouseholdMember; label: string }[] {
  return STATIC_HOUSEHOLD_MEMBERS.map((m) =>
    m.value === 'child' && childDisplayName ? { ...m, label: childDisplayName } : m
  );
}

/**
 * Parses a 'YYYY-MM-DD' string into a local Date at midnight - NOT
 * `new Date(dateString)`, which parses as UTC and can shift a day
 * depending on the device's timezone. Mirrors
 * CalendarDatePicker.tsx's own parseDate helper.
 */
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
 * Create or edit a Location Period - household member picker, saved
 * place picker, start date, and either an end date or an "ongoing"
 * toggle that hides/clears the end date field (Requirement 2.1, 2.2).
 * Shows a non-blocking inline overlap warning (Requirement 2.7) before
 * save, computed via location-service.ts's getOverlappingPeriods -
 * the Save button is never disabled by this warning.
 */
export default function LocationPeriodFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // periodIds is a comma-separated list of every LocationPeriod row in
  // the group being edited - location-periods-list.tsx groups rows that
  // share the same place+dates into one card (e.g. "Aspen, Child + Mom")
  // and passes every row's id here so editing/closing-out/deleting acts
  // on the whole group at once rather than just the one row a plain
  // `periodId` singular param would represent. Falls back to the older
  // singular `periodId` param for callers that only ever pass one id
  // (there are none left after this change, but kept for robustness).
  const periodIdsParam = params.periodIds as string | undefined;
  const singlePeriodId = params.periodId as string | undefined;
  const editingPeriodIds = periodIdsParam
    ? periodIdsParam.split(',')
    : singlePeriodId
      ? [singlePeriodId]
      : [];
  const isEditMode = editingPeriodIds.length > 0;
  const { activeProfile } = useProfile();
  const childProfileId = activeProfile?.id || null;
  const HOUSEHOLD_MEMBERS = buildHouseholdMemberOptions(activeProfile?.displayName);

  // selectedMembers holds every HouseholdMember this period applies to.
  // Tapping a chip TOGGLES membership in both create and edit mode (e.g.
  // selecting both Mom and Dad for a shared trip creates/keeps one
  // LocationPeriod row per selected member, all sharing the same
  // place/dates) - this addresses the "Robbie in Aspen alone" gap
  // reported after the task 11/13/15 checkpoint, where recording a
  // family trip required separately creating one period per person with
  // no way to do it in one pass.
  const [selectedMembers, setSelectedMembers] = useState<HouseholdMember[]>(['child']);
  // Every {id, member} pair this screen was opened with (one per row in
  // the group being edited) - used on save to reconcile a possibly-
  // changed multi-select against those existing rows: a member still
  // selected gets their existing row UPDATED in place; a member removed
  // from the group gets their row DELETED; a newly added member gets a
  // brand new row CREATED. Empty in create mode, where there are no
  // existing rows to reconcile against.
  const [originalPeriods, setOriginalPeriods] = useState<{ id: string; member: HouseholdMember }[]>([]);
  const [savedPlaceId, setSavedPlaceId] = useState<string | undefined>(undefined);
  const [startDateKey, setStartDateKey] = useState<string>(toLocalDateString(new Date()));
  const [isOngoing, setIsOngoing] = useState(true);
  const [endDateKey, setEndDateKey] = useState<string | undefined>(undefined);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [places, setPlaces] = useState<SavedPlace[]>([]);
  // One entry per selected member that has at least one overlapping
  // period - e.g. selecting Mom+Dad for a trip that overlaps an existing
  // period for Dad only shows Dad's warning, not a blanket warning
  // implying both overlap.
  const [overlapping, setOverlapping] = useState<{ member: HouseholdMember; periods: LocationPeriod[] }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!childProfileId) return;
    (async () => {
      try {
        setIsLoading(true);
        const [loadedPlaces, existingPeriods] = await Promise.all([
          databaseService.getSavedPlacesByProfile(childProfileId),
          editingPeriodIds.length > 0 ? databaseService.getLocationPeriodsByProfile(childProfileId) : Promise.resolve([]),
        ]);
        setPlaces(loadedPlaces);

        if (editingPeriodIds.length > 0) {
          const matchedPeriods = existingPeriods.filter((p: LocationPeriod) => editingPeriodIds.includes(p.id));
          if (matchedPeriods.length > 0) {
            setOriginalPeriods(matchedPeriods.map((p) => ({ id: p.id, member: p.householdMember })));
            setSelectedMembers(matchedPeriods.map((p) => p.householdMember));
            // Every row in a group shares the same place/dates (that's
            // what makes them a group - see groupPeriods in
            // location-periods-list.tsx), so the first row's values
            // apply to the whole group.
            const first = matchedPeriods[0];
            setSavedPlaceId(first.savedPlaceId);
            setStartDateKey(first.startDate);
            if (first.endDate) {
              setIsOngoing(false);
              setEndDateKey(first.endDate);
            } else {
              setIsOngoing(true);
              setEndDateKey(undefined);
            }
          }
        } else if (loadedPlaces.length > 0) {
          setSavedPlaceId(loadedPlaces[0].id);
        }
      } catch (error) {
        console.error('Failed to load location period form data:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [childProfileId, periodIdsParam, singlePeriodId]);

  // Non-blocking overlap check (Requirement 2.7) - re-runs whenever the
  // fields that define this period's range/member(s) change. Never
  // affects whether Save is enabled. Checks every selected member
  // in parallel, since a multi-member selection (e.g. Mom+Dad for a
  // shared trip) can overlap for one member and not the other.
  useEffect(() => {
    if (!childProfileId || selectedMembers.length === 0) {
      setOverlapping([]);
      return;
    }
    (async () => {
      try {
        const results = await Promise.all(
          selectedMembers.map(async (member) => {
            // Exclude this member's own row in the group being edited
            // (if any) from its own overlap check - editing a period
            // shouldn't warn that it overlaps with itself.
            const ownRowForMember = originalPeriods.find((p) => p.member === member)?.id;
            return {
              member,
              periods: await getOverlappingPeriods(
                childProfileId,
                member,
                startDateKey,
                isOngoing ? undefined : endDateKey,
                ownRowForMember
              ),
            };
          })
        );
        setOverlapping(results.filter((r) => r.periods.length > 0));
      } catch (error) {
        console.error('Failed to check for overlapping periods:', error);
      }
    })();
  }, [childProfileId, selectedMembers, startDateKey, isOngoing, endDateKey, originalPeriods]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (selectedMembers.length === 0) {
      newErrors.householdMember = 'Please select at least one person';
    }
    if (!savedPlaceId) {
      newErrors.savedPlaceId = 'Please select a place';
    }
    if (!isOngoing && endDateKey && endDateKey < startDateKey) {
      newErrors.endDate = 'End date must be on or after the start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!childProfileId) {
      Alert.alert('Error', 'No profile found. Please create a profile first.');
      return;
    }
    if (!validate() || !savedPlaceId) {
      return;
    }

    try {
      setIsSaving(true);

      if (isEditMode && originalPeriods.length > 0) {
        // Edit mode reconciles a possibly-changed multi-select against
        // the group of existing rows this screen opened with (one row
        // per member who was already in the group):
        // - A member who still has a row in originalPeriods AND is
        //   still selected gets that row UPDATED in place.
        // - A member who HAD a row but is no longer selected gets that
        //   row DELETED - the Parent removed this period from that
        //   person.
        // - A member who is selected but had NO row in the original
        //   group gets a brand new row CREATED - e.g. editing Robbie's
        //   Aspen period to add Mom+Dad creates two new rows alongside
        //   the updated original, rather than requiring those to be
        //   entered as separate periods first.
        const ops: Promise<void>[] = [];

        for (const { id, member } of originalPeriods) {
          if (selectedMembers.includes(member)) {
            ops.push(
              databaseService.updateLocationPeriod(id, {
                householdMember: member,
                savedPlaceId,
                startDate: startDateKey,
                endDate: isOngoing ? undefined : endDateKey,
              })
            );
          } else {
            ops.push(databaseService.deleteLocationPeriod(id));
          }
        }

        const originalMembers = originalPeriods.map((p) => p.member);
        for (const member of selectedMembers) {
          if (originalMembers.includes(member)) continue;
          const period: LocationPeriod = {
            id: uuidv4(),
            childProfileId,
            householdMember: member,
            savedPlaceId,
            startDate: startDateKey,
            endDate: isOngoing ? undefined : endDateKey,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          ops.push(databaseService.createLocationPeriod(period));
        }

        await Promise.all(ops);
      } else {
        // Create mode fans out into one LocationPeriod per selected
        // member, all sharing the same place/dates - e.g. selecting
        // Mom+Dad for a shared trip creates two rows in one save, rather
        // than requiring two separate trips through this form.
        await Promise.all(
          selectedMembers.map((member) => {
            const period: LocationPeriod = {
              id: uuidv4(),
              childProfileId,
              householdMember: member,
              savedPlaceId,
              startDate: startDateKey,
              endDate: isOngoing ? undefined : endDateKey,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            return databaseService.createLocationPeriod(period);
          })
        );
      }

      router.back();
    } catch (error) {
      console.error('Failed to save location period:', error);
      Alert.alert('Error', 'Failed to save: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <ActivityIndicator size="large" color={colors.accent} />
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (places.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyText}>
              You need at least one Saved Place before you can create a
              Location Period. Go back and add one first.
            </Text>
            <Button mode="contained" onPress={() => router.back()} style={styles.primaryButton} color={colors.accent} dark uppercase={false}>
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {isEditMode ? 'Edit Location Period' : 'New Location Period'}
            </Text>

            {/* Household Member(s) - multi-select in both create and edit
                mode (tap toggles membership). On save, this reconciles
                against whatever single row is actually being
                created/edited - see handleSave's comment for exactly how
                edit mode fans a changed selection out across
                update/create/delete. */}
            <Text style={styles.label}>Who (select all who apply) *</Text>
            <View style={styles.chipRow}>
              {HOUSEHOLD_MEMBERS.map((m) => {
                const isSelected = selectedMembers.includes(m.value);
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => {
                      setSelectedMembers((current) =>
                        current.includes(m.value)
                          ? current.filter((v) => v !== m.value)
                          : [...current, m.value]
                      );
                    }}
                    activeOpacity={0.7}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.householdMember && (
              <Text style={styles.errorText}>{errors.householdMember}</Text>
            )}

            {/* Saved Place */}
            <Text style={styles.label}>Place *</Text>
            <View style={styles.chipRow}>
              {places.map((place) => {
                const isSelected = savedPlaceId === place.id;
                return (
                  <TouchableOpacity
                    key={place.id}
                    onPress={() => setSavedPlaceId(place.id)}
                    activeOpacity={0.7}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {getSavedPlaceIcon(place)} {place.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.savedPlaceId && (
              <Text style={styles.errorText}>{errors.savedPlaceId}</Text>
            )}

            {/* Start Date */}
            <Text style={styles.label}>Start Date *</Text>
            <Button
              mode="outlined"
              onPress={() => setShowStartPicker(true)}
              color={colors.accent}
              style={styles.dateButton}
            >
              {formatDateKeyForDisplay(startDateKey)}
            </Button>
            {showStartPicker && (
              <DateTimePicker
                value={parseDateKey(startDateKey)}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (Platform.OS !== 'ios') setShowStartPicker(false);
                  if (date) setStartDateKey(toLocalDateString(date));
                }}
              />
            )}

            {/* Ongoing toggle + End Date */}
            <View style={styles.switchRow}>
              <Text style={styles.sectionTitle}>Ongoing (no end date yet)</Text>
              <Switch
                value={isOngoing}
                onValueChange={(value) => {
                  setIsOngoing(value);
                  if (value) {
                    setEndDateKey(undefined);
                  } else if (!endDateKey) {
                    setEndDateKey(startDateKey);
                  }
                }}
                color={colors.accent}
              />
            </View>

            {!isOngoing && (
              <>
                <Text style={styles.label}>End Date *</Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowEndPicker(true)}
                  color={colors.accent}
                  style={styles.dateButton}
                >
                  {endDateKey ? formatDateKeyForDisplay(endDateKey) : 'Select end date'}
                </Button>
                {showEndPicker && (
                  <DateTimePicker
                    value={parseDateKey(endDateKey || startDateKey)}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (Platform.OS !== 'ios') setShowEndPicker(false);
                      if (date) setEndDateKey(toLocalDateString(date));
                    }}
                  />
                )}
                {errors.endDate && (
                  <Text style={styles.errorText}>{errors.endDate}</Text>
                )}
              </>
            )}

            {/* Overlap warning - non-blocking, Requirement 2.7. One line
                per member that actually has an overlap, so selecting
                Mom+Dad when only Dad has a conflicting period doesn't
                imply Mom's is affected too. */}
            {overlapping.length > 0 && (
              <View style={styles.warningBox}>
                {overlapping.map(({ member, periods }) => (
                  <Text key={member} style={styles.warningText}>
                    ⚠️ This overlaps with {periods.length} existing period
                    {periods.length > 1 ? 's' : ''} for{' '}
                    {HOUSEHOLD_MEMBERS.find((m) => m.value === member)?.label}. You
                    can still save - the most recently created period will
                    take precedence on any overlapping day.
                  </Text>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button
                mode="text"
                onPress={() => router.back()}
                disabled={isSaving}
                uppercase={false}
                color={colors.textDim}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.primaryButton}
                color={colors.accent}
                dark
                loading={isSaving}
                disabled={isSaving}
                uppercase={false}
              >
                {selectedMembers.length > 1
                  ? `Save for ${selectedMembers.length} People`
                  : isEditMode
                    ? 'Save Changes'
                    : 'Create Period'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.screenPadding,
  },
  card: {
    marginBottom: spacing.cardMargin,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  title: {
    marginBottom: 20,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    letterSpacing: typography.h1.letterSpacing,
    textAlign: 'center',
    color: colors.text,
  },
  label: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderRadius: radius.chip,
    minHeight: 36,
    backgroundColor: colors.chipBg,
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
  dateButton: {
    borderRadius: radius.input,
    alignSelf: 'flex-start',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  warningBox: {
    backgroundColor: colors.warmLight,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: 'rgba(242,201,76,0.35)',
    padding: 12,
    marginTop: 20,
  },
  warningText: {
    color: '#8A6D1F',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 32,
    gap: 4,
  },
  cancelButton: {
    marginRight: 4,
  },
  primaryButton: {
    borderRadius: radius.button,
    minWidth: 160,
    marginTop: 12,
  },
});
