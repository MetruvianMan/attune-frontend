import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, Animated } from 'react-native';
import { Button, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { PaperTextInput as TextInput } from '../components/PaperText';
import { PaperText as Text } from '../components/PaperText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eventService } from '../services/event-service';
import { photoService } from '../services/photo-service';
import { databaseService } from '../services/database';
import { EventType, Event } from '../models';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { DEFAULT_QUICK_TAP_BUTTONS } from '../constants/quick-tap-buttons';
import { EVENT_EMOJIS, getEventLabel, getDefaultValenceForEventType } from '../constants/events';
import { EventTypePicker } from '../components/EventTypePicker';

// Severity is stored as a number (1-5) per the Event model / DB schema.
// The UI shows friendly Low/Medium/High labels that map to representative
// numeric values, consistent with the 2-3 defaults used elsewhere (e.g.
// HeatMapView's getDefaultSeverity) for automatic mood scoring.
const SEVERITY_LEVELS = [
  { label: 'Low', value: 1 },
  { label: 'Medium', value: 3 },
  { label: 'High', value: 5 },
] as const;
const VALENCE_OPTIONS = ['positive', 'negative', 'neutral'] as const;

export default function EventFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = params.eventId as string | undefined;
  const isEditMode = !!eventId;

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  // Form state
  const [eventType, setEventType] = useState<EventType>('meltdown');
  // Set when the user picks "Create Custom Event..." in the picker.
  const [customLabel, setCustomLabel] = useState<string | undefined>(undefined);
  // Tracks whether the event type was changed in this editing session, so
  // handleSave knows to clear any stale custom emoji/label override that
  // belonged to the event's original type.
  const [eventTypeChanged, setEventTypeChanged] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState<number | undefined>(undefined);
  const [valence, setValence] = useState<'positive' | 'negative' | 'neutral' | undefined>(undefined);
  // True when the current `valence` selection came from
  // getDefaultValenceForEventType (a Quick Log event with no explicit
  // valence of its own), not from the event's real stored value or a
  // manual selection in this session - used to visually flag the chip as
  // an inferred default rather than data that was always there. Cleared
  // the moment the user taps any Valence chip themselves, at which point
  // it becomes a real, explicit choice like any other event's.
  const [valenceIsInferred, setValenceIsInferred] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [persons, setPersons] = useState<string[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  // Photo IDs for photos captured/picked THIS session that aren't yet
  // associated with an event - capturePhoto()/pickFromLibrary() already
  // save the photo to storage/the photos table immediately (see
  // PhotoService), they just don't know which event it belongs to yet.
  // Tracked separately from photoUris (which mixes those with existing
  // photos loaded from a prior save, for display) so handleSave can call
  // associateWithEvent for exactly the new ones once a real eventId
  // exists, without re-associating photos that were already linked.
  const [newPhotoIds, setNewPhotoIds] = useState<string[]>([]);
  const [eventTypePickerVisible, setEventTypePickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);
      // Both queries only need eventId, not each other's result - fetch
      // them in parallel instead of sequentially awaiting getEvent then
      // getPhotosByEvent, which doubles the network round-trip time on
      // Supabase (SQLite is local and fast either way, but the Supabase
      // build waits out both requests one after another for no reason).
      const [event, photos] = await Promise.all([
        databaseService.getEvent(eventId),
        databaseService.getPhotosByEvent(eventId),
      ]);
      
      if (event) {
        setEventType(event.eventType);
        setCustomLabel(event.customLabel);
        setEventTypeChanged(false);
        setTimestamp(new Date(event.timestamp));
        setNotes(event.notes || '');
        setSeverity(event.severity);
        // Quick Log (quick-tap) events never capture an explicit valence
        // at creation time - the Quick Log grid has no valence UI at all
        // (see app/(tabs)/index.tsx's handleQuickTap). Rather than
        // leaving the Valence selector blank for these, derive one from
        // the event's type using the same RED_EVENTS/GREEN_EVENTS
        // classification the app already uses for automatic day-mood
        // scoring, so the user can see what impact this event actually
        // has on the day's score - and optionally correct/save it, which
        // then persists as a real explicit valence going forward. Events
        // logged via voice/text already carry a real AI-assigned valence
        // and are left as-is here.
        // event.valence comes back as `null` (not `undefined`) for any
        // event with no stored valence - both SQLite and Supabase return
        // NULL for the column, and the row mappers pass that straight
        // through (see database.ts/database-supabase.ts's getEvent row
        // mapping). `!== undefined` was true for `null` too, so this
        // branch was wrongly treated as "has a real explicit valence"
        // for every Quick Log event, leaving the chip unselected instead
        // of falling through to the inferred default below. Use `!= null`
        // (loose) to treat both null and undefined as "no stored value".
        if (event.valence != null) {
          setValence(event.valence);
          setValenceIsInferred(false);
        } else {
          // getDefaultValenceForEventType always returns a value now
          // (never undefined) - watched_tv/medication/etc. fall through
          // to 'neutral' rather than being left unclassified, so every
          // Quick Log event gets a chip selection, not just the
          // red/green ones.
          const inferred = event.source === 'quick-tap' ? getDefaultValenceForEventType(event.eventType) : undefined;
          setValence(inferred);
          setValenceIsInferred(inferred !== undefined);
        }
        setTags(event.tags || []);
        setPersons(event.persons || []);
        
        // Use remoteUrl if available (Supabase), otherwise filePath
        // (SQLite); Photo has no `localUri` field. Same fallback pattern
        // already used elsewhere (see event-detail.tsx,
        // contexts/ProfileContext.tsx).
        setPhotoUris(photos.map(p => p.remoteUrl || p.filePath));
      }
    } catch (error) {
      console.error('Failed to load event:', error);
      Alert.alert('Error', 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddPerson = () => {
    if (personInput.trim() && !persons.includes(personInput.trim())) {
      setPersons([...persons, personInput.trim()]);
      setPersonInput('');
    }
  };

  const handleRemovePerson = (person: string) => {
    setPersons(persons.filter(p => p !== person));
  };

  const handleAddPhoto = async () => {
    try {
      const result = await photoService.pickFromLibrary();
      if (result) {
        setPhotoUris([...photoUris, result.localUri]);
        setNewPhotoIds(prev => [...prev, result.photo.id]);
      }
    } catch (error) {
      console.error('Failed to add photo:', error);
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await photoService.capturePhoto();
      if (result) {
        setPhotoUris([...photoUris, result.localUri]);
        setNewPhotoIds(prev => [...prev, result.photo.id]);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotoUris(photoUris.filter(u => u !== uri));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (isEditMode && eventId) {
        // Update existing event
        await eventService.updateEvent(eventId, {
          eventType,
          timestamp,
          notes,
          severity,
          valence,
          tags,
          persons,
          // If the event type was changed in this session, clear any
          // custom emoji override that belonged to the old type - otherwise
          // a stale custom emoji would keep showing instead of the new
          // type's default emoji. customLabel is set instead of cleared
          // when the new type is 'custom' (user typed a custom event name).
          ...(eventTypeChanged && {
            customEmoji: undefined,
            customLabel: eventType === 'custom' ? customLabel : undefined,
          }),
        });

        // TODO: Handle photo updates
      } else {
        // Create new event
        const event = await eventService.createEvent({
          childProfileId,
          eventType,
          timestamp,
          notes,
          severity,
          valence,
          tags,
          persons,
          customLabel: eventType === 'custom' ? customLabel : undefined,
          source: 'manual',
        });

        // Associate this session's newly captured/picked photos (already
        // saved to storage by capturePhoto()/pickFromLibrary() at the
        // point they were added - see handleAddPhoto/handleTakePhoto)
        // with the event that just got created.
        for (const photoId of newPhotoIds) {
          await photoService.associateWithEvent(photoId, event.id);
        }
      }

      Alert.alert(
        'Success',
        isEditMode ? 'Event updated' : 'Event created',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to save event:', error);
      Alert.alert('Error', 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  // Display label for the dropdown anchor button: emoji + friendly name,
  // using the curated Quick Log list first, falling back to the full
  // EVENT_EMOJIS/getEventLabel maps for legacy/AI-only types.
  const getEventTypeDisplayLabel = (type: EventType): string => {
    if (type === 'custom' && customLabel) {
      return `📝  ${customLabel}`;
    }
    const button = DEFAULT_QUICK_TAP_BUTTONS.find(b => b.eventType === type);
    if (button) return `${button.emoji}  ${button.label}`;
    return `${EVENT_EMOJIS[type] || '📝'}  ${getEventLabel(type)}`;
  };

  // Called when a type is chosen in the EventTypePicker modal. An empty
  // emoji string means "custom event, keep whatever emoji was already
  // set" (per EventTypePicker's handleCustomEventSelect contract) - in
  // that case we don't mark eventTypeChanged, so handleSave won't clear
  // an emoji the user may have intentionally kept.
  const handleEventTypeSelect = (type: EventType, label: string, emoji: string) => {
    setEventType(type);
    setCustomLabel(type === 'custom' ? label : undefined);
    if (emoji) {
      setEventTypeChanged(true);
    }
    setEventTypePickerVisible(false);
  };

  if (isLoading) {
    // Previously rendered a top-left, uncentered "Loading..." card, which
    // against this screen's light background read as an effectively
    // blank white screen for the ~1s the getEvent/getPhotosByEvent fetch
    // takes (worse on the Supabase build - see loadEvent's Promise.all
    // fix above, which parallelizes those two calls instead of awaiting
    // them sequentially). A centered spinner - same ActivityIndicator +
    // accent color already used for the Today tab's own loading states -
    // makes it visibly clear the screen is doing something instead of
    // looking stalled/blank.
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {isEditMode ? 'Edit Event' : 'New Event'}
            </Text>

            {/* Event Type - sourced from saved Quick Log events */}
            <Text variant="titleMedium" style={styles.label}>
              Event Type *
            </Text>
            <Button
              mode="outlined"
              onPress={() => setEventTypePickerVisible(true)}
              style={styles.menuButton}
              contentStyle={styles.menuButtonContent}
              color="#4A90E2"
            >
              {getEventTypeDisplayLabel(eventType)}
            </Button>

            {/* Date & Time */}
            <Text variant="titleMedium" style={styles.label}>
              Date & Time *
            </Text>
            <View style={styles.dateTimeRow}>
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateTimeButton}
                color="#4A90E2"
              >
                {timestamp.toLocaleDateString()}
              </Button>
              <Button
                mode="outlined"
                onPress={() => setShowTimePicker(true)}
                style={styles.dateTimeButton}
                color="#4A90E2"
              >
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Button>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={timestamp}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setTimestamp(date);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={timestamp}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (date) setTimestamp(date);
                }}
              />
            )}

            {/* Notes */}
            <Text variant="titleMedium" style={styles.label}>
              Notes
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholder="Describe what happened..."
              style={styles.textInput}
            />

            {/* Severity */}
            <Text style={styles.label}>
              Severity
            </Text>
            <View style={styles.chipRow}>
              {SEVERITY_LEVELS.map(({ label, value }) => {
                const isSelected = severity === value;
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => {
                      setSeverity(isSelected ? undefined : value);
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Valence */}
            <Text style={styles.label}>
              Valence
              {valenceIsInferred && (
                <Text style={styles.labelHint}>  (estimated from event type)</Text>
              )}
            </Text>
            <View style={styles.chipRow}>
              {VALENCE_OPTIONS.map((val) => {
                const isSelected = valence === val;
                const label = val === 'positive' ? '😊 Positive' : val === 'negative' ? '😔 Negative' : '😐 Neutral';
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      // Any manual tap - including re-selecting the same
                      // inferred value - makes this a real, explicit
                      // choice rather than an inferred one.
                      setValenceIsInferred(false);
                      setValence(valence === val ? undefined : val);
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tags */}
            <Text variant="titleMedium" style={styles.label}>
              Tags
            </Text>
            <View style={styles.chipRow}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  onClose={() => handleRemoveTag(tag)}
                  style={styles.chip}
                >
                  {tag}
                </Chip>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                mode="outlined"
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add tag..."
                style={styles.inputRowField}
                dense
              />
              <Button mode="contained" onPress={handleAddTag} style={styles.addButton} color="#4A90E2">
                Add
              </Button>
            </View>

            {/* People Present */}
            <Text variant="titleMedium" style={styles.label}>
              People Present
            </Text>
            <View style={styles.chipRow}>
              {persons.map((person) => (
                <Chip
                  key={person}
                  onClose={() => handleRemovePerson(person)}
                  style={styles.chip}
                >
                  {person}
                </Chip>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                mode="outlined"
                value={personInput}
                onChangeText={setPersonInput}
                placeholder="Add person..."
                style={styles.inputRowField}
                dense
              />
              <Button mode="contained" onPress={handleAddPerson} style={styles.addButton} color="#4A90E2">
                Add
              </Button>
            </View>

            {/* Photos */}
            <Text variant="titleMedium" style={styles.label}>
              Photos ({photoUris.length})
            </Text>
            <View style={styles.photoButtonRow}>
              <Button
                mode="outlined"
                icon="camera"
                onPress={handleTakePhoto}
                style={styles.photoButton}
                color={colors.accent}
                contentStyle={{ paddingVertical: 0 }}
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={handleAddPhoto}
                style={styles.photoButton}
                color={colors.accent}
                contentStyle={{ paddingVertical: 0 }}
              >
                Choose Photo
              </Button>
            </View>

            {/* Action Buttons */}
            <Button
              mode="contained"
              icon="check"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              style={styles.saveButton}
              color={colors.accent}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              contentStyle={{ paddingVertical: 0 }}
            >
              {isEditMode ? 'Update Event' : 'Create Event'}
            </Button>
            <Button
              mode="text"
              onPress={() => router.back()}
              disabled={isSaving}
              style={styles.cancelButton}
              color={colors.textDim}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              contentStyle={{ paddingVertical: 0 }}
            >
              Cancel
            </Button>
          </Card.Content>
        </Card>
      </View>

      <EventTypePicker
        visible={eventTypePickerVisible}
        currentEventType={eventType}
        onSelect={handleEventTypeSelect}
        onClose={() => setEventTypePickerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionLabel: {
    marginTop: 24,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    color: colors.textDim,
  },
  label: {
    marginTop: 14,
    marginBottom: 7,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  labelHint: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  menuButton: {
    marginBottom: 10,
    borderRadius: radius.input,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    minHeight: 48,
  },
  menuButtonContent: {
    justifyContent: 'flex-start',
    height: 48,
    paddingVertical: 0,
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dateTimeButton: {
    flex: 1,
    borderRadius: radius.input,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    backgroundColor: colors.inputBg,
    height: 48,
    justifyContent: 'center',
  },
  textInput: {
    marginBottom: 6,
    backgroundColor: colors.inputBg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  chip: {
    marginRight: 0,
    marginBottom: 0,
    borderRadius: radius.chip,
    height: 38,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  chipSelected: {
    backgroundColor: colors.chipSelectedBg,
    borderColor: colors.chipSelectedBorder,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  chipTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.chipSelectedText,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  inputRowField: {
    flex: 1,
    backgroundColor: colors.inputBg,
    height: 48,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.button,
    paddingHorizontal: 18,
    height: 44,
    marginTop: 8,
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    borderRadius: radius.input,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
    height: 48,
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 10,
    height: 54,
    borderRadius: radius.button,
    justifyContent: 'center',
    ...shadows.sm,
  },
  cancelButton: {
    marginBottom: 20,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
  },
});
