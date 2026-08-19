import React, { useState } from 'react';
import { View, StyleSheet, Platform, Image as RNImage, Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '../contexts/ProfileContext';
import { colors, typography, spacing, radius, shadows } from '../constants/theme';

// Try to import expo-image, fall back to React Native Image if not available
let Image: any = RNImage;
try {
  const ExpoImage = require('expo-image');
  if (ExpoImage && ExpoImage.Image) {
    Image = ExpoImage.Image;
  }
} catch (e) {
  // expo-image not available, use React Native Image
  console.log('expo-image not available, using React Native Image');
}

interface ProfileHeaderProps {
  emoji: string;
  title: string;
  profileName?: string;
  profilePhotoUri?: string | null;
}

export function ProfileHeader({ emoji, title, profileName: propProfileName, profilePhotoUri: propProfilePhotoUri }: ProfileHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeProfile, allProfiles, profilePhotoUri: cachedPhotoUri, switchProfile } = useProfile();
  const [switcherVisible, setSwitcherVisible] = useState(false);
  
  // Use cached values from context, fallback to props
  const profileName = propProfileName ?? activeProfile?.displayName;
  const profilePhotoUri = propProfilePhotoUri ?? cachedPhotoUri;

  // Quick-switch only makes sense with more than one profile to switch to -
  // with a single profile (or none), the photo still renders but isn't
  // tappable, matching the previous purely-decorative behavior exactly.
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
        {...(Image !== RNImage ? {
          contentFit: "cover",
          transition: 200,
          cachePolicy: "memory-disk"
        } : {
          resizeMode: "cover"
        })}
      />
    ) : (
      <Text style={styles.photoPlaceholder}>👤</Text>
    )
  );
  
  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top : 8 }]}>
      {/* Left: Title with emoji */}
      <Text style={styles.title}>
        {emoji} {title}
      </Text>

      {/* Right: Name + Photo */}
      {profileName && (
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
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    margin: 0,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    letterSpacing: typography.h1.letterSpacing,
    color: colors.text,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileName: {
    fontWeight: '600',
    color: colors.textMuted,
    fontSize: typography.body.fontSize, // Larger (was bodySmall)
  },
  photoCircle: {
    width: 80, // Larger (was 64)
    height: 80, // Larger (was 64)
    borderRadius: 40, // Larger (was 32)
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
    fontSize: 32, // Larger (was 24)
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
