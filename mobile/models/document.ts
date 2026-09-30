export interface Document {
  id: string;
  childProfileId: string;
  documentType: string;
  sourceProvider?: string;
  documentDate?: Date;
  filePath: string;
  remoteUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  extractionFailed: boolean;
  uploadedAt: Date;
  /**
   * Whether this document has been synced to the backend - the documents
   * table has always tracked this (see database.ts's getUnsyncedDocuments/
   * markDocumentsSynced), but it was never exposed on this model until
   * now. Optional for the same reason as Event.synced (see event.ts).
   */
  synced?: boolean;
}
