import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, Card, Chip, IconButton } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { databaseService } from '../services/database';
import { eventService } from '../services/event-service';
import { Event, Photo } from '../models';

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      const loadedEvent = await databaseService.getEventById(eventId);
      
      if (loadedEvent) {
        setEvent(loadedEvent);
        
        // Load photos
        const eventPhotos = await databaseService.getPhotosByEvent(eventId);
        setPhotos(eventPhotos);
      } else {
        Alert.alert('Error', 'Event not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load event:', error);
      Alert.alert('Error', 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/event-form?eventId=${eventId}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
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
      await eventService.deleteEvent(eventId);
      Alert.alert('Success', 'Event deleted', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to delete event:', error);
      Alert.alert('Error', 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatEventType = (type: string): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getValenceColor = (valence?: string) => {
    switch (valence) {
      case 'positive':
        return '#4CAF50';
      case 'negative':
        return '#f44336';
      case 'neutral':
        return '#9E9E9E';
      default:
        return '#2196F3';
    }
  };

  const getValenceEmoji = (valence?: string) => {
    switch (valence) {
      case 'positive':
        return '😊 Positive';
      case 'negative':
        return '😔 Negative';
      case 'neutral':
        return '😐 Neutral';
      default:
        return '';
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

  if (!event) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text>Event not found</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text variant="headlineSmall" style={styles.eventType}>
                  {formatEventType(event.eventType)}
                </Text>
                <Text variant="bodyMedium" style={styles.timestamp}>
                  {new Date(event.timestamp).toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {event.valence && (
                <View style={[styles.valenceBadge, { backgroundColor: getValenceColor(event.valence) }]}>
                  <Text style={styles.valenceText}>{getValenceEmoji(event.valence)}</Text>
                </View>
              )}
            </View>

            {event.severity && (
              <Chip
                mode="flat"
                style={[
                  styles.severityChip,
                  event.severity === 'high' && styles.severityHigh,
                  event.severity === 'medium' && styles.severityMedium,
                  event.severity === 'low' && styles.severityLow,
                ]}
                textStyle={styles.severityText}
              >
                {event.severity.toUpperCase()} SEVERITY
              </Chip>
            )}
          </Card.Content>
        </Card>

        {/* Notes */}
        {event.notes && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Notes
              </Text>
              <Text variant="bodyMedium" style={styles.notes}>
                {event.notes}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Transcript (for voice-logged events) */}
        {event.transcript && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Voice Transcript
              </Text>
              <Text variant="bodyMedium" style={styles.transcript}>
                {event.transcript}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Tags
              </Text>
              <View style={styles.tags}>
                {event.tags.map((tag, index) => (
                  <Chip key={index} mode="outlined" style={styles.tag}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* People Present */}
        {event.persons && event.persons.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                People Present
              </Text>
              <View style={styles.persons}>
                {event.persons.map((person, index) => (
                  <Chip key={index} mode="outlined" style={styles.person} icon="account">
                    {person}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Photos ({photos.length})
              </Text>
              <View style={styles.photoGrid}>
                {photos.map((photo) => (
                  <View key={photo.id} style={styles.photoContainer}>
                    <Image
                      source={{ uri: photo.localUri }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Metadata */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Details
            </Text>
            <View style={styles.metadataRow}>
              <Text variant="bodySmall" style={styles.metadataLabel}>Source:</Text>
              <Text variant="bodySmall" style={styles.metadataValue}>
                {event.source === 'quick-tap' && '⚡ Quick-tap'}
                {event.source === 'voice' && '🎤 Voice'}
                {event.source === 'manual' && '✏️ Manual'}
              </Text>
            </View>
            <View style={styles.metadataRow}>
              <Text variant="bodySmall" style={styles.metadataLabel}>Created:</Text>
              <Text variant="bodySmall" style={styles.metadataValue}>
                {new Date(event.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={styles.metadataRow}>
              <Text variant="bodySmall" style={styles.metadataLabel}>Synced:</Text>
              <Text variant="bodySmall" style={styles.metadataValue}>
                {event.synced ? '✓ Yes' : '⏳ Pending'}
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
            buttonColor="#4A90E2"
          >
            Edit Event
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
            Delete Event
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  eventType: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timestamp: {
    color: '#666',
  },
  valenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  valenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  severityChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  severityHigh: {
    backgroundColor: '#ffebee',
  },
  severityMedium: {
    backgroundColor: '#fff3e0',
  },
  severityLow: {
    backgroundColor: '#e8f5e9',
  },
  severityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  notes: {
    lineHeight: 24,
    color: '#333',
  },
  transcript: {
    lineHeight: 24,
    color: '#333',
    fontStyle: 'italic',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
  },
  persons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  person: {
    marginRight: 4,
    marginBottom: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
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
