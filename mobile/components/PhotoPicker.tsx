import React from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Button, ActivityIndicator, Text } from 'react-native-paper';
import { usePhotos } from '../hooks/usePhotos';
import { PhotoCaptureResult, PhotoPickerOptions } from '../services/photo-service';

export interface PhotoPickerProps {
  onPhotoSelected: (result: PhotoCaptureResult) => void;
  onPhotosSelected?: (results: PhotoCaptureResult[]) => void;
  allowMultiple?: boolean;
  pickerOptions?: PhotoPickerOptions;
  showCameraButton?: boolean;
  showLibraryButton?: boolean;
  buttonMode?: 'text' | 'outlined' | 'contained';
  disabled?: boolean;
}

export function PhotoPicker({
  onPhotoSelected,
  onPhotosSelected,
  allowMultiple = false,
  pickerOptions,
  showCameraButton = true,
  showLibraryButton = true,
  buttonMode = 'outlined',
  disabled = false,
}: PhotoPickerProps) {
  const { isLoading, error, capturePhoto, pickFromLibrary, pickMultiple, clearError } = usePhotos();

  const handleCapturePhoto = async () => {
    try {
      const result = await capturePhoto(pickerOptions);
      if (result) {
        onPhotoSelected(result);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to capture photo');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      if (allowMultiple && onPhotosSelected) {
        const results = await pickMultiple(pickerOptions);
        if (results.length > 0) {
          onPhotosSelected(results);
        }
      } else {
        const result = await pickFromLibrary(pickerOptions);
        if (result) {
          onPhotoSelected(result);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick photo');
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
        <Text style={styles.loadingText}>Processing photo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      
      {showLibraryButton && (
        <Button
          mode={buttonMode}
          onPress={handlePickFromLibrary}
          disabled={disabled || isLoading}
          icon="image"
          style={styles.button}
        >
          {allowMultiple ? 'Choose Photos' : 'Choose Photo'}
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
