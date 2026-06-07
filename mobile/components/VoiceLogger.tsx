import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, ActivityIndicator, TextInput, Checkbox, Portal } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { voiceService, ExtractedEvent } from '../services/voice-service';
import { eventService } from '../services/event-service';
import { databaseService } from '../services/database';
import { FullEmojiPicker } from './FullEmojiPicker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type VoiceLoggerState = 'idle' | 'recording' | 'transcribing' | 'review';

interface VoiceLoggerProps {
  childProfileId: string;
  onComplete: () => void;
}

export function VoiceLogger({ childProfileId, onComplete }: VoiceLoggerProps) {
  const [state, setState] = useState<VoiceLoggerState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [includeDiary, setIncludeDiary] = useState(false);
  const [diaryEntry, setDiaryEntry] = useState('');
  const [useSummarizedDiary, setUseSummarizedDiary] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [valenceMenuVisible, setValenceMenuVisible] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    console.log('Valence menu visible changed to:', valenceMenuVisible);
  }, [valenceMenuVisible]);

  const handleStartRecording = async () => {
    try {
      setError(null);
      await voiceService.startRecording();
      setState('recording');
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start recording');
      setState('idle');
    }
  };

  const handleStopRecording = async () => {
    try {
      setState('transcribing');
      const uri = await voiceService.stopRecording();
      setAudioUri(uri);

      const result = await voiceService.processRecording(uri, childProfileId);
      
      setTranscript(result.transcript);
      setExtractedEvents(result.extraction.events);
      setDiaryEntry(result.extraction.diaryEntry || '');
      
      const allIndices = new Set(result.extraction.events.map((_, i) => i));
      setSelectedEvents(allIndices);
      
      setState('review');
      setShowReviewModal(true);
    } catch (error) {
      console.error('Failed to process recording:', error);
      setError('Failed to process recording');
      setState('idle');
      
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

  const handleOpenEmojiPicker = (index: number) => {
    console.log('Opening emoji picker for event', index);
    setEditingEmojiIndex(index);
    setShowReviewModal(false);
    // Small delay to let review modal close before emoji picker opens
    requestAnimationFrame(() => {
      setEmojiPickerVisible(true);
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    console.log('Emoji selected:', emoji);
    if (editingEmojiIndex !== null) {
      handleUpdateEvent(editingEmojiIndex, { emoji });
    }
    setEmojiPickerVisible(false);
    setEditingEmojiIndex(null);
    // Small delay to let emoji picker close before review modal opens
    requestAnimationFrame(() => {
      setShowReviewModal(true);
    });
  };

  const handleReExtract = async () => {
    try {
      setState('transcribing');
      setShowReviewModal(false);
      
      const result = await voiceService.extractEvents(transcript, childProfileId);
      setExtractedEvents(result.events);
      setDiaryEntry(result.diaryEntry || '');
      
      const allIndices = new Set(result.events.map((_, i) => i));
      setSelectedEvents(allIndices);
      
      setState('review');
      setShowReviewModal(true);
    } catch (error) {
      console.error('Failed to re-extract events:', error);
      setError('Failed to re-extract events');
      setState('review');
      setShowReviewModal(true);
    }
  };

  const handleSave = async () => {
    try {
      setShowReviewModal(false);
      setState('transcribing');
      
      // Use current time for today, noon for past dates
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      const logDate = new Date(selectedDate);
      if (isToday) {
        // Use current time for today's events
        logDate.setTime(Date.now());
      } else {
        // Use noon for past dates
        logDate.setHours(12, 0, 0, 0);
      }

      if (includeDiary && diaryEntry.trim()) {
        // Use verbatim transcript or summarized diary entry based on checkbox
        const diaryContent = useSummarizedDiary ? diaryEntry : transcript;
        
        await databaseService.createDiaryEntry({
          id: uuidv4(),
          childProfileId,
          content: diaryContent,
          date: logDate,
          timestamp: logDate,
          source: 'voice',
          createdAt: new Date(),
        });
      }

      const selectedEventsList = extractedEvents.filter((_, i) => selectedEvents.has(i));
      
      for (const event of selectedEventsList) {
        await eventService.createEvent({
          childProfileId,
          eventType: event.eventType,
          timestamp: logDate,
          notes: event.description,
          source: 'voice',
          transcript,
          valence: event.valence,
          customEmoji: event.emoji, // Pass custom emoji through
        });
      }

      if (audioUri) {
        await voiceService.deleteRecording(audioUri);
      }

      // Reset state
      setState('idle');
      setTranscript('');
      setExtractedEvents([]);
      setSelectedEvents(new Set());
      setDiaryEntry('');
      setAudioUri(null);
      setTranscriptExpanded(false);
      setUseSummarizedDiary(true);
      
      onComplete();
    } catch (error) {
      console.error('Failed to save events:', error);
      setError('Failed to save events');
      setState('idle');
    }
  };

  const handleCancel = async () => {
    if (audioUri) {
      await voiceService.deleteRecording(audioUri);
    }
    setShowReviewModal(false);
    setState('idle');
    setTranscript('');
    setExtractedEvents([]);
    setSelectedEvents(new Set());
    setDiaryEntry('');
    setAudioUri(null);
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // The main button that changes color based on state
  const renderButton = () => {
    if (state === 'idle') {
      return (
        <TouchableOpacity
          onPress={handleStartRecording}
          activeOpacity={0.8}
          style={styles.voiceButtonBlue}
        >
          <Text style={styles.voiceButtonText}>🎙️ Start Voice Log</Text>
        </TouchableOpacity>
      );
    }

    if (state === 'recording') {
      return (
        <TouchableOpacity
          onPress={handleStopRecording}
          activeOpacity={0.8}
          style={styles.voiceButtonRed}
        >
          <Text style={styles.voiceButtonText}>
            🔴 Recording... {formatDuration(recordingDuration)} (tap to stop)
          </Text>
        </TouchableOpacity>
      );
    }

    if (state === 'transcribing') {
      return (
        <View style={styles.voiceButtonYellow}>
          <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.voiceButtonText}>⏳ Transcribing...</Text>
        </View>
      );
    }

    // Review state - button goes back to idle appearance
    return (
      <TouchableOpacity
        onPress={handleStartRecording}
        activeOpacity={0.8}
        style={styles.voiceButtonBlue}
      >
        <Text style={styles.voiceButtonText}>🎙️ Start Voice Log</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Full Emoji Picker - Slides up as full screen */}
      <FullEmojiPicker
        visible={emojiPickerVisible}
        onSelect={handleEmojiSelect}
        onClose={() => {
          setEmojiPickerVisible(false);
          setEditingEmojiIndex(null);
          requestAnimationFrame(() => {
            setShowReviewModal(true);
          });
        }}
      />

      {/* Review Modal - Compact overlay */}
      <Portal>
        <Modal
          visible={showReviewModal}
          animationType="none"
          transparent={true}
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTitle}>🎙️ Voice Log</Text>

                {/* Date Picker */}
                <Text style={styles.sectionLabel}>LOGGING FOR:</Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setTempDate(selectedDate);
                    setShowDatePicker(true);
                  }}
                  style={styles.datePickerButton}
                  textColor="#4A90E2"
                  compact
                >
                  {selectedDate.toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Button>

                {showDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          setTempDate(date);
                        }
                      }}
                      maximumDate={new Date()}
                    />
                    <View style={styles.datePickerButtons}>
                      <Button
                        mode="outlined"
                        onPress={() => {
                          setShowDatePicker(false);
                          setTempDate(selectedDate); // Reset to original
                        }}
                        style={styles.datePickerCancelButton}
                        textColor="#666"
                        compact
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => {
                          setSelectedDate(tempDate);
                          setShowDatePicker(false);
                        }}
                        style={styles.datePickerConfirmButton}
                        buttonColor="#4A90E2"
                        compact
                      >
                        Confirm
                      </Button>
                    </View>
                  </View>
                )}

                {/* Transcript - Expandable */}
                <Text style={styles.sectionLabel}>WHAT YOU SAID:</Text>
                <TouchableOpacity 
                  onPress={() => setTranscriptExpanded(!transcriptExpanded)}
                  style={styles.transcriptContainer}
                >
                  <TextInput
                    value={transcript}
                    onChangeText={setTranscript}
                    multiline
                    numberOfLines={transcriptExpanded ? undefined : 3}
                    style={[
                      styles.transcriptInput,
                      transcriptExpanded && styles.transcriptInputExpanded
                    ]}
                    mode="outlined"
                    outlineColor="#4A90E2"
                    activeOutlineColor="#4A90E2"
                    dense
                    onFocus={() => setTranscriptExpanded(true)}
                  />
                  <View style={styles.expandIndicator}>
                    <Text style={styles.expandText}>
                      {transcriptExpanded ? '▲ Collapse' : '▼ Expand'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <Button
                  mode="text"
                  onPress={handleReExtract}
                  style={styles.reExtractButton}
                  textColor="#4A90E2"
                  icon="refresh"
                  compact
                >
                  Re-analyze
                </Button>

                {/* Diary Checkbox */}
                <View style={styles.diaryCheckboxRow}>
                  <Checkbox.Android
                    status={includeDiary ? 'checked' : 'unchecked'}
                    onPress={() => setIncludeDiary(!includeDiary)}
                    color="#4A90E2"
                  />
                  <Text 
                    style={styles.diaryLabel}
                    onPress={() => setIncludeDiary(!includeDiary)}
                  >
                    📔 Save as diary entry
                  </Text>
                </View>

                {/* Diary format option - only show if diary is enabled */}
                {includeDiary && (
                  <View style={styles.diaryFormatRow}>
                    <View style={styles.radioOption}>
                      <TouchableOpacity 
                        onPress={() => setUseSummarizedDiary(true)}
                        style={styles.radioButton}
                      >
                        <View style={[
                          styles.radioCircle,
                          useSummarizedDiary && styles.radioCircleSelected
                        ]}>
                          {useSummarizedDiary && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.radioLabel}>AI Summary</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.radioOption}>
                      <TouchableOpacity 
                        onPress={() => setUseSummarizedDiary(false)}
                        style={styles.radioButton}
                      >
                        <View style={[
                          styles.radioCircle,
                          !useSummarizedDiary && styles.radioCircleSelected
                        ]}>
                          {!useSummarizedDiary && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.radioLabel}>Verbatim</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Events */}
                <Text style={styles.sectionLabel}>
                  DETECTED {extractedEvents.length} EVENT{extractedEvents.length === 1 ? '' : 'S'}:
                </Text>

                {extractedEvents.map((event, index) => (
                  <Card key={index} style={styles.eventCard}>
                    <Card.Content style={styles.eventCardContent}>
                      <View style={styles.eventTopRow}>
                        <Checkbox.Android
                          status={selectedEvents.has(index) ? 'checked' : 'unchecked'}
                          onPress={() => handleToggleEvent(index)}
                          color="#4A90E2"
                        />
                        <TouchableOpacity 
                          onPress={() => handleOpenEmojiPicker(index)}
                        >
                          <Text style={styles.eventEmoji}>
                            {event.emoji || '📝'}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventType}>
                            {event.eventType.split('_').map(w => 
                              w.charAt(0).toUpperCase() + w.slice(1)
                            ).join(' ')}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.eventDescription}>
                        {event.description}
                      </Text>

                      <View style={styles.impactRow}>
                        <Text style={styles.impactLabel}>Impact:</Text>
                        <TouchableOpacity
                          style={styles.impactBadge}
                          onPress={() => {
                            console.log('Impact badge clicked for event', index);
                            // Use ActionSheet style alert for better UX
                            Alert.alert(
                              'Select Impact',
                              'Choose the emotional impact of this event',
                              [
                                {
                                  text: '✅ Positive',
                                  onPress: () => handleUpdateEvent(index, { valence: 'positive' })
                                },
                                {
                                  text: '➖ Neutral',
                                  onPress: () => handleUpdateEvent(index, { valence: 'neutral' })
                                },
                                {
                                  text: '⚠️ Negative',
                                  onPress: () => handleUpdateEvent(index, { valence: 'negative' })
                                },
                                {
                                  text: 'Cancel',
                                  style: 'cancel'
                                }
                              ],
                              { cancelable: true }
                            );
                          }}
                        >
                          <Text style={styles.impactText}>
                            {getValenceIcon(event.valence)} {getValenceLabel(event.valence)} ▼
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Card.Content>
                  </Card>
                ))}

                {error && (
                  <Text style={styles.error}>{error}</Text>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={handleCancel}
                    style={styles.cancelButton}
                    textColor="#666"
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    style={styles.saveButton}
                    buttonColor="#4A90E2"
                    disabled={selectedEvents.size === 0 && !includeDiary}
                  >
                    Save {selectedEvents.size}
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  // Button states
  voiceButtonBlue: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceButtonRed: {
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceButtonYellow: {
    backgroundColor: '#F39C12',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalScroll: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  datePickerButton: {
    marginBottom: 12,
    borderColor: '#4A90E2',
  },
  datePickerContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  datePickerCancelButton: {
    flex: 1,
    borderColor: '#DDD',
  },
  datePickerConfirmButton: {
    flex: 1,
  },
  transcriptContainer: {
    marginBottom: 4,
  },
  transcriptInput: {
    marginBottom: 4,
    backgroundColor: '#f0f7ff',
    fontSize: 13,
    maxHeight: 100,
    textAlignVertical: 'center',
    paddingTop: 12,
  },
  transcriptInputExpanded: {
    maxHeight: 200,
  },
  expandIndicator: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '500',
  },
  reExtractButton: {
    marginBottom: 12,
  },
  diaryCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diaryLabel: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  diaryFormatRow: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 40,
    marginBottom: 12,
  },
  radioOption: {
    flex: 1,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  radioCircleSelected: {
    borderColor: '#4A90E2',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
  },
  radioLabel: {
    fontSize: 12,
    color: '#666',
  },
  eventCard: {
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  eventCardContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventEmoji: {
    fontSize: 20,
    marginLeft: 4,
    marginRight: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  eventDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 36,
    marginBottom: 6,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 36,
    position: 'relative',
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
  // Valence picker modal
  valenceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  valenceModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  valenceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  valenceModalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
  },
  valenceModalOptionLast: {
    marginBottom: 16,
  },
  valenceModalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  valenceModalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  valenceModalCancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  error: {
    color: '#E74C3C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#DDD',
  },
  saveButton: {
    flex: 1,
  },
});
