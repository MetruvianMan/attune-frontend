# Quick Fix: Add Text Extraction to Documents

## Problem
Documents show "Text extraction pending..." and aren't being used in Chat AI responses.

## Immediate Solution (SQL)

### Step 1: Find your document ID

Run this query in your SQLite database (`mobile/dev.db` or wherever your SQLite database is):

```sql
SELECT id, file_name, document_type, source_provider 
FROM documents 
WHERE child_profile_id = 'default-profile-id';
```

This will show you all documents and their IDs.

### Step 2: Add extracted text

Copy the text from your McCune Assessment PDF (open it, select all, copy), then run:

```sql
UPDATE documents 
SET extracted_text = '
[PASTE YOUR DOCUMENT TEXT HERE - the entire McCune Assessment text]

For example:
McCune Assessment
Child: Robbie
Date: [date]

Verbal Abilities:
According to the assessment, Robbie demonstrates...
[etc - paste the full text]
'
WHERE id = 'your-document-id-from-step-1';
```

### Step 3: Verify

```sql
SELECT file_name, LENGTH(extracted_text) as text_length 
FROM documents 
WHERE id = 'your-document-id';
```

You should see a text_length greater than 0.

### Step 4: Reload the app

Close and reopen the mobile app. The Chat tab should now use the document text!

---

## Alternative: Using Expo

If you have access to the Expo CLI while running the app:

1. Press `d` to open the developer menu
2. Enable "Debug JS Remotely" or "Hermes Debugger"
3. Open Chrome DevTools Console
4. Run:

```javascript
// First, find your documents
const databaseService = require('./services/database').databaseService;
await databaseService.initialize();

const docs = await databaseService.getDocumentsByProfile('default-profile-id');
console.log('Documents:', docs);

// Find your McCune Assessment document ID
const mcCuneDoc = docs.find(d => d.fileName.includes('McCune'));
console.log('McCune Assessment ID:', mcCuneDoc?.id);

// Add the extracted text
await databaseService.updateDocument(mcCuneDoc.id, {
  extractedText: `
[Paste full McCune Assessment text here]
  `,
  extractionFailed: false
});

console.log('✅ Text extraction complete!');
```

---

## Long-term Solution

For production, you'll want to implement one of these:

### Option A: Cloud Function (Recommended)
- Upload document to cloud storage (S3, Google Cloud Storage)
- Trigger cloud function that:
  - Extracts text using OCR service (Google Vision API, AWS Textract, Azure Form Recognizer)
  - Updates database with extracted text
- Mobile app syncs to get updated document

### Option B: On-device Extraction
- Use React Native libraries like `react-native-pdf` or `expo-document-picker` with OCR
- Limited accuracy, slower, drains battery
- Not recommended for production

### Option C: Backend Service
- Send document to your backend API
- Backend uses PDF parsing library (Python: PyPDF2, pdfplumber; Node.js: pdf-parse)
- Returns extracted text to mobile app
- Mobile app saves to local database

---

## For Now: Manual Process

Until you implement automated extraction:

1. When a document is uploaded in the Docs tab, note its filename
2. Open that document on your computer
3. Copy all the text (Cmd+A, Cmd+C)
4. Use one of the methods above to update the database
5. Reload the app

This is tedious but works for testing the Chat feature with real document content!
