import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { Text, FAB, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalStorage, setTotalStorage] = useState<number>(0);

  const childProfileId = activeProfile?.id || null;

  // Debug: Check FAB rendering
  useEffect(() => {
    console.log('DocumentsScreen mounted - FAB should be visible');
    console.log('Bottom inset:', insets.bottom);
  }, [insets.bottom]);

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
    console.log('FAB pressed - navigating to upload screen');
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
        {/* Knowledge Library Header */}
        <View style={styles.libraryHeader}>
          <View style={styles.libraryTitleRow}>
            <Text style={styles.libraryTitle}>Knowledge Library</Text>
            <MaterialCommunityIcons name="brain" size={20} color={colors.primary} />
          </View>
          <Text style={styles.librarySubtitle}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
          </Text>
          <Text style={styles.libraryHint}>Used by Chat and Insights</Text>
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
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredDocuments.length === 0 && !searchQuery && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="book-open-variant" size={56} color={colors.textDim} />
              <Text style={styles.emptyText}>Build your knowledge library</Text>
              <Text style={styles.emptyHint}>
                Upload documents to help Attune provide personalized answers and recommendations
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

          {filteredDocuments.map((doc) => {
            const typeLabel = documentService.getDocumentTypeLabel(doc);
            // Placeholder summary logic - would be replaced with actual AI-generated summaries
            const showSummary = doc.extractedText && doc.extractedText.length > 100;
            const summary = showSummary 
              ? "Key topics identified from document content" // Placeholder - would be AI-generated
              : null;
            
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.documentCard}
                onPress={() => handleDocumentPress(doc)}
                activeOpacity={0.7}
              >
                <View style={styles.documentContent}>
                  {/* Document Main Info */}
                  <View style={styles.documentMainSection}>
                    <Text style={styles.documentName} numberOfLines={2}>
                      {doc.fileName}
                    </Text>
                    
                    <View style={styles.documentMetaRow}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{typeLabel}</Text>
                      </View>
                      {doc.sourceProvider && (
                        <>
                          <Text style={styles.metaDivider}>•</Text>
                          <Text style={styles.sourceText} numberOfLines={1}>
                            {doc.sourceProvider}
                          </Text>
                        </>
                      )}
                    </View>

                    {summary && (
                      <Text style={styles.documentSummary} numberOfLines={1}>
                        {summary}
                      </Text>
                    )}

                    <Text style={styles.uploadDate}>
                      Uploaded {formatDate(doc.uploadedAt)}
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
            );
          })}
        </ScrollView>
      </View>

      {/* FAB for adding documents - positioned with safe area inset */}
      <FAB
        icon="plus"
        style={[
          styles.fab,
          { bottom: Math.max(90, insets.bottom + 60) } // Tab bar height + buffer, or safe area + buffer
        ]}
        onPress={handleAddDocument}
        color="#FFFFFF"
        testID="upload-fab"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  libraryHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  libraryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  libraryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  librarySubtitle: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 3,
  },
  libraryHint: {
    fontSize: 12,
    color: colors.textDim,
  },
  searchbar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: colors.cardBg,
    elevation: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginTop: 14,
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
    marginBottom: 10,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  documentContent: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'flex-start',
    gap: 12,
  },
  documentMainSection: {
    flex: 1,
    gap: 6,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  documentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaDivider: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sourceText: {
    fontSize: 12,
    color: colors.textDim,
    flex: 1,
  },
  uploadDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  documentSummary: {
    fontSize: 12,
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  deleteButton: {
    padding: 6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 28,
    width: 56,
    height: 56,
  },
});
