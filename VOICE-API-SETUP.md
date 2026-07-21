# Voice Logging Backend Setup

## Overview
Voice logging functionality has been implemented in the backend to support the mobile app. The web app continues to call OpenAI directly from the browser, while the mobile app now calls the backend API endpoints.

## Architecture
- **Web App**: Calls OpenAI APIs directly from browser (no change)
- **Mobile App**: Calls backend `/api/voice/*` endpoints  
- **Backend**: Proxies requests to OpenAI with API key stored securely in environment variables

## Backend Implementation

### New Files Created
1. **`backend/src/services/openai-service.ts`**
   - Handles OpenAI Whisper API calls for transcription
   - Handles OpenAI GPT API calls for event extraction
   - Securely manages API key from environment variables

2. **`backend/src/routes/voice.ts`**
   - `POST /api/voice/transcribe` - Upload audio file for transcription
   - `POST /api/voice/extract-events` - Extract structured events from transcript
   - Both endpoints require authentication via JWT token

3. **`backend/src/models/event.ts`**
   - TypeScript type definitions for all 45 event types

### Dependencies Installed
- `multer` - For handling multipart/form-data file uploads
- `form-data` - For sending files to OpenAI API
- `@types/multer` - TypeScript types

### Configuration Required

#### 1. Update `.env` file
Add your OpenAI API key to the backend `.env` file:
```bash
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

#### 2. Deploy to Render
The backend needs to be deployed to Render with the OpenAI API key configured:

1. Go to your Render dashboard
2. Navigate to your `attune-backend` service
3. Go to Environment tab
4. Add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-proj-your-actual-api-key-here`
5. Save and redeploy

## Mobile App Changes

### Reverted to Backend API Calls
The mobile app's `voice-service.ts` was reverted to use the backend API instead of calling OpenAI directly:

- `transcribe()` - POST to `/api/voice/transcribe` with audio file
- `extractEvents()` - POST to `/api/voice/extract-events` with transcript

### Authentication Required
The mobile app must have a valid JWT token to call voice endpoints. This means users need to:
1. Be logged in to the mobile app
2. Have valid authentication token from backend

**Note**: Authentication UI is not yet implemented in the mobile app. This will need to be added before voice logging can work.

## Testing Locally

### 1. Start Backend with OpenAI API Key
```bash
cd backend
# Make sure .env has OPENAI_API_KEY set
npm run dev
```

### 2. Test Endpoints
```bash
# Get authentication token first (login endpoint)
TOKEN="your-jwt-token-here"

# Test transcription (need actual audio file)
curl -X POST http://localhost:3000/api/voice/transcribe \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@recording.m4a"

# Test event extraction
curl -X POST http://localhost:3000/api/voice/extract-events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "He had a great day at school and then had a meltdown at dinner",
    "childProfileId": "test-profile-id"
  }'
```

## Next Steps

### Required for Mobile Voice Logging to Work
1. **Implement Mobile Authentication**
   - Create login screen in mobile app
   - Store JWT token securely
   - Handle token refresh

2. **Deploy Backend to Render**
   - Push backend changes to GitHub
   - Configure OPENAI_API_KEY environment variable in Render
   - Redeploy service

3. **Test End-to-End**
   - Login on mobile app
   - Record voice note
   - Verify transcription works
   - Verify event extraction works
   - Verify events are saved to database

### Future Enhancements
- Add rate limiting for voice endpoints
- Add audio file validation (format, size, duration)
- Add cost monitoring for OpenAI API usage
- Add caching for repeated transcriptions
- Add support for multiple languages

## Security Considerations
- ✅ API key stored in backend environment variables (not in mobile app)
- ✅ All voice endpoints require authentication
- ✅ File size limits enforced (25MB max)
- ✅ Audio file type validation
- ⚠️  Need to add rate limiting per user
- ⚠️  Need to add cost monitoring alerts

## Cost Estimation
OpenAI pricing (as of 2024):
- Whisper API: $0.006 per minute of audio
- GPT-4o-mini: ~$0.0015 per request (estimated)

For 100 voice notes per month (average 2 minutes each):
- Transcription: 200 minutes × $0.006 = $1.20/month
- Event extraction: 100 requests × $0.0015 = $0.15/month
- **Total: ~$1.35/month** for 100 voice notes
