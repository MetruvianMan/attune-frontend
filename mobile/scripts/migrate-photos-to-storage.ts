/**
 * Photo & Document Migration Script
 * 
 * This script uploads existing photos and documents from device storage
 * to Supabase Storage and updates the database with remote URLs.
 * 
 * Usage: Run this from within the mobile app (one-time migration)
 */

import { supabase } from '../services/supabase';
import { databaseService } from '../services/database';
import * as FileSystem from 'expo-file-system';

interface MigrationResult {
  photosProcessed: number;
  photosUploaded: number;
  photosFailed: number;
  documentsProcessed: number;
  documentsUploaded: number;
  documentsFailed: number;
  errors: string[];
}

/**
 * Upload a file to Supabase Storage
 */
async function uploadFileToStorage(
  localPath: string,
  bucket: 'photos' | 'documents',
  fileName: string
): Promise<string | null> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) {
      console.log(`File not found: ${localPath}`);
      return null;
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: fileInfo.uri.endsWith('.jpg') || fileInfo.uri.endsWith('.jpeg') 
          ? 'image/jpeg' 
          : fileInfo.uri.endsWith('.png')
          ? 'image/png'
          : 'application/octet-stream',
        upsert: false, // Don't overwrite if exists
      });

    if (error) {
      console.error(`Upload error for ${fileName}:`, error);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Failed to upload ${fileName}:`, error);
    return null;
  }
}

/**
 * Migrate all photos to Supabase Storage
 */
export async function migratePhotosToStorage(
  childProfileId: string,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<MigrationResult> {
  const result: MigrationResult = {
    photosProcessed: 0,
    photosUploaded: 0,
    photosFailed: 0,
    documentsProcessed: 0,
    documentsUploaded: 0,
    documentsFailed: 0,
    errors: [],
  };

  try {
    // Get all photos for this profile
    const photos = await databaseService.getPhotosByProfileId(childProfileId);
    const totalPhotos = photos.length;

    console.log(`Found ${totalPhotos} photos to migrate`);
    onProgress?.(0, totalPhotos, 'Starting photo migration...');

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      result.photosProcessed++;

      onProgress?.(
        i + 1,
        totalPhotos,
        `Uploading photo ${i + 1}/${totalPhotos}: ${photo.id}`
      );

      // Skip if already has remote URL
      if (photo.remoteUrl) {
        console.log(`Photo ${photo.id} already has remote URL, skipping`);
        result.photosUploaded++;
        continue;
      }

      // Generate unique filename
      const fileExtension = photo.filePath.split('.').pop() || 'jpg';
      const fileName = `${childProfileId}/${photo.id}.${fileExtension}`;

      // Upload to Supabase Storage
      const remoteUrl = await uploadFileToStorage(
        photo.filePath,
        'photos',
        fileName
      );

      if (remoteUrl) {
        // Update database with remote URL
        await supabase
          .from('photos')
          .update({ remote_url: remoteUrl })
          .eq('id', photo.id);

        result.photosUploaded++;
        console.log(`✅ Uploaded photo ${photo.id}: ${remoteUrl}`);
      } else {
        result.photosFailed++;
        result.errors.push(`Failed to upload photo ${photo.id}`);
        console.error(`❌ Failed to upload photo ${photo.id}`);
      }
    }

    onProgress?.(totalPhotos, totalPhotos, 'Photo migration complete!');
  } catch (error) {
    console.error('Photo migration error:', error);
    result.errors.push(`Photo migration error: ${error}`);
  }

  return result;
}

/**
 * Migrate all documents to Supabase Storage
 */
export async function migrateDocumentsToStorage(
  childProfileId: string,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<MigrationResult> {
  const result: MigrationResult = {
    photosProcessed: 0,
    photosUploaded: 0,
    photosFailed: 0,
    documentsProcessed: 0,
    documentsUploaded: 0,
    documentsFailed: 0,
    errors: [],
  };

  try {
    // Get all documents for this profile
    const documents = await databaseService.getDocumentsByProfile(childProfileId);
    const totalDocs = documents.length;

    console.log(`Found ${totalDocs} documents to migrate`);
    onProgress?.(0, totalDocs, 'Starting document migration...');

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      result.documentsProcessed++;

      onProgress?.(
        i + 1,
        totalDocs,
        `Uploading document ${i + 1}/${totalDocs}: ${doc.fileName}`
      );

      // Skip if already has remote URL
      if (doc.remoteUrl) {
        console.log(`Document ${doc.id} already has remote URL, skipping`);
        result.documentsUploaded++;
        continue;
      }

      // Generate unique filename
      const fileExtension = doc.fileName.split('.').pop() || 'pdf';
      const fileName = `${childProfileId}/${doc.id}.${fileExtension}`;

      // Upload to Supabase Storage
      const remoteUrl = await uploadFileToStorage(
        doc.filePath,
        'documents',
        fileName
      );

      if (remoteUrl) {
        // Update database with remote URL
        await supabase
          .from('documents')
          .update({ remote_url: remoteUrl })
          .eq('id', doc.id);

        result.documentsUploaded++;
        console.log(`✅ Uploaded document ${doc.id}: ${remoteUrl}`);
      } else {
        result.documentsFailed++;
        result.errors.push(`Failed to upload document ${doc.id}`);
        console.error(`❌ Failed to upload document ${doc.id}`);
      }
    }

    onProgress?.(totalDocs, totalDocs, 'Document migration complete!');
  } catch (error) {
    console.error('Document migration error:', error);
    result.errors.push(`Document migration error: ${error}`);
  }

  return result;
}

/**
 * Run complete migration for both photos and documents
 */
export async function runCompleteMigration(
  childProfileId: string,
  onProgress?: (message: string) => void
): Promise<MigrationResult> {
  onProgress?.('Starting migration...');

  // Migrate photos
  onProgress?.('Migrating photos...');
  const photoResult = await migratePhotosToStorage(
    childProfileId,
    (current, total, message) => onProgress?.(message)
  );

  // Migrate documents
  onProgress?.('Migrating documents...');
  const docResult = await migrateDocumentsToStorage(
    childProfileId,
    (current, total, message) => onProgress?.(message)
  );

  // Combine results
  const combined: MigrationResult = {
    photosProcessed: photoResult.photosProcessed,
    photosUploaded: photoResult.photosUploaded,
    photosFailed: photoResult.photosFailed,
    documentsProcessed: docResult.documentsProcessed,
    documentsUploaded: docResult.documentsUploaded,
    documentsFailed: docResult.documentsFailed,
    errors: [...photoResult.errors, ...docResult.errors],
  };

  onProgress?.('Migration complete!');
  return combined;
}
