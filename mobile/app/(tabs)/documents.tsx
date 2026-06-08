import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { Text, FAB, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ProfileHeader } from '../../components/ProfileHeader';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { documentService } from '../../services/document-service';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { Document, ChildProfile } from '../../models';
import { colors, shadows, radius, spacing } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DocumentsScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalStorage, setTotalStorage] = useState<number>(0);

  const childProfileId = activeProfile?.id || null;

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Documents tab focused, reloading data...');
      loadActiveProfile();
      if (childProfileId) {
        loadDocuments();
      }
    }, [childProfileId])
  );

  const loadActiveProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      if (profiles.length > 0) {
        setActiveProfile(profiles[0]);
        
        const photos = await databaseService.getPhotosByProfileId(profiles[0].id);
        if (photos.length > 0) {
          setProfilePhotoUri(photos[0].filePath);
        }
      }
    } catch (error) {
      console.error('Failed to load active profile:', error);
    }
  };

  const loadDocuments = async () => {
    if (!childProfileId) return;

    try {
      const docs = await documentService.getDocumentsByProfile(childProfileId);
      console.log(`Loaded ${docs.length} documents`);
      setDocuments(docs);
      setFilteredDocuments(docs);

      // Calculate total storage
      const storage = await documentService.getTotalStorageUsed();
      setTotalStorage(storage);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncService.syncNow();
      await loadDocuments();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = documents.filter(doc => 
      doc.fileName.toLowerCase().includes(lowercaseQuery) ||
      doc.documentType.toLowerCase().includes(lowercaseQuery) ||
      (doc.sourceProvider && doc.sourceProvider.toLowerCase().includes(lowercaseQuery))
    );
    setFilteredDocuments(filtered);
  };

  const handleDocumentPress = (document: Document) => {
    router.push(`/document-viewer?documentId=${document.id}`);
  };

  const handleDeleteDocument = (document: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentService.deleteDocument(document.id);
              await loadDocuments();
            } catch (error) {
              console.error('Failed to delete document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const handleAddDocument = () => {
    router.push('/document-upload');
  };

  const getThumbnail = (document: Document): string | null => {
    if (documentService.isImage(document)) {
      return document.filePath;
    }
    return null;
  };

  const getDocumentIcon = (document: Document): string => {
    return documentService.getDocumentIcon(document);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ProfileHeader
        emoji="📄"
        title="Documents"
        profileName={activeProfile?.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      <View style={styles.container}>
        {/* Storage Info */}
        <View style={styles.storageCard}>
          <MaterialCommunityIcons name="folder-multiple" size={20} color={colors.primary} />
          <Text style={styles.storageText}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} • {documentService.formatBytes(totalStorage)}
          </Text>
        </View>

        {/* Search Bar */}
        <Searchbar
          placeholder="Search documents..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={colors.primary}
        />

        {/* Documents List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredDocuments.length === 0 && !searchQuery && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.textDim} />
              <Text style={styles.emptyText}>No documents yet</Text>
              <Text style={styles.emptyHint}>
                Tap the + button to upload your first document
              </Text>
            </View>
          )}

          {filteredDocuments.length === 0 && searchQuery && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="magnify" size={64} color={colors.textDim} />
              <Text style={styles.emptyText}>No documents found</Text>
              <Text style={styles.emptyHint}>
                Try a different search term
              </Text>
            </View>
          )}

          {filteredDocuments.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.documentCard}
              onPress={() => handleDocumentPress(doc)}
              activeOpacity={0.7}
            >
              <View style={styles.documentContent}>
                {/* Thumbnail or Icon */}
                <View style={styles.thumbnailContainer}>
                  {getThumbnail(doc) ? (
                    <Image source={{ uri: getThumbnail(doc)! }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons 
                        name={getDocumentIcon(doc) as any} 
                        size={32} 
                        color={colors.primary} 
                      />
                    </View>
                  )}
                </View>

                {/* Document Info */}
                <View style={styles.documentInfo}>
                  <Text style={styles.fileName} numberOfLines={2}>
                    {doc.fileName}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {documentService.getDocumentTypeLabel(doc)} • {documentService.formatBytes(doc.fileSize)}
                  </Text>
                  <Text style={styles.documentDate}>
                    {formatDate(doc.uploadedAt)}
                  </Text>
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDocument(doc)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="delete-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB for adding documents */}
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleAddDocument}
          color="white"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storageText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.cardBg,
    elevation: 0,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
  documentCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  documentContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },
  documentMeta: {
    fontSize: 12,
    color: colors.textDim,
  },
  documentDate: {
    fontSize: 11,
    color: colors.textDim,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Increased from 16 to be above tab bar
    backgroundColor: colors.primary,
    elevation: 8, // Add elevation for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
