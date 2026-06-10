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

export interface Strategy {
  id: string;
  profileId: string;
  category: string;
  strategyText: string;
  effectiveness: number | null;
  contexts: string[];
  createdAt: Date;
  updatedAt: Date;
}
