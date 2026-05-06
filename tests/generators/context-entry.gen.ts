import * as fc from 'fast-check';
import type { ContextEntry, ContextType } from '@src/models/index.js';

export function arbContextType(): fc.Arbitrary<ContextType> {
  return fc.constantFrom<ContextType>(
    'routine_disruption',
    'relationship_interaction',
    'parent_state',
  );
}

export function arbPerson(): fc.Arbitrary<{ name: string; role: string }> {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    role: fc.string({ minLength: 1, maxLength: 30 }),
  });
}

export function arbContextEntry(): fc.Arbitrary<ContextEntry> {
  return fc.record({
    id: fc.uuid(),
    childProfileId: fc.uuid(),
    contextType: arbContextType(),
    subType: fc.string({ minLength: 1, maxLength: 30 }),
    person: fc.option(arbPerson(), { nil: undefined }),
    startTime: fc.date(),
    endTime: fc.option(fc.date(), { nil: undefined }),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    createdAt: fc.date(),
  });
}
