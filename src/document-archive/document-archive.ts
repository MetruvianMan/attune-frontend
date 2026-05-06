import type { DataStore } from '@src/data-store/data-store.js';
import type { NLPPipeline } from '@src/nlp-pipeline/nlp-pipeline.js';
import type {
  ArchivedDocument,
  DocumentMetadata,
  DocumentFilter,
} from '@src/models/index.js';
import { extractTextFromFile } from './extract-text.js';

export interface DocumentArchive {
  uploadDocument(
    file: File,
    metadata: DocumentMetadata,
    childProfileId: string,
  ): Promise<ArchivedDocument>;

  getDocuments(childProfileId: string, filter?: DocumentFilter): ArchivedDocument[];
  deleteDocument(documentId: string): void;
  getExtractedText(documentId: string): string | null;
}

export class DocumentArchiveImpl implements DocumentArchive {
  private dataStore: DataStore;
  private nlpPipeline: NLPPipeline;

  constructor(dataStore: DataStore, nlpPipeline: NLPPipeline) {
    this.dataStore = dataStore;
    this.nlpPipeline = nlpPipeline;
  }

  /**
   * Upload a document, attempt text extraction, and persist to DataStore.
   *
   * - Generates a UUID for the document
   * - Attempts text extraction via NLPPipeline.extractDocumentText
   * - If extraction fails or returns null, sets extractionFailed=true
   * - Stores the filename as the file reference (MVP approach)
   * - Persists to DataStore and returns the ArchivedDocument
   */
  async uploadDocument(
    file: File,
    metadata: DocumentMetadata,
    childProfileId: string,
  ): Promise<ArchivedDocument> {
    let extractedText: string | undefined;
    let extractionFailed = false;

    try {
      const result = await extractTextFromFile(file);
      if (result !== null && result.trim().length > 0) {
        extractedText = result;
      } else {
        extractionFailed = true;
      }
    } catch {
      extractionFailed = true;
    }

    const doc: ArchivedDocument = {
      id: crypto.randomUUID(),
      childProfileId,
      documentType: metadata.documentType,
      sourceProvider: metadata.sourceProvider,
      documentDate: metadata.documentDate,
      fileReference: metadata.fileReference || file.name,
      extractedText,
      extractionFailed,
      uploadedAt: new Date(),
    };

    this.dataStore.saveArchivedDocument(doc);
    return doc;
  }

  /**
   * Get documents for a child profile with optional filtering.
   * Delegates to DataStore.getArchivedDocuments.
   */
  getDocuments(childProfileId: string, filter?: DocumentFilter): ArchivedDocument[] {
    return this.dataStore.getArchivedDocuments(childProfileId, filter);
  }

  /**
   * Delete a document by ID.
   * Delegates to DataStore.deleteArchivedDocument.
   */
  deleteDocument(documentId: string): void {
    this.dataStore.deleteArchivedDocument(documentId);
  }

  /**
   * Get the extracted text for a document by ID.
   * Returns the extractedText field or null if not available.
   */
  getExtractedText(documentId: string): string | null {
    // We need to find the document. Since DataStore.getArchivedDocuments requires
    // a childProfileId, we search through all profiles.
    const profiles = this.dataStore.listChildProfiles();
    for (const profile of profiles) {
      const docs = this.dataStore.getArchivedDocuments(profile.id);
      const doc = docs.find((d) => d.id === documentId);
      if (doc) {
        return doc.extractedText ?? null;
      }
    }
    return null;
  }
}
