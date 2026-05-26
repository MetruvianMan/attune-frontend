import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { Document } from '../models';
import { databaseService } from './database';

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
   * Process and save a document
   * - Copies to app's document directory
   * - Creates Document record in database
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
      const filePath = `${this.documentsDir}${newFileName}`;

      // Copy document to app's document directory
      await FileSystem.copyAsync({
        from: uri,
        to: filePath,
      });

      // Get actual file size
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : size;

      // Determine document type from mime type
      const documentType = this.getDocumentType(mimeType);

      // Create Document model
      const document: Document = {
        id: documentId,
        childProfileId,
        documentType,
        filePath,
        fileName: fileName,
        fileSize,
        mimeType,
        extractionFailed: false,
        uploadedAt: new Date(),
      };

      // Save to database
      await databaseService.createDocument(document);

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
      return await FileSystem.getInfoAsync(filePath);
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
      const dirInfo = await FileSystem.getInfoAsync(this.documentsDir);
      
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(this.documentsDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${this.documentsDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size;
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
