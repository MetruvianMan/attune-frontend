import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { databaseService } from '../services/database';
import { RelationshipPerson, Event } from '../models';

export default function RelationshipDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const personId = params.personId as string;

  const [person, setPerson] = useState<RelationshipPerson | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    loadPerson();
  }, [personId]);

  const loadPerson = async () => {
    try {
      setIsLoading(true);
      const loadedPerson = await databaseService.getRelationshipPersonById(personId);
      
      if (loadedPerson) {
        setPerson(loadedPerson);
        
        // Load events involving this person
        const allEvents = await databaseService.getEvents({ childProfileId });
        const filtered = allEvents.filter(event => 
          event.persons?.includes(loadedPerson.name)
        );
        setRelatedEvents(filtered);
      } else {
        Alert.alert('Error', 'Person not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load person:', error);
      Alert.alert('Error', 'Failed to load person');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/relationship-form?personId=${personId}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to remove ${person?.name} from the circle? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await databaseService.deleteRelationshipPerson(personId);
      Alert.alert('Success', 'Person removed from circle', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to delete person:', error);
      Alert.alert('Error', 'Failed to delete person');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStrengthIndicator = (strength?: number) => {
    if (!strength) return null;
    
    const hearts = '❤️'.repeat(strength) + '🤍'.repeat(5 - strength);
    return (
      <View style={styles.strengthContainer}>
        <Text variant="bodyMedium" style={styles.strengthLabel}>
          Relationship Strength:
        </Text>
        <Text style={styles.strength}>{hearts}</Text>
      </View>
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

  if (!person) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text>Person not found</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                {person.photoPath ? (
                  <Image
                    source={{ uri: person.photoPath }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {person.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.profileInfo}>
                <Text variant="headlineSmall" style={styles.name}>
                  {person.name}
                </Text>
                <Text variant="titleMedium" style={styles.role}>
                  {person.role}
                </Text>
              </View>
            </View>

            {renderStrengthIndicator(person.relationshipStrength)}
          </Card.Content>
        </Card>

        {/* Notes */}
        {person.notes && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Notes
              </Text>
              <Text variant="bodyMedium" style={styles.notes}>
                {person.notes}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Related Events */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Related Events ({relatedEvents.length})
            </Text>
            {relatedEvents.length === 0 ? (
              <Text variant="bodyMedium" style={styles.noEvents}>
                No events involving this person yet
              </Text>
            ) : (
              <View style={styles.eventsList}>
                {relatedEvents.slice(0, 5).map((event) => (
                  <View key={event.id} style={styles.eventItem}>
                    <Text variant="bodyMedium" style={styles.eventType}>
                      {event.eventType.split('_').map(w => 
                        w.charAt(0).toUpperCase() + w.slice(1)
                      ).join(' ')}
                    </Text>
                    <Text variant="bodySmall" style={styles.eventDate}>
                      {new Date(event.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
                {relatedEvents.length > 5 && (
                  <Text variant="bodySmall" style={styles.moreEvents}>
                    +{relatedEvents.length - 5} more events
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Metadata */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Details
            </Text>
            <View style={styles.metadataRow}>
              <Text variant="bodySmall" style={styles.metadataLabel}>Added:</Text>
              <Text variant="bodySmall" style={styles.metadataValue}>
                {new Date(person.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.metadataRow}>
              <Text variant="bodySmall" style={styles.metadataLabel}>Synced:</Text>
              <Text variant="bodySmall" style={styles.metadataValue}>
                {person.synced ? '✓ Yes' : '⏳ Pending'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="pencil"
            onPress={handleEdit}
            style={styles.actionButton}
          >
            Edit Person
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={handleDelete}
            loading={isDeleting}
            disabled={isDeleting}
            style={styles.actionButton}
            textColor="#f44336"
          >
            Remove from Circle
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
  card: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  role: {
    color: '#666',
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  strength: {
    fontSize: 18,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  notes: {
    lineHeight: 24,
    color: '#333',
  },
  noEvents: {
    color: '#999',
    fontStyle: 'italic',
  },
  eventsList: {
    gap: 8,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventType: {
    flex: 1,
    fontWeight: '500',
  },
  eventDate: {
    color: '#666',
  },
  moreEvents: {
    marginTop: 8,
    color: '#2196F3',
    fontWeight: '600',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metadataLabel: {
    color: '#666',
    fontWeight: '600',
  },
  metadataValue: {
    color: '#333',
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 12,
  },
});
