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

// Renamed from `Strategy` to resolve a duplicate-export collision with
// models/insight.ts's own (differently-shaped, and actually used by
// services/database.ts + database-supabase.ts) `Strategy` interface -
// both were exported via `export *` in models/index.ts, which TypeScript
// flags as an ambiguous re-export. This one was never imported directly
// by name anywhere in the app (confirmed via search), so renaming it is
// safe - nothing depended on resolving `Strategy` to this shape.
export interface GlossaryStrategy {
  id: string;
  profileId: string;
  category: string;
  strategyText: string;
  effectiveness: number | null;
  contexts: string[];
  createdAt: Date;
  updatedAt: Date;
}
