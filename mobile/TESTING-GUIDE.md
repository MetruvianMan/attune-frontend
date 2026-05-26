# Attune iOS App - Testing Guide

## Quick Start

### Option 1: iOS Simulator (Easiest - No iPhone Needed)

1. **Start the development server:**
   ```bash
   cd /Users/robertpassberger/~:Projects:attune-app/mobile
   npx expo start
   ```

2. **Press `i` to open iOS Simulator**
   - Expo will automatically open the iOS Simulator
   - The app will load in the simulator
   - You can interact with it using your mouse/trackpad

3. **Alternative: Scan QR code in terminal**
   - Install Expo Go app on your iPhone from App Store
   - Scan the QR code shown in terminal
   - App will load on your physical iPhone

---

## Option 2: Physical iPhone (Best Experience)

### Prerequisites
- iPhone with iOS 15 or later
- Same WiFi network as your Mac
- Expo Go app installed from App Store

### Steps
1. **Start the server:**
   ```bash
   cd /Users/robertpassberger/~:Projects:attune-app/mobile
   npx expo start
   ```

2. **On your iPhone:**
   - Open Expo Go app
   - Tap "Scan QR code"
   - Scan the QR code from your terminal
   - App will load on your iPhone

3. **Or use the URL:**
   - Look for the URL in terminal (e.g., `exp://192.168.1.x:8081`)
   - Enter it in Expo Go app

---

## Option 3: Expo Go App (Recommended for Testing)

This is the easiest way to test on a real device:

1. **Install Expo Go:**
   - iPhone: https://apps.apple.com/app/expo-go/id982107779
   - Download from App Store

2. **Start development server:**
   ```bash
   cd /Users/robertpassberger/~:Projects:attune-app/mobile
   npx expo start
   ```

3. **Connect:**
   - Open Expo Go on your iPhone
   - Scan QR code from terminal
   - App loads instantly!

---

## Testing Checklist

### 1. Login Screen
- [ ] App opens to login screen
- [ ] Can enter email and password
- [ ] Login button works
- [ ] Error message shows for invalid credentials
- [ ] Loading indicator appears during login

**Test Credentials:**
- Use your existing Attune backend credentials
- Backend URL: `https://attune-backend-5hke.onrender.com/api`

---

### 2. Today Tab (Main Focus!)

#### Date Picker
- [ ] Date picker shows current date
- [ ] Can tap date chip to open picker
- [ ] Can select past dates (not future)
- [ ] "Today" button appears when past date selected
- [ ] "Today" button resets to current date
- [ ] Backfill indicator shows for past dates

#### Event List
- [ ] Events display with emoji, type, time
- [ ] Severity shows (e.g., "4/5")
- [ ] Notes preview shows (2 lines max)
- [ ] Edit button (pencil) works
- [ ] Delete button shows confirmation
- [ ] Delete removes event

#### Drag-and-Drop Reordering ⭐
- [ ] Drag handle (⠿) visible on each event
- [ ] "Hold ⠿ to reorder" hint shows
- [ ] **Long press** drag handle to start drag
- [ ] Event lifts up with scale animation
- [ ] Can drag event up in list
- [ ] Can drag event down in list
- [ ] Other events shift to make space
- [ ] Release drops event in new position
- [ ] Snackbar shows "Events reordered"
- [ ] Order persists after closing/reopening app

#### Quick-Tap Buttons
- [ ] 45 quick-tap buttons display
- [ ] Buttons show emoji and label
- [ ] Tap button logs event
- [ ] Snackbar confirms "✓ [Event] logged"
- [ ] Event appears in list above
- [ ] Most-used buttons appear first (after logging some)

#### Voice Logging
- [ ] "Voice Log Events" button prominent
- [ ] Tap opens voice recording screen
- [ ] Can record audio
- [ ] Transcription works (requires OpenAI API key)
- [ ] Events extracted from transcript
- [ ] Checkbox review screen shows
- [ ] Can edit transcript
- [ ] Can edit each event
- [ ] Can uncheck events to exclude
- [ ] Diary entry checkbox option
- [ ] Save creates all checked events

#### Manual Entry
- [ ] "Manual Entry" button works
- [ ] Opens event form
- [ ] Can select event type
- [ ] Can set date/time
- [ ] Can add notes
- [ ] Can add tags
- [ ] Can add people
- [ ] Can attach photos
- [ ] Save creates event

---

### 3. Timeline Tab
- [ ] Shows all events chronologically
- [ ] Can filter by event type
- [ ] Can filter by date range
- [ ] Can filter by tags
- [ ] Pull-to-refresh works
- [ ] Pagination loads more events
- [ ] Tap event opens detail screen

---

### 4. Circle Tab
- [ ] Shows relationship persons
- [ ] Can add new person
- [ ] Can edit person
- [ ] Can delete person
- [ ] Relationship strength shows (hearts)
- [ ] Tap person shows detail

---

### 5. Conversation Tab
- [ ] Shows conversation sessions
- [ ] Can start new conversation
- [ ] Chat interface works
- [ ] Messages send and receive
- [ ] Offline message shows when no network

---

### 6. Glossary Tab
- [ ] Shows glossary terms
- [ ] Search bar filters terms
- [ ] Tap term shows detail
- [ ] Category chips display

---

### 7. Documents Tab
- [ ] Shows uploaded documents
- [ ] Can upload new document
- [ ] Can take photo of document
- [ ] Document viewer shows images
- [ ] Can share document
- [ ] Can delete document

---

### 8. Profile Tab
- [ ] Shows child profile info
- [ ] Can edit profile
- [ ] Can change profile photo
- [ ] Sync status displays
- [ ] Manual sync button works
- [ ] Sign out button works

---

## Common Issues & Solutions

### Issue: "Unable to resolve module"
**Solution:**
```bash
cd /Users/robertpassberger/~:Projects:attune-app/mobile
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: "Network request failed"
**Solution:**
- Check backend is running: https://attune-backend-5hke.onrender.com/api
- Check WiFi connection
- Try restarting Expo server

### Issue: "Invariant Violation: requireNativeComponent"
**Solution:**
```bash
npx expo start --clear
```
Then reload app (shake device, press R in terminal)

### Issue: Drag-and-drop not working
**Solution:**
- Make sure you're **long pressing** the ⠿ handle (not just tapping)
- Try on physical device (works better than simulator)
- Check GestureHandlerRootView is wrapping the screen

### Issue: Voice recording not working
**Solution:**
- Grant microphone permission when prompted
- Check OpenAI API key is set in backend
- Try on physical device (simulator has limited audio support)

---

## Development Commands

### Start Development Server
```bash
cd /Users/robertpassberger/~:Projects:attune-app/mobile
npx expo start
```

### Clear Cache and Restart
```bash
npx expo start --clear
```

### Run on iOS Simulator
```bash
npx expo start
# Then press 'i' in terminal
```

### Run on Android Emulator
```bash
npx expo start
# Then press 'a' in terminal
```

### Check for Errors
```bash
npx expo doctor
```

### Install Dependencies
```bash
npm install
```

---

## Testing on Physical iPhone

### Best Practices
1. **Use same WiFi** - Mac and iPhone must be on same network
2. **Keep Expo Go updated** - Update from App Store
3. **Shake to open menu** - Shake device to access dev menu
4. **Reload app** - Shake device, tap "Reload"
5. **Enable Fast Refresh** - Auto-reloads on code changes

### Dev Menu Options (Shake Device)
- **Reload** - Restart the app
- **Debug Remote JS** - Open Chrome debugger
- **Show Performance Monitor** - FPS counter
- **Toggle Element Inspector** - Inspect UI elements

---

## Testing Drag-and-Drop Specifically

### On iOS Simulator
1. Start app in simulator
2. Navigate to Today tab
3. Log 3-4 events using quick-tap buttons
4. Find the drag handle (⠿) on the left of each event
5. **Click and hold** the ⠿ for 1 second
6. **Drag** up or down while holding
7. **Release** to drop

**Note:** Simulator drag-and-drop can be finicky. Physical device works much better!

### On Physical iPhone
1. Open app in Expo Go
2. Navigate to Today tab
3. Log 3-4 events
4. **Long press** the ⠿ handle (hold for 1 second)
5. **Drag** event up or down
6. **Release** to drop
7. Should see "Events reordered" snackbar

**Tip:** The long press is key! A quick tap won't work.

---

## Backend Setup

### Check Backend is Running
```bash
curl https://attune-backend-5hke.onrender.com/api/health
```

Should return: `{"status":"ok"}`

### Backend Endpoints Used
- `POST /api/auth/login` - Login
- `GET /api/sync/events` - Get events
- `POST /api/sync/events` - Upload events
- `POST /api/voice/transcribe` - Voice transcription
- `POST /api/voice/extract-events` - Event extraction
- `POST /api/conversation/message` - Chat messages

---

## Performance Testing

### Check FPS
1. Shake device to open dev menu
2. Tap "Show Performance Monitor"
3. Should see 60 FPS during scrolling
4. Should see 60 FPS during drag-and-drop

### Check Memory
1. Open Xcode
2. Window → Devices and Simulators
3. Select your device
4. Monitor memory usage
5. Should stay under 200MB

---

## What to Test First

### Priority 1: Core Functionality
1. ✅ Login works
2. ✅ Today tab loads
3. ✅ Quick-tap buttons log events
4. ✅ Events display in list
5. ✅ Edit/delete buttons work

### Priority 2: Drag-and-Drop
1. ✅ Drag handle visible
2. ✅ Long press initiates drag
3. ✅ Can reorder events
4. ✅ Order persists

### Priority 3: Voice Logging
1. ✅ Voice recording works
2. ✅ Transcription works
3. ✅ Event extraction works
4. ✅ Checkbox review works

### Priority 4: Other Features
1. ✅ Timeline filtering
2. ✅ Circle management
3. ✅ Conversations
4. ✅ Documents
5. ✅ Profile editing

---

## Reporting Issues

If you find bugs, note:
1. **What you did** - Steps to reproduce
2. **What happened** - Actual behavior
3. **What you expected** - Expected behavior
4. **Device** - iPhone model, iOS version
5. **Screenshots** - If applicable

---

## Next Steps After Testing

1. **Fix any bugs found**
2. **Test with real data** - Import from backup
3. **Test multi-device sync** - Two iPhones
4. **Performance testing** - 500+ events
5. **TestFlight distribution** - Beta testing

---

## Quick Test Script

Run through this in 5 minutes:

```
1. Open app → Login
2. Today tab → Tap 3 quick-tap buttons
3. See 3 events in list
4. Long press ⠿ on middle event
5. Drag to top
6. Release
7. See "Events reordered"
8. Close app
9. Reopen app
10. Check order persisted ✓
```

---

## Need Help?

### Expo Documentation
- https://docs.expo.dev/

### React Native Documentation
- https://reactnative.dev/

### Troubleshooting
- https://docs.expo.dev/troubleshooting/

---

**Ready to test!** Start with:
```bash
cd /Users/robertpassberger/~:Projects:attune-app/mobile
npx expo start
```

Then press `i` for iOS Simulator or scan QR code with Expo Go app on your iPhone!
