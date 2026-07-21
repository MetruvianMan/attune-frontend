import * as FileSystem from 'expo-file-system/legacy';
import { databaseService } from './database';
import { Document } from '../models';

/**
 * Simple text extraction service for documents
 * For MVP: Manual extraction helper
 * TODO: Integrate with backend OCR/PDF parsing service
 */
export class TextExtractionService {
  /**
   * Manually add extracted text to a document
   * Use this as a workaround until automated extraction is implemented
   */
  async manuallySetExtractedText(documentId: string, extractedText: string): Promise<void> {
    try {
      await databaseService.updateDocument(documentId, {
        extractedText,
        extractionFailed: false,
      });
      console.log(`✅ Manually set extracted text for document ${documentId}`);
    } catch (error) {
      console.error('Failed to set extracted text:', error);
      throw error;
    }
  }

  /**
   * Mark document as extraction failed
   */
  async markExtractionFailed(documentId: string): Promise<void> {
    try {
      await databaseService.updateDocument(documentId, {
        extractionFailed: true,
      });
      console.log(`❌ Marked document ${documentId} as extraction failed`);
    } catch (error) {
      console.error('Failed to mark extraction as failed:', error);
      throw error;
    }
  }

  /**
   * Get all documents pending extraction
   */
  async getDocumentsPendingExtraction(childProfileId: string): Promise<Document[]> {
    try {
      const allDocs = await databaseService.getDocumentsByProfile(childProfileId);
      return allDocs.filter(d => 
        !d.extractedText && 
        !d.extractionFailed
      );
    } catch (error) {
      console.error('Failed to get documents pending extraction:', error);
      throw error;
    }
  }

  /**
   * Copy text from clipboard and set it as extracted text for a document
   * Useful workflow: Copy text from document viewer → paste into extraction
   */
  async setExtractedTextFromClipboard(documentId: string, clipboardText: string): Promise<void> {
    if (!clipboardText || clipboardText.trim().length === 0) {
      throw new Error('Clipboard text is empty');
    }

    await this.manuallySetExtractedText(documentId, clipboardText.trim());
  }
}

// Singleton instance
export const textExtractionService = new TextExtractionService();
