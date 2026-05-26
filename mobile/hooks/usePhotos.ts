import { useState, useCallback } from 'react';
import { photoService, PhotoCaptureResult, PhotoPickerOptions } from '../services/photo-service';
import { Photo } from '../models';

export interface UsePhotosReturn {
  isLoading: boolean;
  error: string | null;
  capturePhoto: (options?: PhotoPickerOptions) => Promise<PhotoCaptureResult | null>;
  pickFromLibrary: (options?: PhotoPickerOptions) => Promise<PhotoCaptureResult | null>;
  pickMultiple: (options?: PhotoPickerOptions) => Promise<PhotoCaptureResult[]>;
  deletePhoto: (photoId: string) => Promise<void>;
  clearError: () => void;
}

export function usePhotos(): UsePhotosReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capturePhoto = useCallback(async (options?: PhotoPickerOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await photoService.capturePhoto(options);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to capture photo';
      setError(errorMessage);
      console.error('Capture photo error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickFromLibrary = useCallback(async (options?: PhotoPickerOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await photoService.pickFromLibrary(options);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to pick photo';
      setError(errorMessage);
      console.error('Pick photo error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickMultiple = useCallback(async (options?: PhotoPickerOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await photoService.pickMultipleFromLibrary(options);
      return results;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to pick photos';
      setError(errorMessage);
      console.error('Pick multiple photos error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePhoto = useCallback(async (photoId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await photoService.deletePhoto(photoId);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete photo';
      setError(errorMessage);
      console.error('Delete photo error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    capturePhoto,
    pickFromLibrary,
    pickMultiple,
    deletePhoto,
    clearError,
  };
}
