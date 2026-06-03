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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to process recording: ${errorMessage}`);
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
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.title}>
                Voice Logging Unavailable
              </Text>
              <Text variant="bodyMedium" style={styles.offlineMessage}>
                Voice logging requires an internet connection for transcription and event extraction.
                Please connect to the internet and try again.
              </Text>
              <Button mode="contained" onPress={() => router.back()} style={styles.button} buttonColor="#4A90E2">
                Go Back
              </Button>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  }

  if (state === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
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
                buttonColor="#4A90E2"
              >
                Start Recording
              </Button>
              <Button mode="outlined" onPress={() => router.back()} style={styles.button} textColor="#4A90E2">
                Cancel
              </Button>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  }

  if (state === 'recording') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
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
                buttonColor="#4A90E2"
              >
                Stop Recording
              </Button>
              <Button mode="outlined" onPress={handleCancelRecording} style={styles.button} textColor="#4A90E2">
                Cancel
              </Button>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  }

  if (state === 'processing') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
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
      </View>
    );
  }

  // Review state
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.title}>
                🎙️ Voice Log
              </Text>
              
              {/* Transcript */}
              <Text variant="labelSmall" style={styles.sectionLabel}>
                WHAT YOU SAID:
              </Text>
              <View style={styles.transcriptBox}>
                <Text variant="bodyMedium" style={styles.transcriptText}>
                  {transcript}
                </Text>
              </View>

              {/* Diary Entry Checkbox */}
              <View style={styles.diaryCheckboxRow}>
                <Checkbox
                  status={includeDiary ? 'checked' : 'unchecked'}
                  onPress={() => setIncludeDiary(!includeDiary)}
                />
                <Text variant="bodyMedium" style={styles.diaryLabel} onPress={() => setIncludeDiary(!includeDiary)}>
                  📔 Save as diary entry (won't affect day grade)
                </Text>
              </View>

              {/* Extracted Events */}
              <Text variant="labelSmall" style={styles.sectionLabel}>
                DETECTED {extractedEvents.length} EVENT{extractedEvents.length === 1 ? '' : 'S'}:
              </Text>

              {extractedEvents.length === 0 ? (
                <View style={styles.noEventsContainer}>
                  <Text variant="bodyMedium" style={styles.noEvents}>
                    No events extracted. Try editing the transcript and re-extracting.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.eventsScrollContainer} nestedScrollEnabled>
                  {extractedEvents.map((event, index) => (
                    <Card key={index} style={styles.eventCard}>
                      <Card.Content style={styles.eventCardContent}>
                        <View style={styles.eventTopRow}>
                          <Checkbox
                            status={selectedEvents.has(index) ? 'checked' : 'unchecked'}
                            onPress={() => handleToggleEvent(index)}
                          />
                          <Text style={styles.eventEmoji}>
                            {event.emoji || '📝'}
                          </Text>
                          <View style={styles.eventInfo}>
                            <Text variant="bodyLarge" style={styles.eventType}>
                              {event.eventType.split('_').map(w => 
                                w.charAt(0).toUpperCase() + w.slice(1)
                              ).join(' ')}
                            </Text>
                          </View>
                        </View>
                        
                        <Text variant="bodySmall" style={styles.eventDescription}>
                          {event.description}
                        </Text>

                        <View style={styles.impactRow}>
                          <Text variant="bodySmall" style={styles.impactLabel}>
                            Impact:
                          </Text>
                          <View style={styles.impactBadge}>
                            <Text style={styles.impactText}>
                              {event.valence === 'positive' ? '✅ Positive' : 
                               event.valence === 'negative' ? '⚠️ Negative' : '➖ Neutral'}
                            </Text>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </ScrollView>
              )}

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
                buttonColor="#4A90E2"
              >
                Save ({selectedEvents.size} event{selectedEvents.size === 1 ? '' : 's'})
              </Button>
              <Button mode="outlined" onPress={handleCancel} style={styles.button} textColor="#4A90E2">
                Cancel
              </Button>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 80, // Add top padding for status bar spacing
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
  },
  transcriptBox: {
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginBottom: 12,
  },
  transcriptText: {
    lineHeight: 20,
    color: '#333',
  },
  diaryCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  diaryLabel: {
    flex: 1,
    marginLeft: 8,
    color: '#666',
  },
  eventsScrollContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  noEventsContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
  },
  noEvents: {
    textAlign: 'center',
    color: '#999',
  },
  eventCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  eventCardContent: {
    paddingVertical: 8,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventEmoji: {
    fontSize: 24,
    marginLeft: 8,
    marginRight: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontWeight: '600',
    color: '#333',
  },
  eventDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 40,
    marginBottom: 8,
    lineHeight: 18,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 40,
  },
  impactLabel: {
    fontSize: 11,
    color: '#999',
    marginRight: 8,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  impactText: {
    fontSize: 11,
    color: '#333',
  },
  apiKeyInput: {
    marginTop: 12,
    marginBottom: 8,
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
  error: {
    color: '#d32f2f',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
});
