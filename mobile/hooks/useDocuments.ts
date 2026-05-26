import { useState, useCallback } from 'react';
import { documentService, DocumentUploadResult } from '../services/document-service';
import { Document } from '../models';

export interface UseDocumentsReturn {
  isLoading: boolean;
  error: string | null;
  pickDocument: (childProfileId: string) => Promise<DocumentUploadResult | null>;
  captureDocumentPhoto: (childProfileId: string) => Promise<DocumentUploadResult | null>;
  deleteDocument: (documentId: string) => Promise<void>;
  getDocuments: (childProfileId: string) => Promise<Document[]>;
  clearError: () => void;
}

export function useDocuments(): UseDocumentsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickDocument = useCallback(async (childProfileId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await documentService.pickDocument(childProfileId);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to pick document';
      setError(errorMessage);
      console.error('Pick document error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const captureDocumentPhoto = useCallback(async (childProfileId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await documentService.captureDocumentPhoto(childProfileId);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to capture document photo';
      setError(errorMessage);
      console.error('Capture document photo error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await documentService.deleteDocument(documentId);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete document';
      setError(errorMessage);
      console.error('Delete document error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDocuments = useCallback(async (childProfileId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const documents = await documentService.getDocumentsByProfile(childProfileId);
      return documents;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get documents';
      setError(errorMessage);
      console.error('Get documents error:', err);
      return [];
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
    pickDocument,
    captureDocumentPhoto,
    deleteDocument,
    getDocuments,
    clearError,
  };
}
