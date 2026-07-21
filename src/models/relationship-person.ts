export type RelationshipCategory = 'Family' | 'Family (Extended)' | 'Friends' | 'Childcare' | 'Professional' | 'Other';

export interface RelationshipPerson {
  id: string;
  childProfileId: string;
  name: string;
  category: RelationshipCategory;
  roleLabel: string;
  notes?: string;
  photoBase64?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelationshipPersonInput {
  childProfileId: string;
  name: string;
  category: RelationshipCategory;
  roleLabel?: string;
  notes?: string;
  photoBase64?: string;
}
