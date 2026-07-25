import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Share } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthContext } from '../../contexts/AuthContext';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { ChildProfile } from '../../models';

export default function ProfileScreen() {
  const router = useRouter();
  const { userEmail, logout } = useAuthContext();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reload profiles when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfiles();
      // Skip backend health check for now - using Supabase directly
      // checkBackendHealth();
      setBackendHealthy(true); // Assume healthy for Supabase mode
      setIsCheckingBackend(false);
    }, [])
  );

  const loadProfiles = async () => {
    try {
      console.log('🔍 [ProfileScreen] Starting loadProfiles...');
      console.log('🔍 [ProfileScreen] Calling getAllChildProfiles...');
      const allProfiles = await databaseService.getAllChildProfiles();
      console.log('🔍 [ProfileScreen] getAllChildProfiles returned:', allProfiles.length, 'profiles');
      if (allProfiles.length > 0) {
        console.log('🔍 [ProfileScreen] First profile:', JSON.stringify(allProfiles[0], null, 2));
      }
      setProfiles(allProfiles);
      
      // Load photos for each profile
      const photoMap: Record<string, string> = {};
      for (const profile of allProfiles) {
        const photos = await databaseService.getPhotosByProfileId(profile.id);
        console.log(`Photos for profile ${profile.displayName} (${profile.id}):`, photos.length);
        if (photos.length > 0) {
          console.log('First photo:', photos[0]);
          photoMap[profile.id] = photos[0].filePath;
        }
      }
      setProfilePhotos(photoMap);
      console.log('Photo map:', photoMap);
      
      // Set first profile as active if none selected
      if (allProfiles.length > 0 && !activeProfileId) {
        setActiveProfileId(allProfiles[0].id);
      }
      console.log('✅ [ProfileScreen] loadProfiles complete');
    } catch (error) {
      console.error('❌ [ProfileScreen] Failed to load profiles:', error);
      console.error('❌ [ProfileScreen] Error details:', JSON.stringify(error, null, 2));
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

  const handleSwitchProfile = (profileId: string) => {
    setActiveProfileId(profileId);
  };

  const handleExportCSV = async () => {
    if (!activeProfileId) return;
    
    Alert.alert('Export CSV', 'CSV export will be implemented in a future update');
  };

  const handleExportCorrections = async () => {
    if (!activeProfileId) return;
    
    try {
      const corrections = await databaseService.getVoiceLogCorrections(activeProfileId);
      
      if (corrections.length === 0) {
        Alert.alert('No Data', 'No voice log corrections have been recorded yet. Make edits during Voice Log review to start collecting training data.');
        return;
      }

      // Format for readability
      const formattedData = {
        exportDate: new Date().toISOString(),
        totalCorrections: corrections.length,
        corrections: corrections.map(c => ({
          date: c.createdAt,
          transcriptSnippet: c.transcriptSnippet,
          correction: {
            from: {
              eventType: c.aiOriginal.eventType,
              emoji: c.aiOriginal.emoji,
              valence: c.aiOriginal.valence,
            },
            to: {
              eventType: c.userCorrected.eventType,
              emoji: c.userCorrected.emoji,
              valence: c.userCorrected.valence,
            },
            type: c.correctionType,
          },
          fullTranscript: c.fullTranscript,
        })),
      };

      const jsonString = JSON.stringify(formattedData, null, 2);
      
      // Share via native share dialog
      await Share.share({
        message: `Voice Log Corrections Export\n\n${corrections.length} corrections found\n\nData:\n${jsonString}`,
        title: 'Voice Log Corrections',
      });

    } catch (error) {
      console.error('Export corrections failed:', error);
      Alert.alert('Error', 'Failed to export corrections: ' + (error as Error).message);
    }
  };

  const handleBackup = async () => {
    // Show backup type selection
    Alert.alert(
      'Choose Backup Type',
      'Quick Backup: Fast, smaller file (data only)\n\nFull Backup: Complete with documents & photos (larger file)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quick Backup',
          onPress: () => performBackup(false),
        },
        {
          text: 'Full Backup',
          onPress: () => performBackup(true),
        },
      ]
    );
  };

  const performBackup = async (includeDocs: boolean) => {
    try {
      // Get all data from database
      const allProfiles = await databaseService.getAllChildProfiles();
      const backupData: any = {
        version: '1.0',
        backupType: includeDocs ? 'full' : 'quick',
        exportDate: new Date().toISOString(),
        childProfiles: allProfiles,
        events: [],
        diaryEntries: [],
        insights: [],
        strategies: [],
        relationshipPersons: [],
        conversationSessions: [],
        behaviors: [],
        rewards: [],
        pointEvents: [],
        documents: [],
        photos: [],
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

        // ===== REWARDS DATA =====
        const behaviors = await databaseService.getBehaviorsByProfile(profile.id);
        backupData.behaviors.push(...behaviors);

        const rewards = await databaseService.getRewardsByProfile(profile.id);
        backupData.rewards.push(...rewards);

        const pointEvents = await databaseService.getPointEvents({ childProfileId: profile.id });
        backupData.pointEvents.push(...pointEvents);

        // Include documents and photos if full backup
        if (includeDocs) {
          const documents = await databaseService.getDocumentsByProfile(profile.id);
          
          // Read each document file and encode as base64
          for (const doc of documents) {
            try {
              // Check if file exists first
              const fileInfo = await FileSystem.getInfoAsync(doc.filePath);
              
              if (fileInfo.exists) {
                const fileContent = await FileSystem.readAsStringAsync(doc.filePath, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                backupData.documents.push({
                  ...doc,
                  fileData: fileContent, // Base64 encoded file content
                });
              } else {
                console.warn('Document file not found:', doc.filePath);
                // Include document metadata even if file doesn't exist
                backupData.documents.push({
                  ...doc,
                  fileData: null,
                  error: 'File not found',
                });
              }
            } catch (error) {
              console.error('Failed to read document:', doc.fileName, error);
              // Include document metadata even if file read fails
              backupData.documents.push({
                ...doc,
                fileData: null,
                error: 'Failed to read file',
              });
            }
          }

          const photos = await databaseService.getPhotosByProfileId(profile.id);
          
          // Read each photo file and encode as base64
          for (const photo of photos) {
            try {
              // Check if file exists first
              const fileInfo = await FileSystem.getInfoAsync(photo.filePath);
              
              if (fileInfo.exists) {
                const fileContent = await FileSystem.readAsStringAsync(photo.filePath, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                backupData.photos.push({
                  ...photo,
                  fileData: fileContent, // Base64 encoded photo content
                });
              } else {
                console.warn('Photo file not found:', photo.filePath);
                // Include photo metadata even if file doesn't exist
                backupData.photos.push({
                  ...photo,
                  fileData: null,
                  error: 'File not found',
                });
              }
            } catch (error) {
              console.error('Failed to read photo:', photo.id, error);
              // Include photo metadata even if file read fails
              backupData.photos.push({
                ...photo,
                fileData: null,
                error: 'Failed to read file',
              });
            }
          }
        }
      }

      // Save to file
      const backupType = includeDocs ? 'full' : 'quick';
      const fileName = `attune-${backupType}-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const jsonString = JSON.stringify(backupData, null, 2);
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Calculate file size and stats
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSizeMB = fileInfo.exists ? (fileInfo.size / 1024 / 1024).toFixed(2) : '?';
      
      // Count files with errors
      const docsWithErrors = includeDocs ? backupData.documents.filter((d: any) => d.error).length : 0;
      const photosWithErrors = includeDocs ? backupData.photos.filter((p: any) => p.error).length : 0;
      const totalErrors = docsWithErrors + photosWithErrors;

      const backupSummary = includeDocs
        ? `Full backup created (${fileSizeMB} MB)\n\n` +
          `Includes:\n` +
          `• All data\n` +
          `• ${backupData.behaviors.length} behavior(s)\n` +
          `• ${backupData.rewards.length} reward(s)\n` +
          `• ${backupData.pointEvents.length} point event(s)\n` +
          `• ${backupData.documents.length} document(s)` +
          (docsWithErrors > 0 ? ` (${docsWithErrors} missing files)` : '') + `\n` +
          `• ${backupData.photos.length} photo(s)` +
          (photosWithErrors > 0 ? ` (${photosWithErrors} missing files)` : '') +
          (totalErrors > 0 ? `\n\n⚠️ Some files couldn't be read but metadata was preserved` : '')
        : `Quick backup created (${fileSizeMB} MB)\n\n` +
          `Includes:\n` +
          `• All event data\n` +
          `• ${backupData.behaviors.length} behavior(s)\n` +
          `• ${backupData.rewards.length} reward(s)\n` +
          `• ${backupData.pointEvents.length} point event(s)\n` +
          `• Documents and photos excluded`;

      Alert.alert(
        'Backup Complete',
        `${backupSummary}\n\nSaved as: ${fileName}\n\nShare this file to keep it safe!`,
        [
          { text: 'OK' },
          {
            text: 'Share',
            onPress: async () => {
              try {
                await Share.share({
                  url: fileUri,
                  title: 'Attune Backup',
                  message: `Attune ${backupType} backup from ${new Date().toLocaleDateString()}`,
                });
              } catch (error) {
                console.error('Share failed:', error);
                Alert.alert('Share Failed', 'Could not share backup file');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Backup failed:', error);
      Alert.alert('Backup Failed', 'Failed to create backup: ' + (error as Error).message);
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

      // Validate backup structure
      if (!backupData.version || !backupData.exportDate) {
        Alert.alert('Invalid Backup', 'This file does not appear to be a valid Attune backup.');
        return;
      }

      // Show backup preview
      const backupDate = new Date(backupData.exportDate).toLocaleDateString();
      const profileCount = backupData.childProfiles?.length || 0;
      const eventCount = backupData.events?.length || 0;
      const diaryCount = backupData.diaryEntries?.length || 0;
      const sessionCount = backupData.conversationSessions?.length || 0;
      const behaviorCount = backupData.behaviors?.length || 0;
      const rewardCount = backupData.rewards?.length || 0;
      const pointEventCount = backupData.pointEvents?.length || 0;

      const previewMessage = `Backup from ${backupDate}\n\n` +
        `• ${profileCount} profile(s)\n` +
        `• ${eventCount} event(s)\n` +
        `• ${diaryCount} diary entry/entries\n` +
        `• ${sessionCount} conversation(s)\n` +
        `• ${behaviorCount} behavior(s)\n` +
        `• ${rewardCount} reward(s)\n` +
        `• ${pointEventCount} point event(s)\n\n` +
        `Choose restore mode:`;

      Alert.alert(
        'Restore Backup',
        previewMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace All Data',
            style: 'destructive',
            onPress: () => confirmRestore(backupData, true),
          },
          {
            text: 'Merge with Existing',
            onPress: () => confirmRestore(backupData, false),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to pick file:', error);
      Alert.alert('Error', 'Failed to select backup file: ' + (error as Error).message);
    }
  };

  const confirmRestore = async (backupData: any, replaceAll: boolean) => {
    const mode = replaceAll ? 'REPLACE all current data' : 'MERGE with existing data';
    
    Alert.alert(
      'Confirm Restore',
      `This will ${mode}. This action cannot be undone.\n\n${replaceAll ? '⚠️ All current data will be permanently deleted.' : '⚠️ Duplicate entries may be created if IDs overlap.'}\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => performRestore(backupData, replaceAll),
        },
      ]
    );
  };

  const performRestore = async (backupData: any, replaceAll: boolean) => {
    try {
      let restored = {
        profiles: 0,
        events: 0,
        diaries: 0,
        persons: 0,
        sessions: 0,
        behaviors: 0,
        rewards: 0,
        pointEvents: 0,
        documents: 0,
        photos: 0,
        errors: [] as string[],
      };

      const isFullBackup = backupData.backupType === 'full';

      // Step 1: Clear existing data if replace mode
      if (replaceAll) {
        console.log('🗑️ Clearing all existing data...');
        const existingProfiles = await databaseService.getAllChildProfiles();
        for (const profile of existingProfiles) {
          await databaseService.deleteChildProfile(profile.id);
        }
        console.log('✅ Existing data cleared');
      }

      // Step 2: Import profiles
      if (backupData.childProfiles) {
        console.log(`📋 Restoring ${backupData.childProfiles.length} profiles...`);
        for (const profile of backupData.childProfiles) {
          try {
            // Check if profile exists
            const existing = await databaseService.getChildProfile(profile.id);
            
            if (existing && !replaceAll) {
              // Update existing profile in merge mode
              await databaseService.updateChildProfile(profile.id, {
                ...profile,
                updatedAt: new Date(profile.updatedAt),
              });
            } else {
              // Create new profile
              await databaseService.createChildProfile({
                ...profile,
                createdAt: new Date(profile.createdAt),
                updatedAt: new Date(profile.updatedAt),
              });
            }
            restored.profiles++;
          } catch (error) {
            console.error('Failed to restore profile:', profile.id, error);
            restored.errors.push(`Profile ${profile.displayName}: ${(error as Error).message}`);
          }
        }
      }

      // Step 3: Import events
      if (backupData.events) {
        console.log(`📅 Restoring ${backupData.events.length} events...`);
        for (const event of backupData.events) {
          try {
            // Check if event exists
            const existing = await databaseService.getEvent(event.id);
            
            if (existing && !replaceAll) {
              // Update existing in merge mode
              await databaseService.updateEvent(event.id, {
                ...event,
                timestamp: new Date(event.timestamp),
              });
            } else if (!existing) {
              // Create new event
              await databaseService.createEvent({
                ...event,
                timestamp: new Date(event.timestamp),
                createdAt: new Date(event.createdAt),
              });
            }
            restored.events++;
          } catch (error) {
            console.error('Failed to restore event:', event.id, error);
            restored.errors.push(`Event ${event.id}: ${(error as Error).message}`);
          }
        }
      }

      // Step 4: Import diary entries
      if (backupData.diaryEntries) {
        console.log(`📔 Restoring ${backupData.diaryEntries.length} diary entries...`);
        for (const entry of backupData.diaryEntries) {
          try {
            await databaseService.createDiaryEntry({
              ...entry,
              date: new Date(entry.date),
              timestamp: new Date(entry.timestamp),
              createdAt: new Date(entry.createdAt),
            });
            restored.diaries++;
          } catch (error) {
            // Diary entries might not have a get method, so just try to create
            console.error('Failed to restore diary entry:', entry.id, error);
            restored.errors.push(`Diary ${entry.id}: ${(error as Error).message}`);
          }
        }
      }

      // Step 5: Import relationship persons
      if (backupData.relationshipPersons) {
        console.log(`👥 Restoring ${backupData.relationshipPersons.length} persons...`);
        for (const person of backupData.relationshipPersons) {
          try {
            await databaseService.createRelationshipPerson({
              ...person,
              createdAt: new Date(person.createdAt),
            });
            restored.persons++;
          } catch (error) {
            console.error('Failed to restore person:', person.id, error);
            restored.errors.push(`Person ${person.name}: ${(error as Error).message}`);
          }
        }
      }

      // Step 6: Import conversation sessions (use saveConversationSession for upsert)
      if (backupData.conversationSessions) {
        console.log(`💬 Restoring ${backupData.conversationSessions.length} conversations...`);
        for (const session of backupData.conversationSessions) {
          try {
            // saveConversationSession handles upsert automatically
            await databaseService.saveConversationSession({
              ...session,
              createdAt: new Date(session.createdAt),
              lastActivityAt: new Date(session.lastActivityAt),
            });
            restored.sessions++;
          } catch (error) {
            console.error('Failed to restore session:', session.id, error);
            restored.errors.push(`Session ${session.id}: ${(error as Error).message}`);
          }
        }
      }

      // Step 6a: Import behaviors
      if (backupData.behaviors) {
        console.log(`⭐ Restoring ${backupData.behaviors.length} behaviors...`);
        for (const behavior of backupData.behaviors) {
          try {
            await databaseService.createBehavior({
              ...behavior,
              createdAt: new Date(behavior.createdAt),
              updatedAt: new Date(behavior.updatedAt),
            });
            restored.behaviors++;
          } catch (error) {
            console.error('Failed to restore behavior:', behavior.id, error);
            restored.errors.push(`Behavior ${behavior.title}: ${(error as Error).message}`);
          }
        }
      }

      // Step 6b: Import rewards
      if (backupData.rewards) {
        console.log(`🎁 Restoring ${backupData.rewards.length} rewards...`);
        for (const reward of backupData.rewards) {
          try {
            await databaseService.createReward({
              ...reward,
              createdAt: new Date(reward.createdAt),
              updatedAt: new Date(reward.updatedAt),
            });
            restored.rewards++;
          } catch (error) {
            console.error('Failed to restore reward:', reward.id, error);
            restored.errors.push(`Reward ${reward.title}: ${(error as Error).message}`);
          }
        }
      }

      // Step 6c: Import point events
      if (backupData.pointEvents) {
        console.log(`💰 Restoring ${backupData.pointEvents.length} point events...`);
        for (const pointEvent of backupData.pointEvents) {
          try {
            await databaseService.createPointEvent({
              ...pointEvent,
              timestamp: new Date(pointEvent.timestamp),
              createdAt: new Date(pointEvent.createdAt),
            });
            restored.pointEvents++;
          } catch (error) {
            console.error('Failed to restore point event:', pointEvent.id, error);
            restored.errors.push(`Point event ${pointEvent.id}: ${(error as Error).message}`);
          }
        }
      }

      // Step 7: Import documents (if full backup)
      if (isFullBackup && backupData.documents) {
        console.log(`📄 Restoring ${backupData.documents.length} documents...`);
        for (const doc of backupData.documents) {
          try {
            // Write file data back to filesystem
            let newFilePath = doc.filePath;
            if (doc.fileData) {
              // Ensure directory exists
              const dirPath = `${FileSystem.documentDirectory}documents/`;
              await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
              
              // Create new file path
              newFilePath = `${dirPath}${doc.fileName}`;
              
              // Write base64 data to file
              await FileSystem.writeAsStringAsync(newFilePath, doc.fileData, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }

            // Create document record
            await databaseService.createDocument({
              ...doc,
              filePath: newFilePath,
              uploadedAt: new Date(doc.uploadedAt),
              documentDate: doc.documentDate ? new Date(doc.documentDate) : undefined,
              fileData: undefined, // Don't store in DB
            });
            restored.documents++;
          } catch (error) {
            console.error('Failed to restore document:', doc.fileName, error);
            restored.errors.push(`Document ${doc.fileName}: ${(error as Error).message}`);
          }
        }
      }

      // Step 8: Import photos (if full backup)
      if (isFullBackup && backupData.photos) {
        console.log(`📸 Restoring ${backupData.photos.length} photos...`);
        for (const photo of backupData.photos) {
          try {
            // Write photo data back to filesystem
            let newFilePath = photo.filePath;
            if (photo.fileData) {
              // Ensure directory exists
              const dirPath = `${FileSystem.documentDirectory}photos/`;
              await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
              
              // Create new file path
              const fileName = photo.filePath.split('/').pop() || `photo-${photo.id}.jpg`;
              newFilePath = `${dirPath}${fileName}`;
              
              // Write base64 data to file
              await FileSystem.writeAsStringAsync(newFilePath, photo.fileData, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }

            // Create photo record
            await databaseService.createPhoto({
              ...photo,
              filePath: newFilePath,
              createdAt: new Date(photo.createdAt),
              fileData: undefined, // Don't store in DB
            });
            restored.photos++;
          } catch (error) {
            console.error('Failed to restore photo:', photo.id, error);
            restored.errors.push(`Photo ${photo.id}: ${(error as Error).message}`);
          }
        }
      }

      // Note: Insights and strategies are not restored as they are system-generated
      // and will be regenerated based on the restored events and data

      // Reload UI
      await loadProfiles();

      // Show results
      const successMessage = 
        `✅ Restored:\n` +
        `• ${restored.profiles} profile(s)\n` +
        `• ${restored.events} event(s)\n` +
        `• ${restored.diaries} diary entry/entries\n` +
        `• ${restored.persons} person(s)\n` +
        `• ${restored.sessions} conversation(s)\n` +
        `• ${restored.behaviors} behavior(s)\n` +
        `• ${restored.rewards} reward(s)\n` +
        `• ${restored.pointEvents} point event(s)` +
        (isFullBackup ? `\n• ${restored.documents} document(s)\n• ${restored.photos} photo(s)` : '') +
        (restored.errors.length > 0 ? `\n\n⚠️ ${restored.errors.length} error(s) occurred` : '') +
        `\n\nℹ️ Insights will regenerate from your data`;

      Alert.alert('Restore Complete', successMessage);

      // Log errors if any
      if (restored.errors.length > 0) {
        console.error('Restore errors:', restored.errors);
      }

    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert('Restore Failed', 'An error occurred during restore: ' + (error as Error).message);
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
            Profile
          </Text>

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
                          mode="contained"
                          onPress={() => handleEditProfile(profile.id)}
                          style={styles.editButton}
                          compact
                        >
                          Edit
                        </Button>
                      </View>
                    </View>

                    {/* Right: Profile Photo */}
                    <View style={styles.profilePhotoContainer}>
                      {profilePhotos[profile.id] ? (
                        <Image
                          source={{ uri: profilePhotos[profile.id] }}
                          style={styles.profilePhoto}
                        />
                      ) : (
                        <Text style={styles.profilePhotoPlaceholder}>👤</Text>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}

          {/* Create Profile Link (quiet, below profiles) */}
          <TouchableOpacity
            onPress={handleCreateProfile}
            style={styles.createProfileLink}
          >
            <Text style={styles.createProfileText}>+ Create new profile</Text>
          </TouchableOpacity>

          {/* Data Management Section */}
          <View style={styles.sectionDivider} />
          <Text variant="titleMedium" style={styles.sectionHeader}>
            Data
          </Text>

          <Card style={styles.dataCard}>
            <Card.Content style={styles.dataCardContent}>
              <View style={styles.dataIconGrid}>
                <TouchableOpacity
                  style={styles.dataIconButton}
                  onPress={handleExportCSV}
                  disabled={!activeProfileId}
                >
                  <View style={[styles.dataIconCircle, !activeProfileId && styles.dataIconDisabled]}>
                    <Text style={styles.dataIconEmoji}>📲</Text>
                  </View>
                  <Text style={styles.dataIconLabel}>Export</Text>
                  <Text style={styles.dataIconHint}>Download your event history as CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dataIconButton}
                  onPress={handleBackup}
                >
                  <View style={styles.dataIconCircle}>
                    <Text style={styles.dataIconEmoji}>💾</Text>
                  </View>
                  <Text style={styles.dataIconLabel}>Backup</Text>
                  <Text style={styles.dataIconHint}>Create a complete backup</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dataIconButton}
                  onPress={handleRestore}
                >
                  <View style={styles.dataIconCircle}>
                    <Text style={styles.dataIconEmoji}>📥</Text>
                  </View>
                  <Text style={styles.dataIconLabel}>Restore</Text>
                  <Text style={styles.dataIconHint}>Restore from a previous backup</Text>
                </TouchableOpacity>

                {activeProfileId && (
                  <TouchableOpacity
                    style={styles.dataIconButton}
                    onPress={handleExportCorrections}
                  >
                    <View style={styles.dataIconCircle}>
                      <Text style={styles.dataIconEmoji}>🧠</Text>
                    </View>
                    <Text style={styles.dataIconLabel}>ML Corrections</Text>
                    <Text style={styles.dataIconHint}>Export anonymized AI correction data</Text>
                  </TouchableOpacity>
                )}
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
    marginBottom: 24,
    fontWeight: '600',
    fontSize: 32,
  },
  createProfileLink: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  createProfileText: {
    fontSize: 16,
    color: '#4A90E2',
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
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    marginRight: 4,
    marginBottom: 4,
  },
  editButton: {
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: '#4A90E2',
  },
  deleteButton: {
    marginRight: 4,
    marginBottom: 4,
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
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    fontSize: 48,
  },
  sectionDivider: {
    height: 16,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dataCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 1,
    backgroundColor: '#fff',
  },
  dataCardContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  dataIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dataIconButton: {
    width: '45%',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  dataIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataIconDisabled: {
    opacity: 0.3,
  },
  dataIconEmoji: {
    fontSize: 32,
  },
  dataIconLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  dataIconHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
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
  correctionsButton: {
    marginTop: 8,
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
