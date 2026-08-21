export interface RelationshipPerson {
  id: string;
  childProfileId: string;
  name: string;
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
