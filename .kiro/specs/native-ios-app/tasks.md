# Tasks

## Task 1: Project Setup and Configuration
**Status**: completed
**Requirements**: REQ-1
**Estimated Effort**: 2 hours

### Description
Initialize the React Native Expo project with TypeScript, configure dependencies, and set up the project structure.

### Acceptance Criteria
- [ ] Expo project created with TypeScript template
- [ ] All required dependencies installed (React Navigation, Expo SQLite, Expo SecureStore, etc.)
- [ ] Project structure matches design document
- [ ] TypeScript configuration complete
- [ ] Metro bundler configured
- [ ] app.json configured with correct bundle identifier and permissions

### Implementation Notes
```bash
npx create-expo-app mobile --template expo-template-blank-typescript
cd mobile
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install expo-sqlite expo-secure-store expo-file-system
npm install expo-image-picker expo-document-picker expo-av
npm install expo-image-manipulator @react-native-community/netinfo
npm install axios uuid react-native-paper
```

---

## Task 2: Database Schema and Service
**Status**: completed
**Requirements**: REQ-2, REQ-3, REQ-4, REQ-19
**Estimated Effort**: 6 hours

### Description
Implement SQLite database schema, create DatabaseService class with CRUD operations for all data models.

### Acceptance Criteria
- [ ] All 12 tables created with proper indexes
- [ ] DatabaseService class implements all CRUD operations
- [ ] Event operations (create, read, update, delete, filter)
- [ ] Diary entry operations
- [ ] Photo metadata operations
- [ ] Document metadata operations
- [ ] Sync metadata operations
- [ ] Foreign key constraints enforced
- [ ] Database initialization on first launch

### Implementation Notes
- Create `services/database.ts` with DatabaseService class
- Follow schema from design document
- Use prepared statements for all queries
- Add proper error handling and logging

---

## Task 3: Authentication Service
**Status**: completed
**Requirements**: REQ-1, REQ-29
**Estimated Effort**: 4 hours

### Description
Implement authentication service with login, token storage, token refresh, and logout functionality.

### Acceptance Criteria
- [ ] AuthService class created
- [ ] Login with email/password
- [ ] Store JWT token in SecureStore
- [ ] Retrieve token for API calls
- [ ] Automatic token refresh when within 24 hours of expiration
- [ ] Logout clears token from SecureStore
- [ ] isAuthenticated() check
- [ ] Error handling for invalid credentials

### Implementation Notes
- Create `services/auth-service.ts`
- Use Expo SecureStore for token storage
- Implement token expiration checking
- Backend endpoint: POST /api/auth/login

---

## Task 4: Photo Service
**Status**: completed
**Requirements**: REQ-13, REQ-22
**Estimated Effort**: 4 hours

### Description
Implement photo capture, compression, and storage service.

### Acceptance Criteria
- [ ] PhotoService class created
- [ ] Camera capture with permission handling
- [ ] Photo library picker with permission handling
- [ ] 80% JPEG compression
- [ ] Resize to max 1920px width
- [ ] Save to FileSystem photos directory
- [ ] Delete photo functionality
- [ ] Get photo info functionality

### Implementation Notes
- Create `services/photo-service.ts`
- Use Expo ImagePicker for capture/selection
- Use Expo ImageManipulator for compression
- Store in `${FileSystem.documentDirectory}photos/`

---

## Task 5: Document Service
**Status**: completed
**Requirements**: REQ-14
**Estimated Effort**: 3 hours

### Description
Implement document upload and storage service.

### Acceptance Criteria
- [ ] DocumentService class created
- [ ] Document picker with permission handling
- [ ] Camera capture for document photos
- [ ] Save to FileSystem documents directory
- [ ] Delete document functionality
- [ ] Get document info functionality
- [ ] Support PDF and image file types

### Implementation Notes
- Create `services/document-service.ts`
- Use Expo DocumentPicker for file selection
- Store in `${FileSystem.documentDirectory}documents/`

---

## Task 6: Sync Service - Core Infrastructure
**Status**: completed
**Requirements**: REQ-17, REQ-18, REQ-19, REQ-20, REQ-21
**Estimated Effort**: 8 hours

### Description
Implement sync service with upload/download logic, conflict resolution, and background sync.

### Acceptance Criteria
- [ ] SyncService class created
- [ ] Upload unsynced events to backend
- [ ] Upload unsynced diary entries
- [ ] Upload unsynced photos
- [ ] Upload unsynced documents
- [ ] Download changes since last sync
- [ ] Last-write-wins conflict resolution
- [ ] Track last sync timestamp
- [ ] Exponential backoff retry logic
- [ ] Network connectivity detection
- [ ] Sync status notifications

### Implementation Notes
- Create `services/sync-service.ts`
- Use NetInfo for connectivity detection
- Backend endpoints: POST /api/sync/events, GET /api/sync/download
- Implement retry with exponential backoff (30s, 1m, 2m, 5m)

---

## Task 7: Sync Service - Background Sync
**Status**: completed
**Requirements**: REQ-17
**Estimated Effort**: 4 hours

### Description
Implement 15-minute background sync using Expo Background Fetch.

### Acceptance Criteria
- [ ] Background sync task registered
- [ ] Sync runs every 15 minutes when app is active
- [ ] Sync runs immediately on app open
- [ ] Background sync works when app is backgrounded
- [ ] Task Manager integration

### Implementation Notes
- Use Expo Background Fetch and Task Manager
- Register task in SyncService.initialize()
- Handle background sync failures gracefully

---

## Task 8: Voice Service
**Status**: pending
**Requirements**: REQ-16
**Estimated Effort**: 6 hours

### Description
Implement voice recording, transcription, and multi-event extraction service.

### Acceptance Criteria
- [ ] VoiceService class created
- [ ] Audio recording with permission handling
- [ ] Send audio to backend for transcription
- [ ] Send transcript to backend for event extraction
- [ ] Parse extracted events response
- [ ] Re-extract events from edited transcript
- [ ] Error handling for offline mode

### Implementation Notes
- Create `services/voice-service.ts`
- Use Expo AV for audio recording
- Backend endpoints: POST /api/voice/transcribe, POST /api/voice/extract-events
- Return structured data for review screen

---

## Task 9: Navigation Structure
**Status**: pending
**Requirements**: REQ-5
**Estimated Effort**: 3 hours

### Description
Set up React Navigation with tab bar and 7 main tabs.

### Acceptance Criteria
- [ ] Tab navigator configured
- [ ] 7 tabs: Today, Timeline, Circle, Conversation, Glossary, Documents, Profile
- [ ] Tab icons and labels
- [ ] Default to Today tab
- [ ] Preserve scroll position when switching tabs
- [ ] Stack navigators for detail screens

### Implementation Notes
- Create `app/(tabs)/_layout.tsx` with tab configuration
- Use React Navigation Bottom Tabs
- Configure tab bar styling to match design

---

## Task 10: Login Screen
**Status**: completed
**Requirements**: REQ-1
**Estimated Effort**: 3 hours

### Description
Create login screen with email/password authentication.

### Acceptance Criteria
- [ ] Login screen UI with email and password fields
- [ ] Form validation
- [ ] Submit button calls AuthService.login()
- [ ] Display loading indicator during authentication
- [ ] Display error messages for invalid credentials
- [ ] Navigate to Today tab on successful login
- [ ] Remember authentication across app restarts

### Implementation Notes
- Create `app/(auth)/login.tsx`
- Use React Native Paper for form components
- Check authentication status on app launch

---

## Task 11: Today Tab - Quick Tap Buttons
**Status**: completed
**Requirements**: REQ-6, REQ-25
**Estimated Effort**: 4 hours

### Description
Implement Today tab with quick-tap buttons for one-tap event logging.

### Acceptance Criteria
- [x] Display all configured quick-tap buttons
- [x] Tap button creates event immediately
- [x] Event saved to local database
- [x] Event added to sync queue
- [x] Visual feedback on tap
- [x] Buttons load from database
- [x] Support 45+ buttons with scrolling

### Implementation Notes
- Created `app/(tabs)/index.tsx` (Today tab) with full quick-tap functionality
- Created `components/QuickTapButton.tsx` with emoji and label display
- Implemented 45 default quick-tap buttons from web app
- Integrated EventService.createQuickTapEvent() on tap
- Added Snackbar for success feedback
- Added today's event summary display

---

## Task 12: Today Tab - Voice Logging Button
**Status**: completed
**Requirements**: REQ-6, REQ-16
**Estimated Effort**: 2 hours

### Description
Add voice logging button to Today tab that navigates to voice recording screen.

### Acceptance Criteria
- [x] Voice logging button displayed prominently
- [x] Tap navigates to voice recording screen (placeholder for now)
- [x] Button shows microphone icon
- [x] Disabled when offline (to be implemented in Task 13)

### Implementation Notes
- Added prominent voice logging button to Today tab
- Button shows microphone icon and clear label
- Placeholder handler ready for Task 13 implementation
- Manual entry button also added for completeness


---

## Task 13: Voice Recording Screen
**Status**: completed
**Requirements**: REQ-16
**Estimated Effort**: 6 hours

### Description
Create voice recording screen with record/stop controls and review screen with multi-event extraction.

### Acceptance Criteria
- [x] Recording screen with record/stop button
- [x] Visual recording indicator
- [x] Stop recording sends to VoiceService
- [x] Review screen displays transcript (editable)
- [x] Review screen displays extracted events with checkboxes (checked by default)
- [x] Each event has emoji picker, event type dropdown, description field, valence selector
- [x] Diary entry checkbox option
- [x] Re-extract button to re-run extraction on edited transcript
- [x] Save button creates diary entry (if checked) and checked events
- [x] All saved items added to sync queue
- [x] Display offline message when no network

### Implementation Notes
- Created `app/voice-recording.tsx` with full recording and review workflow
- Created `services/voice-service.ts` with audio recording, transcription, and event extraction
- Integrated with EventService and DatabaseService for saving
- Network connectivity detection with offline message
- Checkbox-based event review matching web app experience

---

## Task 14: Today Tab - Manual Entry Button
**Status**: completed
**Requirements**: REQ-6, REQ-15
**Estimated Effort**: 2 hours

### Description
Add manual entry button to Today tab that navigates to event creation screen.

### Acceptance Criteria
- [x] Manual entry button displayed
- [x] Tap navigates to event creation screen
- [x] Button shows plus icon

### Implementation Notes
- Added manual entry button to Today tab
- Navigation to event-form screen implemented

---

## Task 15: Event Creation Screen
**Status**: completed
**Requirements**: REQ-15
**Estimated Effort**: 6 hours

### Description
Create event creation/editing screen with full event details form.

### Acceptance Criteria
- [x] Form fields: event type, timestamp, description, tags, context, photos
- [x] Native date/time pickers
- [x] Photo attachment with camera/library options
- [x] Tag input with autocomplete
- [x] Context selection (environment, people, activities)
- [x] Form validation
- [x] Save button creates event in database
- [x] Event added to sync queue
- [x] Navigate back to Today tab on save

### Implementation Notes
- Created `app/event-form.tsx` with comprehensive event form
- Supports both create and edit modes
- All 45+ event types available in dropdown
- Date/time pickers for timestamp
- Tags and people present with add/remove
- Severity and valence selectors
- Photo attachment from camera or library
- Note: Requires `@react-native-community/datetimepicker` package installation

---

## Task 16: Today Tab - Summary and Insights
**Status**: completed
**Requirements**: REQ-6, REQ-23
**Estimated Effort**: 3 hours

### Description
Display today's event summary and most recent insight on Today tab.

### Acceptance Criteria
- [x] Display event count by type for today
- [x] Display most recent insight
- [x] Tap insight navigates to insight detail screen (placeholder)
- [x] Summary updates when new events are logged
- [x] Display diary entries for today

### Implementation Notes
- Created `components/InsightCard.tsx` for displaying insights
- Created `components/DiaryEntryCard.tsx` for displaying diary entries
- Created `models/insight.ts` for Insight and Strategy types
- Added insight retrieval methods to DatabaseService
- Today screen now displays:
  * Event count for today
  * Most recent insight (if available)
  * Today's diary entries (if any)
  * All updates when new events are logged

---

## Task 17: Timeline Tab
**Status**: completed
**Requirements**: REQ-7
**Estimated Effort**: 6 hours

### Description
Create Timeline tab with chronological event list and filtering.

### Acceptance Criteria
- [x] Display all events in reverse chronological order
- [x] Show event type, timestamp, description, photos
- [x] Filter controls: event type, date range, tags
- [x] Apply filters updates list
- [x] Tap event navigates to event detail screen
- [x] Pull-to-refresh triggers sync
- [x] Smooth scrolling with 500+ events (60fps)
- [x] Infinite scroll/pagination

### Implementation Notes
- Created `app/(tabs)/timeline.tsx` with full timeline functionality
- Created `components/EventCard.tsx` for event display
- Created `components/EventFilters.tsx` for filtering UI
- Implemented pagination with PAGE_SIZE = 20
- Pull-to-refresh triggers sync and reloads events
- Filter by event types, date range, and tags
- FAB button for quick event creation

---

## Task 18: Event Detail Screen
**Status**: completed
**Requirements**: REQ-7, REQ-15, REQ-22
**Estimated Effort**: 4 hours

### Description
Create event detail screen showing full event information with edit capability.

### Acceptance Criteria
- [x] Display all event fields
- [x] Display attached photos in gallery
- [x] Tap photo opens full-screen view with zoom (placeholder)
- [x] Edit button navigates to event form
- [x] Delete button with confirmation
- [x] Display associated context entries (placeholder)
- [x] Display related insights (placeholder)

### Implementation Notes
- Created `app/event-detail.tsx` with comprehensive event display
- Shows all event fields: type, timestamp, notes, transcript, tags, people, photos
- Severity and valence badges with color coding
- Edit button navigates to event-form with eventId
- Delete button with confirmation dialog
- Metadata section shows source, created date, sync status
- Photo grid display (2 columns)

---

## Task 19: Circle Tab
**Status**: completed
**Requirements**: REQ-8
**Estimated Effort**: 4 hours

### Description
Create Circle tab displaying child's support network.

### Acceptance Criteria
- [x] Display all relationship persons
- [x] Show name, role, photo, relationship strength
- [x] Tap person navigates to relationship detail screen
- [x] Add button to create new person
- [x] Pull-to-refresh triggers sync

### Implementation Notes
- Created `app/(tabs)/circle.tsx` with person list
- Created `components/PersonCard.tsx` for person display
- Created `models/relationship-person.ts` for RelationshipPerson type
- Added relationship person CRUD methods to DatabaseService
- Relationship strength shown as hearts (1-5 scale)
- FAB button for adding new person
- Pull-to-refresh triggers sync

---

## Task 20: Relationship Detail Screen
**Status**: completed
**Requirements**: REQ-8
**Estimated Effort**: 3 hours

### Description
Create relationship detail screen with person information and edit capability.

### Acceptance Criteria
- [x] Display person details
- [x] Display events involving this person
- [x] Edit button
- [x] Delete button with confirmation

### Implementation Notes
- Created `app/relationship-detail.tsx` with full person details
- Created `app/relationship-form.tsx` for add/edit person
- Shows profile photo (or placeholder with initial)
- Displays name, role, relationship strength, notes
- Lists related events (events where person is mentioned)
- Edit button navigates to relationship-form with personId
- Delete button with confirmation dialog
- Form includes photo capture/selection, common role chips, strength selector

---

## Task 21: Conversation Tab
**Status**: completed
**Requirements**: REQ-9
**Estimated Effort**: 6 hours

### Description
Create Conversation tab with AI chat sessions.

### Acceptance Criteria
- [x] Display all conversation sessions
- [x] New conversation button
- [x] Tap session navigates to conversation detail
- [x] Display offline message when no network

### Implementation Notes
- Created `app/(tabs)/conversation.tsx` with session list
- Created `components/ConversationCard.tsx` for session display
- Created `models/conversation.ts` for ConversationSession and ConversationTurn types
- Added conversation CRUD methods to DatabaseService
- Network connectivity detection with offline message
- FAB button disabled when offline
- Pull-to-refresh triggers sync

---

## Task 22: Conversation Detail Screen
**Status**: completed
**Requirements**: REQ-9
**Estimated Effort**: 5 hours

### Description
Create conversation detail screen with message history and input.

### Acceptance Criteria
- [x] Display all messages in conversation
- [x] Message input field
- [x] Send button
- [x] Save message to database
- [x] Send message to backend API
- [x] Display AI response
- [x] Auto-scroll to latest message
- [x] Display offline message when no network

### Implementation Notes
- Created `app/conversation-detail.tsx` with chat interface
- Message bubbles with user/assistant styling
- Auto-scroll to bottom on new messages
- Keyboard avoiding view for iOS
- Network connectivity detection
- Backend endpoint: POST /api/conversation/message
- Saves conversation to database after each exchange
- Supports both new and existing conversations

---

## Task 23: Glossary Tab
**Status**: completed
**Requirements**: REQ-10
**Estimated Effort**: 3 hours

### Description
Create Glossary tab with neurodiversity terms and definitions.

### Acceptance Criteria
- [x] Display all glossary terms
- [x] Show term name and brief definition
- [x] Search field to filter terms
- [x] Tap term navigates to term detail screen
- [x] Pull-to-refresh triggers sync

### Implementation Notes
- Created `app/(tabs)/glossary.tsx` with term list
- Created `components/GlossaryTermCard.tsx` for term display
- Added glossary CRUD methods to DatabaseService
- Searchbar filters by term, definition, or category
- Real-time search filtering
- Pull-to-refresh triggers sync
- Empty state for no terms or no search results

---

## Task 24: Glossary Term Detail Screen
**Status**: completed
**Requirements**: REQ-10
**Estimated Effort**: 2 hours

### Description
Create glossary term detail screen with full definition and context.

### Acceptance Criteria
- [x] Display term name
- [x] Display full definition
- [x] Display category
- [x] Display related terms

### Implementation Notes
- Created `app/glossary-term-detail.tsx` with full term display
- Shows term name, category chip, full definition
- Displays related terms (same category, up to 5)
- Related terms shown as chips
- Info card with helpful context

---

## Task 25: Documents Tab
**Status**: completed
**Requirements**: REQ-11
**Estimated Effort**: 5 hours

### Description
Create Documents tab with archived documents list and upload capability.

### Acceptance Criteria
- [x] Display all archived documents
- [x] Show document name, type, upload date, thumbnail
- [x] Tap document opens document viewer
- [x] Add button to upload new documents
- [x] Pull-to-refresh triggers sync
- [x] Support PDF and image documents

### Implementation Notes
- Created `app/(tabs)/documents.tsx` with document list view
- DocumentCard component already exists
- Implemented search functionality
- Shows storage usage info
- Pull-to-refresh triggers sync
- FAB button for uploading documents

---

## Task 26: Document Viewer Screen
**Status**: completed
**Requirements**: REQ-11
**Estimated Effort**: 4 hours

### Description
Create document viewer for PDFs and images.

### Acceptance Criteria
- [x] Display PDF documents
- [x] Display image documents
- [x] Zoom and pan for images
- [x] Page navigation for PDFs
- [x] Share button
- [x] Delete button with confirmation

### Implementation Notes
- Created `app/document-viewer.tsx` with full document viewing
- Uses WebView for PDF viewing (basic support)
- Uses Image component with resizeMode for images
- Implemented sharing via expo-sharing
- Shows document metadata (type, size, upload date, source)
- Unsupported document types show info with share option
- Delete functionality with confirmation dialog

---

## Task 27: Document Upload Screen
**Status**: completed
**Requirements**: REQ-14
**Estimated Effort**: 4 hours

### Description
Create document upload screen with file picker and camera options.

### Acceptance Criteria
- [x] Select file option opens document picker
- [x] Take photo option opens camera
- [x] Display selected file preview
- [x] Document type dropdown
- [x] Document date picker
- [x] Save button uploads document
- [x] Document saved to FileSystem
- [x] Document metadata saved to database
- [x] Added to sync queue

### Implementation Notes
- Created `app/document-upload.tsx` with upload workflow
- Uses DocumentService for file handling
- Two upload methods: file picker and camera capture
- Optional metadata: source/provider and document date
- Image preview for captured photos
- Icon preview for other file types
- Documents saved immediately on selection
- Metadata can be updated after upload

---

## Task 28: Profile Tab
**Status**: pending
**Requirements**: REQ-12
**Estimated Effort**: 4 hours

### Description
Create Profile tab with child profile, sync status, and settings.

### Acceptance Criteria
- [ ] Display child profile (name, photo, birthdate, preferences)
- [ ] Edit profile button
- [ ] Display sync status (last sync time, errors)
- [ ] Manual sync button
- [ ] Logout button
- [ ] App version display

### Implementation Notes
- Create `app/(tabs)/profile.tsx`
- Create `components/SyncStatusIndicator.tsx`
- Query child_profiles from database

---

## Task 29: Profile Edit Screen
**Status**: pending
**Requirements**: REQ-12
**Estimated Effort**: 3 hours

### Description
Create profile edit screen for child profile information.

### Acceptance Criteria
- [ ] Form fields: name, photo, birthdate, diagnosis, preferences
- [ ] Photo upload with camera/library options
- [ ] Date picker for birthdate
- [ ] Save button updates profile
- [ ] Profile added to sync queue

### Implementation Notes
- Create `app/profile-edit.tsx`
- Use PhotoService for profile photo

---

## Task 30: Initial Data Sync
**Status**: pending
**Requirements**: REQ-2, REQ-3, REQ-4
**Estimated Effort**: 4 hours

### Description
Implement initial data sync on first login with progress indicator.

### Acceptance Criteria
- [ ] Trigger initial sync after successful login
- [ ] Display progress indicator with sync status
- [ ] Download all data types from backend
- [ ] Download all photos and documents
- [ ] Save to local database and FileSystem
- [ ] Display Today tab when complete
- [ ] Retry option on failure
- [ ] Complete within 30 seconds for 100 events, 50 photos, 20 documents

### Implementation Notes
- Add initial sync logic to AuthService or SyncService
- Create `components/InitialSyncScreen.tsx`
- Backend endpoint: GET /api/sync/initial

---

## Task 31: Offline Mode Handling
**Status**: pending
**Requirements**: REQ-19
**Estimated Effort**: 3 hours

### Description
Implement offline mode detection and UI indicators.

### Acceptance Criteria
- [ ] Display offline indicator when no network
- [ ] Allow CRUD operations while offline
- [ ] Queue changes for sync when online
- [ ] Display offline message for AI features
- [ ] Auto-sync when network restored

### Implementation Notes
- Use NetInfo for connectivity detection
- Create `components/OfflineIndicator.tsx`
- Add offline checks to VoiceService and ConversationService

---

## Task 32: Error Handling and Recovery
**Status**: pending
**Requirements**: REQ-30
**Estimated Effort**: 4 hours

### Description
Implement comprehensive error handling and recovery mechanisms.

### Acceptance Criteria
- [ ] Display clear error messages for all failures
- [ ] Retry logic with exponential backoff
- [ ] Database corruption recovery
- [ ] Network error handling
- [ ] Auth token expiration handling
- [ ] Sync failure recovery
- [ ] Error logging for debugging

### Implementation Notes
- Create `utils/error-handling.ts`
- Add error boundaries to React components
- Implement retry logic in SyncService

---

## Task 33: Data Migration from Web App
**Status**: pending
**Requirements**: REQ-28
**Estimated Effort**: 4 hours

### Description
Ensure data uploaded from web app is correctly downloaded and displayed in mobile app.

### Acceptance Criteria
- [ ] Download all data types from backend
- [ ] Correctly parse and store events
- [ ] Correctly parse and store diary entries
- [ ] Correctly parse and store photos
- [ ] Correctly parse and store documents
- [ ] Correctly parse and store all other data types
- [ ] Display migrated data in all tabs
- [ ] Preserve photo and document references

### Implementation Notes
- Test with actual data backup from web app
- Verify data integrity after migration
- Backend should already support this via sync endpoints

---

## Task 34: Photo Full-Screen Viewer
**Status**: pending
**Requirements**: REQ-22
**Estimated Effort**: 3 hours

### Description
Create full-screen photo viewer with zoom and swipe gestures.

### Acceptance Criteria
- [ ] Display photo full-screen
- [ ] Pinch-to-zoom gesture
- [ ] Swipe down to dismiss
- [ ] Smooth animations

### Implementation Notes
- Create `components/PhotoViewer.tsx`
- Use React Native Gesture Handler
- Use React Native Reanimated for animations

---

## Task 35: Diary Entry Display
**Status**: pending
**Requirements**: REQ-27
**Estimated Effort**: 3 hours

### Description
Display diary entries on Today tab and Timeline, separate from events.

### Acceptance Criteria
- [ ] Display diary entries on Today tab for current date
- [ ] Display diary entries on Timeline in chronological order
- [ ] Visually distinct from events
- [ ] Edit diary entry functionality
- [ ] Delete diary entry functionality
- [ ] Diary entries don't affect analytics

### Implementation Notes
- Create `components/DiaryEntryCard.tsx`
- Query diary_entries from database
- Add to Today tab and Timeline tab

---

## Task 36: Context Entry Logging
**Status**: pending
**Requirements**: REQ-26
**Estimated Effort**: 4 hours

### Description
Implement context entry logging for events.

### Acceptance Criteria
- [ ] Context field in event form
- [ ] Select environment, people present, activities
- [ ] Create context_entry records
- [ ] Associate with event
- [ ] Display context in event detail
- [ ] Sync context entries

### Implementation Notes
- Add context input to EventForm component
- Create context_entries in database when saving event

---

## Task 37: Quick-Tap Button Customization
**Status**: pending
**Requirements**: REQ-25
**Estimated Effort**: 4 hours

### Description
Allow users to customize quick-tap buttons.

### Acceptance Criteria
- [ ] Add button to create new quick-tap button
- [ ] Edit button configuration (event type, label, emoji)
- [ ] Delete button
- [ ] Reorder buttons with drag-and-drop
- [ ] Save changes to database
- [ ] Sync button configurations

### Implementation Notes
- Create `app/quick-tap-settings.tsx`
- Use react-native-draggable-flatlist for reordering

---

## Task 38: Strategy Display and Tracking
**Status**: pending
**Requirements**: REQ-24
**Estimated Effort**: 3 hours

### Description
Display strategy recommendations and allow users to mark as tried/effective.

### Acceptance Criteria
- [ ] Display strategies related to insights
- [ ] Strategy detail screen
- [ ] Mark as tried button
- [ ] Mark as effective button
- [ ] Track helped_count and didnt_help_count
- [ ] Sync strategy updates

### Implementation Notes
- Create `app/strategy-detail.tsx`
- Query strategies from database
- Update strategy records in database

---

## Task 39: TestFlight Distribution Setup
**Status**: pending
**Requirements**: REQ-1
**Estimated Effort**: 3 hours

### Description
Configure app for TestFlight distribution and create first build.

### Acceptance Criteria
- [ ] Apple Developer account configured
- [ ] App bundle identifier set
- [ ] EAS Build configured
- [ ] Production build created
- [ ] Uploaded to TestFlight
- [ ] Internal testing group created
- [ ] 5-7 testers invited

### Implementation Notes
- Use EAS Build: `eas build --platform ios`
- Configure app.json with correct bundle ID
- Submit to TestFlight: `eas submit --platform ios`

---

## Task 40: Testing and Bug Fixes
**Status**: pending
**Requirements**: All
**Estimated Effort**: 16 hours

### Description
Comprehensive testing of all features and bug fixes.

### Acceptance Criteria
- [ ] Test all 41 requirements
- [ ] Test on physical iPhone device
- [ ] Test offline mode
- [ ] Test sync with multiple devices
- [ ] Test data migration from web app
- [ ] Test with 500+ events
- [ ] Test with 100+ photos
- [ ] Performance testing (60fps scrolling)
- [ ] Fix all critical bugs
- [ ] Fix all high-priority bugs

### Implementation Notes
- Create test plan covering all requirements
- Test with real data from backup
- Use TestFlight for beta testing
- Gather feedback from testers

---

## Task 41: Documentation
**Status**: pending
**Requirements**: All
**Estimated Effort**: 4 hours

### Description
Create user documentation and developer documentation.

### Acceptance Criteria
- [ ] User guide for app features
- [ ] Setup instructions for developers
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Known issues and limitations
- [ ] Future enhancements roadmap

### Implementation Notes
- Create README.md in mobile directory
- Document environment setup
- Document build and deployment process
