export interface Strategy {
  id: string;
  childProfileId: string;
  insightId: string;
  description: string;
  sourceDocumentRef?: string;
  effectiveness: {
    helpedCount: number;
    didntHelpCount: number;
  };
  createdAt: Date;
}

export interface StrategyFeedback {
  strategyId: string;
  feedback: 'helped' | 'didnt_help';
  timestamp: Date;
}

export interface StrategyFeedbackUpdate {
  feedback: 'helped' | 'didnt_help';
}
