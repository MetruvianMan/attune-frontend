export type RelationshipCategory = 'Family' | 'Family (Extended)' | 'Friends' | 'Childcare' | 'Professional' | 'Other';

export interface RelationshipPerson {
  id: string;
  childProfileId: string;
  name: string;
  // Broad grouping used to order/bucket people in the Circle tab's network
  // graph (see CircleNetworkView.tsx's CATEGORY_ORDER) - distinct from
  // `role` below, which is the specific relationship (e.g. "Aunt",
  // "Teacher"). Optional since it was added after `role` and existing
  // rows may not have it set.
  category?: RelationshipCategory;
  role: string;
  relationshipStrength?: number; // 1-5 scale
  photoPath?: string;
  // Small (~300px) compressed copy of photoPath, used by the Circle tab's
  // network graph so it doesn't have to download the full-size original
  // just to render a ~100-130px avatar circle. Falls back to photoPath
  // wherever this isn't set (e.g. people added before this field existed).
  photoThumbnailPath?: string;
  notes?: string;
  createdAt: Date;
  synced: boolean;
}
