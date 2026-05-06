import type { DataStore } from '@src/data-store/data-store.js';
import type { NLPPipeline } from '@src/nlp-pipeline/nlp-pipeline.js';
import type { ToneComplianceFilter } from '@src/tone-compliance/tone-compliance-filter.js';
import type {
  Insight,
  IntakeProfile,
  ArchivedDocument,
  Strategy,
  StrategyFeedback,
} from '@src/models/index.js';

export interface StrategyRecommender {
  generateStrategies(
    insight: Insight,
    intakeProfile: IntakeProfile | null,
    documents: ArchivedDocument[],
    feedbackHistory: StrategyFeedback[],
  ): Promise<Strategy[]>;

  recordFeedback(strategyId: string, feedback: 'helped' | 'didnt_help'): void;
  changeFeedback(strategyId: string, newFeedback: 'helped' | 'didnt_help'): void;
}

export class StrategyRecommenderImpl implements StrategyRecommender {
  private dataStore: DataStore;
  private nlpPipeline: NLPPipeline;
  private toneFilter: ToneComplianceFilter;

  constructor(
    dataStore: DataStore,
    nlpPipeline: NLPPipeline,
    toneFilter: ToneComplianceFilter,
  ) {
    this.dataStore = dataStore;
    this.nlpPipeline = nlpPipeline;
    this.toneFilter = toneFilter;
  }

  /**
   * Generate 2-3 strategies for the given insight.
   *
   * Uses NLPPipeline.generateStrategies to get strategy descriptions,
   * creates Strategy objects with UUIDs, passes descriptions through
   * ToneComplianceFilter, and persists to DataStore.
   */
  async generateStrategies(
    insight: Insight,
    intakeProfile: IntakeProfile | null,
    documents: ArchivedDocument[],
    feedbackHistory: StrategyFeedback[],
  ): Promise<Strategy[]> {
    const descriptions = await this.nlpPipeline.generateStrategies({
      insight,
      intakeProfile: intakeProfile ?? undefined,
      documents,
      feedbackHistory,
    });

    const now = new Date();
    const strategies: Strategy[] = descriptions.map((description) => {
      const reframed = this.toneFilter.reframe(description);
      return {
        id: crypto.randomUUID(),
        childProfileId: insight.childProfileId,
        insightId: insight.id,
        description: reframed,
        effectiveness: {
          helpedCount: 0,
          didntHelpCount: 0,
        },
        createdAt: now,
      };
    });

    // Persist each strategy and collect IDs
    for (const strategy of strategies) {
      this.dataStore.saveStrategy(strategy);
    }

    return strategies;
  }

  /**
   * Record initial feedback for a strategy.
   * Delegates to DataStore.updateStrategyFeedback.
   */
  recordFeedback(strategyId: string, feedback: 'helped' | 'didnt_help'): void {
    this.dataStore.updateStrategyFeedback(strategyId, { feedback });
  }

  /**
   * Change existing feedback on a strategy.
   *
   * When changing from helped→didnt_help: decrement helpedCount, increment didntHelpCount.
   * When changing from didnt_help→helped: decrement didntHelpCount, increment helpedCount.
   *
   * Implemented by first reversing the old feedback (opposite increment to undo),
   * then applying the new feedback.
   */
  changeFeedback(strategyId: string, newFeedback: 'helped' | 'didnt_help'): void {
    // The old feedback is the opposite of the new one
    const oldFeedback: 'helped' | 'didnt_help' = newFeedback === 'helped' ? 'didnt_help' : 'helped';

    // Reverse the old feedback: we need to decrement the old count.
    // Since updateStrategyFeedback only increments, we work around this by
    // getting the strategy, computing the correct values, and setting them.
    // However, the DataStore only exposes updateStrategyFeedback which increments.
    // The simplest correct approach: call updateStrategyFeedback with the new feedback
    // (which increments the new count), then manually adjust the old count by
    // getting the strategy and saving it back.

    // Step 1: Apply the new feedback (increments newFeedback count)
    this.dataStore.updateStrategyFeedback(strategyId, { feedback: newFeedback });

    // Step 2: Decrement the old feedback count by getting the strategy and adjusting
    const strategies = this.findStrategyById(strategyId);
    if (strategies) {
      const updatedEffectiveness = { ...strategies.effectiveness };
      if (oldFeedback === 'helped') {
        updatedEffectiveness.helpedCount = Math.max(0, updatedEffectiveness.helpedCount - 1);
      } else {
        updatedEffectiveness.didntHelpCount = Math.max(0, updatedEffectiveness.didntHelpCount - 1);
      }
      // Save the adjusted strategy back
      this.dataStore.saveStrategy({
        ...strategies,
        effectiveness: updatedEffectiveness,
      });
    }
  }

  /**
   * Find a strategy by ID by searching through all insights' strategies.
   * This is a workaround since DataStore.getStrategies requires an insightId.
   */
  private findStrategyById(strategyId: string): Strategy | null {
    // We need to find the strategy. The DataStore.getStrategies takes insightId,
    // but we can look through all insights to find it.
    // A simpler approach: since we just called updateStrategyFeedback which
    // already validated the strategy exists, we can search all insights.
    const profiles = this.dataStore.listChildProfiles();
    for (const profile of profiles) {
      const insights = this.dataStore.getInsights(profile.id);
      for (const insight of insights) {
        const strategies = this.dataStore.getStrategies(insight.id);
        const found = strategies.find((s) => s.id === strategyId);
        if (found) return found;
      }
    }
    return null;
  }
}
