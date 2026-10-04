// A category describing the nature of a SavedPlace - see the Glossary in
// .kiro/specs/family-location-tracking/requirements.md's Place_Type
// definition. Fixed to these 5 values per Requirement 1.1.
export type PlaceType = 'home' | 'family_visit' | 'vacation' | 'camp_or_school_trip' | 'other';

export interface SavedPlace {
  id: string;
  childProfileId: string;
  name: string;
  placeType: PlaceType;
  /**
   * Optional city/region text used to derive a static representative
   * coordinate for the Location Map (see design.md's "Location Map
   * rendering" section) via a one-time geocoding lookup at create/edit
   * time - NOT used for anything requiring live geocoding accuracy, and
   * NOT re-resolved on every render.
   */
  regionHint?: string;
  latitude?: number;
  longitude?: number;
  /**
   * Optional Parent-chosen emoji override (e.g. "⛰️" for an "Aspen"
   * Vacation place), shown instead of the PlaceType's default icon
   * (getPlaceTypeIcon) everywhere a SavedPlace's icon is rendered -
   * Calendar day cells, Map pins, the detail sheet, and the management
   * list/forms. Falls back to the PlaceType icon when unset, so this is
   * purely cosmetic and never required.
   */
  customEmoji?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedPlaceInput {
  childProfileId: string;
  name: string;
  placeType: PlaceType;
  regionHint?: string;
  customEmoji?: string;
}
