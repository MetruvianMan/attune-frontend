import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, ActivityIndicator, TextInput, Checkbox, Portal } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { voiceService, ExtractedEvent } from '../services/voice-service';
import { eventService } from '../services/event-service';
import { databaseService } from '../services/database';
import { EventType } from '../models/event';
import { FullEmojiPicker } from './FullEmojiPicker';
import { EventTypePicker } from './EventTypePicker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type VoiceLoggerState = 'idle' | 'recording' | 'transcribing' | 'review';

interface VoiceLoggerProps {
  childProfileId: string;
  onComplete: () => void;
  initialDate?: Date; // Optional: defaults to today if not provided
}

export function VoiceLogger({ childProfileId, onComplete, initialDate }: VoiceLoggerProps) {
  const [state, setState] = useState<VoiceLoggerState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [includeDiary, setIncludeDiary] = useState(true); // Default to checked
  const [diaryEntry, setDiaryEntry] = useState('');
  const [useSummarizedDiary, setUseSummarizedDiary] = useState(false); // Default to Verbatim
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(initialDate || new Date());
  const [valenceMenuVisible, setValenceMenuVisible] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number | null>(null);
  const [eventTypePickerVisible, setEventTypePickerVisible] = useState(false);
  const [editingEventTypeIndex, setEditingEventTypeIndex] = useState<number | null>(null);
  const [originalExtractedEvents, setOriginalExtractedEvents] = useState<ExtractedEvent[]>([]); // Track AI originals for corrections

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

  // Update selectedDate when initialDate prop changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
      setTempDate(initialDate);
    }
  }, [initialDate]);

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
      console.log('🎙️ Stop recording initiated');
      console.log('📅 Selected date:', selectedDate.toISOString());
      console.log('👤 Child profile ID:', childProfileId);
      
      setState('transcribing');
      const uri = await voiceService.stopRecording();
      console.log('✅ Recording stopped, URI:', uri);
      setAudioUri(uri);

      console.log('🔄 Starting processRecording...');
      const result = await voiceService.processRecording(uri, childProfileId);
      console.log('✅ Processing complete, events:', result.extraction.events.length);
      
      setTranscript(result.transcript);
      setExtractedEvents(result.extraction.events);
      setOriginalExtractedEvents(JSON.parse(JSON.stringify(result.extraction.events))); // Deep copy for comparison
      setDiaryEntry(result.extraction.diaryEntry || '');
      
      const allIndices = new Set(result.extraction.events.map((_, i) => i));
      setSelectedEvents(allIndices);
      
      setState('review');
      setShowReviewModal(true);
    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Show user-friendly error message
        let userMessage = error.message;
        
        // Check for specific error patterns
        if (error.message.includes('Cannot reach server') || error.message.includes('Network Error')) {
          userMessage = '⚠️ Cannot reach server\n\nPlease ensure:\n• Backend server is running\n• You have internet connection\n• API_BASE_URL is correctly configured';
        } else if (error.message.includes('Authentication failed')) {
          userMessage = '⚠️ Authentication expired\n\nPlease log out and log back in.';
        } else if (error.message.includes('timed out')) {
          userMessage = '⚠️ Processing took too long\n\nTry a shorter recording or check your connection.';
        } else if (error.message.includes('status code 500') || error.message.includes('Server error')) {
          userMessage = '⚠️ Server Error\n\nThe backend encountered an issue. Common causes:\n\n• OpenAI API key not configured\n• OpenAI API quota exceeded\n• Backend database connection failed\n• Invalid transcript format\n\nCheck backend server logs for details.';
        }
        
        setError(userMessage);
      } else {
        setError('Failed to process recording. Please try again.');
      }
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

  const handleOpenEventTypePicker = (index: number) => {
    console.log('Opening event type picker for event', index);
    setEditingEventTypeIndex(index);
    setShowReviewModal(false);
    requestAnimationFrame(() => {
      setEventTypePickerVisible(true);
    });
  };

  const handleEventTypeSelect = (eventType: EventType, label: string, emoji: string) => {
    console.log('Event type selected:', eventType, label, emoji);
    if (editingEventTypeIndex !== null) {
      // Build updates object
      const updates: Partial<ExtractedEvent> = {
        eventType,
      };
      
      // Only update emoji if one was provided (not empty string)
      if (emoji) {
        updates.emoji = emoji;
      }
      
      // For custom events, store the custom label separately
      if (eventType === 'custom') {
        (updates as any).customLabel = label;
      }
      
      handleUpdateEvent(editingEventTypeIndex, updates);
    }
    setEventTypePickerVisible(false);
    setEditingEventTypeIndex(null);
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
      setOriginalExtractedEvents(JSON.parse(JSON.stringify(result.events))); // Deep copy
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
      
      // Track corrections for ML training
      for (let i = 0; i < selectedEventsList.length; i++) {
        const currentEvent = selectedEventsList[i];
        const originalEvent = originalExtractedEvents[i];
        
        // Check if user made corrections
        if (originalEvent) {
          const eventTypeChanged = currentEvent.eventType !== originalEvent.eventType;
          const emojiChanged = currentEvent.emoji !== originalEvent.emoji;
          const valenceChanged = currentEvent.valence !== originalEvent.valence;
          
          if (eventTypeChanged || emojiChanged || valenceChanged) {
            // Determine correction type
            let correctionType: 'event_type' | 'emoji' | 'valence' | 'multiple';
            const changedCount = [eventTypeChanged, emojiChanged, valenceChanged].filter(Boolean).length;
            if (changedCount > 1) {
              correctionType = 'multiple';
            } else if (eventTypeChanged) {
              correctionType = 'event_type';
            } else if (emojiChanged) {
              correctionType = 'emoji';
            } else {
              correctionType = 'valence';
            }

            // Store correction for ML training
            await databaseService.createVoiceLogCorrection({
              id: uuidv4(),
              childProfileId,
              transcriptSnippet: currentEvent.description,
              fullTranscript: transcript,
              aiOriginal: {
                eventType: originalEvent.eventType,
                emoji: originalEvent.emoji || '',
                valence: originalEvent.valence || 'neutral',
                description: originalEvent.description,
              },
              userCorrected: {
                eventType: currentEvent.eventType,
                emoji: currentEvent.emoji || '',
                valence: currentEvent.valence || 'neutral',
                description: currentEvent.description,
              },
              correctionType,
              createdAt: new Date(),
            });

            console.log(`📊 Correction logged: ${originalEvent.eventType} → ${currentEvent.eventType}`);
          }
        }

        // Create the event
        await eventService.createEvent({
          childProfileId,
          eventType: currentEvent.eventType,
          timestamp: logDate,
          notes: currentEvent.description,
          source: 'voice',
          transcript,
          valence: currentEvent.valence,
          customEmoji: currentEvent.emoji, // Pass custom emoji through
          ...((currentEvent as any).customLabel && {
            customLabel: (currentEvent as any).customLabel // Store custom label for custom events
          })
        });
      }

      if (audioUri) {
        await voiceService.deleteRecording(audioUri);
      }

      // Reset state to defaults
      setState('idle');
      setTranscript('');
      setExtractedEvents([]);
      setOriginalExtractedEvents([]);
      setSelectedEvents(new Set());
      setDiaryEntry('');
      setAudioUri(null);
      setTranscriptExpanded(false);
      setIncludeDiary(true); // Reset to default (checked)
      setUseSummarizedDiary(false); // Reset to default (Verbatim)
      
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
    setOriginalExtractedEvents([]);
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
    // Show error state if there's an error
    if (error && state === 'idle') {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              handleStartRecording();
            }}
            activeOpacity={0.8}
            style={styles.voiceButtonBlue}
          >
            <Text style={styles.voiceButtonText}>🎙️ Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

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

      {/* Event Type Picker - Slides up as bottom sheet */}
      <EventTypePicker
        visible={eventTypePickerVisible}
        currentEventType={editingEventTypeIndex !== null ? extractedEvents[editingEventTypeIndex]?.eventType : 'custom'}
        onSelect={handleEventTypeSelect}
        onClose={() => {
          setEventTypePickerVisible(false);
          setEditingEventTypeIndex(null);
          requestAnimationFrame(() => {
            setShowReviewModal(true);
          });
        }}
      />

      {/* Review Modal - Refined AI workflow experience */}
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
                {/* Compressed header with inline date */}
                <View style={styles.headerSection}>
                  <Text style={styles.modalTitle}>Review Voice Log</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setTempDate(selectedDate);
                      setShowDatePicker(true);
                    }}
                    style={styles.dateButton}
                  >
                    <Text style={styles.dateButtonText}>
                      {selectedDate.toLocaleDateString('en-US', { 
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </TouchableOpacity>

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
                            setTempDate(selectedDate);
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
                </View>

                {/* Unified transcript section */}
                <View style={styles.transcriptSection}>
                  <Text style={styles.sectionLabel}>What you said</Text>
                  <View style={styles.transcriptEditor}>
                    <TextInput
                      value={transcript}
                      onChangeText={setTranscript}
                      multiline
                      numberOfLines={transcriptExpanded ? undefined : 4}
                      style={[
                        styles.transcriptInput,
                        transcriptExpanded && styles.transcriptInputExpanded
                      ]}
                      mode="flat"
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      onFocus={() => setTranscriptExpanded(true)}
                      onBlur={() => setTranscriptExpanded(false)}
                      placeholder="Edit transcript if needed..."
                      placeholderTextColor="#B2BEC3"
                      textColor="#2D3436"
                      scrollEnabled={transcriptExpanded} // Allow scrolling only when expanded if content is very long
                    />
                    {/* Integrated controls */}
                    <View style={styles.transcriptControls}>
                      <TouchableOpacity 
                        onPress={() => setTranscriptExpanded(!transcriptExpanded)}
                        style={styles.transcriptControlButton}
                      >
                        <Text style={styles.transcriptControlText}>
                          {transcriptExpanded ? 'Show less' : 'Show more'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.controlDivider}>·</Text>
                      <TouchableOpacity 
                        onPress={handleReExtract}
                        style={styles.transcriptControlButton}
                      >
                        <Text style={styles.transcriptControlText}>Re-analyze</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* AI Analysis - emphasized as primary value */}
                <View style={styles.aiAnalysisSection}>
                  <View style={styles.aiAnalysisHeader}>
                    <Text style={styles.aiAnalysisTitle}>
                      ✨ AI extracted {extractedEvents.length} event{extractedEvents.length === 1 ? '' : 's'}
                    </Text>
                    {extractedEvents.length > 0 && (
                      <Text style={styles.aiAnalysisSubtitle}>
                        Review and adjust before saving
                      </Text>
                    )}
                  </View>

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
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.eventEmoji}>
                            {event.emoji || '📝'}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.eventInfo}>
                          <TouchableOpacity onPress={() => handleOpenEventTypePicker(index)}>
                            <Text style={styles.eventType}>
                              {(event as any).customLabel || event.eventType.split('_').map(w => 
                                w.charAt(0).toUpperCase() + w.slice(1)
                              ).join(' ')}
                            </Text>
                          </TouchableOpacity>
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
                </View>

                {/* Simplified save options - no section header */}
                <View style={styles.saveOptionsSection}>
                  <TouchableOpacity 
                    onPress={() => setIncludeDiary(!includeDiary)}
                    style={styles.diaryOption}
                  >
                    <Checkbox.Android
                      status={includeDiary ? 'checked' : 'unchecked'}
                      onPress={() => setIncludeDiary(!includeDiary)}
                      color="#4A90E2"
                    />
                    <View style={styles.diaryOptionContent}>
                      <Text style={styles.diaryOptionLabel}>
                        📔 Save as diary entry
                      </Text>
                      {includeDiary && (
                        <Text style={styles.diaryOptionHint}>
                          {useSummarizedDiary ? 'AI summary' : 'Verbatim transcript'}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {includeDiary && (
                    <View style={styles.diaryFormatOptions}>
                      <TouchableOpacity 
                        onPress={() => setUseSummarizedDiary(true)}
                        style={styles.radioOption}
                      >
                        <View style={[
                          styles.radioCircle,
                          useSummarizedDiary && styles.radioCircleSelected
                        ]}>
                          {useSummarizedDiary && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.radioLabel}>AI Summary</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setUseSummarizedDiary(false)}
                        style={styles.radioOption}
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
                  )}
                </View>

                {error && (
                  <Text style={styles.error}>{error}</Text>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
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
                    {selectedEvents.size > 0 
                      ? `Save ${selectedEvents.size} Event${selectedEvents.size === 1 ? '' : 's'}`
                      : 'Save Diary'
                    }
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
  // Error container for voice log errors
  errorContainer: {
    marginBottom: 16,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
    textAlign: 'center',
  },
  // Button states - ENHANCED for primary CTA prominence
  voiceButtonBlue: {
    backgroundColor: '#4A90E2',
    paddingVertical: 18, // Increased from 16
    paddingHorizontal: 24,
    borderRadius: 14, // Slightly larger
    marginBottom: 16, // Increased from 12
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2', // Blue shadow for prominence
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, // Stronger shadow
    shadowRadius: 8,
    elevation: 6,
    minHeight: 58, // Increased from implicit
  },
  voiceButtonRed: {
    backgroundColor: '#E74C3C',
    paddingVertical: 18, // Increased from 16
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 16, // Increased from 12
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 58,
  },
  voiceButtonYellow: {
    backgroundColor: '#F39C12',
    paddingVertical: 18, // Increased from 16
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 16, // Increased from 12
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#F39C12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 58,
  },
  voiceButtonText: {
    color: '#FFFFFF',
    fontSize: 17, // Increased from 16
    fontWeight: '700', // Bolder
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
  // Compressed header with inline date
  headerSection: {
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    color: '#2D3436',
    letterSpacing: -0.3,
  },
  dateButton: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  datePickerContainer: {
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,52,54,0.08)',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  datePickerCancelButton: {
    flex: 1,
    borderColor: 'rgba(45,52,54,0.12)',
  },
  datePickerConfirmButton: {
    flex: 1,
  },
  // Unified transcript section
  transcriptSection: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    letterSpacing: -0.1,
    marginBottom: 8,
  },
  transcriptEditor: {
    backgroundColor: '#FAFBFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(45,52,54,0.08)',
    overflow: 'hidden',
  },
  transcriptInput: {
    backgroundColor: 'transparent',
    fontSize: 15,
    lineHeight: 24,
    color: '#2D3436',
    maxHeight: 140,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 14,
    minHeight: 124,
    fontWeight: '400',
    textAlignVertical: 'top',
  },
  transcriptInputExpanded: {
    maxHeight: 'none' as any, // Remove height constraint when expanded
    minHeight: 220,
    paddingVertical: 18,
  },
  // Integrated transcript controls
  transcriptControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(45,52,54,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(45,52,54,0.06)',
    gap: 8,
  },
  transcriptControlButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  transcriptControlText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  controlDivider: {
    fontSize: 12,
    color: 'rgba(99,110,114,0.3)',
  },
  // AI Analysis - emphasized
  aiAnalysisSection: {
    marginBottom: 16,
  },
  aiAnalysisHeader: {
    marginBottom: 12,
  },
  aiAnalysisTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  aiAnalysisSubtitle: {
    fontSize: 12,
    color: '#636E72',
    lineHeight: 16,
  },
  // Event cards - tightened spacing (10-15% reduction)
  eventCard: {
    marginBottom: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  eventCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventEmoji: {
    fontSize: 22,
    marginLeft: 4,
    marginRight: 10,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
    letterSpacing: -0.2,
  },
  eventDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#636E72',
    marginLeft: 46,
    marginBottom: 6,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 46,
  },
  impactLabel: {
    fontSize: 11,
    color: '#B2BEC3',
    marginRight: 8,
    fontWeight: '500',
  },
  impactBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F8FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.15)',
  },
  impactText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  // Simplified save options - no header
  saveOptionsSection: {
    marginBottom: 16,
  },
  diaryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  diaryOptionContent: {
    flex: 1,
    marginLeft: 8,
  },
  diaryOptionLabel: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '500',
    marginBottom: 2,
  },
  diaryOptionHint: {
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: 1,
  },
  diaryFormatOptions: {
    flexDirection: 'row',
    gap: 20,
    marginLeft: 46,
    marginTop: 6,
  },
  radioOption: {
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
    marginRight: 8,
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
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  // Valence picker modal (preserved)
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
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
  // Action buttons - improved layout
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  cancelButton: {
    flex: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderWidth: 1.5,
  },
  saveButton: {
    flex: 2,
  },
});
