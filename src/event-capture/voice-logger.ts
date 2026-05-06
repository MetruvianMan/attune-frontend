import type { EventType } from '@src/models/index.js';

export interface ExtractedEventData {
  eventType: EventType | null;
  emotionalTone: string;
  tags: string[];
  persons: string[];
}

export interface VoiceTranscriptionResult {
  transcript: string;
  extractedEvent: ExtractedEventData;
}

export interface VoiceLogger {
  startRecording(): void;
  stopRecording(): Promise<VoiceTranscriptionResult>;
  isRecording(): boolean;
}

export class VoiceLoggerImpl implements VoiceLogger {
  private recording = false;
  private recordingStartTime: Date | null = null;

  /**
   * Begin audio capture. Captures the current timestamp for use as the
   * Event timestamp when the recording is later saved.
   */
  startRecording(): void {
    if (this.recording) {
      return;
    }
    this.recording = true;
    this.recordingStartTime = new Date();
  }

  /**
   * Stop recording and return a stub transcription result.
   * In the full implementation this will delegate to the NLP_Pipeline
   * for speech-to-text and event data extraction.
   */
  async stopRecording(): Promise<VoiceTranscriptionResult> {
    if (!this.recording) {
      throw new Error('Not currently recording');
    }

    this.recording = false;

    // Stub result — will be replaced with real NLP_Pipeline integration
    const result: VoiceTranscriptionResult = {
      transcript: '',
      extractedEvent: {
        eventType: null,
        emotionalTone: '',
        tags: [],
        persons: [],
      },
    };

    return result;
  }

  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Returns the timestamp captured when recording started.
   * This should be used as the Event timestamp so the event
   * reflects when the parent began speaking, not when they stopped.
   */
  getRecordingStartTime(): Date | null {
    return this.recordingStartTime;
  }
}
