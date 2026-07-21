import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Card, ActivityIndicator, TextInput, Checkbox, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as NetInfo from '@react-native-community/netinfo';
import DateTimePicker from '@react-native-community/datetimepicker';
import { voiceService, ExtractedEvent } from '../services/voice-service';
import { eventService } from '../services/event-service';
import { databaseService } from '../services/database';
import { EventType } from '../models';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type RecordingState = 'idle' | 'recording' | 'processing' | 'review';

export default function VoiceRecordingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
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
  const [childProfileId, setChildProfileId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [valenceMenuVisible, setValenceMenuVisible] = useState<number | null>(null);
  const [textInputMode, setTextInputMode] = useState(false);
  const [manualTranscript, setManualTranscript] = useState('');

  useEffect(() => {
    // Load active profile
    loadActiveProfile();

    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  const loadActiveProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      if (profiles.length > 0) {
        setChildProfileId(profiles[0].id);
        console.log('Voice recording using profile:', profiles[0].id);
      } else {
        console.error('No profiles found');
        setError('No profile found. Please create a profile first.');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('Failed to load profile');
    }
  };

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
    if (!childProfileId) {
      setError('No profile loaded. Please create a profile first.');
      return;
    }

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
    if (!childProfileId) {
      setError('No profile loaded');
      return;
    }

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

  const getValenceIcon = (valence?: 'positive' | 'negative' | 'neutral') => {
    if (valence === 'positive') return '✅';
    if (valence === 'negative') return '⚠️';
    return '➖';
  };

  const getValenceLabel = (valence?: 'positive' | 'negative' | 'neutral') => {
    if (valence === 'positive') return 'Positive';
    if (valence === 'negative') return 'Negative';
    return 'Neutral';
  };

  const handleSave = async () => {
    if (!childProfileId) {
      setError('No profile loaded');
      return;
    }

    try {
      setState('processing');
      setError(null);

      console.log('=== Starting save process ===');
      // Use selected date from date picker, set to noon for consistency
      const logDate = new Date(selectedDate);
      logDate.setHours(12, 0, 0, 0);
      
      console.log('Using date:', logDate.toISOString());
      console.log('Child profile ID:', childProfileId);

      // Save diary entry if included
      if (includeDiary && diaryEntry.trim()) {
        console.log('Saving diary entry...');
        await databaseService.createDiaryEntry({
          id: uuidv4(),
          childProfileId,
          content: diaryEntry,
          date: logDate,
          timestamp: logDate,
          source: 'voice',
          createdAt: new Date(),
        });
        console.log('✅ Diary entry saved');
      }

      // Save selected events
      const selectedEventsList = extractedEvents.filter((_, i) => selectedEvents.has(i));
      console.log(`Saving ${selectedEventsList.length} events...`);
      
      for (const event of selectedEventsList) {
        console.log(`Creating event: ${event.eventType}`);
        const savedEvent = await eventService.createEvent({
          childProfileId,
          eventType: event.eventType,
          timestamp: logDate,
          notes: event.description,
          source: 'voice',
          transcript,
          valence: event.valence,
        });
        console.log(`✅ Event saved with ID: ${savedEvent.id}`);
      }

      console.log('=== All events saved successfully ===');

      // Clean up audio file
      if (audioUri) {
        await voiceService.deleteRecording(audioUri);
      }

      // Show success message and navigate back
      const eventCount = selectedEventsList.length;
      const hasDiary = includeDiary && diaryEntry.trim();
      
      const dateStr = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      Alert.alert(
        'Success',
        `Saved ${eventCount} event${eventCount === 1 ? '' : 's'}${hasDiary ? ' and diary entry' : ''} for ${dateStr}`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate back to Today tab
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Failed to save events:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to save events: ${errorMsg}`);
      setState('review');
    }
  };

  const handleCancel = async () => {
    if (audioUri) {
      await voiceService.deleteRecording(audioUri);
    }
    router.back();
  };

  const handleSubmitTypedText = async () => {
    if (!manualTranscript.trim()) {
      setError('Please enter some text');
      return;
    }

    if (!childProfileId) {
      setError('No profile loaded');
      return;
    }

    try {
      setState('processing');
      setError(null);

      const result = await voiceService.extractEvents(manualTranscript, childProfileId);
      
      setTranscript(manualTranscript);
      setExtractedEvents(result.events);
      setDiaryEntry(result.diaryEntry || '');
      
      // Select all events by default
      const allIndices = new Set(result.events.map((_, i) => i));
      setSelectedEvents(allIndices);
      
      setState('review');
    } catch (error) {
      console.error('Failed to extract events from text:', error);
      setError('Failed to extract events. Please try again.');
      setState('idle');
    }
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
    // Text input mode
    if (textInputMode) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="bodyMedium" style={styles.instructions}>
                  Type or paste your narrative below. Describe multiple events, and we'll
                  automatically extract them for you to review.
                </Text>
                <Text variant="bodySmall" style={styles.example}>
                  Example: "Today was rough. He had a meltdown at breakfast, then refused to get dressed.
                  But he did great at school and had a nice playdate in the afternoon."
                </Text>
                <TextInput
                  value={manualTranscript}
                  onChangeText={setManualTranscript}
                  multiline
                  numberOfLines={8}
                  placeholder="Type what happened today..."
                  style={styles.manualInput}
                  mode="outlined"
                  outlineColor="#4A90E2"
                  activeOutlineColor="#4A90E2"
                />
                {error && (
                  <Text variant="bodySmall" style={styles.error}>
                    {error}
                  </Text>
                )}
                <Button
                  mode="contained"
                  icon="arrow-right"
                  onPress={handleSubmitTypedText}
                  style={styles.button}
                  buttonColor="#4A90E2"
                  disabled={!manualTranscript.trim()}
                >
                  Extract Events
                </Button>
                <Button 
                  mode="text" 
                  onPress={() => {
                    setTextInputMode(false);
                    setManualTranscript('');
                    setError(null);
                  }} 
                  style={styles.button}
                  textColor="#999"
                >
                  Use Voice Recording Instead
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

    // Voice recording mode (default)
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
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
                Start Voice Log
              </Button>
              <Button 
                mode="text" 
                onPress={() => setTextInputMode(true)} 
                style={styles.switchModeButton}
                textColor="#999"
                compact
              >
                or type instead
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
              <Text variant="displayMedium" style={styles.duration}>
                {formatDuration(recordingDuration)}
              </Text>
              <Text variant="bodyMedium" style={styles.recordingHint}>
                🔴 Recording... Speak naturally. Describe what happened.
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
              <ActivityIndicator size="large" style={styles.loader} color="#4A90E2" />
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
              
              {/* Date Picker */}
              <Text variant="labelSmall" style={styles.sectionLabel}>
                LOGGING FOR:
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerButton}
                textColor="#4A90E2"
              >
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Button>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setSelectedDate(date);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
              
              {/* Transcript - Now Editable */}
              <Text variant="labelSmall" style={styles.sectionLabel}>
                WHAT YOU SAID:
              </Text>
              <TextInput
                value={transcript}
                onChangeText={setTranscript}
                multiline
                numberOfLines={4}
                style={styles.transcriptInput}
                mode="outlined"
                outlineColor="#4A90E2"
                activeOutlineColor="#4A90E2"
              />

              {/* Re-extract button */}
              <Button
                mode="text"
                onPress={handleReExtract}
                style={styles.reExtractButton}
                textColor="#4A90E2"
                icon="refresh"
              >
                Re-extract Events from Edited Transcript
              </Button>

              {/* Diary Entry Checkbox - Larger */}
              <View style={styles.diaryCheckboxRow}>
                <Checkbox.Android
                  status={includeDiary ? 'checked' : 'unchecked'}
                  onPress={() => setIncludeDiary(!includeDiary)}
                  color="#4A90E2"
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
                          <Checkbox.Android
                            status={selectedEvents.has(index) ? 'checked' : 'unchecked'}
                            onPress={() => handleToggleEvent(index)}
                            color="#4A90E2"
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
                          <Menu
                            visible={valenceMenuVisible === index}
                            onDismiss={() => setValenceMenuVisible(null)}
                            anchor={
                              <TouchableOpacity
                                style={styles.impactBadge}
                                onPress={() => setValenceMenuVisible(index)}
                              >
                                <Text style={styles.impactText}>
                                  {getValenceIcon(event.valence)} {getValenceLabel(event.valence)} ▼
                                </Text>
                              </TouchableOpacity>
                            }
                          >
                            <Menu.Item
                              onPress={() => {
                                handleUpdateEvent(index, { valence: 'positive' });
                                setValenceMenuVisible(null);
                              }}
                              title="✅ Positive"
                            />
                            <Menu.Item
                              onPress={() => {
                                handleUpdateEvent(index, { valence: 'neutral' });
                                setValenceMenuVisible(null);
                              }}
                              title="➖ Neutral"
                            />
                            <Menu.Item
                              onPress={() => {
                                handleUpdateEvent(index, { valence: 'negative' });
                                setValenceMenuVisible(null);
                              }}
                              title="⚠️ Negative"
                            />
                          </Menu>
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
                Save {selectedEvents.size} event{selectedEvents.size === 1 ? '' : 's'} for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
    paddingTop: 8, // Reduced since we have a header now
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
  datePickerButton: {
    marginBottom: 16,
    borderColor: '#4A90E2',
  },
  transcriptInput: {
    marginBottom: 8,
    backgroundColor: '#f0f7ff',
    fontSize: 14,
    lineHeight: 20,
  },
  reExtractButton: {
    marginBottom: 16,
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
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  impactText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
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
  switchModeButton: {
    marginTop: 4,
    marginBottom: -4,
  },
  manualInput: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 150,
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
