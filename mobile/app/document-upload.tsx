import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Button, Card, TextInput, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { documentService } from '../services/document-service';
import { databaseService } from '../services/database';

const DOCUMENT_TYPES = [
  'IEP',
  'Evaluation',
  'Report',
  'Medical',
  'School',
  'Therapy',
  'Other',
];

export default function DocumentUploadScreen() {
  const router = useRouter();

  const [documentResult, setDocumentResult] = useState<any | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [documentDate, setDocumentDate] = useState<Date | null>(null);
  const [source, setSource] = useState<string>('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  const handlePickFile = async () => {
    try {
      const result = await documentService.pickDocument(childProfileId);
      if (result) {
        setDocumentResult(result);
      }
    } catch (error) {
      console.error('Failed to pick file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleCapturePhoto = async () => {
    try {
      const result = await documentService.captureDocumentPhoto(childProfileId);
      if (result) {
        setDocumentResult(result);
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDocumentDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!documentResult) {
      Alert.alert('Validation Error', 'Please select a file or take a photo');
      return;
    }

    if (!documentType) {
      Alert.alert('Validation Error', 'Please select a document type');
      return;
    }

    setLoading(true);
    try {
      // Update the document with additional metadata
      await databaseService.updateDocument(documentResult.document.id, {
        documentType,
        documentDate: documentDate ? documentDate.toISOString() : null,
        source: source.trim() || null,
      });

      Alert.alert('Success', 'Document uploaded successfully');
      router.back();
    } catch (error) {
      console.error('Failed to save document:', error);
      Alert.alert('Error', 'Failed to save document');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString();
  };

  const isImage = documentResult?.document.mimeType.startsWith('image/');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          Upload Document
        </Text>

        {/* File Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Select File
            </Text>

            {documentResult ? (
              <View style={styles.previewContainer}>
                {isImage ? (
                  <Image
                    source={{ uri: documentResult.localUri }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.filePlaceholder}>
                    <Text style={styles.fileIcon}>📄</Text>
                    <Text variant="bodyMedium" numberOfLines={2}>
                      {documentResult.document.fileName}
                    </Text>
                  </View>
                )}
                <Button
                  mode="outlined"
                  onPress={() => setDocumentResult(null)}
                  style={styles.removeButton}
                  icon="close"
                >
                  Remove
                </Button>
              </View>
            ) : (
              <View style={styles.uploadButtons}>
                <Button
                  mode="contained"
                  onPress={handlePickFile}
                  style={styles.uploadButton}
                  icon="file-document"
                >
                  Choose File
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCapturePhoto}
                  style={styles.uploadButton}
                  icon="camera"
                >
                  Take Photo
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Document Details */}
        {documentResult && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Document Details
              </Text>

              {/* Document Type */}
              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={styles.label}>
                  Document Type *
                </Text>
                <Menu
                  visible={showTypeMenu}
                  onDismiss={() => setShowTypeMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowTypeMenu(true)}
                      style={styles.menuButton}
                    >
                      {documentType || 'Select Type'}
                    </Button>
                  }
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <Menu.Item
                      key={type}
                      onPress={() => {
                        setDocumentType(type);
                        setShowTypeMenu(false);
                      }}
                      title={type}
                    />
                  ))}
                </Menu>
              </View>

              {/* Document Date */}
              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={styles.label}>
                  Document Date (Optional)
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateButton}
                >
                  {formatDate(documentDate)}
                </Button>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={documentDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}

              {/* Source/Provider */}
              <TextInput
                label="Source/Provider (Optional)"
                value={source}
                onChangeText={setSource}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Dr. Smith, ABC School District"
              />

              {/* File Info */}
              <View style={styles.fileInfo}>
                <Text variant="bodySmall" style={styles.fileInfoText}>
                  File: {documentResult.document.fileName}
                </Text>
                <Text variant="bodySmall" style={styles.fileInfoText}>
                  Size: {(documentResult.document.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                </Text>
                <Text variant="bodySmall" style={styles.fileInfoText}>
                  Type: {documentResult.document.mimeType}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        {documentResult && (
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.uploadActionButton}
              icon="content-save"
            >
              Save Document
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        )}
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
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  previewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  filePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  removeButton: {
    marginTop: 8,
  },
  uploadButtons: {
    gap: 12,
  },
  uploadButton: {
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: '#666',
  },
  menuButton: {
    justifyContent: 'flex-start',
  },
  dateButton: {
    justifyContent: 'flex-start',
  },
  input: {
    marginBottom: 12,
  },
  fileInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  fileInfoText: {
    color: '#666',
    marginBottom: 4,
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
  uploadActionButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 12,
  },
});
