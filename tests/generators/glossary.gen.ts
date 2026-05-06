import * as fc from 'fast-check';
import type { GlossaryTerm, GlossaryCategory } from '@src/models/index.js';

export function arbGlossaryCategory(): fc.Arbitrary<GlossaryCategory> {
  return fc.constantFrom<GlossaryCategory>(
    'general_concepts',
    'autism_related',
    'adhd_related',
    'school_and_services',
    'sensory',
  );
}

export function arbGlossaryTerm(): fc.Arbitrary<GlossaryTerm> {
  return fc.record({
    term: fc.string({ minLength: 1, maxLength: 50 }),
    definition: fc.string({ minLength: 1, maxLength: 200 }),
    category: arbGlossaryCategory(),
  });
}
