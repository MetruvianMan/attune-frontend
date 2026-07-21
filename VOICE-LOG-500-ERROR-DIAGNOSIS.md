# Voice Log 500 Error - Complete Diagnosis

**Error**: Request failed with status code 500  
**Location**: `VoiceService#extractEvents` in voice-service.ts (line 241:20)  
**Date**: July 16, 2026

---

## 🔍 Root Cause Analysis

The 500 error means your **backend server is running** but **crashing** when trying to process the voice log. Based on the code, this happens during the OpenAI API call in `openai-service.ts`.

### Most Likely Causes (in order):

1. **❌ Missing OPENAI_API_KEY** (90% probability)
   - Backend tries to create OpenAI client
   - No API key in environment
   - Throws error: "OPENAI_API_KEY not set"

2. **❌ Invalid OpenAI API Key** (5% probability)
   - API key is set but invalid
   - OpenAI rejects the request

3. **❌ OpenAI API Quota Exceeded** (3% probability)
   - API key valid but no credits/quota left
   - OpenAI returns 429 error

4. **❌ OpenAI API is Down** (2% probability)
   - Temporary service outage

---

## ✅ Step-by-Step Fix

### **Step 1: Check Backend Logs**

Your backend should show detailed error logs. Look for:

```bash
# In your backend terminal, you should see:
❌ Event extraction error: Error: OPENAI_API_KEY not set
# OR
❌ Event extraction error: Error: Invalid API key
# OR
❌ Event extraction error: Error: Rate limit exceeded
```

**Action**: Check your backend terminal/console for the actual error message.

---

### **Step 2: Verify OPENAI_API_KEY**

The backend expects an environment variable `OPENAI_API_KEY`.

#### **Check if it exists:**

```bash
# Go to backend directory
cd /Users/robertpassberger/~:Projects:attune-app/backend

# Check .env file
cat .env | grep OPENAI_API_KEY

# OR check environment
echo $OPENAI_API_KEY
```

#### **If missing, add it:**

1. **Get an OpenAI API key**:
   - Go to https://platform.openai.com/api-keys
   - Create a new key or copy existing one

2. **Add to backend .env**:
   ```bash
   cd /Users/robertpassberger/~:Projects:attune-app/backend
   
   # Create or edit .env file
   echo "OPENAI_API_KEY=sk-your-actual-key-here" >> .env
   ```

3. **Restart backend server**:
   ```bash
   # Stop the backend (Ctrl+C)
   # Start it again
   npm run dev
   # OR
   npm start
   ```

---

### **Step 3: Verify API Key is Valid**

Test your OpenAI API key:

```bash
# Replace sk-xxx with your actual key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-actual-key-here" | head -20

# Should show a list of models
# If error, key is invalid
```

---

### **Step 4: Check OpenAI Quota**

```bash
# Check your OpenAI usage
# Go to: https://platform.openai.com/usage

# Verify you have credits available
# If $0.00 remaining, add credits or upgrade plan
```

---

### **Step 5: Test the Fix**

1. **Restart backend** with OPENAI_API_KEY set
2. **Try voice log again** in the mobile app
3. **Check logs** to verify it works:

```bash
# Backend should show:
🔍 Extracting events from transcript (123 chars) for child abc-123
✅ Extracted 2 events successfully
```

---

## 🛠️ Alternative: Check Backend Environment

### **If using dotenv:**

Make sure your backend loads .env:

```typescript
// At top of backend/src/index.ts or main entry file
import 'dotenv/config';
// OR
import dotenv from 'dotenv';
dotenv.config();
```

### **If using process.env directly:**

Set environment variable when starting server:

```bash
# Option 1: Inline
OPENAI_API_KEY=sk-xxx npm run dev

# Option 2: Export first
export OPENAI_API_KEY=sk-xxx
npm run dev
```

---

## 🧪 Test Backend Directly

You can test the backend endpoint directly to see the exact error:

```bash
# Get auth token from your app (check mobile logs or auth service)
AUTH_TOKEN="your-jwt-token-here"

# Test extract-events endpoint
curl -X POST http://localhost:3000/api/voice/extract-events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "transcript": "Robbie had a great day at school today",
    "childProfileId": "test-123"
  }'

# Should return:
# {"events":[...], "diaryEntry": "..."}

# If error, will show exact error message
```

---

## 📋 Complete Checklist

- [ ] Backend server is running
- [ ] Backend logs show the actual error (check terminal)
- [ ] OPENAI_API_KEY exists in backend/.env file
- [ ] OPENAI_API_KEY value starts with "sk-"
- [ ] OpenAI API key is valid (test with curl)
- [ ] OpenAI account has available credits/quota
- [ ] Backend was restarted after adding API key
- [ ] Mobile app tried voice log again
- [ ] Backend logs show success: "✅ Extracted X events"

---

## 🎯 Quick Fix Commands

```bash
# 1. Go to backend
cd /Users/robertpassberger/~:Projects:attune-app/backend

# 2. Check if .env exists
ls -la .env

# 3. Add OPENAI_API_KEY (replace with your key)
echo "OPENAI_API_KEY=sk-your-key-here" >> .env

# 4. Restart backend
# Stop with Ctrl+C, then:
npm run dev

# 5. Try voice log in mobile app again
```

---

## 📊 What the Mobile App Now Shows

After my fix, when you get a 500 error, you'll see:

```
⚠️ Server Error

The backend encountered an issue. Common causes:

• OpenAI API key not configured
• OpenAI API quota exceeded
• Backend database connection failed
• Invalid transcript format

Check backend server logs for details.

[🎙️ Try Again]
```

This tells you to check the backend logs for the actual error.

---

## 🔧 Backend Code Fix (Optional)

If you want even better error messages, add this to `openai-service.ts`:

```typescript
private getClient(): OpenAI {
  if (!this.client) {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      const detailedError = 'OPENAI_API_KEY not set in backend environment. ' +
        'Add it to backend/.env file: OPENAI_API_KEY=sk-your-key-here';
      console.error('❌', detailedError);
      throw new Error(detailedError);
    }
    
    console.log('✅ OPENAI_API_KEY found:', apiKey.substring(0, 8) + '...');
    
    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }
  return this.client;
}
```

---

## 📱 Mobile App Improvements Made

### **Enhanced Error Display**

- ✅ Shows multi-line error messages
- ✅ Lists common causes for 500 errors
- ✅ Directs user to check backend logs
- ✅ Provides "Try Again" button

### **Better Logging**

- ✅ Logs HTTP status codes
- ✅ Logs server error details
- ✅ Logs network error codes
- ✅ Identifies error type (network vs auth vs server)

---

## ✅ Expected Result

Once you fix the OPENAI_API_KEY issue:

1. **Backend logs show**:
   ```
   ✅ OPENAI_API_KEY found: sk-proj...
   🔍 Extracting events from transcript...
   ✅ Extracted 2 events successfully
   ```

2. **Mobile app shows**:
   - Transcript in review modal
   - Extracted events with emojis
   - "Save 2 Events" button works
   - No more 500 error

---

## 🚨 Still Having Issues?

If you still get 500 error after:
1. ✅ Confirmed OPENAI_API_KEY is set
2. ✅ Confirmed API key is valid
3. ✅ Confirmed backend restarted
4. ✅ Confirmed OpenAI has quota

Then check:
- Backend console for EXACT error message
- OpenAI API status: https://status.openai.com
- Network connectivity from backend to OpenAI
- Firewall/proxy settings

**Share the exact error from backend logs for further diagnosis.**

---

## 📞 Summary

**Problem**: Backend returns 500 error when extracting events

**Root Cause**: Most likely missing or invalid OPENAI_API_KEY

**Quick Fix**:
```bash
cd backend
echo "OPENAI_API_KEY=sk-your-key" >> .env
npm run dev  # restart
```

**Test**: Try voice log again - should work!

---

**Status**: ⚠️ **Backend Configuration Issue**  
**Action Required**: Add OPENAI_API_KEY to backend environment
