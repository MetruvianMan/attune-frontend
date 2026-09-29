import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../constants/theme';
import { ProfilePhotoBadge } from './ProfilePhotoBadge';

interface ProfileHeaderProps {
  emoji: string;
  title: string;
  profileName?: string;
  profilePhotoUri?: string | null;
}

// profileName/profilePhotoUri props are no longer read - ProfilePhotoBadge
// reads activeProfile/profilePhotoUri from useProfile() itself now (see
// that component), which is the same source every caller of this prop was
// already passing through from useProfile() anyway. Kept in the props
// interface (as optional, unused) rather than removed, so existing call
// sites across every tab screen don't all need updating at once.
export function ProfileHeader({ emoji, title }: ProfileHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top : 8 }]}>
      {/* Left: Title with emoji */}
      <Text style={styles.title}>
        {emoji} {title}
      </Text>

      {/* Right: Name + Photo (+ profile-switcher modal) */}
      <ProfilePhotoBadge />
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
});
