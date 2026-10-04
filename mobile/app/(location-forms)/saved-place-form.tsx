import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { Button, Card, ActivityIndicator } from 'react-native-paper';
import { PaperText as Text, PaperTextInput as TextInput } from '../../components/PaperText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { useProfile } from '../../contexts/ProfileContext';
import { databaseService } from '../../services/database';
import { geocodeRegionHint, getPlaceTypeIcon } from '../../services/location-service';
import { CategorizedEmojiPicker } from '../../components/CategorizedEmojiPicker';
import { PlaceType, SavedPlace } from '../../models';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';

// Label + PlaceType pairs for the chip row below - emoji sourced from the
// single shared getPlaceTypeIcon mapping (location-service.ts) so this
// form, LocationCalendarView, LocationMapView, and the Today tab indicator
// never drift into separate copies of the same icon lookup.
const PLACE_TYPES: { value: PlaceType; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'family_visit', label: 'Family Visit' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'camp_or_school_trip', label: 'Camp / School Trip' },
  { value: 'other', label: 'Other' },
];

/**
 * Create or edit a Saved Place - name, Place Type (required chip picker),
 * and an optional region hint used to geocode a Location Map pin position.
 * Follows relationship-form.tsx's plain try/catch save pattern (not
 * behavior-form.tsx's context-backed optimistic navigation) - there's no
 * shared Location context/optimistic store for this feature, see
 * app/(location-forms)/_layout.tsx's header comment.
 */
export default function SavedPlaceFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const placeId = params.placeId as string | undefined;
  const isEditMode = !!placeId;
  const { activeProfile } = useProfile();
  const childProfileId = activeProfile?.id || null;

  const [name, setName] = useState('');
  const [placeType, setPlaceType] = useState<PlaceType>('home');
  const [regionHint, setRegionHint] = useState('');
  // Optional emoji override shown instead of the PlaceType's default icon
  // (e.g. '⛰️' for an "Aspen" Vacation place) - '' means "no override,
  // use the PlaceType icon." The picker itself is only shown once the
  // Parent opts in via showEmojiPicker, to keep the form's default state
  // uncluttered for the common case of just using the PlaceType icon.
  const [customEmoji, setCustomEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && placeId) {
      loadPlace(placeId);
    }
  }, [placeId]);

  const loadPlace = async (id: string) => {
    try {
      setIsLoading(true);
      const place = await databaseService.getSavedPlace(id);
      if (place) {
        setName(place.name);
        setPlaceType(place.placeType);
        setRegionHint(place.regionHint || '');
        setCustomEmoji(place.customEmoji || '');
        if (place.customEmoji) setShowEmojiPicker(true);
      }
    } catch (error) {
      console.error('Failed to load saved place:', error);
      Alert.alert('Error', 'Failed to load place');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!childProfileId) {
      Alert.alert('Error', 'No profile found. Please create a profile first.');
      return;
    }
    if (!validate()) {
      return;
    }

    try {
      setIsSaving(true);

      const trimmedRegionHint = regionHint.trim();
      // Geocode ONCE here, at save time - not on every render, and not
      // tied to app usage (see location-service.ts's geocodeRegionHint
      // for the full privacy reasoning). A failed/empty lookup still
      // saves the place successfully, just without a lat/long - it falls
      // into the Location Map's "Other places" fallback grouping rather
      // than blocking this save (Requirement 1.7, Property 7).
      const coords = trimmedRegionHint ? await geocodeRegionHint(trimmedRegionHint) : null;

      const trimmedCustomEmoji = customEmoji.trim();

      if (isEditMode && placeId) {
        await databaseService.updateSavedPlace(placeId, {
          name: name.trim(),
          placeType,
          regionHint: trimmedRegionHint || undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          customEmoji: trimmedCustomEmoji || undefined,
        });
      } else {
        const place: SavedPlace = {
          id: uuidv4(),
          childProfileId,
          name: name.trim(),
          placeType,
          regionHint: trimmedRegionHint || undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          customEmoji: trimmedCustomEmoji || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await databaseService.createSavedPlace(place);
      }

      router.back();
    } catch (error) {
      console.error('Failed to save place:', error);
      Alert.alert('Error', 'Failed to save place: ' + (error as Error).message);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {isEditMode ? 'Edit Place' : 'New Saved Place'}
            </Text>

            {/* Name */}
            <Text variant="titleMedium" style={styles.label}>
              Name *
            </Text>
            <TextInput
              mode="outlined"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grandma's House, Camp Wildwood"
              error={!!errors.name}
              style={styles.textInput}
              outlineColor={colors.inputBorder}
              activeOutlineColor={colors.accent}
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}

            {/* Place Type */}
            <Text style={styles.label}>
              Place Type *
            </Text>
            <View style={styles.chipRow}>
              {PLACE_TYPES.map((pt) => {
                const isSelected = placeType === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    onPress={() => setPlaceType(pt.value)}
                    activeOpacity={0.7}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {getPlaceTypeIcon(pt.value)} {pt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Emoji (optional) - overrides the Place Type's
                default icon everywhere this place's icon is shown
                (Calendar, Map, detail sheet, management screens) via
                getSavedPlaceIcon. */}
            <View style={styles.emojiLabelRow}>
              <Text style={[styles.label, styles.emojiLabelNoMargin]}>Custom Icon (Optional)</Text>
              {showEmojiPicker ? (
                <TouchableOpacity
                  onPress={() => {
                    setShowEmojiPicker(false);
                    setCustomEmoji('');
                  }}
                >
                  <Text style={styles.emojiRemoveLink}>Use default</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                  <Text style={styles.emojiRemoveLink}>Choose an icon</Text>
                </TouchableOpacity>
              )}
            </View>
            {showEmojiPicker ? (
              <CategorizedEmojiPicker
                selectedEmoji={customEmoji || getPlaceTypeIcon(placeType)}
                onSelectEmoji={setCustomEmoji}
              />
            ) : (
              <Text style={styles.helperText}>
                Using the default {PLACE_TYPES.find((pt) => pt.value === placeType)?.label} icon
                ({getPlaceTypeIcon(placeType)}). Choose a custom one if you'd like, e.g. ⛰️ for a mountain town.
              </Text>
            )}

            {/* Region Hint (optional, for Location Map placement) */}
            <Text variant="titleMedium" style={styles.label}>
              City or Region (Optional)
            </Text>
            <TextInput
              mode="outlined"
              value={regionHint}
              onChangeText={setRegionHint}
              placeholder="e.g. Aspen, CO"
              style={styles.textInput}
              outlineColor={colors.inputBorder}
              activeOutlineColor={colors.accent}
            />
            <Text style={styles.helperText}>
              Used to place this spot on the Location Map. If left blank
              or not recognized, this place still appears in an "Other
              places" list on the map - it's never hidden.
            </Text>

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
                {isEditMode ? 'Save Changes' : 'Create Place'}
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
  textInput: {
    backgroundColor: colors.inputBgSolid,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12.5,
    color: colors.textDim,
    marginTop: 8,
    lineHeight: 18,
  },
  emojiLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  emojiLabelNoMargin: {
    marginTop: 0,
    marginBottom: 0,
  },
  emojiRemoveLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
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
  },
});
