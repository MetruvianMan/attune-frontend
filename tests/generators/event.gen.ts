import * as fc from 'fast-check';
import type { Event, EventType } from '@src/models/index.js';

const wellBeingEventTypes = [
  'mood', 'sleep', 'diet', 'screen_time', 'physical_wellness', 'medication',
] as const;

const behavioralEventTypes = [
  'meltdown', 'shutdown', 'conflict', 'school_incident', 'positive_behavior',
] as const;

export function arbEventType(): fc.Arbitrary<EventType> {
  return fc.constantFrom<EventType>(
    ...wellBeingEventTypes,
    ...behavioralEventTypes,
  );
}

export function arbEvent(): fc.Arbitrary<Event> {
  return fc.record({
    id: fc.uuid(),
    childProfileId: fc.uuid(),
    eventType: arbEventType(),
    timestamp: fc.date(),
    severity: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    persons: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
    source: fc.constantFrom('voice' as const, 'quick-tap' as const, 'manual' as const),
    transcript: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
    contextEntryRefs: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
    createdAt: fc.date(),
  });
}
