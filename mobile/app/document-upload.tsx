import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, TouchableOpacity, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { documentService } from '../services/document-service';
import { databaseService } from '../services/database';
import { ChildProfile } from '../models';
import { colors, shadows, radius } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DOCUMENT_TYPES = [
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'iep', label: 'IEP' },
  { value: 'provider_report', label: 'Provider Report' },
  { value: 'therapy_notes', label: 'Therapy Notes' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'school_report', label: 'School Report' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'progress_report', label: 'Progress Report' },
  { value: 'other', label: 'Other' },
];

export default function DocumentUploadScreen() {
  const router = useRouter();
  
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('evaluation');
  const [documentDate, setDocumentDate] = useState<Date>(new Date());
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sourceProvider, setSourceProvider] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

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
      await documentService.initialize();
      
      const result = await documentService.pickDocument(activeProfile.id);
      
      if (result) {
        setSelectedDocumentId(result.document.id);
        setSelectedFile({
          uri: result.localUri,
          fileName: result.document.fileName,
          fileSize: result.document.fileSize,
          mimeType: result.document.mimeType,
        });
        
        if (!documentName) {
          setDocumentName(result.document.fileName);
        }
      }
    } catch (error: any) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', error?.message || 'Failed to select document');
    }
  };

  const handleTakePhoto = async () => {
    if (!activeProfile) {
      Alert.alert('Error', 'No profile found');
      return;
    }

    try {
      await documentService.initialize();
      
      const result = await documentService.captureDocumentPhoto(activeProfile.id);
      
      if (result) {
        setSelectedDocumentId(result.document.id);
        setSelectedFile({
          uri: result.localUri,
          fileName: result.document.fileName,
          fileSize: result.document.fileSize,
          mimeType: result.document.mimeType,
        });
        
        if (!documentName) {
          setDocumentName(`Document Photo ${new Date().toLocaleDateString()}`);
        }
      }
    } catch (error: any) {
      console.error('Failed to capture photo:', error);
      if (error.message === 'Camera permission denied') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error?.message || 'Failed to capture photo');
      }
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !activeProfile || !selectedDocumentId) {
      Alert.alert('Error', 'No document selected');
      return;
    }

    try {
      setUploading(true);

      await databaseService.updateDocument(selectedDocumentId, {
        fileName: documentName || selectedFile.fileName,
        documentType,
        sourceProvider: sourceProvider || undefined,
        documentDate: documentDate,
      });
      
      Alert.alert(
        'Success',
        'Document saved successfully',
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
    if (date) {
      setTempDate(date);
    }
  };

  const handleDateConfirm = () => {
    setDocumentDate(tempDate);
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setTempDate(documentDate); // Reset to original
    setShowDatePicker(false);
  };

  const getSelectedTypeLabel = () => {
    return DOCUMENT_TYPES.find(t => t.value === documentType)?.label || 'Evaluation';
  };

  const isImage = selectedFile?.mimeType.startsWith('image/');

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to Library</Text>
        <Text style={styles.headerSubtitle}>Helps Attune provide personalized answers</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!selectedFile && (
          <View style={styles.uploadOptions}>
            <Text style={styles.sectionTitle}>Upload Method</Text>
            
            <TouchableOpacity
              style={styles.uploadOption}
              onPress={handleSelectFromFiles}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="file-document-outline" size={32} color={colors.primary} />
              <View style={styles.uploadOptionText}>
                <Text style={styles.uploadOptionTitle}>Select from Files</Text>
                <Text style={styles.uploadOptionDesc}>PDF, image, or document</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadOption}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="camera" size={32} color={colors.primary} />
              <View style={styles.uploadOptionText}>
                <Text style={styles.uploadOptionTitle}>Take Photo</Text>
                <Text style={styles.uploadOptionDesc}>Capture with camera</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {selectedFile && (
          <View style={styles.previewSection}>
            {/* Compact Preview */}
            <View style={styles.previewCard}>
              {isImage ? (
                <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewIcon}>
                  <MaterialCommunityIcons name="file-document" size={40} color={colors.primary} />
                </View>
              )}
              
              <View style={styles.previewInfo}>
                <Text style={styles.previewFileName} numberOfLines={2}>{selectedFile.fileName}</Text>
                <Text style={styles.previewFileSize}>
                  {documentService.formatBytes(selectedFile.fileSize)}
                </Text>
              </View>
            </View>

            {/* Compact Document Information */}
            <View style={styles.metadataForm}>
              <Text style={styles.sectionTitle}>Document Information</Text>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Name (optional)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="e.g., Neuropsych Evaluation 2024"
                  value={documentName}
                  onChangeText={setDocumentName}
                  style={styles.textInput}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Type</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowTypeMenu(true)}
                >
                  <Text style={styles.dropdownButtonText}>{getSelectedTypeLabel()}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Source/Provider (optional)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="e.g., Dr. Smith, School District"
                  value={sourceProvider}
                  onChangeText={setSourceProvider}
                  style={styles.textInput}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    setTempDate(documentDate);
                    setShowDatePicker(true);
                  }}
                >
                  <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
                  <Text style={styles.dateButtonText}>
                    {documentDate.toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                  <View style={styles.datePickerButtons}>
                    <Button
                      mode="outlined"
                      onPress={handleDateCancel}
                      style={styles.datePickerButton}
                      textColor={colors.textDim}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleDateConfirm}
                      style={styles.datePickerButton}
                      buttonColor={colors.primary}
                    >
                      Confirm
                    </Button>
                  </View>
                </View>
              )}
            </View>

            {/* Document Type Modal */}
            <Modal
              visible={showTypeMenu}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTypeMenu(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowTypeMenu(false)}
              >
                <TouchableOpacity 
                  style={styles.modalContent}
                  activeOpacity={1}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Document Type</Text>
                    <TouchableOpacity onPress={() => setShowTypeMenu(false)}>
                      <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.modalScroll}>
                    {DOCUMENT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.modalItem,
                          documentType === type.value && styles.modalItemSelected
                        ]}
                        onPress={() => {
                          setDocumentType(type.value);
                          setShowTypeMenu(false);
                        }}
                      >
                        <Text style={[
                          styles.modalItemText,
                          documentType === type.value && styles.modalItemTextSelected
                        ]}>
                          {type.label}
                        </Text>
                        {documentType === type.value && (
                          <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setSelectedFile(null);
                  setSelectedDocumentId(null);
                  setDocumentName('');
                  setSourceProvider('');
                }}
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
                {uploading ? 'Saving...' : 'Save Document'}
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textDim,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 200,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  uploadOptions: {
    gap: 10,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadows.sm,
  },
  uploadOptionText: {
    flex: 1,
  },
  uploadOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  uploadOptionDesc: {
    fontSize: 12,
    color: colors.textDim,
  },
  previewSection: {
    gap: 18,
  },
  previewCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 12,
    ...shadows.sm,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    resizeMode: 'cover',
  },
  previewIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}10`,
    borderRadius: radius.md,
  },
  previewInfo: {
    flex: 1,
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  previewFileSize: {
    fontSize: 11,
    color: colors.textDim,
  },
  metadataForm: {
    gap: 14,
  },
  formField: {
    gap: 6,
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
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  datePickerContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  datePickerButton: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  actionButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
