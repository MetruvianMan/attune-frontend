import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { decode } from 'base64-arraybuffer';
import { Document } from '../models';
import { databaseService } from './database';
import { supabase } from './supabase';

export interface DocumentUploadResult {
  document: Document;
  localUri: string;
}

export class DocumentService {
  private documentsDir: string;
  private initialized = false;

  constructor() {
    this.documentsDir = `${FileSystem.documentDirectory}documents/`;
  }

  /**
   * Initialize the document service
   * Creates the documents directory if it doesn't exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // `size` was an opt-in option on older expo-file-system versions;
      // the installed version's InfoOptions no longer has a `size` field
      // at all - FileInfo always includes size (when the path exists)
      // unconditionally now.
      const dirInfo = await FileSystem.getInfoAsync(this.documentsDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.documentsDir, { intermediates: true });
        console.log('Documents directory created:', this.documentsDir);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize document service:', error);
      throw error;
    }
  }

  /**
   * Request camera permissions for document photos
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request camera permission:', error);
      return false;
    }
  }

  /**
   * Check if camera permission is granted
   */
  async hasCameraPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check camera permission:', error);
      return false;
    }
  }

  /**
   * Pick a document from the Files app
   * Supports PDF, images, and other document types
   */
  async pickDocument(childProfileId: string): Promise<DocumentUploadResult | null> {
    await this.initialize();

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return await this.processAndSaveDocument(
        asset.uri,
        asset.name,
        asset.mimeType || 'application/octet-stream',
        asset.size || 0,
        childProfileId
      );
    } catch (error) {
      console.error('Failed to pick document:', error);
      throw error;
    }
  }

  /**
   * Take a photo of a document using the camera
   */
  async captureDocumentPhoto(childProfileId: string): Promise<DocumentUploadResult | null> {
    await this.initialize();

    // Check/request permission
    const hasPermission = await this.hasCameraPermission();
    if (!hasPermission) {
      const granted = await this.requestCameraPermission();
      if (!granted) {
        throw new Error('Camera permission denied');
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const fileName = `document-${Date.now()}.jpg`;
      
      return await this.processAndSaveDocument(
        asset.uri,
        fileName,
        'image/jpeg',
        0, // Size will be calculated after copy
        childProfileId
      );
    } catch (error) {
      console.error('Failed to capture document photo:', error);
      throw error;
    }
  }

  /**
   * Upload a document to Supabase Storage (cloud/production and dev-supabase
   * variants), falling back to local-only storage if the upload fails or if
   * not running a Supabase variant at all. Mirrors photo-service.ts's
   * uploadOrSaveJpeg pattern.
   *
   * Previously this always only copied the file into the app's local
   * sandbox directory (FileSystem.documentDirectory) and left remoteUrl
   * unset, on every app variant including cloud/production. That local
   * path is tied to that specific install's container UUID - it doesn't
   * survive an app reinstall/update (iOS assigns a new container UUID) and
   * was never visible to any other device. Document rows with a local-only
   * filePath and no remoteUrl would permanently fail to open
   * ("Document file not found on device" in document-viewer.tsx) the
   * moment that local file stopped existing on whichever device happened
   * to open them - confirmed against real uploaded document rows, all of
   * which had remote_url = NULL despite running the Supabase/cloud
   * variant.
   *
   * Returns the local filePath as filePath if this device already has the
   * file locally cached (so it can still open instantly without a network
   * round trip) - remoteUrl is what makes it durable/cross-device, filePath
   * remains a same-device fast path.
   */
  private async uploadOrSaveDocument(
    localUri: string,
    fileName: string,
    mimeType: string
  ): Promise<{ filePath: string; remoteUrl?: string; fileSize: number }> {
    const useSupabase = Constants.expoConfig?.extra?.USE_SUPABASE_DB === 'true';

    // Always keep a local copy too (used as the same-device fast path in
    // document-viewer.tsx, and as the fallback if the upload below fails).
    const localFilePath = `${this.documentsDir}${fileName}`;
    await FileSystem.copyAsync({ from: localUri, to: localFilePath });
    const localFileInfo = await FileSystem.getInfoAsync(localFilePath);
    const fileSize = localFileInfo.exists && 'size' in localFileInfo ? localFileInfo.size : 0;

    if (!useSupabase) {
      return { filePath: localFilePath, fileSize };
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(localFilePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      console.log('[DocumentService] ✅ Uploaded to cloud:', data.path);
      return { filePath: localFilePath, remoteUrl: urlData.publicUrl, fileSize };
    } catch (uploadError) {
      console.error('[DocumentService] ❌ Upload failed, keeping local-only copy:', (uploadError as Error).message);
      // Local copy above already exists - fall through to local-only.
      return { filePath: localFilePath, fileSize };
    }
  }

  /**
   * Process and save a document
   * - Copies to app's document directory (and uploads to Supabase Storage
   *   when running a Supabase variant - see uploadOrSaveDocument above)
   * - Creates Document record in database
   * - Triggers text extraction
   */
  private async processAndSaveDocument(
    uri: string,
    fileName: string,
    mimeType: string,
    size: number,
    childProfileId: string
  ): Promise<DocumentUploadResult> {
    try {
      // Generate unique filename
      const documentId = uuidv4();
      const extension = this.getFileExtension(fileName, mimeType);
      const newFileName = `${documentId}${extension}`;

      const { filePath, remoteUrl, fileSize: uploadedFileSize } = await this.uploadOrSaveDocument(
        uri,
        newFileName,
        mimeType
      );
      const fileSize = uploadedFileSize || size;

      // Determine document type from mime type
      const documentType = this.getDocumentType(mimeType);

      // Create Document model
      const document: Document = {
        id: documentId,
        childProfileId,
        documentType,
        filePath,
        remoteUrl,
        fileName: fileName,
        fileSize,
        mimeType,
        extractionFailed: false,
        uploadedAt: new Date(),
      };

      // Save to database
      await databaseService.createDocument(document);

      // Trigger text extraction in background (don't await)
      this.extractTextInBackground(documentId, filePath, mimeType).catch(error => {
        console.error(`Background text extraction failed for ${documentId}:`, error);
      });

      return {
        document,
        localUri: filePath,
      };
    } catch (error) {
      console.error('Failed to process and save document:', error);
      throw error;
    }
  }

  /**
   * Extract text from document using backend service
   */
  private async extractTextInBackground(documentId: string, filePath: string, mimeType: string): Promise<void> {
    try {
      // Use backend URL from environment variable (production: Render, dev: local)
      const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://attune-backend-5hke.onrender.com';
      console.log(`📄 Starting text extraction for document ${documentId}...`);
      console.log(`   Backend URL: ${backendUrl}`);
      console.log(`   MIME type: ${mimeType}`);

      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log(`   File read as base64: ${base64Data.length} characters`);

      // Call backend API
      const url = `${backendUrl}/api/documents/extract-text`;
      console.log(`   Calling: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Data,
          mimeType,
        }),
      });

      console.log(`   Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   Backend error response: ${errorText}`);
        throw new Error(`Backend returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`   Result:`, result);

      if (result.success && result.text) {
        // Update document with extracted text
        await databaseService.updateDocument(documentId, {
          extractedText: result.text,
          extractionFailed: false,
        });
        console.log(`✅ Text extraction complete: ${result.characterCount} characters`);
      } else {
        throw new Error(result.error || 'Extraction failed');
      }
    } catch (error) {
      console.error('❌ Text extraction error:', error);
      // Mark as extraction failed
      await databaseService.updateDocument(documentId, {
        extractionFailed: true,
      });
    }
  }

  /**
   * Delete a document
   * Removes from both FileSystem and database
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document from database to get file path
      const document = await databaseService.getDocumentById(documentId);
      
      if (!document) {
        console.warn('Document not found in database:', documentId);
        return;
      }

      // Delete file from FileSystem
      try {
        await FileSystem.deleteAsync(document.filePath, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete document file:', error);
      }

      // Delete from database
      await databaseService.deleteDocument(documentId);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Get document info from FileSystem
   */
  async getDocumentInfo(filePath: string): Promise<FileSystem.FileInfo> {
    try {
      return await FileSystem.getInfoAsync(filePath, { md5: false });
    } catch (error) {
      console.error('Failed to get document info:', error);
      throw error;
    }
  }

  /**
   * Get document URI for display/opening
   */
  getDocumentUri(filePath: string): string {
    return filePath;
  }

  /**
   * Get file extension from filename or mime type
   */
  private getFileExtension(fileName: string, mimeType: string): string {
    // Try to get extension from filename
    const match = fileName.match(/\.[^.]+$/);
    if (match) {
      return match[0];
    }

    // Fallback to mime type
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
    };

    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Determine document type from mime type
   */
  private getDocumentType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (mimeType.includes('word')) {
      return 'word';
    }
    if (mimeType.includes('text')) {
      return 'text';
    }
    return 'other';
  }

  /**
   * Get human-readable document type label
   */
  getDocumentTypeLabel(document: Document): string {
    const labels: Record<string, string> = {
      'pdf': 'PDF Document',
      'image': 'Image',
      'word': 'Word Document',
      'text': 'Text Document',
      'other': 'Document',
    };

    return labels[document.documentType] || 'Document';
  }

  /**
   * Check if document is an image
   */
  isImage(document: Document): boolean {
    return document.documentType === 'image' || document.mimeType.startsWith('image/');
  }

  /**
   * Check if document is a PDF
   */
  isPDF(document: Document): boolean {
    return document.documentType === 'pdf' || document.mimeType === 'application/pdf';
  }

  /**
   * Get total storage used by documents
   */
  async getTotalStorageUsed(): Promise<number> {
    try {
      // Check if directory exists first
      try {
        await FileSystem.readDirectoryAsync(this.documentsDir);
      } catch {
        // Directory doesn't exist yet
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(this.documentsDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${this.documentsDir}${file}`;
        try {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists && 'size' in fileInfo) {
            totalSize += fileInfo.size;
          }
        } catch (error) {
          // Skip files that can't be read
          console.warn(`Could not read file: ${file}`, error);
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to calculate total storage:', error);
      return 0;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get document icon name based on type
   */
  getDocumentIcon(document: Document): string {
    const icons: Record<string, string> = {
      'pdf': 'file-pdf-box',
      'image': 'file-image',
      'word': 'file-word',
      'text': 'file-document',
      'other': 'file',
    };

    return icons[document.documentType] || 'file';
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId: string, updates: Partial<Document>): Promise<void> {
    try {
      await databaseService.updateDocument(documentId, updates);
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  }

  /**
   * Get documents by child profile
   */
  async getDocumentsByProfile(childProfileId: string): Promise<Document[]> {
    try {
      return await databaseService.getDocumentsByProfile(childProfileId);
    } catch (error) {
      console.error('Failed to get documents by profile:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned documents
   * Removes documents from FileSystem that don't have database records
   */
  async cleanupOrphanedDocuments(): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.documentsDir);
      let cleanedCount = 0;

      for (const file of files) {
        const documentId = file.split('.')[0];
        const filePath = `${this.documentsDir}${file}`;

        // Check if document exists in database
        const document = await databaseService.getDocumentById(documentId);
        
        if (!document) {
          // Orphaned file - delete it
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          cleanedCount++;
          console.log('Deleted orphaned document:', file);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup orphaned documents:', error);
      return 0;
    }
  }
}

// Singleton instance
export const documentService = new DocumentService();
