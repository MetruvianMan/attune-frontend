import * as fc from 'fast-check';
import type { Strategy } from '@src/models/index.js';

export function arbStrategy(): fc.Arbitrary<Strategy> {
  return fc.record({
    id: fc.uuid(),
    childProfileId: fc.uuid(),
    insightId: fc.uuid(),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    sourceDocumentRef: fc.option(fc.uuid(), { nil: undefined }),
    effectiveness: fc.record({
      helpedCount: fc.nat({ max: 100 }),
      didntHelpCount: fc.nat({ max: 100 }),
    }),
    createdAt: fc.date(),
  });
}
