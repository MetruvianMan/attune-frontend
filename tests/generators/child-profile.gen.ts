import * as fc from 'fast-check';
import type { ChildProfile, IntakeProfile } from '@src/models/index.js';

export function arbIntakeProfile(): fc.Arbitrary<IntakeProfile> {
  return fc.record({
    biographical: fc.record({
      grade: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      householdComposition: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    }),
    diagnosis: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    traits: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
    strengths: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
    struggles: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
    sensoryPreferences: fc.record({
      sensitivities: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
      seekingBehaviors: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
    }),
    communicationStyle: fc.record({
      type: fc.constantFrom('verbal' as const, 'limited_verbal' as const, 'aac_user' as const),
      preferredPatterns: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
    }),
  });
}

export function arbChildProfile(): fc.Arbitrary<ChildProfile> {
  return fc.record({
    id: fc.uuid(),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
    alias: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    age: fc.integer({ min: 0, max: 25 }),
    diagnosis: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    intakeProfile: fc.option(arbIntakeProfile(), { nil: undefined }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });
}
