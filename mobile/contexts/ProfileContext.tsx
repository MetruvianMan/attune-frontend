import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/database';
import { ChildProfile } from '../models';

interface ProfileContextType {
  activeProfile: ChildProfile | null;
  profilePhotoUri: string | null;
  isLoading: boolean;
  reloadProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const profiles = await databaseService.getAllChildProfiles();
      
      if (profiles.length > 0) {
        const profile = profiles[0];
        setActiveProfile(profile);
        
        // Load photo
        const photos = await databaseService.getPhotosByProfileId(profile.id);
        if (photos.length > 0) {
          setProfilePhotoUri(photos[0].filePath);
        } else {
          setProfilePhotoUri(null);
        }
      } else {
        setActiveProfile(null);
        setProfilePhotoUri(null);
      }
    } catch (error) {
      console.error('[ProfileContext] Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const reloadProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        profilePhotoUri,
        isLoading,
        reloadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
