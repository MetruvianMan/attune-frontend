# Setup Instructions for Attune Mobile App

## Required Dependencies Installation

### 1. Install Date-Time Picker (Required for Event Form)

The event form screen uses native date/time pickers. Install the required package:

```bash
cd /Users/robertpassberger/~:Projects:attune-app/mobile
npm install @react-native-community/datetimepicker
```

### 2. Verify All Dependencies

Run this command to ensure all packages are installed:

```bash
npm install
```

---

## Running the App

### Start the Development Server

```bash
npm start
```

This will start the Expo development server.

### Run on iOS Simulator

```bash
npm run ios
```

Or press `i` in the Expo terminal after running `npm start`.

### Run on Physical iPhone

1. Install the Expo Go app from the App Store
2. Scan the QR code shown in the terminal
3. The app will load on your device

---

## Backend Configuration

The app is configured to connect to the backend at:

```
https://attune-backend-5hke.onrender.com/api
```

This is set in `/mobile/constants/api.ts`. If you need to change it:

1. Open `/mobile/constants/api.ts`
2. Update the `API_BASE_URL` constant
3. Restart the development server

---

## Testing the App

### 1. Login

Use your existing Attune account credentials:
- Email: Your registered email
- Password: Your password

The app will authenticate with the backend and store the JWT token securely.

### 2. Test Event Logging

**Quick-Tap Buttons:**
- Tap any of the 45+ quick-tap buttons on the Today screen
- Event is saved immediately
- See the event count update

**Voice Logging:**
- Tap "Voice Log Events" button
- Grant microphone permission when prompted
- Record your description of events
- Review the extracted events (all checked by default)
- Edit descriptions if needed
- Save to create all checked events

**Manual Entry:**
- Tap "Manual Entry" button
- Fill out the event form
- Select date/time, add notes, tags, people
- Optionally attach photos
- Save to create the event

### 3. Test Sync

- Pull down on the Today screen to trigger sync
- Or tap the sync button in the Sync Status card
- Events will upload to the backend
- Changes from other devices will download

---

## Permissions Required

The app will request the following permissions:

### iOS Permissions (configured in app.json)

- **Camera** - For taking photos of events and documents
- **Photo Library** - For selecting existing photos
- **Microphone** - For voice logging
- **Background Fetch** - For periodic sync (15 minutes)

These permissions are requested when first needed. Make sure to grant them for full functionality.

---

## Troubleshooting

### "Database not initialized" Error

If you see this error:
1. Close the app completely
2. Clear the app data (Settings > Expo Go > Clear Data)
3. Restart the app
4. The database will initialize on first launch

### Voice Logging Not Working

Check:
1. Microphone permission is granted
2. Device is connected to the internet
3. Backend is accessible (check API_BASE_URL)

### Photos Not Uploading

Check:
1. Camera/Photo Library permissions are granted
2. Photos are being saved to local storage first
3. Sync is running (check sync status indicator)

### Sync Failures

If sync is failing:
1. Check internet connection
2. Verify backend is running (visit the API URL in a browser)
3. Check authentication token is valid (try logging out and back in)
4. Look for error messages in the sync status indicator

---

## Development Notes

### Database Location

The SQLite database is stored at:
```
${FileSystem.documentDirectory}attune.db
```

### Photo Storage

Photos are stored at:
```
${FileSystem.documentDirectory}photos/
```

### Document Storage

Documents are stored at:
```
${FileSystem.documentDirectory}documents/
```

### Clearing All Data

To reset the app completely:
1. Delete the app from your device/simulator
2. Reinstall
3. All local data will be cleared

---

## Next Steps

After setup is complete:

1. **Test all event logging methods** (quick-tap, voice, manual)
2. **Verify sync is working** (events upload to backend)
3. **Test offline mode** (turn off wifi, log events, turn on wifi, sync)
4. **Review Today screen** (event count, insights, diary entries)

---

## Support

If you encounter issues:

1. Check the Expo terminal for error messages
2. Check the device console logs
3. Verify backend is accessible
4. Ensure all dependencies are installed
5. Try clearing app data and restarting

---

## Current Implementation Status

### ✅ Completed (Tasks 1-16)
- Project setup and configuration
- Database schema and service
- Authentication service
- Photo service
- Document service
- Sync service (upload/download/background)
- Login screen and navigation
- Today tab with quick-tap buttons
- Voice logging with multi-event extraction
- Manual event entry form
- Today summary with insights and diary entries

### 🚧 In Progress (Tasks 17+)
- Timeline tab
- Event detail screen
- Circle tab (relationship network)
- Conversation tab (AI chat)
- Glossary tab
- Documents tab
- Profile tab enhancements

---

## Architecture Overview

```
mobile/
├── app/                    # Screens (Expo Router)
│   ├── (auth)/            # Auth screens (login)
│   ├── (tabs)/            # Tab screens (Today, Timeline, etc.)
│   ├── voice-recording.tsx
│   ├── event-form.tsx
│   └── _layout.tsx
├── components/            # Reusable UI components
│   ├── QuickTapButton.tsx
│   ├── InsightCard.tsx
│   ├── DiaryEntryCard.tsx
│   ├── PhotoPicker.tsx
│   └── SyncStatusIndicator.tsx
├── services/              # Business logic
│   ├── database.ts        # SQLite operations
│   ├── auth-service.ts    # Authentication
│   ├── event-service.ts   # Event CRUD
│   ├── photo-service.ts   # Photo handling
│   ├── document-service.ts
│   ├── sync-service.ts    # Backend sync
│   └── voice-service.ts   # Voice recording
├── models/                # TypeScript types
│   ├── event.ts
│   ├── child-profile.ts
│   ├── diary-entry.ts
│   ├── photo.ts
│   ├── document.ts
│   └── insight.ts
├── contexts/              # React contexts
│   └── AuthContext.tsx
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts
│   ├── usePhotos.ts
│   ├── useDocuments.ts
│   └── useSync.ts
├── utils/                 # Utility functions
│   └── api-client.ts      # HTTP client
└── constants/             # App constants
    ├── api.ts
    └── storage-keys.ts
```

---

## Key Features Implemented

1. **Event Logging**
   - 45+ quick-tap buttons
   - Voice logging with multi-event extraction
   - Manual entry with full form
   - All methods save to local database

2. **Sync**
   - Automatic 15-minute background sync
   - Manual sync trigger
   - Upload: events, diary entries, photos, documents
   - Download: incremental sync with last-write-wins
   - Offline queue management

3. **Data Storage**
   - SQLite database (12 tables)
   - Secure token storage (iOS Keychain)
   - Local file storage for photos/documents
   - Efficient indexing for queries

4. **UI/UX**
   - Native iOS design patterns
   - React Native Paper components
   - Smooth animations
   - Clear visual feedback
   - Offline indicators

---

## Ready to Build!

The app is now ready for development and testing. All core event logging features are implemented and functional.
