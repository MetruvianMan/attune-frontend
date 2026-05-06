export type DocumentType =
  | 'evaluation'
  | 'iep'
  | 'provider_report'
  | 'therapy_notes'
  | 'medical_record'
  | 'other';

export interface ArchivedDocument {
  id: string;
  childProfileId: string;
  documentType: DocumentType;
  sourceProvider?: string;
  documentDate?: Date;
  fileReference: string;
  extractedText?: string;
  extractionFailed: boolean;
  uploadedAt: Date;
}

export interface DocumentMetadata {
  documentType: DocumentType;
  sourceProvider?: string;
  documentDate?: Date;
  fileReference?: string;
}

export interface DocumentFilter {
  documentType?: DocumentType;
  sortBy?: 'date' | 'upload_date';
  sortOrder?: 'asc' | 'desc';
}
