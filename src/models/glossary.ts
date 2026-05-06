export type GlossaryCategory =
  | 'general_concepts'
  | 'autism_related'
  | 'adhd_related'
  | 'school_and_services'
  | 'sensory';

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: GlossaryCategory;
}
