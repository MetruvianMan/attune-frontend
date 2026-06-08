import React from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../constants/theme';

interface ProfileHeaderProps {
  emoji: string;
  title: string;
  profileName?: string;
  profilePhotoUri?: string | null;
}

export function ProfileHeader({ emoji, title, profileName, profilePhotoUri }: ProfileHeaderProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
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
          <View style={styles.photoCircle}>
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.photo} />
            ) : (
              <Text style={styles.photoPlaceholder}>👤</Text>
            )}
          </View>
        </View>
      )}
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
});
