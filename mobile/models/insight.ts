export interface Insight {
  id: string;
  childProfileId: string;
  type: 'pattern' | 'trigger' | 'trend' | 'recommendation';
  narrative: string;
  supportingSignals: string[];
  confidenceScore: 'low' | 'medium' | 'high';
  explainabilityStatement: string;
  timeSpanStart?: Date;
  timeSpanEnd?: Date;
  communicationScripts?: string[];
  strategyIds: string[];
  createdAt: Date;
}

export interface Strategy {
  id: string;
  childProfileId: string;
  insightId: string;
  description: string;
  sourceDocumentRef?: string;
  helpedCount: number;
  didntHelpCount: number;
  createdAt: Date;
}
