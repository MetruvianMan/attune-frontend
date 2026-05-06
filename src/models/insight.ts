export interface Insight {
  id: string;
  childProfileId: string;
  type: 'weekly' | 'positive_pattern' | 'longitudinal_trend' | 'document_synthesis';
  narrative: string;
  supportingSignals: SupportingSignal[];
  confidenceScore: 'low' | 'medium' | 'high';
  explainabilityStatement: string;
  timeSpan?: { start: Date; end: Date };
  communicationScripts?: CommunicationScript[];
  strategyIds: string[];
  createdAt: Date;
}

export interface SupportingSignal {
  description: string;
  observationCount: number;
  contributingFactors: string[];
}

export interface CommunicationScript {
  topic: string;
  script: string;
  context: string;
}

export interface DataReference {
  type: 'event' | 'context_entry' | 'insight' | 'document';
  id: string;
  summary: string;
}
