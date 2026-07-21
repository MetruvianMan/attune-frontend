/**
 * Helper utility for manually extracting text from documents
 * 
 * TEMPORARY SOLUTION until automated text extraction is implemented
 * 
 * How to use:
 * 1. Open your document (PDF, image, etc.) on your computer
 * 2. Copy the relevant text
 * 3. Run this in your app's developer console or add to a debug screen
 * 4. Paste the text when prompted
 * 
 * Example usage in app:
 * ```
 * import { manuallyExtractText } from './utils/extract-text-helper';
 * 
 * // In your component:
 * await manuallyExtractText('document-id-here', `
 *   Paste your document text here...
 * `);
 * ```
 */

import { databaseService } from '../services/database';

export async function manuallyExtractText(documentId: string, text: string): Promise<void> {
  try {
    await databaseService.updateDocument(documentId, {
      extractedText: text.trim(),
      extractionFailed: false,
    });
    console.log(`✅ Text extraction complete for document: ${documentId}`);
    console.log(`📝 Extracted ${text.length} characters`);
  } catch (error) {
    console.error('❌ Failed to extract text:', error);
    throw error;
  }
}

/**
 * Extract text for McCune Assessment document
 * Replace with actual document ID and text
 */
export async function extractMcCuneAssessmentText(): Promise<void> {
  // TODO: Replace with your actual document ID
  const documentId = 'your-document-id-here';
  
  // TODO: Replace with actual McCune Assessment text
  const text = `
McCune Assessment for Robbie

[Copy and paste the full text of the McCune Assessment here]

Verbal Abilities:
- [Assessment details about verbal abilities]
- [Communication skills]
- [Language development]

[Rest of the assessment text...]
  `;

  await manuallyExtractText(documentId, text);
}

/**
 * Quick helper to see all documents and their IDs
 */
export async function listDocuments(childProfileId: string): Promise<void> {
  const docs = await databaseService.getDocumentsByProfile(childProfileId);
  console.log('\n📄 All Documents:');
  docs.forEach((doc, index) => {
    console.log(`\n${index + 1}. ${doc.fileName}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Type: ${doc.documentType}`);
    console.log(`   Has text: ${doc.extractedText ? 'YES' : 'NO'}`);
    if (doc.extractedText) {
      console.log(`   Text length: ${doc.extractedText.length} characters`);
    }
  });
}
