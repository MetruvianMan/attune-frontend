# Text Extraction Setup Guide

## What We Built

A **backend text extraction service** that automatically extracts text from PDF documents when they're uploaded in the mobile app.

### Architecture:
```
Mobile App → Upload Document → Backend API → Extract Text → Return to Mobile → Save in Database
```

## Setup Instructions

### Step 1: Start the Backend Server

```bash
cd /Users/robertpassberger/~:Projects:attune-app/backend
npm install  # Install pdf-parse (already done)
npm run dev  # Start the server
```

You should see:
```
🚀 Attune backend running on http://localhost:3000
📊 Health check: http://localhost:3000/health
🎙️  Voice API: ✅ Ready
📄 Document extraction: ✅ Ready
```

### Step 2: Update Mobile .env for Local Testing

If testing on iOS Simulator or physical device, you need to use your computer's IP address (not `localhost`).

**Find your IP address:**
- **Mac**: System Preferences > Network > Select your connection > IP address (e.g., `192.168.1.100`)
- **Windows**: Open Command Prompt > Run `ipconfig` > Look for IPv4 Address

**Update `/mobile/.env`:**
```env
EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP_ADDRESS:3000
```

For example:
```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3000
```

### Step 3: Restart Mobile App

```bash
cd /Users/robertpassberger/~:Projects:attune-app/mobile
# Stop the current Expo server (Ctrl+C)
npm start
```

### Step 4: Test Text Extraction

1. Open the mobile app
2. Go to **Docs** tab
3. **Upload a PDF document** (your McCune Assessment)
4. Watch the backend console - you should see:
   ```
   📄 Extracting text from base64 data (application/pdf)
   ✅ Text extraction successful: 5432 characters
   ```
5. Go to **Chat** tab
6. The document should now show as ready (no "Text extraction pending..." message)
7. Ask: "Tell me about Robbie's verbal abilities"
8. AI should now reference the McCune Assessment!

## How It Works

### Mobile App (`document-service.ts`):
1. User uploads document
2. Document saved to local file system
3. **Background process starts**:
   - Read file as base64
   - Send to backend API
   - Receive extracted text
   - Update database with extracted text

### Backend API (`/api/documents/extract-text`):
- Receives base64-encoded PDF
- Uses `pdf-parse` library to extract text
- Returns extracted text to mobile app

## API Endpoints

### Extract Text from Single Document
```
POST http://localhost:3000/api/documents/extract-text
Content-Type: application/json

{
  "base64Data": "JVBERi0xLjQKJ...",
  "mimeType": "application/pdf"
}
```

**Response:**
```json
{
  "success": true,
  "text": "Extracted text content...",
  "pageCount": 5,
  "characterCount": 5432
}
```

### Extract Text from Multiple Documents
```
POST http://localhost:3000/api/documents/extract-text-batch
Content-Type: multipart/form-data

files[]: file1.pdf
files[]: file2.pdf
```

## Troubleshooting

### Issue: "Text extraction pending..." never goes away

**Check backend logs:**
```bash
# In backend terminal
# Look for extraction errors
```

**Common causes:**
1. Backend not running
2. Wrong BACKEND_URL in mobile/.env
3. Network issue (firewall blocking connection)

**Fix:**
- Make sure backend is running on port 3000
- Update BACKEND_URL to use your computer's IP address (not localhost)
- Check that mobile device/simulator can reach your computer

### Issue: Backend returns 400 error

**Check:**
- File size (must be < 10MB)
- MIME type (only PDF and TXT supported currently)
- Base64 encoding is valid

### Issue: Extraction succeeds but text is garbled

**Cause:** Some PDFs have text encoded as images (scanned documents)

**Solution:** Need OCR (Optical Character Recognition)
- Options: Google Vision API, AWS Textract, Azure Form Recognizer
- For now, manually copy/paste text from those documents

## Testing the Endpoint Directly

You can test the backend API directly:

```bash
# From the attune-app directory
curl -X POST http://localhost:3000/api/documents/extract-text \
  -H "Content-Type: application/json" \
  -d @test-document.json
```

Where `test-document.json` contains:
```json
{
  "base64Data": "...",
  "mimeType": "application/pdf"
}
```

## Production Deployment

For production, you'll want to:

1. **Deploy backend** to Render, Railway, or similar
2. **Update mobile app** with production backend URL
3. **Add authentication** to the extraction endpoint
4. **Add rate limiting** to prevent abuse
5. **Consider cloud storage** (S3, Google Cloud Storage) for documents
6. **Add OCR support** for scanned documents

## Next Steps

- ✅ Backend text extraction service (done)
- ✅ Mobile app integration (done)
- ✅ Automatic extraction on upload (done)
- 🔄 Test with real documents
- 📋 Add OCR for scanned documents (future)
- 🔐 Add authentication (future)
- ☁️  Deploy to production (future)
