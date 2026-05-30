import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';

interface ProfileHeaderProps {
  emoji: string;
  title: string;
  profileName?: string;
  profilePhotoUri?: string | null;
}

export function ProfileHeader({ emoji, title, profileName, profilePhotoUri }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Left: Title with emoji */}
      <Text variant="headlineMedium" style={styles.title}>
        {emoji} {title}
      </Text>

      {/* Right: Name + Photo */}
      {profileName && (
        <View style={styles.rightGroup}>
          <Text variant="bodySmall" style={styles.profileName}>
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
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    margin: 0,
    fontWeight: 'bold',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontWeight: '600',
    color: '#999',
    fontSize: 12,
  },
  photoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#4A90E2',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    fontSize: 24,
  },
});
