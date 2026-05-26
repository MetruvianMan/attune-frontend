import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Share } from 'react-native';
import { Text, Button, Card, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { databaseService } from '../services/database';
import { documentService } from '../services/document-service';
import { Document } from '../models/document';

export default function DocumentViewerScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await databaseService.getDocumentById(documentId);
      setDocument(doc);
    } catch (error) {
      console.error('Failed to load document:', error);
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!document) return;

    try {
      await Share.share({
        url: document.fileUri,
        title: document.fileName,
      });
    } catch (error) {
      console.error('Failed to share document:', error);
      Alert.alert('Error', 'Failed to share document');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentService.deleteDocument(documentId);
              await databaseService.deleteDocument(documentId);
              router.back();
            } catch (error) {
              console.error('Failed to delete document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'IEP': '#4CAF50',
      'Evaluation': '#2196F3',
      'Report': '#FF9800',
      'Medical': '#F44336',
      'School': '#9C27B0',
      'Therapy': '#00BCD4',
      'Other': '#757575',
    };
    return colors[type] || colors['Other'];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading document...</Text>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleMedium">Document not found</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  const isImage = document.mimeType.startsWith('image/');
  const isPDF = document.mimeType === 'application/pdf';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Document Preview */}
        <Card style={styles.previewCard}>
          <Card.Content>
            {isImage ? (
              <Image
                source={{ uri: document.fileUri }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
            ) : isPDF ? (
              <View style={styles.pdfPlaceholder}>
                <Text style={styles.pdfIcon}>📄</Text>
                <Text variant="titleMedium" style={styles.pdfText}>
                  PDF Document
                </Text>
                <Text variant="bodySmall" style={styles.pdfNote}>
                  Full PDF viewing coming soon
                </Text>
              </View>
            ) : (
              <View style={styles.pdfPlaceholder}>
                <Text style={styles.pdfIcon}>📎</Text>
                <Text variant="titleMedium" style={styles.pdfText}>
                  Document
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Document Info */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.fileName}>
              {document.fileName}
            </Text>

            {document.documentType && (
              <Chip
                style={[
                  styles.typeChip,
                  { backgroundColor: getDocumentTypeColor(document.documentType) },
                ]}
                textStyle={styles.chipText}
              >
                {document.documentType}
              </Chip>
            )}

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Uploaded:
              </Text>
              <Text variant="bodyMedium">{formatDate(document.uploadedAt)}</Text>
            </View>

            {document.documentDate && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Document Date:
                </Text>
                <Text variant="bodyMedium">{formatDate(document.documentDate)}</Text>
              </View>
            )}

            {document.source && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Source:
                </Text>
                <Text variant="bodyMedium">{document.source}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                File Type:
              </Text>
              <Text variant="bodyMedium">{document.mimeType}</Text>
            </View>

            {document.fileSizeBytes && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  File Size:
                </Text>
                <Text variant="bodyMedium">
                  {(document.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
            )}

            {document.syncStatus === 'pending' && (
              <Chip style={styles.syncChip} textStyle={styles.syncChipText}>
                Pending Sync
              </Chip>
            )}
          </Card.Content>
        </Card>

        {/* Extracted Text */}
        {document.extractedText && (
          <Card style={styles.textCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Extracted Text
              </Text>
              <Text variant="bodyMedium" style={styles.extractedText}>
                {document.extractedText}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleShare}
            style={styles.actionButton}
            icon="share-variant"
          >
            Share
          </Button>
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={styles.actionButton}
            icon="delete"
            textColor="#F44336"
          >
            Delete
          </Button>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginTop: 16,
  },
  previewCard: {
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 400,
    borderRadius: 8,
  },
  pdfPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  pdfIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  pdfText: {
    marginBottom: 8,
  },
  pdfNote: {
    color: '#666',
  },
  infoCard: {
    marginBottom: 16,
  },
  fileName: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 120,
  },
  syncChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    marginTop: 8,
  },
  syncChipText: {
    color: '#F57C00',
    fontSize: 11,
  },
  textCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  extractedText: {
    color: '#666',
    lineHeight: 22,
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 12,
  },
});
