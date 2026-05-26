import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { databaseService } from '../services/database';
import { photoService } from '../services/photo-service';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();

  const [displayName, setDisplayName] = useState('');
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [preferences, setPreferences] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileId) {
      loadProfile();
    }
  }, [profileId]);

  const loadProfile = async () => {
    try {
      const profile = await databaseService.getChildProfile(profileId);
      if (profile) {
        setDisplayName(profile.displayName || '');
        setBirthdate(profile.birthdate ? new Date(profile.birthdate) : null);
        setDiagnosis(profile.diagnosis || '');
        setPreferences(profile.preferences || '');
        setProfilePhotoUri(profile.profilePhotoUri || null);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photoUri = await photoService.capturePhoto();
      setProfilePhotoUri(photoUri);
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const photoUri = await photoService.pickPhoto();
      setProfilePhotoUri(photoUri);
    } catch (error) {
      console.error('Failed to pick photo:', error);
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthdate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter a name');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        id: profileId,
        displayName: displayName.trim(),
        birthdate: birthdate ? birthdate.toISOString() : null,
        diagnosis: diagnosis.trim() || null,
        preferences: preferences.trim() || null,
        profilePhotoUri: profilePhotoUri || null,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending' as const,
      };

      await databaseService.updateChildProfile(profileData);
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthdate: Date | null): string | null => {
    if (!birthdate) return null;
    const today = new Date();
    const age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
      return `${age - 1}`;
    }
    return `${age}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          Edit Profile
        </Text>

        {/* Profile Photo */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Profile Photo
            </Text>
            {profilePhotoUri ? (
              <Image
                source={{ uri: profilePhotoUri }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text variant="bodyLarge" style={styles.placeholderText}>
                  No Photo
                </Text>
              </View>
            )}
            <View style={styles.photoButtons}>
              <Button
                mode="outlined"
                onPress={handleTakePhoto}
                style={styles.photoButton}
                icon="camera"
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                onPress={handlePickPhoto}
                style={styles.photoButton}
                icon="image"
              >
                Choose Photo
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Basic Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Basic Information
            </Text>

            <TextInput
              label="Name *"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.datePickerContainer}>
              <Text variant="bodyMedium" style={styles.label}>
                Birthdate
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
              >
                {birthdate
                  ? birthdate.toLocaleDateString()
                  : 'Select Birthdate'}
              </Button>
              {birthdate && (
                <Text variant="bodySmall" style={styles.ageText}>
                  Age: {calculateAge(birthdate)} years
                </Text>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={birthdate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            <TextInput
              label="Diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
              placeholder="e.g., Autism Spectrum Disorder, ADHD"
            />

            <TextInput
              label="Preferences & Notes"
              value={preferences}
              onChangeText={setPreferences}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="Any preferences, sensitivities, or important notes"
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            icon="content-save"
          >
            Save Profile
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            disabled={loading}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
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
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#999',
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  input: {
    marginBottom: 12,
  },
  datePickerContainer: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
    color: '#666',
  },
  dateButton: {
    marginBottom: 4,
  },
  ageText: {
    color: '#666',
    marginTop: 4,
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 12,
  },
});
