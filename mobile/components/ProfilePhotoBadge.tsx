import React, { useState } from 'react';
import { View, StyleSheet, Image, Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useProfile } from '../contexts/ProfileContext';
import { colors, typography, spacing, radius, shadows } from '../constants/theme';

// Previously tried expo-image's <Image> (better caching/cross-fade) with
// a try/catch fallback to React Native's own Image if the package wasn't
// available. That fallback only protects the require() call itself - it
// doesn't catch a failure that happens later, when the component actually
// mounts and tries to reach its native backing view. That's exactly what
// happened here: expo-image's JS package is installed, but its native
// module isn't linked into the currently-running SBDev build, so a
// mounted <ExpoImage.Image> threw "Cannot find native module 'ExpoImage'"
// as an uncaught render error, past the try/catch entirely. Every screen
// with a profile photo header (ProfileHeader, RewardsTabScreen) goes
// through this component, so this wasn't safe to leave in even behind a
// guard - using React Native's own Image (always linked, no native
// module dependency) instead. Loses expo-image's memory-disk caching and
// built-in cross-fade transition; revisit once a native rebuild actually
// includes expo-image's native module.

/**
 * The "profile name + tappable circular photo" piece of ProfileHeader,
 * extracted into its own component so it can be reused somewhere OTHER
 * than the standard full-width title-left/photo-right header row -
 * specifically RewardsTabScreen, whose header layout (title + point
 * balance box in the upper-left) doesn't match ProfileHeader's own
 * layout and can't just render <ProfileHeader> directly. ProfileHeader
 * itself now renders this component internally for its own right-side
 * group, so the profile-switcher modal only has one implementation.
 */
export function ProfilePhotoBadge() {
  const router = useRouter();
  const { activeProfile, allProfiles, profilePhotoUri, isLoading, switchProfile } = useProfile();
  const [switcherVisible, setSwitcherVisible] = useState(false);

  const profileName = activeProfile?.displayName;

  // Quick-switch only makes sense with more than one profile to switch to -
  // with a single profile (or none), the photo still renders but isn't
  // tappable, matching ProfileHeader's existing purely-decorative behavior.
  const canSwitch = allProfiles.length > 1;

  const handleSelectProfile = async (profileId: string) => {
    setSwitcherVisible(false);
    if (profileId !== activeProfile?.id) {
      await switchProfile(profileId);
    }
  };

  const handleManageProfiles = () => {
    setSwitcherVisible(false);
    router.push('/(tabs)/profile');
  };

  const renderPhoto = (uri?: string | null) => (
    uri ? (
      <Image
        source={{ uri }}
        style={styles.photo}
        resizeMode="cover"
      />
    ) : (
      <Text style={styles.photoPlaceholder}>👤</Text>
    )
  );

  // While the profile is still resolving (isLoading true), render the
  // SAME rightGroup row - photo circle at the same 80x80 size, an empty
  // name slot reserving the same height - instead of returning null.
  // Returning null unconditionally here made this whole block absent
  // until the profile resolved, so any screen using this
  // (RewardsTabScreen, and ProfileHeader on every other tab) had its
  // header grow taller/wider the instant the profile loaded, pushing
  // everything below it down - the reported layout jump right after the
  // splash screen. Once loading genuinely settles with no profile at all
  // (a fresh install with no profiles created yet), this still returns
  // null below exactly as before - only the brief loading window gets a
  // placeholder now, not the permanent empty-app state.
  if (isLoading) {
    return (
      <View style={styles.rightGroup}>
        <Text style={styles.profileName}> </Text>
        <View style={styles.photoCircle} />
      </View>
    );
  }

  if (!profileName) {
    return null;
  }

  return (
    <>
      <View style={styles.rightGroup}>
        <Text style={styles.profileName}>
          {profileName}
        </Text>
        <TouchableOpacity
          style={styles.photoCircle}
          onPress={() => canSwitch && setSwitcherVisible(true)}
          disabled={!canSwitch}
          activeOpacity={canSwitch ? 0.7 : 1}
          accessibilityRole={canSwitch ? 'button' : undefined}
          accessibilityLabel={canSwitch ? 'Switch active profile' : undefined}
        >
          {renderPhoto(profilePhotoUri)}
        </TouchableOpacity>
      </View>

      {/* Quick-switch modal - lists every profile, tap to switch */}
      <Modal
        visible={switcherVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSwitcherVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSwitcherVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Switch Profile</Text>
            {allProfiles.map((p) => {
              const isActive = p.id === activeProfile?.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.profileRow, isActive && styles.profileRowActive]}
                  onPress={() => handleSelectProfile(p.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowPhotoCircle}>
                    {renderPhoto(p.id === activeProfile?.id ? profilePhotoUri : null)}
                  </View>
                  <Text style={styles.rowName}>{p.displayName}</Text>
                  {isActive && <Text style={styles.rowActiveLabel}>ACTIVE</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.manageLink} onPress={handleManageProfiles}>
              <Text style={styles.manageLinkText}>Manage Profiles</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileName: {
    fontWeight: '600',
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    fontSize: 32,
  },
  // Quick-switch modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 22,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    ...shadows.elevated,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    marginBottom: 6,
  },
  profileRowActive: {
    backgroundColor: colors.accentLight,
  },
  rowPhotoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentLight,
    borderWidth: 1.5,
    borderColor: colors.accent,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowName: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  rowActiveLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
  },
  manageLink: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: 'center',
  },
  manageLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
});
