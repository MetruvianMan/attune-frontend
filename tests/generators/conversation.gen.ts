import * as fc from 'fast-check';
import type {
  ConversationSession,
  ConversationTurn,
  DataReference,
} from '@src/models/index.js';

export function arbDataReference(): fc.Arbitrary<DataReference> {
  return fc.record({
    type: fc.constantFrom(
      'event' as const,
      'context_entry' as const,
      'insight' as const,
      'document' as const,
    ),
    id: fc.uuid(),
    summary: fc.string({ minLength: 1, maxLength: 100 }),
  });
}

export function arbConversationTurn(): fc.Arbitrary<ConversationTurn> {
  return fc.record({
    role: fc.constantFrom('parent' as const, 'assistant' as const),
    content: fc.string({ minLength: 1, maxLength: 200 }),
    timestamp: fc.date(),
    dataRefs: fc.option(
      fc.array(arbDataReference(), { minLength: 1, maxLength: 5 }),
      { nil: undefined },
    ),
  });
}

export function arbConversationSession(): fc.Arbitrary<ConversationSession> {
  return fc.record({
    id: fc.uuid(),
    childProfileId: fc.uuid(),
    turns: fc.array(arbConversationTurn(), { minLength: 0, maxLength: 10 }),
    createdAt: fc.date(),
    lastActivityAt: fc.date(),
  });
}
