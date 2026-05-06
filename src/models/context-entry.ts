export type ContextType = 'routine_disruption' | 'relationship_interaction' | 'parent_state';

export interface ContextEntry {
  id: string;
  childProfileId: string;
  contextType: ContextType;
  subType: string;
  person?: { name: string; role: string };
  startTime: Date;
  endTime?: Date;
  notes?: string;
  createdAt: Date;
}

export interface ContextEntryInput {
  childProfileId: string;
  contextType: ContextType;
  subType: string;
  person?: { name: string; role: string };
  startTime?: Date;
  endTime?: Date;
  notes?: string;
}

export interface ContextFilter {
  childProfileId: string;
  contextTypes?: ContextType[];
  dateRange?: { start: Date; end: Date };
  activeOnly?: boolean;
}
