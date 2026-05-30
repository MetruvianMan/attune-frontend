import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthContext } from '../../contexts/AuthContext';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { ChildProfile } from '../../models';

export default function ProfileScreen() {
  const router = useRouter();
  const { userEmail, logout } = useAuthContext();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reload profiles when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfiles();
      checkBackendHealth();
    }, [])
  );

  const loadProfiles = async () => {
    try {
      const allProfiles = await databaseService.getAllChildProfiles();
      setProfiles(allProfiles);
      
      // Set first profile as active if none selected
      if (allProfiles.length > 0 && !activeProfileId) {
        setActiveProfileId(allProfiles[0].id);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const checkBackendHealth = async () => {
    try {
      setIsCheckingBackend(true);
      const healthy = await syncService.checkHealth();
      setBackendHealthy(healthy);
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendHealthy(false);
    } finally {
      setIsCheckingBackend(false);
    }
  };

  const handleCreateProfile = () => {
    router.push('/profile-form');
  };

  const handleEditProfile = (profileId: string) => {
    router.push(`/profile-form?profileId=${profileId}`);
  };

  const handleDeleteProfile = (profile: ChildProfile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${profile.displayName}'s profile? This will permanently remove all events, insights, and data associated with this profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Note: Database has CASCADE DELETE, so all related data will be removed
              await databaseService.deleteChildProfile(profile.id);
              
              // If deleted profile was active, switch to another
              if (activeProfileId === profile.id) {
                const remaining = profiles.filter(p => p.id !== profile.id);
                setActiveProfileId(remaining.length > 0 ? remaining[0].id : null);
              }
              
              await loadProfiles();
              Alert.alert('Success', 'Profile deleted');
            } catch (error) {
              console.error('Failed to delete profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };

  const handleSwitchProfile = (profileId: string) => {
    setActiveProfileId(profileId);
  };

  const handleExportCSV = async () => {
    if (!activeProfileId) return;
    
    Alert.alert('Export CSV', 'CSV export will be implemented in a future update');
  };

  const handleBackup = async () => {
    try {
      // Get all data from database
      const allProfiles = await databaseService.getAllChildProfiles();
      const backupData: any = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        childProfiles: allProfiles,
        events: [],
        diaryEntries: [],
        insights: [],
        strategies: [],
        relationshipPersons: [],
        conversationSessions: [],
      };

      // Collect all data for each profile
      for (const profile of allProfiles) {
        const events = await databaseService.getEvents({ childProfileId: profile.id });
        backupData.events.push(...events);

        const diaryEntries = await databaseService.getDiaryEntries(profile.id);
        backupData.diaryEntries.push(...diaryEntries);

        const insights = await databaseService.getRecentInsights(profile.id, 1000);
        backupData.insights.push(...insights);

        const persons = await databaseService.getRelationshipPersons(profile.id);
        backupData.relationshipPersons.push(...persons);

        const sessions = await databaseService.getConversationSessions(profile.id);
        backupData.conversationSessions.push(...sessions);
      }

      // Save to file
      const fileName = `attune-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));

      Alert.alert(
        'Backup Created',
        `Backup saved to: ${fileName}\n\nYou can share this file via AirDrop or email.`,
        [
          { text: 'OK' },
          {
            text: 'Share',
            onPress: () => {
              // TODO: Implement sharing
              Alert.alert('Share', 'File sharing will be implemented in a future update');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Backup failed:', error);
      Alert.alert('Error', 'Failed to create backup');
    }
  };

  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const backupData = JSON.parse(fileContent);

      Alert.alert(
        'Restore Backup',
        'This will replace your current data with the backup. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                // Import profiles
                if (backupData.childProfiles) {
                  for (const profile of backupData.childProfiles) {
                    await databaseService.createChildProfile({
                      ...profile,
                      createdAt: new Date(profile.createdAt),
                      updatedAt: new Date(profile.updatedAt),
                    });
                  }
                }

                // Import events
                if (backupData.events) {
                  for (const event of backupData.events) {
                    await databaseService.createEvent({
                      ...event,
                      timestamp: new Date(event.timestamp),
                      createdAt: new Date(event.createdAt),
                    });
                  }
                }

                // Import diary entries
                if (backupData.diaryEntries) {
                  for (const entry of backupData.diaryEntries) {
                    await databaseService.createDiaryEntry({
                      ...entry,
                      date: new Date(entry.date),
                      createdAt: new Date(entry.createdAt),
                    });
                  }
                }

                // Import relationship persons
                if (backupData.relationshipPersons) {
                  for (const person of backupData.relationshipPersons) {
                    await databaseService.createRelationshipPerson({
                      ...person,
                      createdAt: new Date(person.createdAt),
                    });
                  }
                }

                // Import conversation sessions
                if (backupData.conversationSessions) {
                  for (const session of backupData.conversationSessions) {
                    await databaseService.createConversationSession({
                      ...session,
                      createdAt: new Date(session.createdAt),
                      lastActivityAt: new Date(session.lastActivityAt),
                    });
                  }
                }

                await loadProfiles();
                Alert.alert('Success', 'Backup restored successfully!');
              } catch (error) {
                console.error('Restore failed:', error);
                Alert.alert('Error', 'Failed to restore backup: ' + (error as Error).message);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to pick file:', error);
      Alert.alert('Error', 'Failed to select backup file');
    }
  };

  const handleUploadData = async () => {
    Alert.alert(
      'Upload Data',
      'Upload your local data to the cloud? This will overwrite any existing synced data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            try {
              setIsUploading(true);
              await syncService.uploadAllData();
              Alert.alert('Success', 'Data uploaded to cloud!');
            } catch (error) {
              console.error('Upload failed:', error);
              Alert.alert('Error', 'Failed to upload data: ' + (error as Error).message);
            } finally {
              setIsUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadData = async () => {
    Alert.alert(
      'Download Data',
      'Download synced data from cloud? This will replace your local data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            try {
              setIsDownloading(true);
              await syncService.downloadAllData();
              await loadProfiles();
              Alert.alert('Success', 'Data downloaded from cloud!');
            } catch (error) {
              console.error('Download failed:', error);
              Alert.alert('Error', 'Failed to download data: ' + (error as Error).message);
            } finally {
              setIsDownloading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Logout? Your local data will remain safe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await logout();
            Alert.alert('Success', 'Logged out');
          } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <Text variant="headlineMedium" style={styles.header}>
            👤 Profiles
          </Text>

          {/* Create Profile Button */}
          <Button
            mode="contained"
            icon="plus"
            onPress={handleCreateProfile}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
          >
            Create New Profile
          </Button>

          {/* Profile List */}
          {profiles.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  🌱 No profiles yet
                </Text>
                <Text variant="bodySmall" style={styles.emptyHint}>
                  Download synced data or create a child profile to start tracking
                </Text>
              </Card.Content>
            </Card>
          ) : (
            profiles.map((profile) => (
              <Card
                key={profile.id}
                style={[
                  styles.profileCard,
                  activeProfileId === profile.id && styles.activeProfileCard,
                ]}
              >
                <Card.Content>
                  <View style={styles.profileRow}>
                    {/* Left: Profile Info */}
                    <View style={styles.profileInfo}>
                      <View style={styles.profileNameRow}>
                        <Text variant="titleMedium" style={styles.profileName}>
                          {profile.displayName}
                        </Text>
                        {profile.alias && (
                          <Text variant="bodySmall" style={styles.profileAlias}>
                            ({profile.alias})
                          </Text>
                        )}
                        {activeProfileId === profile.id && (
                          <Text variant="bodySmall" style={styles.activeLabel}>
                            ACTIVE
                          </Text>
                        )}
                      </View>
                      <Text variant="bodySmall" style={styles.profileAge}>
                        Age {profile.age}
                      </Text>
                      {profile.diagnosis && (
                        <Text variant="bodySmall" style={styles.profileDiagnosis}>
                          {profile.diagnosis}
                        </Text>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.profileActions}>
                        {activeProfileId !== profile.id && (
                          <Button
                            mode="outlined"
                            onPress={() => handleSwitchProfile(profile.id)}
                            style={styles.actionButton}
                            compact
                          >
                            Switch to
                          </Button>
                        )}
                        <Button
                          mode="outlined"
                          onPress={() => handleEditProfile(profile.id)}
                          style={styles.actionButton}
                          compact
                        >
                          Edit
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => handleDeleteProfile(profile)}
                          style={[styles.actionButton, styles.deleteButton]}
                          compact
                          textColor="#C75C5C"
                        >
                          Delete
                        </Button>
                      </View>
                    </View>

                    {/* Right: Profile Photo */}
                    <View style={styles.profilePhotoContainer}>
                      <Text style={styles.profilePhotoPlaceholder}>👤</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}

          {/* Data Management Section */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                DATA
              </Text>
              <Text variant="bodySmall" style={styles.sectionDescription}>
                Export = CSV of events for spreadsheets · Backup = full JSON snapshot ·
                Restore = reload from a backup file
              </Text>

              <View style={styles.buttonRow}>
                {activeProfileId && (
                  <Button
                    mode="outlined"
                    icon="file-chart"
                    onPress={handleExportCSV}
                    style={styles.dataButton}
                    compact
                  >
                    Export
                  </Button>
                )}
                <Button
                  mode="outlined"
                  icon="content-save"
                  onPress={handleBackup}
                  style={styles.dataButton}
                  compact
                >
                  Backup
                </Button>
                <Button
                  mode="outlined"
                  icon="download"
                  onPress={handleRestore}
                  style={styles.dataButton}
                  compact
                >
                  Restore
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Cloud Sync Section (at bottom) */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                ☁️ CLOUD SYNC (OPTIONAL)
              </Text>
              <Text variant="bodySmall" style={styles.sectionDescription}>
                Share data with family members. Your local app works without this.
              </Text>

              {/* Backend Status */}
              <View
                style={[
                  styles.statusBadge,
                  backendHealthy ? styles.statusHealthy : styles.statusOffline,
                ]}
              >
                <Text style={styles.statusText}>
                  {isCheckingBackend
                    ? '⏳ Checking backend...'
                    : backendHealthy
                    ? '✓ Backend available'
                    : '⚠ Backend offline (local mode only)'}
                </Text>
              </View>

              {userEmail ? (
                <>
                  <View style={styles.buttonRow}>
                    <Button
                      mode="contained"
                      icon="upload"
                      onPress={handleUploadData}
                      style={styles.syncButton}
                      loading={isUploading}
                      disabled={isUploading || isDownloading || !backendHealthy}
                      compact
                    >
                      Upload Data
                    </Button>
                    <Button
                      mode="outlined"
                      icon="download"
                      onPress={handleDownloadData}
                      style={styles.syncButton}
                      loading={isDownloading}
                      disabled={isUploading || isDownloading || !backendHealthy}
                      compact
                    >
                      Download Data
                    </Button>
                  </View>
                  <Button
                    mode="text"
                    onPress={handleLogout}
                    style={styles.logoutButton}
                    compact
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Text variant="bodySmall" style={styles.loginHint}>
                  Login functionality will be added in a future update
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* Sync Status */}
          {activeProfileId && (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Sync Status
                </Text>
                <SyncStatusIndicator showLastSync showSyncButton />
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  createButton: {
    marginBottom: 16,
    borderRadius: 12,
  },
  createButtonContent: {
    paddingVertical: 4,
  },
  emptyCard: {
    marginBottom: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#666',
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  activeProfileCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginRight: 12,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  profileName: {
    fontWeight: '600',
  },
  profileAlias: {
    color: '#999',
    marginLeft: 6,
  },
  activeLabel: {
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 10,
  },
  profileAge: {
    color: '#999',
    marginBottom: 2,
  },
  profileDiagnosis: {
    color: '#666',
    marginBottom: 8,
  },
  profileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    marginRight: 4,
    marginBottom: 4,
  },
  deleteButton: {
    borderColor: '#C75C5C',
  },
  profilePhotoContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#E3F2FD',
    borderWidth: 3,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhotoPlaceholder: {
    fontSize: 48,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  sectionDescription: {
    color: '#999',
    marginBottom: 12,
    lineHeight: 18,
    fontSize: 11,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dataButton: {
    flex: 1,
  },
  syncButton: {
    flex: 1,
  },
  statusBadge: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusHealthy: {
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
  statusOffline: {
    backgroundColor: 'rgba(255,152,0,0.1)',
  },
  statusText: {
    fontSize: 12,
    textAlign: 'center',
  },
  loginHint: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  logoutButton: {
    marginTop: 4,
  },
});
