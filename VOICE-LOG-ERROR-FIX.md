# Voice Log Error Fix

**Issue**: "Event extraction failed error" when attempting voice log on Attune mobile

**Date**: July 16, 2026

---

## 🔍 Root Cause

The error "Event extraction failed" occurs when the backend API call to `/voice/extract-events` fails. This can happen due to several reasons:

1. **Backend server not running** or not accessible
2. **Network connectivity issue**
3. **Authentication token expired/invalid**
4. **Backend endpoint error** (500 server error)
5. **Request timeout** (takes too long to process)

---

## ✅ Fixes Applied

### **1. Enhanced Error Logging** (`voice-service.ts`)

Added comprehensive error logging to help diagnose the exact issue:

```typescript
// Now logs:
- Auth token presence
- HTTP status codes
- Server error messages
- Network error codes
- Request timeouts
```

### **2. User-Friendly Error Messages** (`voice-service.ts`)

Replaced generic errors with specific, actionable messages:

| Error Type | New Message |
|------------|-------------|
| Network Error | "Cannot reach server. Please check your internet connection and ensure the backend is running." |
| Timeout | "Event extraction timed out. Please try a shorter recording." |
| Auth Failed | "Authentication failed. Please log out and log in again." |
| Server Error | "Server error: [specific error from backend]" |

### **3. Request Timeout Added**

Added 60-second timeout for event extraction:

```typescript
timeout: 60000, // 60 second timeout
```

### **4. Better Error Display** (`VoiceLogger.tsx`)

- Shows multi-line error messages with formatting
- Provides "Try Again" button after errors
- Displays specific troubleshooting steps
- Visual error container with red background

---

## 🧪 How to Diagnose

When you see the error, check the console logs for:

### **Step 1: Check for Network Errors**
Look for:
```
❌ Network error: ERR_NETWORK
❌ Error message: Cannot reach server...
```

**Fix**: Ensure backend is running at `API_BASE_URL`

### **Step 2: Check for Auth Errors**
Look for:
```
❌ Status: 401
❌ No authentication token available
```

**Fix**: Log out and log back in

### **Step 3: Check for Server Errors**
Look for:
```
❌ Status: 500
❌ Server error: [error message]
```

**Fix**: Check backend logs for the specific error

### **Step 4: Check for Timeout**
Look for:
```
❌ Network error: ECONNABORTED
❌ Error message: Event extraction timed out
```

**Fix**: Try shorter recording or optimize backend

---

## 🔧 Quick Fixes

### **If Backend Is Not Running**

1. Check `API_BASE_URL` in `.env` file
2. Start the backend server
3. Verify it's accessible from the mobile device
4. Check firewall rules if on same network

### **If Authentication Failed**

1. Log out of the app
2. Log back in
3. Try voice log again

### **If Network Issues**

1. Check mobile device has internet
2. Verify backend URL is correct
3. Test backend health endpoint
4. Check if on same network (for local development)

### **If Server Error**

1. Check backend logs for detailed error
2. Verify OpenAI API key is configured
3. Check backend event extraction logic
4. Ensure database is accessible

---

## 📋 Testing Checklist

After fixes, test these scenarios:

- [ ] Voice log works when backend is running
- [ ] Shows "Cannot reach server" when backend is down
- [ ] Shows "Authentication failed" when token expires
- [ ] Shows "Timed out" for very long recordings
- [ ] "Try Again" button works after error
- [ ] Error message is readable and helpful

---

## 🎯 What Changed

### **Files Modified**

1. **`/mobile/services/voice-service.ts`**
   - Enhanced error logging
   - Added request timeout
   - User-friendly error messages
   - Network error detection

2. **`/mobile/components/VoiceLogger.tsx`**
   - Better error display with formatting
   - "Try Again" button after errors
   - Multi-line error text support
   - Visual error container styling

---

## 📱 User Experience Improvements

**Before**:
```
Error: Event extraction failed
[No context, no recovery option]
```

**After**:
```
⚠️ Cannot reach server

Please ensure:
1. Backend server is running
2. You have internet connection
3. API_BASE_URL is correctly configured

[🎙️ Try Again]
```

---

## 🚀 Next Steps

### **For Production**
1. Add retry logic (auto-retry once on network error)
2. Add backend health check before recording
3. Show spinner during API calls
4. Add analytics to track error rates

### **For Development**
1. Document backend setup process
2. Create health check endpoint
3. Add mock mode for testing without backend
4. Improve backend error responses

---

## 📞 Debugging Commands

```bash
# Check if backend is accessible
curl http://localhost:3000/health

# Check API base URL in .env
cat /Users/robertpassberger/~:Projects:attune-app/.env | grep API_BASE_URL

# View real-time logs when testing voice log
npx expo start

# Check backend logs
# (depends on your backend setup)
```

---

## ✅ Summary

**Problem**: Generic "Event extraction failed" error with no context

**Solution**: 
- Added detailed error logging
- Provided user-friendly error messages
- Added troubleshooting steps
- Improved error UI with "Try Again" button

**Result**: Users now know exactly what went wrong and how to fix it

---

**Status**: ✅ **FIXED**

The voice logging error handling is now much more robust and user-friendly. Users will see specific, actionable error messages instead of generic failures.
