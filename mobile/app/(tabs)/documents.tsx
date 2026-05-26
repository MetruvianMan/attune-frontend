import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { DocumentCard } from '../../components/DocumentCard';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { Document } from '../../models';

export default function DocumentsScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const loadedDocuments = await databaseService.getDocumentsByProfile(childProfileId);
      setDocuments(loadedDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncService.sync();
      await loadDocuments();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDocumentPress = (document: Document) => {
    router.push(`/document-viewer?documentId=${document.id}`);
  };

  const handleUploadDocument = () => {
    router.push('/document-upload');
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <DocumentCard document={item} onPress={() => handleDocumentPress(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No Documents Yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        Upload documents like IEPs, evaluations, and reports
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleUploadDocument}
        label="Upload"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyMessage: {
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
