import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '../services/database';
import { ChildProfile } from '../models';

// Persists which child profile is "active" across app restarts. Not
// sensitive data (just an ID), so plain AsyncStorage is appropriate here
// rather than expo-secure-store.
const SELECTED_PROFILE_STORAGE_KEY = 'attune:selectedChildProfileId';

interface ProfileContextType {
  activeProfile: ChildProfile | null;
  allProfiles: ChildProfile[];
  profilePhotoUri: string | null;
  isLoading: boolean;
  reloadProfile: () => Promise<void>;
  /** Switch the app-wide active child profile. Persists the selection so it
   * survives app restarts, and updates activeProfile/profilePhotoUri
   * immediately for every screen consuming useProfile(). */
  switchProfile: (profileId: string) => Promise<void>;
}

// Exported (not just the hook) so other contexts - namely RewardsContext -
// can do a soft `useContext(ProfileContext)` lookup that returns undefined
// outside a ProfileProvider, rather than the throwing useProfile() hook.
// This lets RewardsContext prefer the app-wide active profile when a
// ProfileProvider is present (the real app), while still falling back to
// its own independent profile lookup when rendered standalone (existing
// unit tests render RewardsProvider without a ProfileProvider wrapper).
export const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<ChildProfile[]>([]);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPhotoForProfile = useCallback(async (profileId: string) => {
    // Load photo - use remoteUrl if available (Supabase), otherwise filePath (SQLite)
    const photos = await databaseService.getPhotosByProfileId(profileId);
    if (photos.length > 0) {
      const photo = photos[0];
      setProfilePhotoUri(photo.remoteUrl || photo.filePath);
    } else {
      setProfilePhotoUri(null);
    }
  }, [setProfilePhotoUri]);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);

      // AsyncStorage reads are local and effectively instant, unlike the
      // two DB queries below - reading it first (and awaiting it alone)
      // lets us kick off the profiles fetch and a *speculative* photo
      // fetch for the persisted profile id at the same time, in parallel,
      // instead of the previous "await profiles, THEN await photo"
      // sequence. That sequential shape meant the photo genuinely
      // resolved a full extra network round-trip later than everything
      // else on screen (reported as "the photo loads after everything
      // else") - running them concurrently means the photo is ready by
      // the time the slower of the two calls finishes, not after both.
      const storedId = await AsyncStorage.getItem(SELECTED_PROFILE_STORAGE_KEY);

      const profilesPromise = databaseService.getAllChildProfiles();
      // Speculative: we don't yet know if storedId still refers to a real
      // profile (it may have been deleted since last launch) - that's
      // resolved below once profilesPromise settles. Fetching now, before
      // that's confirmed, is what makes this run in parallel rather than
      // after.
      const speculativePhotosPromise = storedId
        ? databaseService.getPhotosByProfileId(storedId).catch(() => [])
        : Promise.resolve([]);

      const [profiles, speculativePhotos] = await Promise.all([profilesPromise, speculativePhotosPromise]);
      setAllProfiles(profiles);

      if (profiles.length > 0) {
        // Prefer the persisted selection if it still refers to a profile
        // that exists (e.g. wasn't deleted since last launch); otherwise
        // fall back to the first profile - this is exactly the behavior the
        // app had before persistence existed, so a single-profile setup
        // (nothing stored yet) resolves identically to before.
        const matchedProfile = storedId ? profiles.find(p => p.id === storedId) : undefined;
        const profile = matchedProfile ?? profiles[0];

        setActiveProfile(profile);

        if (matchedProfile && storedId === profile.id) {
          // The speculative fetch above was already for the right
          // profile - use its result directly instead of running a
          // second, now-redundant query.
          if (speculativePhotos.length > 0) {
            const photo = speculativePhotos[0];
            setProfilePhotoUri(photo.remoteUrl || photo.filePath);
          } else {
            setProfilePhotoUri(null);
          }
        } else {
          // Fell back to a different profile (no stored value yet, or the
          // stored profile no longer exists) - the speculative fetch (if
          // any) was for the wrong id, so fetch the right one now.
          await loadPhotoForProfile(profile.id);
        }

        // Keep storage in sync if we fell back (no stored value yet, or the
        // stored profile no longer exists) so future launches resolve
        // instantly without needing the fallback logic again.
        if (!matchedProfile) {
          await AsyncStorage.setItem(SELECTED_PROFILE_STORAGE_KEY, profile.id);
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
  }, [loadPhotoForProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const reloadProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const switchProfile = useCallback(async (profileId: string) => {
    // Look up in the already-loaded list rather than re-querying the
    // database - avoids a round trip and a flash of "no active profile"
    // while switching.
    const profile = allProfiles.find(p => p.id === profileId);
    if (!profile) {
      console.error('[ProfileContext] switchProfile: profile not found', profileId);
      return;
    }

    try {
      await AsyncStorage.setItem(SELECTED_PROFILE_STORAGE_KEY, profileId);
      setActiveProfile(profile);
      await loadPhotoForProfile(profile.id);
    } catch (error) {
      console.error('[ProfileContext] Failed to switch profile:', error);
    }
  }, [allProfiles, loadPhotoForProfile]);

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        allProfiles,
        profilePhotoUri,
        isLoading,
        reloadProfile,
        switchProfile,
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
