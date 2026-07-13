import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, Animated } from 'react-native';
import { Text, Button, Card, TextInput, Chip, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eventService } from '../services/event-service';
import { photoService } from '../services/photo-service';
import { databaseService } from '../services/database';
import { EventType, Event } from '../models';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';

const EVENT_TYPES: EventType[] = [
  'meltdown',
  'shutdown',
  'conflict',
  'school_incident',
  'great_day',
  'good_sleep',
  'poor_sleep',
  'medication',
  'wet_bed',
  'didnt_eat_dinner',
  'playdate',
  'watched_tv',
  'sick',
  'family_adventure',
  'played_outside',
  'good_dinner',
  'drew_comics',
  'stayed_home',
  'aggression',
  'good_breakfast',
  'tired',
  'fast_food',
  'sports',
  'party',
  'bounceback',
  'sugar',
  'poor_transitions',
  'chores',
  'focus',
  'reading',
  'kindness',
  'overwhelm',
  'naughty',
  'refusal',
  'sibling_harmony',
  'bad_language',
  'injury',
  'sneaky',
  'messy',
  'helpful',
  'video_games',
  'toilet_issue',
  'dad_bonding',
  'mom_bonding',
  'travel',
];

const SEVERITY_LEVELS = ['low', 'medium', 'high'] as const;
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
  const [timestamp, setTimestamp] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [valence, setValence] = useState<'positive' | 'negative' | 'neutral' | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [persons, setPersons] = useState<string[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [eventTypeMenuVisible, setEventTypeMenuVisible] = useState(false);
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
      const event = await databaseService.getEvent(eventId);
      
      if (event) {
        setEventType(event.eventType);
        setTimestamp(new Date(event.timestamp));
        setNotes(event.notes || '');
        setSeverity(event.severity);
        setValence(event.valence);
        setTags(event.tags || []);
        setPersons(event.persons || []);
        
        // Load photos
        const photos = await databaseService.getPhotosByEvent(eventId);
        setPhotoUris(photos.map(p => p.localUri));
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
      const result = await photoService.pickFromLibrary(false);
      if (result) {
        setPhotoUris([...photoUris, result.uri]);
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
        setPhotoUris([...photoUris, result.uri]);
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
          source: 'manual',
        });

        // Save photos
        for (const uri of photoUris) {
          await photoService.savePhoto(uri, childProfileId, event.id);
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

  const formatEventType = (type: EventType): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text>Loading...</Text>
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
              {isEditMode ? 'Edit Event' : 'New Event'}
            </Text>

            {/* Event Type */}
            <Text variant="titleMedium" style={styles.label}>
              Event Type *
            </Text>
            <Menu
              visible={eventTypeMenuVisible}
              onDismiss={() => setEventTypeMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setEventTypeMenuVisible(true)}
                  style={styles.menuButton}
                  contentStyle={styles.menuButtonContent}
                  textColor="#4A90E2"
                >
                  {formatEventType(eventType)}
                </Button>
              }
            >
              <ScrollView style={styles.menuScroll}>
                {EVENT_TYPES.map((type) => (
                  <Menu.Item
                    key={type}
                    onPress={() => {
                      setEventType(type);
                      setEventTypeMenuVisible(false);
                    }}
                    title={formatEventType(type)}
                  />
                ))}
              </ScrollView>
            </Menu>

            {/* Date & Time */}
            <Text variant="titleMedium" style={styles.label}>
              Date & Time *
            </Text>
            <View style={styles.dateTimeRow}>
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateTimeButton}
                textColor="#4A90E2"
              >
                {timestamp.toLocaleDateString()}
              </Button>
              <Button
                mode="outlined"
                onPress={() => setShowTimePicker(true)}
                style={styles.dateTimeButton}
                textColor="#4A90E2"
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
              {SEVERITY_LEVELS.map((level) => {
                const isSelected = severity === level;
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => {
                      setSeverity(severity === level ? undefined : level);
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
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Valence */}
            <Text style={styles.label}>
              Valence
            </Text>
            <View style={styles.chipRow}>
              {VALENCE_OPTIONS.map((val) => {
                const isSelected = valence === val;
                const label = val === 'positive' ? '😊 Positive' : val === 'negative' ? '😔 Negative' : '😐 Neutral';
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
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
              <Button mode="contained" onPress={handleAddTag} style={styles.addButton} buttonColor="#4A90E2">
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
              <Button mode="contained" onPress={handleAddPerson} style={styles.addButton} buttonColor="#4A90E2">
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
                textColor={colors.accent}
                contentStyle={{ paddingVertical: 0 }}
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={handleAddPhoto}
                style={styles.photoButton}
                textColor={colors.accent}
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
              buttonColor={colors.accent}
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
              textColor={colors.textDim}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              contentStyle={{ paddingVertical: 0 }}
            >
              Cancel
            </Button>
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
  menuScroll: {
    maxHeight: 300,
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
