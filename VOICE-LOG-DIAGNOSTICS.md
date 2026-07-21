# Voice Log 500 Error - Complete Diagnostics

## Problem Summary
Getting "Event extraction failed: Request failed with status code 500" when using voice logging in Attune mobile app.

## Root Cause Analysis
The mobile app is configured to connect to your local backend at `http://10.0.0.226:3000`, but the 500 error suggests either:
1. Backend is not running
2. Backend is running but can't be reached from your mobile device
3. Backend OpenAI API call is failing for some reason

## Verified Working ✅
- ✅ OpenAI API key is valid and working (tested with `test-openai.js`)
- ✅ Backend `/voice/extract-events` endpoint has proper error handling
- ✅ Mobile app has correct error logging and timeout configuration
- ✅ Mobile `.env` has local backend URL configured: `http://10.0.0.226:3000`

## Diagnostic Steps

### Step 1: Verify Backend is Running

```bash
cd /Users/robertpassberger/~:Projects:attune-app/backend
npm run dev
```

**Expected output:**
```
✓ Built in XXXms
Server running on port 3000
```

**Keep this terminal open** - you need to see the backend logs when the mobile app makes requests.

### Step 2: Test Backend from Your Computer

Open a new terminal and test the backend locally:

```bash
# Test 1: Check backend is responding
curl http://localhost:3000/api/health

# Test 2: Login to get a token (replace with your actual credentials)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Test 3: Test event extraction endpoint
curl -X POST http://localhost:3000/api/voice/extract-events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "transcript": "Robbie had a great day today. He played outside and was very helpful.",
    "childProfileId": "1"
  }'
```

**Expected:** Should return JSON with extracted events.

### Step 3: Test Backend from Mobile Device Network

Your mobile device needs to reach the backend at `http://10.0.0.226:3000`. Test this:

```bash
# On your computer, find your current IP address
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Verify:**
- Is `10.0.0.226` still your current IP?
- If not, update `/Users/robertpassberger/~:Projects:attune-app/mobile/.env` with the new IP
- Restart Expo after changing `.env`

### Step 4: Check Firewall Settings (macOS)

Your Mac firewall might be blocking incoming connections:

1. Go to **System Preferences > Security & Privacy > Firewall**
2. If Firewall is ON, click "Firewall Options"
3. Make sure Node.js or your terminal app is allowed to accept incoming connections
4. Or temporarily disable firewall for testing

### Step 5: Try Voice Log with Backend Logs Visible

1. Make sure backend is running (`npm run dev`) in a visible terminal
2. Open Attune mobile app
3. Try a voice log
4. **Watch the backend terminal** for incoming requests and errors

**Look for:**
- `POST /api/voice/transcribe-base64` - transcription request
- `POST /api/voice/extract-events` - event extraction request
- Any error messages in red

### Step 6: Check Mobile App Logs

In your mobile app terminal (where Expo is running), look for:
- Network errors (ECONNREFUSED, ERR_NETWORK)
- Axios error details
- HTTP status codes

## Common Issues & Solutions

### Issue 1: Backend Not Running
**Symptoms:** 
- Mobile shows "Cannot reach server" error
- No logs appear in backend terminal

**Solution:**
```bash
cd /Users/robertpassberger/~:Projects:attune-app/backend
npm run dev
```

### Issue 2: Wrong IP Address
**Symptoms:**
- Mobile can't connect to backend
- ERR_NETWORK or ECONNREFUSED errors

**Solution:**
1. Find your current IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Update `mobile/.env` with new IP
3. Restart Expo: Kill and restart `npm start` in mobile folder

### Issue 3: Firewall Blocking
**Symptoms:**
- Backend is running
- IP is correct
- Still can't connect from mobile

**Solution:**
- Temporarily disable macOS firewall
- Or add Node.js to allowed apps in Firewall settings

### Issue 4: OpenAI API Key Invalid on Production
**Symptoms:**
- Works locally but fails on production Render backend

**Solution:**
You need to set the `OPENAI_API_KEY` environment variable on your Render backend:
1. Go to https://dashboard.render.com
2. Find your attune-backend service
3. Go to Environment tab
4. Add `OPENAI_API_KEY` with your key
5. Save changes (will trigger redeploy)

## Quick Test Script

Run this to test everything at once:

```bash
#!/bin/bash
echo "🔍 Attune Backend Diagnostic"
echo ""

# Check if backend is running
echo "1. Checking if backend is running on port 3000..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "   ✅ Backend is running"
else
  echo "   ❌ Backend is NOT running - start it with 'cd backend && npm run dev'"
  exit 1
fi

# Check IP address
echo ""
echo "2. Your current IP addresses:"
ifconfig | grep "inet " | grep -v 127.0.0.1

echo ""
echo "3. Mobile .env is configured for:"
grep EXPO_PUBLIC_BACKEND_URL mobile/.env

echo ""
echo "4. If IPs don't match, update mobile/.env and restart Expo"
echo ""
echo "5. Try voice log now and watch backend terminal for errors"
```

Save as `diagnose.sh`, make executable (`chmod +x diagnose.sh`), and run: `./diagnose.sh`

## Still Not Working?

If you've tried all the above and still getting 500 errors:

1. **Share the backend terminal output** - What appears when you try the voice log?
2. **Share the mobile terminal output** - What's the full error stack?
3. **Try the curl test** from Step 2 - Does direct API call work?

The backend logs will show the ACTUAL error from OpenAI, which will help us fix it.
