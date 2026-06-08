import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { documentService } from '../services/document-service';
import { databaseService } from '../services/database';
import { ChildProfile } from '../models';
import { colors, shadows, radius } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DocumentUploadScreen() {
  const router = useRouter();
  
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);
  const [documentDate, setDocumentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sourceProvider, setSourceProvider] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadActiveProfile();
  }, []);

  const loadActiveProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      if (profiles.length > 0) {
        setActiveProfile(profiles[0]);
      }
    } catch (error) {
      console.error('Failed to load active profile:', error);
    }
  };

  const handleSelectFromFiles = async () => {
    if (!activeProfile) {
      Alert.alert('Error', 'No profile found');
      return;
    }

    try {
      const result = await documentService.pickDocument(activeProfile.id);
      
      if (result) {
        setSelectedFile({
          uri: result.localUri,
          fileName: result.document.fileName,
          fileSize: result.document.fileSize,
          mimeType: result.document.mimeType,
        });
        
        // Show success and go back
        Alert.alert(
          'Document Uploaded',
          `${result.document.fileName} has been uploaded successfully.`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleTakePhoto = async () => {
    if (!activeProfile) {
      Alert.alert('Error', 'No profile found');
      return;
    }

    try {
      const result = await documentService.captureDocumentPhoto(activeProfile.id);
      
      if (result) {
        setSelectedFile({
          uri: result.localUri,
          fileName: result.document.fileName,
          fileSize: result.document.fileSize,
          mimeType: result.document.mimeType,
        });
        
        // Show success and go back
        Alert.alert(
          'Photo Captured',
          'Document photo has been saved successfully.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to capture photo:', error);
      if (error.message === 'Camera permission denied') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos. Please enable it in Settings.',
          [
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !activeProfile) {
      Alert.alert('Error', 'No document selected');
      return;
    }

    try {
      setUploading(true);

      // Update document metadata if source or date was provided
      // Note: The document is already saved by pickDocument/captureDocumentPhoto
      // This is just a placeholder for future metadata updates
      
      Alert.alert(
        'Success',
        'Document uploaded successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to save document:', error);
      Alert.alert('Error', 'Failed to save document');
    } finally {
      setUploading(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setDocumentDate(date);
    }
  };

  const isImage = selectedFile?.mimeType.startsWith('image/');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Document</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Upload Options */}
        {!selectedFile && (
          <View style={styles.uploadOptions}>
            <Text style={styles.sectionTitle}>Choose Upload Method</Text>
            
            <TouchableOpacity
              style={styles.uploadOption}
              onPress={handleSelectFromFiles}
              activeOpacity={0.7}
            >
              <View style={styles.uploadIconContainer}>
                <MaterialCommunityIcons name="file-document-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.uploadOptionTitle}>Select from Files</Text>
              <Text style={styles.uploadOptionDesc}>
                Choose a PDF, image, or document from your device
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadOption}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={styles.uploadIconContainer}>
                <MaterialCommunityIcons name="camera" size={40} color={colors.primary} />
              </View>
              <Text style={styles.uploadOptionTitle}>Take Photo</Text>
              <Text style={styles.uploadOptionDesc}>
                Capture a photo of a document with your camera
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* File Preview and Metadata (shown after selection) */}
        {selectedFile && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Selected Document</Text>

            {/* File Preview */}
            <View style={styles.previewCard}>
              {isImage ? (
                <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewIcon}>
                  <MaterialCommunityIcons name="file-document" size={64} color={colors.primary} />
                </View>
              )}
              
              <Text style={styles.previewFileName}>{selectedFile.fileName}</Text>
              <Text style={styles.previewFileSize}>
                {documentService.formatBytes(selectedFile.fileSize)}
              </Text>
            </View>

            {/* Metadata Form */}
            <View style={styles.metadataForm}>
              <Text style={styles.sectionTitle}>Document Details (Optional)</Text>

              {/* Source Provider */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Source/Provider</Text>
                <TextInput
                  mode="outlined"
                  placeholder="e.g., Pediatrician, School, Therapist"
                  value={sourceProvider}
                  onChangeText={setSourceProvider}
                  style={styles.textInput}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />
              </View>

              {/* Document Date */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Document Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.dateButtonText}>
                    {documentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={documentDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={() => setSelectedFile(null)}
                style={styles.actionButton}
                textColor={colors.textDim}
                disabled={uploading}
              >
                Change File
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.actionButton}
                buttonColor={colors.primary}
                disabled={uploading}
                loading={uploading}
              >
                {uploading ? 'Saving...' : 'Save'}
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploadOptions: {
    gap: 16,
  },
  uploadOption: {
    padding: 24,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.sm,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  uploadOptionDesc: {
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  previewSection: {
    gap: 24,
  },
  previewCard: {
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.sm,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  previewIcon: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  previewFileSize: {
    fontSize: 12,
    color: colors.textDim,
  },
  metadataForm: {
    gap: 16,
  },
  formField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  textInput: {
    backgroundColor: colors.cardBg,
    fontSize: 14,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
});
