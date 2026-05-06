import * as fc from 'fast-check';
import type { ArchivedDocument, DocumentType } from '@src/models/index.js';

export function arbDocumentType(): fc.Arbitrary<DocumentType> {
  return fc.constantFrom<DocumentType>(
    'evaluation',
    'iep',
    'provider_report',
    'therapy_notes',
    'medical_record',
    'other',
  );
}

export function arbArchivedDocument(): fc.Arbitrary<ArchivedDocument> {
  return fc.record({
    id: fc.uuid(),
    childProfileId: fc.uuid(),
    documentType: arbDocumentType(),
    sourceProvider: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    documentDate: fc.option(fc.date(), { nil: undefined }),
    fileReference: fc.string({ minLength: 1, maxLength: 100 }),
    extractedText: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
    extractionFailed: fc.boolean(),
    uploadedAt: fc.date(),
  });
}
