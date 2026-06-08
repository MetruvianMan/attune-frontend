import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, Alert, TouchableOpacity, Platform, Share } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { documentService } from '../services/document-service';
import { databaseService } from '../services/database';
import { Document } from '../models';
import { colors, shadows, radius } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function DocumentViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const documentId = params.documentId as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const doc = await databaseService.getDocumentById(documentId);
      
      if (!doc) {
        setError('Document not found');
        return;
      }

      setDocument(doc);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(doc.filePath);
      if (!fileInfo.exists) {
        setError('Document file not found on device');
        return;
      }

      // For images, set the URI
      if (documentService.isImage(doc)) {
        setImageUri(doc.filePath);
      }
    } catch (err) {
      console.error('Failed to load document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!document) return;

    try {
      // Use React Native's built-in Share API
      const result = await Share.share({
        message: `Sharing document: ${document.fileName}`,
        url: Platform.OS === 'ios' ? document.filePath : undefined,
        title: document.fileName,
      }, {
        dialogTitle: `Share ${document.fileName}`,
      });

      if (result.action === Share.sharedAction) {
        console.log('Document shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (err: any) {
      console.error('Failed to share document:', err);
      Alert.alert('Share', 'Document path copied. You can paste it in other apps.');
    }
  };

  const handleDelete = () => {
    if (!document) return;

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
              router.back();
            } catch (err) {
              console.error('Failed to delete document:', err);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  if (error || !document) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Document not found'}</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.fileName} numberOfLines={1}>
            {document.fileName}
          </Text>
          <Text style={styles.fileInfo}>
            {documentService.getDocumentTypeLabel(document)} • {documentService.formatBytes(document.fileSize)}
          </Text>
        </View>
      </View>

      {/* Document Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {/* Image Viewer */}
        {documentService.isImage(document) && imageUri && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        {/* PDF Viewer - Using WebView for basic PDF support */}
        {documentService.isPDF(document) && (
          <View style={styles.pdfContainer}>
            <WebView
              source={{ uri: document.filePath }}
              style={styles.pdfWebView}
              originWhitelist={['*']}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.pdfLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading PDF...</Text>
                </View>
              )}
            />
          </View>
        )}

        {/* Other document types - show info only */}
        {!documentService.isImage(document) && !documentService.isPDF(document) && (
          <View style={styles.unsupportedContainer}>
            <MaterialCommunityIcons 
              name={documentService.getDocumentIcon(document) as any} 
              size={80} 
              color={colors.primary} 
            />
            <Text style={styles.unsupportedTitle}>Preview not available</Text>
            <Text style={styles.unsupportedText}>
              This document type cannot be previewed in the app.
            </Text>
            <Text style={styles.unsupportedText}>
              Use the Share button to open it in another app.
            </Text>
          </View>
        )}

        {/* Document Metadata */}
        <View style={styles.metadataCard}>
          <Text style={styles.metadataTitle}>Document Information</Text>
          
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Type:</Text>
            <Text style={styles.metadataValue}>{documentService.getDocumentTypeLabel(document)}</Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Size:</Text>
            <Text style={styles.metadataValue}>{documentService.formatBytes(document.fileSize)}</Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Uploaded:</Text>
            <Text style={styles.metadataValue}>{formatDate(document.uploadedAt)}</Text>
          </View>

          {document.sourceProvider && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Source:</Text>
              <Text style={styles.metadataValue}>{document.sourceProvider}</Text>
            </View>
          )}

          {document.documentDate && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Date:</Text>
              <Text style={styles.metadataValue}>{formatDate(document.documentDate)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="share-variant"
          onPress={handleShare}
          style={styles.actionButton}
          textColor={colors.primary}
        >
          Share
        </Button>
        <Button
          mode="outlined"
          icon="delete-outline"
          onPress={handleDelete}
          style={styles.actionButton}
          textColor={colors.error}
        >
          Delete
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  fileInfo: {
    fontSize: 12,
    color: colors.textDim,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight * 0.5,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pdfContainer: {
    width: screenWidth,
    height: screenHeight * 0.6,
    backgroundColor: colors.bg,
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pdfLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  unsupportedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  unsupportedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  unsupportedText: {
    fontSize: 14,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  metadataCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metadataLabel: {
    fontSize: 13,
    color: colors.textDim,
    width: 100,
  },
  metadataValue: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.sm,
  },
  actionButton: {
    flex: 1,
    borderColor: colors.border,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textDim,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 8,
  },
});
