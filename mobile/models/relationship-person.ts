export interface RelationshipPerson {
  id: string;
  childProfileId: string;
  name: string;
  role: string;
  relationshipStrength?: number; // 1-5 scale
  photoPath?: string;
  notes?: string;
  createdAt: Date;
  synced: boolean;
}
