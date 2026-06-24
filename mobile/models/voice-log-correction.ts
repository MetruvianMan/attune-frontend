import { EventType } from './event';

export interface VoiceLogCorrection {
  id: string;
  childProfileId: string;
  transcriptSnippet: string;
  fullTranscript: string;
  aiOriginal: {
    eventType: EventType;
    emoji: string;
    valence: 'positive' | 'negative' | 'neutral';
    description: string;
  };
  userCorrected: {
    eventType: EventType;
    emoji: string;
    valence: 'positive' | 'negative' | 'neutral';
    description?: string;
  };
  correctionType: 'event_type' | 'emoji' | 'valence' | 'multiple';
  createdAt: Date;
}
