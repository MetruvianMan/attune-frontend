import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, ActivityIndicator, Text } from 'react-native-paper';
import { useDocuments } from '../hooks/useDocuments';
import { DocumentUploadResult } from '../services/document-service';

export interface DocumentPickerProps {
  childProfileId: string;
  onDocumentSelected: (result: DocumentUploadResult) => void;
  showCameraButton?: boolean;
  showFileButton?: boolean;
  buttonMode?: 'text' | 'outlined' | 'contained';
  disabled?: boolean;
}

export function DocumentPicker({
  childProfileId,
  onDocumentSelected,
  showCameraButton = true,
  showFileButton = true,
  buttonMode = 'outlined',
  disabled = false,
}: DocumentPickerProps) {
  const { isLoading, error, pickDocument, captureDocumentPhoto, clearError } = useDocuments();

  const handlePickDocument = async () => {
    try {
      const result = await pickDocument(childProfileId);
      if (result) {
        onDocumentSelected(result);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick document');
    }
  };

  const handleCapturePhoto = async () => {
    try {
      const result = await captureDocumentPhoto(childProfileId);
      if (result) {
        onDocumentSelected(result);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to capture document photo');
    }
  };

  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      clearError();
    }
  }, [error, clearError]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Processing document...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showFileButton && (
        <Button
          mode={buttonMode}
          onPress={handlePickDocument}
          disabled={disabled || isLoading}
          icon="file-document"
          style={styles.button}
        >
          Choose File
        </Button>
      )}
      
      {showCameraButton && (
        <Button
          mode={buttonMode}
          onPress={handleCapturePhoto}
          disabled={disabled || isLoading}
          icon="camera"
          style={styles.button}
        >
          Take Photo
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 140,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
