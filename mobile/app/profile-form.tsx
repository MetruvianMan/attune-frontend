import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Card, TextInput, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { databaseService } from '../services/database';
import { photoService } from '../services/photo-service';
import { ChildProfile, IntakeProfile } from '../models';

const COMMUNICATION_STYLES = [
  { value: 'verbal', label: 'Verbal' },
  { value: 'limited_verbal', label: 'Limited Verbal' },
  { value: 'aac_user', label: 'AAC User' },
] as const;

export default function ProfileFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const profileId = params.profileId as string | undefined;
  const isEditMode = !!profileId;

  // Basic fields
  const [displayName, setDisplayName] = useState('');
  const [alias, setAlias] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);

  // Intake profile fields
  const [grade, setGrade] = useState('');
  const [strengths, setStrengths] = useState('');
  const [struggles, setStruggles] = useState('');
  const [traits, setTraits] = useState('');
  const [sensitivities, setSensitivities] = useState('');
  const [communicationStyle, setCommunicationStyle] = useState<'verbal' | 'limited_verbal' | 'aac_user'>('verbal');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadProfile();
    }
  }, [profileId]);

  const loadProfile = async () => {
    if (!profileId) return;

    try {
      setIsLoading(true);
      const profile = await databaseService.getChildProfile(profileId);

      if (profile) {
        setDisplayName(profile.displayName);
        setAlias(profile.alias || '');
        setAge(profile.age.toString());
        setDiagnosis(profile.diagnosis || '');

        if (profile.intakeProfile) {
          setGrade(profile.intakeProfile.biographical?.grade || '');
          setStrengths(profile.intakeProfile.strengths?.join(', ') || '');
          setStruggles(profile.intakeProfile.struggles?.join(', ') || '');
          setTraits(profile.intakeProfile.traits?.join(', ') || '');
          setSensitivities(profile.intakeProfile.sensoryPreferences?.sensitivities?.join(', ') || '');
          setCommunicationStyle(profile.intakeProfile.communicationStyle?.type || 'verbal');
        }

        // Load photo from storage
        const photos = await databaseService.getPhotosByProfileId(profileId);
        if (photos.length > 0) {
          setPhotoUri(photos[0].filePath);
          setPhotoId(photos[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await photoService.capturePhoto();
      if (result) {
        setPhotoUri(result.localUri);
        setPhotoId(result.photo.id);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await photoService.pickFromLibrary();
      if (result) {
        setPhotoUri(result.localUri);
        setPhotoId(result.photo.id);
      }
    } catch (error) {
      console.error('Failed to pick photo:', error);
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const splitList = (value: string): string[] => {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSave = async () => {
    // Validation
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter a display name');
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid age');
      return;
    }

    try {
      setIsSaving(true);

      const intakeProfile: IntakeProfile = {
        biographical: {
          grade: grade.trim() || undefined,
        },
        traits: splitList(traits),
        strengths: splitList(strengths),
        struggles: splitList(struggles),
        sensoryPreferences: {
          sensitivities: splitList(sensitivities),
          seekingBehaviors: [],
        },
        communicationStyle: {
          type: communicationStyle,
          preferredPatterns: [],
        },
      };

      if (isEditMode && profileId) {
        // Update existing profile
        await databaseService.updateChildProfile(profileId, {
          displayName: displayName.trim(),
          alias: alias.trim() || undefined,
          age: ageNum,
          diagnosis: diagnosis.trim() || undefined,
          intakeProfile,
        });

        // Save photo to storage
        if (photoUri && photoId) {
          console.log('Associating photo with profile:', { photoId, profileId });
          await photoService.associateWithProfile(photoId, profileId);
          console.log('Photo associated successfully');
        }

        Alert.alert('Success', 'Profile updated', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        // Create new profile
        const newProfile: ChildProfile = {
          id: `profile-${Date.now()}`,
          displayName: displayName.trim(),
          alias: alias.trim() || undefined,
          age: ageNum,
          diagnosis: diagnosis.trim() || undefined,
          intakeProfile,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await databaseService.createChildProfile(newProfile);

        // Save photo to storage
        if (photoUri && photoId) {
          console.log('Associating photo with new profile:', { photoId, profileId: newProfile.id });
          await photoService.associateWithProfile(photoId, newProfile.id);
          console.log('Photo associated successfully');
        }

        Alert.alert('Success', 'Profile created', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profileId) return;

    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${displayName}'s profile? This will permanently remove all events, insights, and data associated with this profile. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              // Note: Database has CASCADE DELETE, so all related data will be removed
              await databaseService.deleteChildProfile(profileId);
              
              Alert.alert('Success', 'Profile deleted', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/profile') },
              ]);
            } catch (error) {
              console.error('Failed to delete profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
              setIsSaving(false);
            }
          },
        },
      ]
    );
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
              {isEditMode ? '✏️ Edit Profile' : '🌱 New Profile'}
            </Text>

            {/* Profile Photo */}
            <View style={styles.photoSection}>
              <TouchableOpacity
                style={styles.photoPreview}
                onPress={() => {
                  Alert.alert('Profile Photo', 'Choose an option', [
                    { text: 'Take Photo', onPress: handleTakePhoto },
                    { text: 'Choose from Library', onPress: handlePickPhoto },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImage} />
                ) : (
                  <Text style={styles.photoPlaceholder}>📷</Text>
                )}
              </TouchableOpacity>
              <Text variant="bodySmall" style={styles.photoLabel}>
                Tap to upload photo
              </Text>
            </View>

            {/* Display Name */}
            <Text variant="titleSmall" style={styles.label}>
              Display Name *
            </Text>
            <TextInput
              mode="outlined"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Child's name"
              style={styles.input}
            />

            {/* Alias */}
            <Text variant="titleSmall" style={styles.label}>
              Alias (optional, for privacy)
            </Text>
            <TextInput
              mode="outlined"
              value={alias}
              onChangeText={setAlias}
              placeholder="Alias"
              style={styles.input}
            />

            {/* Age */}
            <Text variant="titleSmall" style={styles.label}>
              Age *
            </Text>
            <TextInput
              mode="outlined"
              value={age}
              onChangeText={setAge}
              placeholder="Age"
              keyboardType="number-pad"
              style={styles.input}
            />

            {/* Diagnosis */}
            <Text variant="titleSmall" style={styles.label}>
              Diagnosis (optional)
            </Text>
            <TextInput
              mode="outlined"
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="e.g., Autism, ADHD"
              style={styles.input}
            />

            {/* Grade */}
            <Text variant="titleSmall" style={styles.label}>
              Grade (optional)
            </Text>
            <TextInput
              mode="outlined"
              value={grade}
              onChangeText={setGrade}
              placeholder="e.g., 3rd grade"
              style={styles.input}
            />

            {/* Strengths */}
            <Text variant="titleSmall" style={styles.label}>
              Strengths (comma-separated)
            </Text>
            <TextInput
              mode="outlined"
              value={strengths}
              onChangeText={setStrengths}
              placeholder="e.g., creative, empathetic"
              style={styles.input}
            />

            {/* Struggles */}
            <Text variant="titleSmall" style={styles.label}>
              Struggles (comma-separated)
            </Text>
            <TextInput
              mode="outlined"
              value={struggles}
              onChangeText={setStruggles}
              placeholder="e.g., transitions, loud noises"
              style={styles.input}
            />

            {/* Traits */}
            <Text variant="titleSmall" style={styles.label}>
              Traits (comma-separated)
            </Text>
            <TextInput
              mode="outlined"
              value={traits}
              onChangeText={setTraits}
              placeholder="e.g., detail-oriented, visual learner"
              style={styles.input}
            />

            {/* Sensory Sensitivities */}
            <Text variant="titleSmall" style={styles.label}>
              Sensory Sensitivities (comma-separated)
            </Text>
            <TextInput
              mode="outlined"
              value={sensitivities}
              onChangeText={setSensitivities}
              placeholder="e.g., loud sounds, bright lights"
              style={styles.input}
            />

            {/* Communication Style */}
            <Text variant="titleSmall" style={styles.label}>
              Communication Style
            </Text>
            <View style={styles.chipRow}>
              {COMMUNICATION_STYLES.map((style) => (
                <Chip
                  key={style.value}
                  selected={communicationStyle === style.value}
                  onPress={() => setCommunicationStyle(style.value)}
                  style={styles.chip}
                >
                  {style.label}
                </Chip>
              ))}
            </View>

            {/* Action Buttons */}
            <Button
              mode="contained"
              icon="check"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              style={styles.saveButton}
              buttonColor="#4A90E2"
            >
              {isEditMode ? 'Save Changes' : 'Create Profile'}
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={isSaving}
              style={styles.cancelButton}
              textColor="#4A90E2"
            >
              Cancel
            </Button>

            {/* Delete Button (only in edit mode) */}
            {isEditMode && (
              <Button
                mode="text"
                onPress={handleDelete}
                disabled={isSaving}
                style={styles.deleteButton}
                textColor="#FF3B30"
              >
                Delete Profile...
              </Button>
            )}
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    borderWidth: 3,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    fontSize: 32,
  },
  photoLabel: {
    color: '#999',
    fontSize: 12,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 16,
  },
  deleteButton: {
    marginTop: 24,
  },
});
