import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Button, Card, TextInput, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../services/database';
import { photoService } from '../services/photo-service';
import { RelationshipPerson } from '../models';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';

const CATEGORIES: Array<'Family' | 'Family (Extended)' | 'Friends' | 'Childcare' | 'Professional' | 'Other'> = [
  'Family',
  'Family (Extended)',
  'Friends',
  'Childcare',
  'Professional',
  'Other',
];

const COMMON_ROLES = [
  'Parent',
  'Brother',
  'Sister',
  'Grandparent',
  'Aunt',
  'Uncle',
  'Teacher',
  'Therapist',
  'Friend',
  'Coach',
  'Caregiver',
  'Doctor',
];

export default function RelationshipFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const personId = params.personId as string | undefined;
  const isEditMode = !!personId;

  // Form state
  const [childProfileId, setChildProfileId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Family' | 'Family (Extended)' | 'Friends' | 'Childcare' | 'Professional' | 'Other'>('Family');
  const [role, setRole] = useState('');
  const [relationshipStrength, setRelationshipStrength] = useState<number | undefined>(undefined);
  const [photoPath, setPhotoPath] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (isEditMode && childProfileId) {
      loadPerson();
    }
  }, [personId, childProfileId]);

  const loadProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      if (profiles.length > 0) {
        setChildProfileId(profiles[0].id);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadPerson = async () => {
    if (!personId) return;

    try {
      setIsLoading(true);
      const person = await databaseService.getRelationshipPersonById(personId);
      
      if (person) {
        setName(person.name);
        setCategory(person.category || 'Family');
        setRole(person.role);
        setRelationshipStrength(person.relationshipStrength);
        setPhotoPath(person.photoPath);
        setNotes(person.notes || '');
      }
    } catch (error) {
      console.error('Failed to load person:', error);
      Alert.alert('Error', 'Failed to load person');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await photoService.capturePhoto();
      if (result) {
        console.log('[RelationshipForm] Photo captured:', result.localUri);
        setPhotoPath(result.localUri);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const result = await photoService.pickFromLibrary();
      if (result) {
        console.log('[RelationshipForm] Photo selected:', result.localUri);
        setPhotoPath(result.localUri);
      }
    } catch (error) {
      console.error('Failed to choose photo:', error);
      Alert.alert('Error', 'Failed to choose photo');
    }
  };

  const handleSave = async () => {
    if (!childProfileId) {
      Alert.alert('Error', 'No profile found. Please create a profile first.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name');
      return;
    }

    if (!role.trim()) {
      Alert.alert('Validation Error', 'Please enter a role');
      return;
    }

    try {
      setIsSaving(true);

      if (isEditMode && personId) {
        // Update existing person
        await databaseService.updateRelationshipPerson(personId, {
          name: name.trim(),
          category,
          role: role.trim(),
          relationshipStrength,
          photoPath,
          notes: notes.trim(),
        });
      } else {
        // Create new person
        const person: RelationshipPerson = {
          id: uuidv4(),
          childProfileId,
          name: name.trim(),
          category,
          role: role.trim(),
          relationshipStrength,
          photoPath,
          notes: notes.trim() || undefined,
          createdAt: new Date(),
          synced: false,
        };

        console.log('[RelationshipForm] Creating person:', person);
        await databaseService.createRelationshipPerson(person);
      }

      Alert.alert(
        'Success',
        isEditMode ? 'Person updated' : 'Person added to circle',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to save person:', error);
      Alert.alert('Error', 'Failed to save person: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
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
              {isEditMode ? 'Edit Person' : 'Add Person to Circle'}
            </Text>

            {/* Photo - Circular with camera icon */}
            <Text variant="titleMedium" style={styles.label}>
              Photo (Optional)
            </Text>
            <View style={styles.photoCircleContainer}>
              <View style={styles.photoCircle}>
                {photoPath ? (
                  <Image
                    source={{ uri: photoPath }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.cameraIcon}>📷</Text>
                )}
              </View>
              {photoPath && (
                <Button
                  mode="text"
                  onPress={() => setPhotoPath(undefined)}
                  compact
                  style={styles.removePhotoText}
                >
                  Remove
                </Button>
              )}
            </View>
            <View style={styles.photoButtons}>
              <Button
                mode="outlined"
                icon="camera"
                onPress={handleTakePhoto}
                style={styles.photoButton}
                compact
                labelStyle={{ color: colors.accent, fontSize: 15, fontWeight: '500' }}
                textColor={colors.accent}
                contentStyle={{ paddingVertical: 0 }}
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={handleChoosePhoto}
                style={styles.photoButton}
                compact
                labelStyle={{ color: colors.accent, fontSize: 15, fontWeight: '500' }}
                textColor={colors.accent}
                contentStyle={{ paddingVertical: 0 }}
              >
                Choose Photo
              </Button>
            </View>

            {/* Name */}
            <Text variant="titleMedium" style={styles.label}>
              Name *
            </Text>
            <TextInput
              mode="outlined"
              value={name}
              onChangeText={setName}
              placeholder="Enter name..."
              style={styles.textInput}
            />

            {/* Category */}
            <Text style={styles.label}>
              Category *
            </Text>
            <View style={styles.categoryChips}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                  >
                    <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Text style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}>
                        {cat}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Role */}
            <Text style={styles.label}>
              Role *
            </Text>
            <View style={styles.roleChips}>
              {COMMON_ROLES.map((commonRole) => {
                const isSelected = role === commonRole;
                return (
                  <TouchableOpacity
                    key={commonRole}
                    onPress={() => setRole(commonRole)}
                    activeOpacity={0.7}
                    style={[
                      styles.roleChip,
                      isSelected && styles.roleChipSelected,
                    ]}
                  >
                    <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Text style={[
                        styles.roleChipText,
                        isSelected && styles.roleChipTextSelected,
                      ]}>
                        {commonRole}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              mode="outlined"
              value={role}
              onChangeText={setRole}
              placeholder="Or enter custom role..."
              style={[styles.textInput, styles.compactInput]}
            />

            {/* Notes */}
            <Text variant="titleMedium" style={styles.label}>
              Notes (Optional)
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this person..."
              style={styles.textInput}
            />

            {/* Action Buttons */}
            <Button
              mode="contained"
              icon="check"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              style={styles.saveButton}
              labelStyle={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}
              contentStyle={{ paddingVertical: 0 }}
            >
              {isEditMode ? 'Update Person' : 'Add to Circle'}
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
    paddingTop: 60, // Extra padding at top to prevent title cutoff
  },
  card: {
    marginBottom: spacing.cardMargin,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  title: {
    marginBottom: 28,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    letterSpacing: typography.h1.letterSpacing,
    textAlign: 'center',
    color: colors.text,
  },
  label: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  textInput: {
    marginBottom: 12,
    backgroundColor: colors.inputBg,
  },
  compactInput: {
    height: 52,
    backgroundColor: colors.inputBg,
  },
  photoCircleContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  photoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.accentLight,
    borderWidth: 4,
    borderColor: colors.accent,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  cameraIcon: {
    fontSize: 52,
  },
  removePhotoText: {
    marginTop: 4,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  photoButton: {
    flex: 1,
    borderRadius: radius.input,
    borderColor: colors.accent,
    borderWidth: 1,
    backgroundColor: colors.accentLight,
    height: 48,
    justifyContent: 'center',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  categoryChip: {
    marginRight: 0,
    marginBottom: 0,
    borderRadius: radius.chip,
    height: 36,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: colors.chipSelectedBg,
    borderColor: colors.chipSelectedBorder,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  categoryChipTextSelected: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.chipSelectedText,
    lineHeight: 16,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  roleChip: {
    marginRight: 0,
    marginBottom: 0,
    borderRadius: radius.chip,
    height: 36,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleChipSelected: {
    backgroundColor: colors.chipSelectedBg,
    borderColor: colors.chipSelectedBorder,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  roleChipTextSelected: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.chipSelectedText,
    lineHeight: 16,
  },
  saveButton: {
    marginTop: 32,
    marginBottom: 10,
    height: 54,
    borderRadius: radius.button,
    backgroundColor: colors.accent,
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
