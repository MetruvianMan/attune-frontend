/**
 * Temporary test script to manually trigger text extraction
 * for existing documents
 */

import { databaseService } from './services/database';
import { documentService } from './services/document-service';
import * as FileSystem from 'expo-file-system/legacy';

export async function testTextExtraction() {
  try {
    console.log('🧪 Starting text extraction test...');
    
    // Get backend URL
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    console.log(`   Backend URL: ${backendUrl}`);
    
    // Get all profiles
    const profiles = await databaseService.getAllChildProfiles();
    if (profiles.length === 0) {
      console.error('   No profiles found');
      return;
    }
    
    const profile = profiles[0];
    console.log(`   Profile: ${profile.name}`);
    
    // Get all documents for this profile
    const documents = await databaseService.getDocumentsByProfile(profile.id);
    console.log(`   Found ${documents.length} documents`);
    
    for (const doc of documents) {
      console.log(`\n   📄 Document: ${doc.fileName}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Type: ${doc.documentType}`);
      console.log(`      MIME: ${doc.mimeType}`);
      console.log(`      Path: ${doc.filePath}`);
      console.log(`      Has extracted text: ${!!doc.extractedText}`);
      console.log(`      Extraction failed: ${doc.extractionFailed}`);
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(doc.filePath);
      console.log(`      File exists: ${fileInfo.exists}`);
      
      if (!doc.extractedText && !doc.extractionFailed && fileInfo.exists) {
        console.log(`      ⚡ Triggering extraction...`);
        
        try {
          // Read file as base64
          const base64Data = await FileSystem.readAsStringAsync(doc.filePath, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log(`      Base64 length: ${base64Data.length}`);
          
          // Call backend
          const url = `${backendUrl}/api/documents/extract-text`;
          console.log(`      Calling: ${url}`);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64Data,
              mimeType: doc.mimeType,
            }),
          });
          
          console.log(`      Response status: ${response.status}`);
          const responseText = await response.text();
          console.log(`      Response: ${responseText.substring(0, 200)}...`);
          
          if (response.ok) {
            const result = JSON.parse(responseText);
            if (result.success && result.text) {
              await databaseService.updateDocument(doc.id, {
                extractedText: result.text,
                extractionFailed: false,
              });
              console.log(`      ✅ Success! Extracted ${result.characterCount} characters`);
            }
          } else {
            console.error(`      ❌ Failed: ${responseText}`);
          }
        } catch (error) {
          console.error(`      ❌ Error:`, error);
        }
      }
    }
    
    console.log('\n🧪 Test complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}
