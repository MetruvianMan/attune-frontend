import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { apiPost, apiUploadFile } from '../utils/api-client';
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
   * Transcribe audio file to text
   */
  async transcribe(audioUri: string): Promise<TranscriptionResult> {
    try {
      const response = await apiUploadFile<TranscriptionResult>(
        '/voice/transcribe',
        audioUri,
        'audio',
        'audio.m4a'
      );

      return response;
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      throw error;
    }
  }

  /**
   * Extract events from transcript
   */
  async extractEvents(
    transcript: string,
    childProfileId: string
  ): Promise<EventExtractionResult> {
    try {
      const response = await apiPost<EventExtractionResult>(
        '/voice/extract-events',
        {
          transcript,
          childProfileId,
        }
      );

      return response;
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
