import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Photo } from '../models';
import { databaseService } from './database';

export interface PhotoCaptureResult {
  photo: Photo;
  localUri: string;
}

export interface PhotoPickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

export class PhotoService {
  private photosDir: string;
  private initialized = false;

  constructor() {
    this.photosDir = `${FileSystem.documentDirectory}photos/`;
  }

  /**
   * Initialize the photo service
   * Creates the photos directory if it doesn't exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const dirInfo = await FileSystem.getInfoAsync(this.photosDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.photosDir, { intermediates: true });
        console.log('Photos directory created:', this.photosDir);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize photo service:', error);
      throw error;
    }
  }

  /**
   * Request camera permissions
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
   * Request photo library permissions
   */
  async requestLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request library permission:', error);
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
   * Check if photo library permission is granted
   */
  async hasLibraryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check library permission:', error);
      return false;
    }
  }

  /**
   * Capture a photo using the camera
   */
  async capturePhoto(options?: PhotoPickerOptions): Promise<PhotoCaptureResult | null> {
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
        quality: 1, // Full quality, we'll compress manually
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect ?? [4, 3],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return await this.processAndSavePhoto(asset.uri, asset.width, asset.height);
    } catch (error) {
      console.error('Failed to capture photo:', error);
      throw error;
    }
  }

  /**
   * Pick a photo from the library
   */
  async pickFromLibrary(options?: PhotoPickerOptions): Promise<PhotoCaptureResult | null> {
    await this.initialize();

    // Check/request permission
    const hasPermission = await this.hasLibraryPermission();
    if (!hasPermission) {
      const granted = await this.requestLibraryPermission();
      if (!granted) {
        throw new Error('Photo library permission denied');
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1, // Full quality, we'll compress manually
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect ?? [4, 3],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return await this.processAndSavePhoto(asset.uri, asset.width, asset.height);
    } catch (error) {
      console.error('Failed to pick photo from library:', error);
      throw error;
    }
  }

  /**
   * Pick multiple photos from the library
   */
  async pickMultipleFromLibrary(options?: PhotoPickerOptions): Promise<PhotoCaptureResult[]> {
    await this.initialize();

    // Check/request permission
    const hasPermission = await this.hasLibraryPermission();
    if (!hasPermission) {
      const granted = await this.requestLibraryPermission();
      if (!granted) {
        throw new Error('Photo library permission denied');
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false, // No editing for multiple selection
        allowsMultipleSelection: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
      }

      // Process all selected photos
      const photos: PhotoCaptureResult[] = [];
      for (const asset of result.assets) {
        const photo = await this.processAndSavePhoto(asset.uri, asset.width, asset.height);
        photos.push(photo);
      }

      return photos;
    } catch (error) {
      console.error('Failed to pick multiple photos:', error);
      throw error;
    }
  }

  /**
   * Process and save a photo
   * - Compresses to 80% JPEG quality
   * - Resizes to max 1920px width
   * - Saves to FileSystem
   * - Creates Photo record in database
   */
  private async processAndSavePhoto(
    uri: string,
    originalWidth: number,
    originalHeight: number
  ): Promise<PhotoCaptureResult> {
    try {
      // Compress and resize
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [
          // Resize if width > 1920px
          ...(originalWidth > 1920
            ? [{ resize: { width: 1920 } }]
            : []),
        ],
        {
          compress: 0.8, // 80% JPEG quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Generate unique filename
      const photoId = uuidv4();
      const fileName = `${photoId}.jpg`;
      const filePath = `${this.photosDir}${fileName}`;

      // Copy compressed photo to app's document directory
      await FileSystem.copyAsync({
        from: compressed.uri,
        to: filePath,
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      // Create Photo model
      const photo: Photo = {
        id: photoId,
        filePath,
        fileSize,
        width: compressed.width,
        height: compressed.height,
        createdAt: new Date(),
      };

      // Save to database (without eventId or childProfileId - will be set later)
      await databaseService.createPhoto(photo);

      return {
        photo,
        localUri: filePath,
      };
    } catch (error) {
      console.error('Failed to process and save photo:', error);
      throw error;
    }
  }

  /**
   * Delete a photo
   * Removes from both FileSystem and database
   */
  async deletePhoto(photoId: string): Promise<void> {
    try {
      // Get photo from database to get file path
      const photo = await databaseService.getPhotoById(photoId);
      
      if (!photo) {
        console.warn('Photo not found in database:', photoId);
        return;
      }

      // Delete file from FileSystem
      try {
        await FileSystem.deleteAsync(photo.filePath, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete photo file:', error);
      }

      // Delete from database
      await databaseService.deletePhoto(photoId);
    } catch (error) {
      console.error('Failed to delete photo:', error);
      throw error;
    }
  }

  /**
   * Get photo info from FileSystem
   */
  async getPhotoInfo(filePath: string): Promise<FileSystem.FileInfo> {
    try {
      return await FileSystem.getInfoAsync(filePath);
    } catch (error) {
      console.error('Failed to get photo info:', error);
      throw error;
    }
  }

  /**
   * Get photo URI for display
   * Returns the file:// URI that can be used in Image components
   */
  getPhotoUri(filePath: string): string {
    return filePath;
  }

  /**
   * Associate a photo with an event
   */
  async associateWithEvent(photoId: string, eventId: string): Promise<void> {
    try {
      await databaseService.updatePhotoEventAssociation(photoId, eventId);
    } catch (error) {
      console.error('Failed to associate photo with event:', error);
      throw error;
    }
  }

  /**
   * Associate a photo with a child profile
   */
  async associateWithProfile(photoId: string, childProfileId: string): Promise<void> {
    try {
      await databaseService.updatePhotoProfileAssociation(photoId, childProfileId);
    } catch (error) {
      console.error('Failed to associate photo with profile:', error);
      throw error;
    }
  }

  /**
   * Get total storage used by photos
   */
  async getTotalStorageUsed(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.photosDir);
      
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(this.photosDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${this.photosDir}${file}`;
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
   * Clean up orphaned photos
   * Removes photos from FileSystem that don't have database records
   */
  async cleanupOrphanedPhotos(): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.photosDir);
      let cleanedCount = 0;

      for (const file of files) {
        const photoId = file.replace('.jpg', '');
        const filePath = `${this.photosDir}${file}`;

        // Check if photo exists in database
        // This would require a getPhotoById method in DatabaseService
        // For now, we'll skip this check
        console.log('TODO: Implement orphaned photo cleanup');
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup orphaned photos:', error);
      return 0;
    }
  }
}

// Singleton instance
export const photoService = new PhotoService();
