import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../contexts/AuthContext';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { databaseService } from '../../services/database';

export default function ProfileScreen() {
  const router = useRouter();
  const { userEmail, logout } = useAuthContext();
  const [childProfile, setChildProfile] = useState<any | null>(null);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    loadChildProfile();
  }, []);

  const loadChildProfile = async () => {
    try {
      const profile = await databaseService.getChildProfile(childProfileId);
      setChildProfile(profile);
    } catch (error) {
      console.error('Failed to load child profile:', error);
    }
  };

  const handleEditProfile = () => {
    router.push(`/profile-edit?profileId=${childProfileId}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Child Profile */}
        {childProfile && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Child Profile
              </Text>
              <View style={styles.profileInfo}>
                <Text variant="bodyLarge" style={styles.profileName}>
                  {childProfile.displayName}
                </Text>
                {childProfile.age && (
                  <Text variant="bodyMedium" style={styles.profileDetail}>
                    Age: {childProfile.age}
                  </Text>
                )}
                {childProfile.diagnosis && (
                  <Text variant="bodyMedium" style={styles.profileDetail}>
                    Diagnosis: {childProfile.diagnosis}
                  </Text>
                )}
              </View>
              <Button
                mode="outlined"
                onPress={handleEditProfile}
                style={styles.editButton}
                icon="pencil"
              >
                Edit Profile
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Account */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Account
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {userEmail}
            </Text>
          </Card.Content>
        </Card>

        {/* Sync Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Sync Status
            </Text>
            <SyncStatusIndicator
              showLastSync
              showSyncButton
            />
          </Card.Content>
        </Card>

        {/* App Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              App Info
            </Text>
            <Text variant="bodyMedium" style={styles.info}>
              Version: 1.0.0{'\n'}
              Platform: iOS{'\n'}
              Build: Development
            </Text>
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Button
          mode="contained"
          onPress={logout}
          style={styles.logoutButton}
          icon="logout"
        >
          Sign Out
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginBottom: 12,
  },
  profileName: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileDetail: {
    color: '#666',
    marginBottom: 4,
  },
  editButton: {
    marginTop: 8,
  },
  email: {
    color: '#666',
  },
  info: {
    color: '#666',
    lineHeight: 24,
  },
  logoutButton: {
    marginTop: 16,
    marginBottom: 32,
  },
});
