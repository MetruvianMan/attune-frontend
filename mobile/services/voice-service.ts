import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { fromByteArray } from 'base64-js';
import axios from 'axios';
import { authService } from './auth-service';
import { API_BASE_URL } from '../constants/api';
import { EventType } from '../models';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
}

export interface ExtractedEvent {
  eventType: EventType;
  description: string;
  emoji?: string;
  valence?: 'positive' | 'negative' | 'neutral';
  timestamp?: Date;
}

export interface EventExtractionResult {
  events: ExtractedEvent[];
  diaryEntry?: string;
}

export class VoiceService {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request microphone permissions:', error);
      return false;
    }
  }

  /**
   * Start audio recording
   */
  async startRecording(): Promise<void> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording instance
      const recording = new Audio.Recording();
      
      // Prepare the recording
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      // Start recording
      await recording.startAsync();

      this.recording = recording;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop audio recording and return file URI
   */
  async stopRecording(): Promise<string> {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      this.recordingUri = uri;
      this.recording = null;

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Get recording duration in seconds
   */
  async getRecordingDuration(): Promise<number> {
    try {
      if (!this.recording) {
        return 0;
      }

      const status = await this.recording.getStatusAsync();
      if (status.isRecording) {
        return status.durationMillis / 1000;
      }

      return 0;
    } catch (error) {
      console.error('Failed to get recording duration:', error);
      return 0;
    }
  }

  /**
   * Cancel recording and clean up
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      if (this.recordingUri) {
        try {
          // Just try to delete - idempotent option handles file not existing
          await FileSystem.deleteAsync(this.recordingUri, { idempotent: true });
        } catch (deleteError) {
          console.warn('Could not delete recording file:', deleteError);
        }
        this.recordingUri = null;
      }
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  }

  /**
   * Transcribe audio file to text using backend API (base64 method)
   * Note: Auth optional (Phase 3 - backend doesn't require auth)
   */
  async transcribe(audioUri: string): Promise<TranscriptionResult> {
    try {
      console.log('Reading audio file for base64 encoding...');
      console.log('Audio URI:', audioUri);
      
      // Use fetch to read the file as an ArrayBuffer
      const response = await fetch(audioUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert ArrayBuffer to Uint8Array, then to base64
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = fromByteArray(uint8Array);

      console.log(`Successfully converted ${base64Audio.length} chars of base64 audio`);
      console.log(`Sending to backend: ${API_BASE_URL}/voice/transcribe-base64`);

      // Auth token optional (backend doesn't require it in Phase 3)
      const token = await authService.getToken();
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Send base64 audio in JSON body
      const apiResponse = await axios.post<TranscriptionResult>(
        `${API_BASE_URL}/voice/transcribe-base64`,
        {
          audioBase64: base64Audio,
          filename: 'recording.m4a',
        },
        {
          headers,
          timeout: 120000, // 2 minute timeout
        }
      );

      console.log('Transcription successful!');
      return apiResponse.data;
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Transcription failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Extract events from transcript using backend API
   * Note: Auth optional (Phase 3 - backend doesn't require auth)
   */
  async extractEvents(
    transcript: string,
    childProfileId: string
  ): Promise<EventExtractionResult> {
    try {
      console.log('🔍 Extracting events from transcript...');
      console.log('   Transcript length:', transcript.length);
      console.log('   Child profile ID:', childProfileId);
      console.log('   API URL:', `${API_BASE_URL}/voice/extract-events`);
      
      // Auth token optional (backend doesn't require it in Phase 3)
      const token = await authService.getToken();
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('   Auth token present:', token.substring(0, 20) + '...');
      } else {
        console.log('   No auth token (not required)');
      }

      const response = await axios.post<EventExtractionResult>(
        `${API_BASE_URL}/voice/extract-events`,
        {
          transcript,
          childProfileId,
        },
        {
          headers,
          timeout: 60000, // 60 second timeout for event extraction
        }
      );

      console.log('✅ Event extraction successful:', response.data.events.length, 'events');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to extract events:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Axios error details:');
        console.error('   Status:', error.response?.status);
        console.error('   Status text:', error.response?.statusText);
        console.error('   Error data:', JSON.stringify(error.response?.data, null, 2));
        console.error('   Request URL:', error.config?.url);
        console.error('   Network error:', error.code);
        
        // Provide more helpful error messages
        if (error.code === 'ECONNABORTED') {
          throw new Error('Event extraction timed out. Please try a shorter recording.');
        } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          throw new Error('Cannot reach server. Please check your internet connection and ensure the backend is running.');
        } else if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please log out and log in again.');
        } else if (error.response?.status === 500) {
          const serverError = error.response?.data?.error || 'Server error';
          throw new Error(`Server error: ${serverError}`);
        }
        
        const message = error.response?.data?.error || error.message;
        throw new Error(`Event extraction failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Complete voice logging workflow: record, transcribe, extract
   */
  async processRecording(
    audioUri: string,
    childProfileId: string
  ): Promise<{
    transcript: string;
    extraction: EventExtractionResult;
  }> {
    try {
      // Step 1: Transcribe audio
      const transcriptionResult = await this.transcribe(audioUri);

      // Step 2: Extract events from transcript
      const extraction = await this.extractEvents(
        transcriptionResult.transcript,
        childProfileId
      );

      return {
        transcript: transcriptionResult.transcript,
        extraction,
      };
    } catch (error) {
      console.error('Failed to process recording:', error);
      throw error;
    }
  }

  /**
   * Clean up audio file
   */
  async deleteRecording(audioUri: string): Promise<void> {
    try {
      // Just try to delete - if file doesn't exist, FileSystem will handle it gracefully
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
    } catch (error) {
      // Ignore deletion errors - file might not exist or already deleted
      console.warn('Could not delete recording:', error);
    }
  }
}

// Singleton instance
export const voiceService = new VoiceService();
