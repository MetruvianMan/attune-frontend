import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, ActivityIndicator, TextInput, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as NetInfo from '@react-native-community/netinfo';
import { voiceService, ExtractedEvent } from '../services/voice-service';
import { eventService } from '../services/event-service';
import { databaseService } from '../services/database';
import { EventType } from '../models';

type RecordingState = 'idle' | 'recording' | 'processing' | 'review';

export default function VoiceRecordingScreen() {
  const router = useRouter();
  const [state, setState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [includeDiary, setIncludeDiary] = useState(false);
  const [diaryEntry, setDiaryEntry] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update recording duration every second
    let interval: NodeJS.Timeout;
    if (state === 'recording') {
      interval = setInterval(async () => {
        const duration = await voiceService.getRecordingDuration();
        setRecordingDuration(duration);
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  const handleStartRecording = async () => {
    try {
      setError(null);
      await voiceService.startRecording();
      setState('recording');
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    try {
      setState('processing');
      const uri = await voiceService.stopRecording();
      setAudioUri(uri);

      // Process recording: transcribe and extract events
      const result = await voiceService.processRecording(uri, childProfileId);
      
      setTranscript(result.transcript);
      setExtractedEvents(result.extraction.events);
      setDiaryEntry(result.extraction.diaryEntry || '');
      
      // Select all events by default
      const allIndices = new Set(result.extraction.events.map((_, i) => i));
      setSelectedEvents(allIndices);
      
      setState('review');
    } catch (error) {
      console.error('Failed to process recording:', error);
      setError('Failed to process recording. Please try again.');
      setState('idle');
      
      // Clean up audio file
      if (audioUri) {
        await voiceService.deleteRecording(audioUri);
      }
    }
  };

  const handleCancelRecording = async () => {
    await voiceService.cancelRecording();
    setState('idle');
    setRecordingDuration(0);
  };

  const handleReExtract = async () => {
    try {
      setState('processing');
      setError(null);

      const result = await voiceService.extractEvents(transcript, childProfileId);
      
      setExtractedEvents(result.events);
      setDiaryEntry(result.diaryEntry || '');
      
      // Select all events by default
      const allIndices = new Set(result.events.map((_, i) => i));
      setSelectedEvents(allIndices);
      
      setState('review');
    } catch (error) {
      console.error('Failed to re-extract events:', error);
      setError('Failed to re-extract events. Please try again.');
      setState('review');
    }
  };

  const handleToggleEvent = (index: number) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEvents(newSelected);
  };

  const handleUpdateEvent = (index: number, updates: Partial<ExtractedEvent>) => {
    const newEvents = [...extractedEvents];
    newEvents[index] = { ...newEvents[index], ...updates };
    setExtractedEvents(newEvents);
  };

  const handleSave = async () => {
    try {
      setState('processing');
      setError(null);

      // Save diary entry if included
      if (includeDiary && diaryEntry.trim()) {
        await databaseService.createDiaryEntry({
          id: '',
          childProfileId,
          content: diaryEntry,
          date: new Date(),
          createdAt: new Date(),
          synced: false,
        });
      }

      // Save selected events
      const selectedEventsList = extractedEvents.filter((_, i) => selectedEvents.has(i));
      
      for (const event of selectedEventsList) {
        await eventService.createEvent({
          childProfileId,
          eventType: event.eventType,
          timestamp: event.timestamp || new Date(),
          notes: event.description,
          source: 'voice',
          transcript,
          valence: event.valence,
        });
      }

      // Clean up audio file
      if (audioUri) {
        await voiceService.deleteRecording(audioUri);
      }

      // Navigate back to Today tab
      Alert.alert(
        'Success',
        `Saved ${selectedEventsList.length} event${selectedEventsList.length === 1 ? '' : 's'}${includeDiary ? ' and diary entry' : ''}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to save events:', error);
      setError('Failed to save events. Please try again.');
      setState('review');
    }
  };

  const handleCancel = async () => {
    if (audioUri) {
      await voiceService.deleteRecording(audioUri);
    }
    router.back();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOnline) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Voice Logging Unavailable
            </Text>
            <Text variant="bodyMedium" style={styles.offlineMessage}>
              Voice logging requires an internet connection for transcription and event extraction.
              Please connect to the internet and try again.
            </Text>
            <Button mode="contained" onPress={() => router.back()} style={styles.button}>
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (state === 'idle') {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Voice Log Events 🎤
            </Text>
            <Text variant="bodyMedium" style={styles.instructions}>
              Tap the button below to start recording. Describe multiple events in one go, and we'll
              automatically extract them for you to review.
            </Text>
            <Text variant="bodySmall" style={styles.example}>
              Example: "Today was rough. He had a meltdown at breakfast, then refused to get dressed.
              But he did great at school and had a nice playdate in the afternoon."
            </Text>
            {error && (
              <Text variant="bodySmall" style={styles.error}>
                {error}
              </Text>
            )}
            <Button
              mode="contained"
              icon="microphone"
              onPress={handleStartRecording}
              style={styles.button}
              contentStyle={styles.recordButtonContent}
            >
              Start Recording
            </Button>
            <Button mode="outlined" onPress={() => router.back()} style={styles.button}>
              Cancel
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (state === 'recording') {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Recording... 🔴
            </Text>
            <Text variant="displayMedium" style={styles.duration}>
              {formatDuration(recordingDuration)}
            </Text>
            <Text variant="bodyMedium" style={styles.recordingHint}>
              Speak naturally. Describe what happened today.
            </Text>
            <Button
              mode="contained"
              icon="stop"
              onPress={handleStopRecording}
              style={styles.button}
            >
              Stop Recording
            </Button>
            <Button mode="outlined" onPress={handleCancelRecording} style={styles.button}>
              Cancel
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (state === 'processing') {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <ActivityIndicator size="large" style={styles.loader} />
            <Text variant="titleLarge" style={styles.title}>
              Processing...
            </Text>
            <Text variant="bodyMedium" style={styles.processingMessage}>
              Transcribing audio and extracting events. This may take a moment.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  // Review state
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Review & Edit
            </Text>
            
            {/* Transcript */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Transcript
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              value={transcript}
              onChangeText={setTranscript}
              style={styles.transcriptInput}
            />
            <Button
              mode="outlined"
              icon="refresh"
              onPress={handleReExtract}
              style={styles.reExtractButton}
              compact
            >
              Re-extract Events
            </Button>

            {/* Extracted Events */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Extracted Events ({extractedEvents.length})
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              Check the events you want to save. Tap to edit details.
            </Text>

            {extractedEvents.length === 0 ? (
              <Text variant="bodyMedium" style={styles.noEvents}>
                No events extracted. Try editing the transcript and re-extracting.
              </Text>
            ) : (
              extractedEvents.map((event, index) => (
                <Card key={index} style={styles.eventCard}>
                  <Card.Content>
                    <View style={styles.eventHeader}>
                      <Checkbox
                        status={selectedEvents.has(index) ? 'checked' : 'unchecked'}
                        onPress={() => handleToggleEvent(index)}
                      />
                      <Text variant="titleMedium" style={styles.eventEmoji}>
                        {event.emoji || '📝'}
                      </Text>
                      <View style={styles.eventInfo}>
                        <Text variant="bodyLarge" style={styles.eventType}>
                          {event.eventType}
                        </Text>
                        {event.valence && (
                          <Text variant="bodySmall" style={styles.valence}>
                            {event.valence === 'positive' ? '😊' : event.valence === 'negative' ? '😔' : '😐'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TextInput
                      mode="outlined"
                      multiline
                      value={event.description}
                      onChangeText={(text) => handleUpdateEvent(index, { description: text })}
                      style={styles.eventDescription}
                      dense
                    />
                  </Card.Content>
                </Card>
              ))
            )}

            {/* Diary Entry */}
            <View style={styles.diarySection}>
              <View style={styles.diaryHeader}>
                <Checkbox
                  status={includeDiary ? 'checked' : 'unchecked'}
                  onPress={() => setIncludeDiary(!includeDiary)}
                />
                <Text variant="titleMedium" style={styles.diaryTitle}>
                  Save as Diary Entry
                </Text>
              </View>
              {includeDiary && (
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  value={diaryEntry}
                  onChangeText={setDiaryEntry}
                  placeholder="Optional diary entry..."
                  style={styles.diaryInput}
                />
              )}
            </View>

            {error && (
              <Text variant="bodySmall" style={styles.error}>
                {error}
              </Text>
            )}

            {/* Action Buttons */}
            <Button
              mode="contained"
              icon="check"
              onPress={handleSave}
              style={styles.button}
              disabled={selectedEvents.size === 0 && !includeDiary}
            >
              Save ({selectedEvents.size} event{selectedEvents.size === 1 ? '' : 's'})
            </Button>
            <Button mode="outlined" onPress={handleCancel} style={styles.button}>
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
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructions: {
    marginBottom: 12,
    color: '#666',
    lineHeight: 22,
  },
  example: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    fontStyle: 'italic',
    color: '#666',
  },
  offlineMessage: {
    marginBottom: 24,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  duration: {
    textAlign: 'center',
    marginVertical: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  recordingHint: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  loader: {
    marginVertical: 24,
  },
  processingMessage: {
    textAlign: 'center',
    color: '#666',
  },
  button: {
    marginTop: 12,
  },
  recordButtonContent: {
    paddingVertical: 8,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  transcriptInput: {
    marginBottom: 8,
  },
  reExtractButton: {
    marginBottom: 16,
  },
  hint: {
    marginBottom: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  noEvents: {
    padding: 16,
    textAlign: 'center',
    color: '#999',
  },
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  eventInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventType: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  valence: {
    fontSize: 20,
  },
  eventDescription: {
    marginTop: 8,
  },
  diarySection: {
    marginTop: 24,
  },
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diaryTitle: {
    fontWeight: 'bold',
  },
  diaryInput: {
    marginTop: 8,
  },
  error: {
    color: '#d32f2f',
    marginTop: 12,
    textAlign: 'center',
  },
});
