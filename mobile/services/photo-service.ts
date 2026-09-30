import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Photo } from '../models';
import { databaseService } from './database';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import { decode } from 'base64-arraybuffer';

export interface PhotoCaptureResult {
  photo: Photo;
  localUri: string;
  // Small (~300px) compressed copy of the photo, used for avatar-sized
  // display (e.g. the Circle tab's network graph) so callers don't have to
  // download/decode the full-size original just to render a small circle.
  // Same storage target as the main photo (Supabase Storage URL when cloud
  // sync is on, local file path otherwise). Undefined if thumbnail
  // generation/upload failed - callers should fall back to localUri.
  thumbnailUri?: string;
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
      // `size` used to be an opt-in option on older expo-file-system
      // versions; the currently-installed version's InfoOptions type no
      // longer has a `size` field at all - FileInfo now always includes
      // size (when the path exists) unconditionally, so passing the
      // option was a no-op even before it started failing to type-check.
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
   * Upload a locally-manipulated JPEG to Supabase Storage, falling back to
   * local FileSystem storage if the upload fails (or if not using Supabase
   * at all). Shared by both the full-size photo and the small thumbnail so
   * that fallback/error-handling logic doesn't have to be duplicated.
   */
  private async uploadOrSaveJpeg(
    localUri: string,
    fileName: string,
    useSupabase: boolean
  ): Promise<{ filePath: string; fileSize: number }> {
    if (useSupabase) {
      try {
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const arrayBuffer = decode(base64);

        const { data, error } = await supabase.storage
          .from('photos')
          .upload(fileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) {
          throw new Error(`Supabase upload failed: ${error.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        console.log('[PhotoService] ✅ Uploaded to cloud:', data.path);
        return { filePath: urlData.publicUrl, fileSize: arrayBuffer.byteLength };
      } catch (uploadError) {
        console.error('[PhotoService] ❌ Upload failed, falling back to local storage:', (uploadError as Error).message);
        // Fall through to local save below
      }
    }

    // Local storage (SQLite mode, or Supabase upload fallback)
    const filePath = `${this.photosDir}${fileName}`;
    await FileSystem.copyAsync({ from: localUri, to: filePath });
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
    console.log('[PhotoService] ℹ️ Saved locally:', filePath);
    return { filePath, fileSize };
  }

  /**
   * Process and save a photo
   * - Compresses to 80% JPEG quality
   * - Resizes to max 1920px width
   * - Also generates a small ~300px thumbnail (same 80% quality) for
   *   avatar-sized display contexts like the Circle tab's network graph,
   *   so those don't need to download/decode the full-size original just
   *   to render a ~100-130px circle
   * - Saves both to FileSystem (if local SQLite) OR uploads both to
   *   Supabase Storage (if cloud)
   * - Falls back to local storage if Supabase upload fails
   * - Creates Photo record in database
   */
  private async processAndSavePhoto(
    uri: string,
    originalWidth: number,
    originalHeight: number
  ): Promise<PhotoCaptureResult> {
    try {
      const useSupabase = Constants.expoConfig?.extra?.USE_SUPABASE_DB === 'true';
      console.log('[PhotoService] useSupabase:', useSupabase);

      // Compress and resize the full-size copy
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

      // Generate unique filenames (thumbnail gets its own file, not a
      // shared name, so it can be uploaded/served independently)
      const photoId = uuidv4();
      const fileName = `${photoId}.jpg`;
      const thumbnailFileName = `${photoId}_thumb.jpg`;

      const { filePath, fileSize } = await this.uploadOrSaveJpeg(compressed.uri, fileName, useSupabase);

      // Generate and save the small avatar-sized thumbnail. Best-effort:
      // if it fails for any reason, we still have the full-size photo, so
      // callers should fall back to that rather than fail the whole save.
      let thumbnailPath: string | undefined;
      try {
        const thumbnail = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 300 } }],
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        const thumbResult = await this.uploadOrSaveJpeg(thumbnail.uri, thumbnailFileName, useSupabase);
        thumbnailPath = thumbResult.filePath;
      } catch (thumbError) {
        console.error('[PhotoService] ⚠️ Thumbnail generation failed (non-fatal):', (thumbError as Error).message);
      }

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
        thumbnailUri: thumbnailPath,
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
      return await FileSystem.getInfoAsync(filePath, { md5: false });
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
