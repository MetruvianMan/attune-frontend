import * as fc from 'fast-check';
import type {
  Insight,
  SupportingSignal,
  CommunicationScript,
} from '@src/models/index.js';

export function arbSupportingSignal(): fc.Arbitrary<SupportingSignal> {
  return fc.record({
    description: fc.string({ minLength: 1, maxLength: 100 }),
    observationCount: fc.integer({ min: 1, max: 100 }),
    contributingFactors: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  });
}

export function arbCommunicationScript(): fc.Arbitrary<CommunicationScript> {
  return fc.record({
    topic: fc.string({ minLength: 1, maxLength: 50 }),
    script: fc.string({ minLength: 1, maxLength: 200 }),
    context: fc.string({ minLength: 1, maxLength: 100 }),
  });
}

export function arbInsight(): fc.Arbitrary<Insight> {
  return fc.record({
    id: fc.uuid(),
    childProfileId: fc.uuid(),
    type: fc.constantFrom(
      'weekly' as const,
      'positive_pattern' as const,
      'longitudinal_trend' as const,
      'document_synthesis' as const,
    ),
    narrative: fc.string({ minLength: 1, maxLength: 500 }),
    supportingSignals: fc.array(arbSupportingSignal(), { minLength: 1, maxLength: 5 }),
    confidenceScore: fc.constantFrom('low' as const, 'medium' as const, 'high' as const),
    explainabilityStatement: fc.string({ minLength: 1, maxLength: 200 }),
    timeSpan: fc.option(
      fc.record({
        start: fc.date(),
        end: fc.date(),
      }),
      { nil: undefined },
    ),
    communicationScripts: fc.option(
      fc.array(arbCommunicationScript(), { minLength: 1, maxLength: 3 }),
      { nil: undefined },
    ),
    strategyIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
    createdAt: fc.date(),
  });
}
