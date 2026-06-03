import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
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

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

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
        await FileSystem.deleteAsync(this.recordingUri, { idempotent: true });
        this.recordingUri = null;
      }
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  }

  /**
   * Transcribe audio file to text using backend API (base64 method)
   */
  async transcribe(audioUri: string): Promise<TranscriptionResult> {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('Reading audio file for base64 encoding...');
      
      // Read the file as base64 string
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64',
      });

      console.log(`Sending ${base64Audio.length} chars of base64 audio to backend...`);

      // Send base64 audio in JSON body
      const response = await axios.post<TranscriptionResult>(
        `${API_BASE_URL}/voice/transcribe-base64`,
        {
          audioBase64: base64Audio,
          filename: 'recording.m4a',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minute timeout
        }
      );

      console.log('Transcription successful!');
      return response.data;
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
   */
  async extractEvents(
    transcript: string,
    childProfileId: string
  ): Promise<EventExtractionResult> {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await axios.post<EventExtractionResult>(
        `${API_BASE_URL}/voice/extract-events`,
        {
          transcript,
          childProfileId,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to extract events:', error);
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
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }
}

// Singleton instance
export const voiceService = new VoiceService();
