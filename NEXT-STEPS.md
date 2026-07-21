# Voice Log 500 Error - Next Steps

## Current Status ✅

All diagnostics passed:
- ✅ Backend is running on port 3000
- ✅ IP address matches mobile .env config (10.0.0.226)
- ✅ OpenAI API key is valid and working
- ✅ Mobile app error handling is in place
- ✅ Backend error logging is in place

## The Problem

You're getting a 500 error, but we haven't seen the **actual backend error message** yet. The 500 error means the backend is crashing during the event extraction, but we need to see WHY.

## What You Need To Do Now 🎯

### Option 1: Test with Mobile App (Recommended)

1. **Open 2 terminals side by side:**
   - Terminal 1: Backend logs (`cd backend && npm run dev`)
   - Terminal 2: Mobile logs (where Expo is running)

2. **Try voice log in mobile app**

3. **Watch Terminal 1 (backend)** for these logs:
   ```
   POST /api/voice/transcribe-base64
   POST /api/voice/extract-events
   ❌ Event extraction error: [THE ACTUAL ERROR]
   ```

4. **Share the error message** from the backend terminal with me

### Option 2: Test Backend Directly (Faster)

Skip the mobile app and test the backend API directly:

```bash
cd /Users/robertpassberger/~:Projects:attune-app
./test-extract-events.sh
```

This will:
- Prompt for your login credentials
- Call `/api/voice/extract-events` directly
- Show you the response AND backend error logs

## Common Error Messages & Solutions

### "OpenAI API key is invalid"
- Key expired or revoked
- Solution: Get new key from https://platform.openai.com/api-keys

### "You exceeded your current quota"
- OpenAI account has no credits
- Solution: Add payment method at https://platform.openai.com/account/billing

### "Rate limit exceeded"
- Too many requests to OpenAI
- Solution: Wait a few minutes and try again

### "Model 'gpt-4o-mini' not available"
- Model access issue (unlikely)
- Solution: Check OpenAI dashboard for model access

### "Timeout" or "ECONNREFUSED"
- Can't reach OpenAI API
- Solution: Check internet connection

## Files Created for You

1. **`VOICE-LOG-DIAGNOSTICS.md`** - Complete troubleshooting guide
2. **`diagnose.sh`** - Quick diagnostic script (already ran successfully)
3. **`test-extract-events.sh`** - Direct API testing script
4. **`backend/test-openai.js`** - OpenAI connection tester (already ran successfully)

## What Happens Next

Once you share the actual backend error message:
- I can give you the exact solution
- It's likely one of the common issues above
- We'll fix it in < 5 minutes

## Quick Commands Reference

```bash
# Run all diagnostics
./diagnose.sh

# Test backend API directly (faster)
./test-extract-events.sh

# Start backend with visible logs
cd backend && npm run dev

# Test OpenAI connection
cd backend && node test-openai.js

# Check your IP address
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

**TL;DR:** Everything is configured correctly. We just need to see the actual error from the backend logs when you try the voice log. Run `./test-extract-events.sh` or try voice log with backend terminal visible, then share the error message.
