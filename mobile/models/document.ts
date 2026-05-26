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
}
