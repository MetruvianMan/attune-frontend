export interface ChildProfile {
  id: string;
  displayName: string;
  alias?: string;
  age: number;
  diagnosis?: string;
  intakeProfile?: IntakeProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntakeProfile {
  biographical: {
    grade?: string;
    householdComposition?: string;
  };
  diagnosis?: string;
  traits: string[];
  strengths: string[];
  struggles: string[];
  sensoryPreferences: {
    sensitivities: string[];
    seekingBehaviors: string[];
  };
  communicationStyle: {
    type: 'verbal' | 'limited_verbal' | 'aac_user';
    preferredPatterns: string[];
  };
}
