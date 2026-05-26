import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, Card, TextInput, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../services/database';
import { photoService } from '../services/photo-service';
import { RelationshipPerson } from '../models';

const COMMON_ROLES = [
  'Parent',
  'Sibling',
  'Grandparent',
  'Teacher',
  'Therapist',
  'Friend',
  'Coach',
  'Caregiver',
  'Doctor',
  'Other',
];

export default function RelationshipFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const personId = params.personId as string | undefined;
  const isEditMode = !!personId;

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [relationshipStrength, setRelationshipStrength] = useState<number | undefined>(undefined);
  const [photoPath, setPhotoPath] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadPerson();
    }
  }, [personId]);

  const loadPerson = async () => {
    if (!personId) return;

    try {
      setIsLoading(true);
      const person = await databaseService.getRelationshipPersonById(personId);
      
      if (person) {
        setName(person.name);
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
        setPhotoPath(result.uri);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const result = await photoService.pickFromLibrary(false);
      if (result) {
        setPhotoPath(result.uri);
      }
    } catch (error) {
      console.error('Failed to choose photo:', error);
      Alert.alert('Error', 'Failed to choose photo');
    }
  };

  const handleSave = async () => {
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
          role: role.trim(),
          relationshipStrength,
          photoPath,
          notes: notes.trim() || undefined,
          createdAt: new Date(),
          synced: false,
        };

        await databaseService.createRelationshipPerson(person);
      }

      Alert.alert(
        'Success',
        isEditMode ? 'Person updated' : 'Person added to circle',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to save person:', error);
      Alert.alert('Error', 'Failed to save person');
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

            {/* Photo */}
            <Text variant="titleMedium" style={styles.label}>
              Photo (Optional)
            </Text>
            {photoPath ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: photoPath }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <Button
                  mode="outlined"
                  onPress={() => setPhotoPath(undefined)}
                  style={styles.removePhotoButton}
                  compact
                >
                  Remove Photo
                </Button>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={handleTakePhoto}
                  style={styles.photoButton}
                >
                  Take Photo
                </Button>
                <Button
                  mode="outlined"
                  icon="image"
                  onPress={handleChoosePhoto}
                  style={styles.photoButton}
                >
                  Choose Photo
                </Button>
              </View>
            )}

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

            {/* Role */}
            <Text variant="titleMedium" style={styles.label}>
              Role *
            </Text>
            <View style={styles.roleChips}>
              {COMMON_ROLES.map((commonRole) => (
                <Chip
                  key={commonRole}
                  selected={role === commonRole}
                  onPress={() => setRole(commonRole)}
                  style={styles.roleChip}
                >
                  {commonRole}
                </Chip>
              ))}
            </View>
            <TextInput
              mode="outlined"
              value={role}
              onChangeText={setRole}
              placeholder="Or enter custom role..."
              style={styles.textInput}
            />

            {/* Relationship Strength */}
            <Text variant="titleMedium" style={styles.label}>
              Relationship Strength (Optional)
            </Text>
            <View style={styles.strengthButtons}>
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  mode={relationshipStrength === level ? 'contained' : 'outlined'}
                  onPress={() => setRelationshipStrength(level)}
                  style={styles.strengthButton}
                >
                  {'❤️'.repeat(level)}
                </Button>
              ))}
            </View>
            {relationshipStrength && (
              <Button
                mode="text"
                onPress={() => setRelationshipStrength(undefined)}
                compact
              >
                Clear
              </Button>
            )}

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
            >
              {isEditMode ? 'Update Person' : 'Add to Circle'}
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={isSaving}
              style={styles.cancelButton}
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
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    marginBottom: 8,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  removePhotoButton: {
    marginTop: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  roleChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  strengthButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  strengthButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 16,
  },
});
