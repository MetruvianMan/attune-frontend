# Requirements Document

## Introduction

This document specifies the requirements for converting the Attune web application to a native iOS app using React Native and Expo. The native app will provide unlimited photo and document storage, automatic multi-device sync, offline support, and a true mobile experience for parents tracking their child's neurodivergent journey.

### Background

The current Attune web application is a TypeScript/Vite application with comprehensive event logging, AI insights, and document management. It uses browser IndexedDB and localStorage for data persistence, which has proven inadequate for mobile use due to storage quota limitations (only 10 photos and 2 documents before hitting limits). The backend is a Node.js/Express API deployed on Render with JWT authentication, sync endpoints, and file storage capabilities.

Parents currently access the app via localhost:3003 on a laptop or through a deployed web app at attune-frontend.onrender.com. Both parents need to track events, upload photos and documents, and access AI-powered insights about their child (Robbie). The web app has experienced auth token expiration issues, mobile Safari compatibility problems, and manual sync requirements that make multi-device usage impractical.

### Problem Statement

The browser-based architecture creates three critical problems:
1. **Storage Quotas**: Browser storage limits prevent storing more than 10 photos and 2 documents, making the app unusable for comprehensive tracking
2. **Manual Sync**: Users must manually upload and download data, leading to data inconsistency between devices
3. **Poor Mobile Experience**: Mobile Safari has tab navigation issues, login problems, and frequent auth token expiration errors

### Solution Overview

A native iOS app built with React Native and Expo will eliminate storage quotas, provide automatic background sync, enable offline-first operation, and deliver a true mobile experience. The app will use the existing backend API without requiring backend changes, preserve all existing data during migration, and support simultaneous use by both parents on their iPhones.

### Key Decisions

- **Platform**: iOS 15+ only (iPhone, portrait orientation)
- **Technology**: React Native with Expo managed workflow, TypeScript
- **Photo Compression**: 80% JPEG quality for balance of quality and file size
- **Sync Frequency**: Every 15 minutes when active + immediate on app open + pull-to-refresh
- **Conflict Resolution**: Last-write-wins for MVP
- **Distribution**: TestFlight for 5-7 testers (parents, nannies, friends)
- **Push Notifications**: Post-MVP (not in initial release)

## Glossary

- **Attune_App**: The native iOS application for tracking neurodivergent child development
- **Backend_API**: The existing Node.js/Express server deployed on Render
- **Sync_Service**: The component responsible for synchronizing data between devices and the backend
- **Local_Store**: The SQLite database and file system storage on the iOS device
- **Auth_Token**: JWT token used for authenticating API requests
- **Sync_Queue**: The queue of local changes waiting to be uploaded to the backend
- **Event**: A logged occurrence (meltdown, positive behavior, sleep, etc.) with timestamp and metadata
- **Photo**: An image file attached to an event or profile, stored as JPEG
- **Document**: A file (PDF, image) archived in the Documents tab
- **Child_Profile**: The profile data for the child being tracked (name, photo, preferences)
- **Relationship_Person**: A person in the child's support network (parent, teacher, therapist, etc.)
- **Insight**: AI-generated observation about patterns or trends in the child's data
- **Strategy**: AI-recommended intervention or approach based on observed patterns
- **Conversation_Session**: A chat conversation with the AI assistant
- **Glossary_Term**: A neurodiversity-related term with definition and context
- **Quick_Tap_Button**: A customizable one-tap button for logging common events
- **Context_Entry**: A logged context factor (environment, people present, activities)
- **Archived_Document**: A document stored in the Documents tab with metadata
- **Keychain**: iOS secure storage for sensitive data like auth tokens
- **TestFlight**: Apple's beta testing platform for distributing pre-release apps
- **Expo**: A framework and platform for building React Native applications
- **Pull_To_Refresh**: A gesture to manually trigger data sync by pulling down on a list

## Requirements


### Requirement 1: App Installation and Authentication

**User Story:** As a parent, I want to install the app from TestFlight and login with my existing account, so that I can access all my child's data on my iPhone.

#### Acceptance Criteria

1. THE Attune_App SHALL be installable via TestFlight on iOS 15+ devices
2. WHEN the Attune_App launches for the first time, THE Attune_App SHALL display a login screen
3. WHEN a user enters valid email and password credentials, THE Attune_App SHALL authenticate with the Backend_API and receive an Auth_Token
4. WHEN authentication succeeds, THE Attune_App SHALL store the Auth_Token in the Keychain
5. WHEN the Auth_Token is within 24 hours of expiration, THE Attune_App SHALL refresh the Auth_Token automatically
6. IF authentication fails, THEN THE Attune_App SHALL display a clear error message indicating invalid credentials
7. WHEN a user is authenticated, THE Attune_App SHALL remain logged in across app restarts

### Requirement 2: Initial Data Sync

**User Story:** As a parent, I want all my existing data to download when I first login, so that I can see my child's complete history immediately.

#### Acceptance Criteria

1. WHEN a user logs in for the first time, THE Sync_Service SHALL download all data from the Backend_API
2. WHILE the initial sync is in progress, THE Attune_App SHALL display a progress indicator showing sync status
3. THE Sync_Service SHALL download events, Child_Profile, Relationship_Person records, Archived_Document records, Conversation_Session records, Glossary_Term records, Insight records, Strategy records, Context_Entry records, and Quick_Tap_Button configurations
4. WHEN the initial sync completes, THE Attune_App SHALL store all data in the Local_Store
5. WHEN the initial sync completes, THE Attune_App SHALL display the Today tab with all downloaded data
6. IF the initial sync fails, THEN THE Attune_App SHALL display an error message and provide a retry option
7. THE initial sync SHALL complete within 30 seconds for a dataset containing 100 events, 50 photos, and 20 documents

### Requirement 3: Photo Download and Storage

**User Story:** As a parent, I want all photos to download automatically, so that I can view them offline without manual downloads.

#### Acceptance Criteria

1. WHEN the Sync_Service downloads Event records or Child_Profile records containing photo references, THE Sync_Service SHALL download the corresponding photo files from the Backend_API
2. THE Sync_Service SHALL store downloaded photos in the Local_Store file system
3. WHEN a photo download completes, THE Attune_App SHALL update the corresponding Event or Child_Profile record with the local file path
4. IF a photo download fails, THEN THE Sync_Service SHALL retry the download with exponential backoff up to 3 attempts
5. WHILE photos are downloading, THE Attune_App SHALL display placeholder images with download progress indicators
6. THE Attune_App SHALL handle at least 100 photos totaling 100MB without performance degradation

### Requirement 4: Document Download and Storage

**User Story:** As a parent, I want all documents to download automatically, so that I can access them offline.

#### Acceptance Criteria

1. WHEN the Sync_Service downloads Archived_Document records, THE Sync_Service SHALL download the corresponding document files from the Backend_API
2. THE Sync_Service SHALL store downloaded documents in the Local_Store file system
3. WHEN a document download completes, THE Attune_App SHALL update the Archived_Document record with the local file path
4. IF a document download fails, THEN THE Sync_Service SHALL retry the download with exponential backoff up to 3 attempts
5. THE Attune_App SHALL handle at least 50 documents totaling 50MB without performance degradation

### Requirement 5: Tab Navigation

**User Story:** As a parent, I want to navigate between all seven tabs, so that I can access all features of the app.

#### Acceptance Criteria

1. THE Attune_App SHALL display a tab bar with seven tabs: Today, Timeline, Circle, Conversation, Glossary, Documents, and Profile
2. WHEN a user taps a tab, THE Attune_App SHALL navigate to that tab within 100ms
3. THE Attune_App SHALL maintain each tab's scroll position when switching between tabs
4. THE Attune_App SHALL display the Today tab by default when the app launches
5. WHEN a user switches tabs, THE Attune_App SHALL preserve any unsaved form data in the previous tab

### Requirement 6: Today Tab Features

**User Story:** As a parent, I want to quickly log events and see today's summary, so that I can capture moments as they happen.

#### Acceptance Criteria

1. THE Today tab SHALL display quick-tap buttons for common events
2. THE Today tab SHALL display a voice logging button
3. THE Today tab SHALL display a manual entry button
4. THE Today tab SHALL display today's event summary showing event count by type
5. THE Today tab SHALL display the most recent Insight
6. WHEN a user taps a Quick_Tap_Button, THE Attune_App SHALL create an Event with the current timestamp and save it to the Local_Store
7. WHEN a user taps the voice logging button, THE Attune_App SHALL navigate to the voice logging screen

### Requirement 7: Timeline Tab Features

**User Story:** As a parent, I want to view all events in chronological order with filtering, so that I can review my child's history.

#### Acceptance Criteria

1. THE Timeline tab SHALL display all Event records in reverse chronological order
2. THE Timeline tab SHALL display event type, timestamp, description, and attached photos for each Event
3. THE Timeline tab SHALL provide filter controls for event type, date range, and tags
4. WHEN a user applies a filter, THE Timeline tab SHALL display only Event records matching the filter criteria
5. WHEN a user taps an Event, THE Attune_App SHALL navigate to the event detail screen
6. THE Timeline tab SHALL support pull-to-refresh to trigger manual sync
7. THE Timeline tab SHALL scroll smoothly at 60fps with 500+ Event records

### Requirement 8: Circle Tab Features

**User Story:** As a parent, I want to view and manage my child's support network, so that I can track relationships and interactions.

#### Acceptance Criteria

1. THE Circle tab SHALL display all Relationship_Person records
2. THE Circle tab SHALL display name, role, photo, and relationship strength for each Relationship_Person
3. WHEN a user taps a Relationship_Person, THE Attune_App SHALL navigate to the relationship detail screen
4. THE Circle tab SHALL provide an add button to create new Relationship_Person records
5. THE Circle tab SHALL support pull-to-refresh to trigger manual sync

### Requirement 9: Conversation Tab Features

**User Story:** As a parent, I want to chat with the AI assistant, so that I can get insights and advice about my child.

#### Acceptance Criteria

1. THE Conversation tab SHALL display all Conversation_Session records
2. THE Conversation tab SHALL display a button to start a new Conversation_Session
3. WHEN a user taps a Conversation_Session, THE Attune_App SHALL navigate to the conversation detail screen showing all messages
4. WHEN a user sends a message in a Conversation_Session, THE Attune_App SHALL save the message to the Local_Store and send it to the Backend_API
5. WHEN the Backend_API returns an AI response, THE Attune_App SHALL display the response in the conversation
6. IF the device is offline, THEN THE Attune_App SHALL display a message indicating that AI features require internet connectivity

### Requirement 10: Glossary Tab Features

**User Story:** As a parent, I want to browse neurodiversity terms and definitions, so that I can better understand my child's experiences.

#### Acceptance Criteria

1. THE Glossary tab SHALL display all Glossary_Term records
2. THE Glossary tab SHALL display term name and a brief definition for each Glossary_Term
3. WHEN a user taps a Glossary_Term, THE Attune_App SHALL navigate to the term detail screen showing the full definition and context
4. THE Glossary tab SHALL provide a search field to filter Glossary_Term records by name or definition
5. THE Glossary tab SHALL support pull-to-refresh to trigger manual sync

### Requirement 11: Documents Tab Features

**User Story:** As a parent, I want to view and manage archived documents, so that I can access important files about my child.

#### Acceptance Criteria

1. THE Documents tab SHALL display all Archived_Document records
2. THE Documents tab SHALL display document name, type, upload date, and thumbnail for each Archived_Document
3. WHEN a user taps an Archived_Document, THE Attune_App SHALL open the document viewer
4. THE Documents tab SHALL provide an add button to upload new documents
5. THE Documents tab SHALL support pull-to-refresh to trigger manual sync
6. THE Attune_App SHALL display PDF and image documents in the document viewer

### Requirement 12: Profile Tab Features

**User Story:** As a parent, I want to view and edit my child's profile and app settings, so that I can keep information current.

#### Acceptance Criteria

1. THE Profile tab SHALL display the Child_Profile including name, photo, birthdate, and preferences
2. THE Profile tab SHALL provide an edit button to modify Child_Profile fields
3. THE Profile tab SHALL display sync status showing last sync time and sync errors
4. THE Profile tab SHALL provide a manual sync button
5. THE Profile tab SHALL provide a logout button
6. WHEN a user taps the logout button, THE Attune_App SHALL clear the Auth_Token from the Keychain and navigate to the login screen


### Requirement 13: Photo Capture and Upload

**User Story:** As a parent, I want to take photos with my camera or select from my photo library, so that I can attach visual context to events.

#### Acceptance Criteria

1. WHEN a user adds or edits an Event, THE Attune_App SHALL provide a button to add photos
2. WHEN a user taps the add photo button, THE Attune_App SHALL display options to take a photo or select from the photo library
3. WHEN a user selects "take photo", THE Attune_App SHALL open the native camera interface
4. WHEN a user captures a photo, THE Attune_App SHALL compress the photo to 80% JPEG quality
5. WHEN a user selects "photo library", THE Attune_App SHALL open the native photo picker
6. WHEN a user selects a photo from the library, THE Attune_App SHALL compress the photo to 80% JPEG quality
7. WHEN a photo is added to an Event, THE Attune_App SHALL save the photo to the Local_Store and add it to the Sync_Queue
8. WHEN the Sync_Service processes the Sync_Queue, THE Sync_Service SHALL upload the photo to the Backend_API
9. THE Attune_App SHALL display a progress indicator while photos are uploading
10. IF a photo upload fails, THEN THE Sync_Service SHALL retry the upload with exponential backoff up to 3 attempts

### Requirement 14: Document Upload

**User Story:** As a parent, I want to upload documents from my Files app or take photos of documents, so that I can archive important files.

#### Acceptance Criteria

1. WHEN a user is on the Documents tab, THE Attune_App SHALL provide an add button to upload documents
2. WHEN a user taps the add document button, THE Attune_App SHALL display options to select a file or take a photo
3. WHEN a user selects "select file", THE Attune_App SHALL open the native document picker
4. WHEN a user selects a document, THE Attune_App SHALL save the document to the Local_Store and add it to the Sync_Queue
5. WHEN a user selects "take photo", THE Attune_App SHALL open the native camera interface
6. WHEN a user captures a photo of a document, THE Attune_App SHALL save the photo as a document to the Local_Store and add it to the Sync_Queue
7. WHEN the Sync_Service processes the Sync_Queue, THE Sync_Service SHALL upload the document to the Backend_API
8. IF a document upload fails, THEN THE Sync_Service SHALL retry the upload with exponential backoff up to 3 attempts

### Requirement 15: Event Creation and Editing

**User Story:** As a parent, I want to create and edit events with full details, so that I can capture comprehensive information about my child's experiences.

#### Acceptance Criteria

1. WHEN a user taps the manual entry button on the Today tab, THE Attune_App SHALL navigate to the event creation screen
2. THE event creation screen SHALL provide fields for event type, timestamp, description, tags, context, and photos
3. THE event creation screen SHALL provide native date and time pickers for the timestamp field
4. WHEN a user saves an Event, THE Attune_App SHALL validate that required fields are populated
5. WHEN validation succeeds, THE Attune_App SHALL save the Event to the Local_Store and add it to the Sync_Queue
6. WHEN a user taps an existing Event, THE Attune_App SHALL navigate to the event detail screen
7. THE event detail screen SHALL provide an edit button
8. WHEN a user edits an Event and saves changes, THE Attune_App SHALL update the Event in the Local_Store and add the change to the Sync_Queue

### Requirement 16: Voice Logging with Multi-Event Extraction

**User Story:** As a parent, I want to speak freely about my day and have the system automatically extract multiple events with checkboxes, so that I can log a full day's worth of events in one voice session.

#### Acceptance Criteria

1. WHEN a user taps the voice logging button, THE Attune_App SHALL start recording audio immediately
2. WHEN a user taps stop recording, THE Attune_App SHALL send the audio to the Backend_API for transcription
3. WHEN the Backend_API returns the transcript, THE Attune_App SHALL send the transcript to the Backend_API for event extraction
4. WHEN the Backend_API returns extracted events, THE Attune_App SHALL display a review screen with:
   - The full transcript text (editable)
   - A checkbox to save the transcript as a diary entry
   - A list of extracted events, each with:
     - A checkbox (checked by default) to include/exclude the event
     - An emoji picker button to customize the event emoji
     - An editable event type dropdown
     - An editable description field
     - A valence selector (positive/neutral/negative)
5. WHEN a user taps save, THE Attune_App SHALL:
   - Save the diary entry if the diary checkbox is checked
   - Save each checked event with its customized properties to the Local_Store
   - Add all saved items to the Sync_Queue
6. THE Attune_App SHALL support extracting 1-10 events from a single voice log
7. IF the device is offline, THEN THE Attune_App SHALL display a message indicating that voice logging requires internet connectivity
8. WHEN a user edits the transcript text, THE Attune_App SHALL provide a "Re-extract events" button to re-run event extraction on the edited transcript

### Requirement 17: Automatic Background Sync

**User Story:** As a parent, I want my changes to sync automatically in the background, so that I don't have to manually upload and download data.

#### Acceptance Criteria

1. WHILE the Attune_App is in the foreground, THE Sync_Service SHALL sync with the Backend_API every 15 minutes
2. WHEN the Attune_App transitions from background to foreground, THE Sync_Service SHALL sync with the Backend_API immediately
3. WHEN the Sync_Service syncs, THE Sync_Service SHALL upload all items in the Sync_Queue to the Backend_API
4. WHEN the Sync_Service syncs, THE Sync_Service SHALL download all changes from the Backend_API since the last sync
5. WHEN the Sync_Service downloads changes, THE Sync_Service SHALL update the Local_Store with the new data
6. THE Sync_Service SHALL track the last sync timestamp for incremental sync
7. WHEN a sync completes successfully, THE Attune_App SHALL update the sync status indicator with the current timestamp
8. IF a sync fails, THEN THE Sync_Service SHALL retry with exponential backoff starting at 30 seconds

### Requirement 18: Manual Sync Trigger

**User Story:** As a parent, I want to manually trigger a sync, so that I can ensure my latest changes are uploaded immediately.

#### Acceptance Criteria

1. WHEN a user performs a pull-to-refresh gesture on the Timeline, Circle, Glossary, or Documents tab, THE Sync_Service SHALL sync with the Backend_API immediately
2. WHEN a user taps the manual sync button on the Profile tab, THE Sync_Service SHALL sync with the Backend_API immediately
3. WHILE a manual sync is in progress, THE Attune_App SHALL display a sync indicator
4. WHEN a manual sync completes, THE Attune_App SHALL display a success message
5. IF a manual sync fails, THEN THE Attune_App SHALL display an error message with details

### Requirement 19: Offline Support

**User Story:** As a parent, I want to use the app offline and have my changes sync when I'm back online, so that I can log events anywhere.

#### Acceptance Criteria

1. WHEN the device has no network connectivity, THE Attune_App SHALL display an offline indicator
2. WHILE the device is offline, THE Attune_App SHALL allow users to create, edit, and delete Event records, Relationship_Person records, and other data
3. WHEN a user makes changes while offline, THE Attune_App SHALL save the changes to the Local_Store and add them to the Sync_Queue
4. WHEN network connectivity is restored, THE Sync_Service SHALL sync with the Backend_API automatically
5. WHILE the device is offline, THE Attune_App SHALL display cached data from the Local_Store
6. IF a user attempts to use AI features while offline, THEN THE Attune_App SHALL display a message indicating that AI features require internet connectivity

### Requirement 20: Sync Conflict Resolution

**User Story:** As a parent, I want conflicts between my changes and my spouse's changes to be resolved automatically, so that we can both use the app without coordination.

#### Acceptance Criteria

1. WHEN the Sync_Service downloads a change from the Backend_API that conflicts with a local change in the Sync_Queue, THE Sync_Service SHALL resolve the conflict using last-write-wins strategy
2. WHEN applying last-write-wins, THE Sync_Service SHALL compare timestamps and keep the change with the later timestamp
3. WHEN a conflict is resolved, THE Sync_Service SHALL update the Local_Store with the winning change
4. WHEN a conflict is resolved, THE Sync_Service SHALL remove the losing change from the Sync_Queue
5. THE Sync_Service SHALL log all conflict resolutions for debugging purposes

### Requirement 21: Multi-User Access

**User Story:** As a parent, I want my spouse to be able to install the app and see all the same data, so that we can both track our child's progress.

#### Acceptance Criteria

1. WHEN multiple users authenticate with the same account credentials, THE Backend_API SHALL return the same data to all users
2. WHEN one user creates or modifies data, THE Sync_Service SHALL upload the change to the Backend_API
3. WHEN another user syncs, THE Sync_Service SHALL download the change and update their Local_Store
4. THE Attune_App SHALL support simultaneous use by multiple users without data loss
5. WHEN both users modify the same data while offline, THE Sync_Service SHALL resolve conflicts using last-write-wins strategy

### Requirement 22: Photo Viewing

**User Story:** As a parent, I want to view photos full-screen with zoom, so that I can see details clearly.

#### Acceptance Criteria

1. WHEN a user taps a photo in an Event or Child_Profile, THE Attune_App SHALL display the photo full-screen
2. WHILE viewing a photo full-screen, THE Attune_App SHALL support pinch-to-zoom gestures
3. WHILE viewing a photo full-screen, THE Attune_App SHALL support swipe gestures to dismiss
4. WHEN a user swipes down, THE Attune_App SHALL dismiss the full-screen photo view and return to the previous screen

### Requirement 23: AI Insight Generation

**User Story:** As a parent, I want the app to generate weekly insights about my child's patterns, so that I can understand trends and make informed decisions.

#### Acceptance Criteria

1. THE Attune_App SHALL display the most recent Insight on the Today tab
2. WHEN a user taps an Insight, THE Attune_App SHALL navigate to the insight detail screen showing the full insight text and related Event records
3. THE Attune_App SHALL sync Insight records generated by the Backend_API
4. THE Attune_App SHALL display Insight records in reverse chronological order

### Requirement 24: Strategy Recommendations

**User Story:** As a parent, I want the app to recommend strategies based on observed patterns, so that I can try evidence-based interventions.

#### Acceptance Criteria

1. THE Attune_App SHALL sync Strategy records generated by the Backend_API
2. WHEN a user views an Insight, THE Attune_App SHALL display related Strategy records
3. WHEN a user taps a Strategy, THE Attune_App SHALL navigate to the strategy detail screen showing the full strategy description and implementation guidance
4. THE Attune_App SHALL allow users to mark Strategy records as tried or effective


### Requirement 25: Quick-Tap Button Customization

**User Story:** As a parent, I want to customize quick-tap buttons for my most common events, so that I can log events with one tap.

#### Acceptance Criteria

1. THE Attune_App SHALL sync Quick_Tap_Button configurations from the Backend_API
2. THE Today tab SHALL display all configured Quick_Tap_Button records
3. WHEN a user taps a Quick_Tap_Button, THE Attune_App SHALL create an Event with the button's configured event type and timestamp
4. THE Attune_App SHALL allow users to add, edit, and remove Quick_Tap_Button configurations
5. WHEN a user modifies Quick_Tap_Button configurations, THE Attune_App SHALL save the changes to the Local_Store and add them to the Sync_Queue

### Requirement 26: Context Entry Logging

**User Story:** As a parent, I want to log contextual factors like environment and people present, so that I can identify triggers and patterns.

#### Acceptance Criteria

1. WHEN a user creates or edits an Event, THE Attune_App SHALL provide a context field
2. THE context field SHALL allow users to select or enter environment, people present, activities, and other contextual factors
3. WHEN a user saves an Event with context, THE Attune_App SHALL create Context_Entry records and associate them with the Event
4. THE Attune_App SHALL sync Context_Entry records with the Backend_API
5. WHEN viewing an Event, THE Attune_App SHALL display all associated Context_Entry records

### Requirement 27: Diary Entries

**User Story:** As a parent, I want to save voice transcripts as diary entries separate from events, so that I can keep a narrative log of my day without affecting event-based analytics.

#### Acceptance Criteria

1. WHEN a user completes a voice log, THE Attune_App SHALL provide a checkbox option to "Save as diary entry"
2. WHEN the diary checkbox is checked and the user saves, THE Attune_App SHALL create a DiaryEntry record with the transcript text and timestamp
3. THE Attune_App SHALL display diary entries on the Today tab for the corresponding date
4. THE Attune_App SHALL allow users to edit diary entry text after creation
5. THE Attune_App SHALL allow users to delete diary entries
6. THE Attune_App SHALL sync DiaryEntry records with the Backend_API
7. DIARY entries SHALL NOT affect mood grades or event-based analytics
8. THE Attune_App SHALL display diary entries in a visually distinct section from events

### Requirement 28: Data Preservation During Migration

**User Story:** As a parent, I want all my existing data from the web app to be preserved, so that I don't lose weeks of tracking history.

#### Acceptance Criteria

1. THE Backend_API SHALL accept data uploads from the web app
2. WHEN a user uploads data from the web app to the Backend_API, THE Backend_API SHALL store all Event records, Child_Profile data, Relationship_Person records, Archived_Document records, Conversation_Session records, Glossary_Term records, Insight records, Strategy records, Context_Entry records, and Quick_Tap_Button configurations
3. WHEN a user logs into the Attune_App for the first time, THE Sync_Service SHALL download all data from the Backend_API including data uploaded from the web app
4. THE Attune_App SHALL display all migrated data correctly in all tabs
5. THE Attune_App SHALL preserve all photo and document references from the web app

### Requirement 29: Secure Token Storage

**User Story:** As a parent, I want my authentication token stored securely, so that my family's private data is protected.

#### Acceptance Criteria

1. WHEN the Attune_App receives an Auth_Token from the Backend_API, THE Attune_App SHALL store the Auth_Token in the Keychain
2. THE Attune_App SHALL encrypt all data at rest in the Local_Store
3. THE Attune_App SHALL use HTTPS for all network requests to the Backend_API
4. THE Attune_App SHALL clear the Auth_Token from the Keychain when a user logs out
5. IF the Auth_Token is compromised or expired, THEN THE Attune_App SHALL require the user to re-authenticate

### Requirement 30: Error Handling and Recovery

**User Story:** As a parent, I want the app to handle errors gracefully and recover automatically, so that I don't lose data or get stuck.

#### Acceptance Criteria

1. IF a network request fails, THEN THE Attune_App SHALL display a clear error message indicating the failure reason
2. IF a sync fails, THEN THE Sync_Service SHALL retry with exponential backoff starting at 30 seconds up to 5 minutes
3. IF the Local_Store becomes corrupted, THEN THE Attune_App SHALL attempt to recover by re-downloading data from the Backend_API
4. IF the Attune_App crashes, THEN THE Attune_App SHALL preserve all unsaved changes in the Sync_Queue
5. WHEN the Attune_App restarts after a crash, THE Attune_App SHALL resume normal operation without data loss

### Requirement 31: Performance Requirements

**User Story:** As a parent, I want the app to be fast and responsive, so that I can log events quickly without waiting.

#### Acceptance Criteria

1. THE Attune_App SHALL launch within 2 seconds on iPhone 12 or newer
2. WHEN a user taps a tab, THE Attune_App SHALL switch tabs within 100ms
3. THE Timeline tab SHALL scroll smoothly at 60fps with 500 Event records
4. WHEN a user saves an Event, THE Attune_App SHALL save to the Local_Store within 200ms
5. THE Attune_App SHALL compress and save photos within 1 second
6. THE initial sync SHALL complete within 30 seconds for a dataset containing 100 events, 50 photos, and 20 documents

### Requirement 32: Storage Management

**User Story:** As a parent, I want the app to manage storage efficiently, so that I don't run out of space on my device.

#### Acceptance Criteria

1. THE Attune_App SHALL store photos and documents in the Local_Store file system
2. THE Attune_App SHALL compress photos to 80% JPEG quality before storing
3. THE Attune_App SHALL display storage usage in the Profile tab showing total size of photos and documents
4. THE Attune_App SHALL handle at least 100 photos totaling 100MB without performance degradation
5. THE Attune_App SHALL handle at least 50 documents totaling 50MB without performance degradation
6. WHERE storage space is limited, THE Attune_App SHALL provide an option to delete local photos and documents while preserving references

### Requirement 33: Sync Status Visibility

**User Story:** As a parent, I want to see sync status at all times, so that I know when my changes are uploaded and when new data is available.

#### Acceptance Criteria

1. THE Attune_App SHALL display a sync status indicator showing last sync time
2. WHILE a sync is in progress, THE sync status indicator SHALL display "Syncing..."
3. WHEN a sync completes successfully, THE sync status indicator SHALL display "Last synced: [timestamp]"
4. IF a sync fails, THEN THE sync status indicator SHALL display "Sync failed: [error message]"
5. THE sync status indicator SHALL be visible on the Profile tab
6. WHEN items are in the Sync_Queue, THE sync status indicator SHALL display the count of pending changes

### Requirement 34: Native iOS UI Patterns

**User Story:** As a parent, I want the app to feel like a native iOS app, so that it's familiar and easy to use.

#### Acceptance Criteria

1. THE Attune_App SHALL use native iOS navigation patterns including tab bar and stack navigation
2. THE Attune_App SHALL use native iOS UI components including buttons, switches, pickers, and text fields
3. THE Attune_App SHALL support pull-to-refresh gestures on list views
4. THE Attune_App SHALL support swipe gestures for dismissing modals and navigating back
5. THE Attune_App SHALL use native iOS date and time pickers
6. THE Attune_App SHALL follow iOS Human Interface Guidelines for spacing, typography, and colors
7. THE Attune_App SHALL support iOS dark mode

### Requirement 35: TestFlight Distribution

**User Story:** As a parent, I want to distribute the app to my spouse and trusted testers via TestFlight, so that we can all use the app before public release.

#### Acceptance Criteria

1. THE Attune_App SHALL be buildable for TestFlight distribution
2. THE Attune_App SHALL include all required metadata for TestFlight including app name, version, and build number
3. THE Attune_App SHALL be installable via TestFlight on iOS 15+ devices
4. THE Attune_App SHALL support up to 10 TestFlight testers
5. WHEN a new build is uploaded to TestFlight, THE Attune_App SHALL notify testers of the update

### Requirement 36: Relationship Management

**User Story:** As a parent, I want to add and edit people in my child's support network, so that I can track relationships and interactions.

#### Acceptance Criteria

1. WHEN a user taps the add button on the Circle tab, THE Attune_App SHALL navigate to the relationship creation screen
2. THE relationship creation screen SHALL provide fields for name, role, photo, relationship strength, and notes
3. WHEN a user saves a Relationship_Person, THE Attune_App SHALL save it to the Local_Store and add it to the Sync_Queue
4. WHEN a user taps an existing Relationship_Person, THE Attune_App SHALL navigate to the relationship detail screen
5. THE relationship detail screen SHALL provide an edit button
6. WHEN a user edits a Relationship_Person and saves changes, THE Attune_App SHALL update it in the Local_Store and add the change to the Sync_Queue

### Requirement 37: Document Synthesis

**User Story:** As a parent, I want to see AI-generated synthesis of my archived documents, so that I can understand key themes across multiple documents.

#### Acceptance Criteria

1. THE Attune_App SHALL sync document synthesis data from the Backend_API
2. WHEN a user views the Documents tab, THE Attune_App SHALL display a synthesis section showing cross-document insights
3. WHEN a user taps a synthesis insight, THE Attune_App SHALL navigate to a detail screen showing the full synthesis and related Archived_Document records
4. IF the device is offline, THEN THE Attune_App SHALL display cached synthesis data

### Requirement 38: Glossary Search

**User Story:** As a parent, I want to search the glossary, so that I can quickly find definitions for specific terms.

#### Acceptance Criteria

1. THE Glossary tab SHALL provide a search field at the top of the screen
2. WHEN a user types in the search field, THE Attune_App SHALL filter Glossary_Term records to show only terms matching the search query
3. THE search SHALL match against term name and definition text
4. WHEN a user clears the search field, THE Attune_App SHALL display all Glossary_Term records
5. THE search SHALL be case-insensitive

### Requirement 39: Event Filtering

**User Story:** As a parent, I want to filter events by type and date range, so that I can focus on specific patterns.

#### Acceptance Criteria

1. THE Timeline tab SHALL provide filter controls for event type and date range
2. WHEN a user selects an event type filter, THE Timeline tab SHALL display only Event records of that type
3. WHEN a user selects a date range filter, THE Timeline tab SHALL display only Event records within that date range
4. WHEN a user applies multiple filters, THE Timeline tab SHALL display only Event records matching all filter criteria
5. WHEN a user clears filters, THE Timeline tab SHALL display all Event records
6. THE Attune_App SHALL persist filter selections across app restarts

### Requirement 40: Photo Compression Quality

**User Story:** As a parent, I want photos compressed to balance quality and file size, so that sync is fast but photos are still clear.

#### Acceptance Criteria

1. WHEN a user captures or selects a photo, THE Attune_App SHALL compress the photo to 80% JPEG quality
2. THE compressed photo SHALL be visually indistinguishable from the original at typical viewing sizes
3. THE compressed photo SHALL be approximately 50-70% smaller than the original file size
4. THE Attune_App SHALL preserve photo orientation and EXIF metadata during compression

### Requirement 41: Logout and Session Management

**User Story:** As a parent, I want to logout securely, so that my family's data is protected if my phone is lost or stolen.

#### Acceptance Criteria

1. WHEN a user taps the logout button on the Profile tab, THE Attune_App SHALL display a confirmation dialog
2. WHEN a user confirms logout, THE Attune_App SHALL clear the Auth_Token from the Keychain
3. WHEN a user confirms logout, THE Attune_App SHALL optionally clear all data from the Local_Store
4. WHEN logout completes, THE Attune_App SHALL navigate to the login screen
5. IF the Auth_Token expires, THEN THE Attune_App SHALL automatically logout and navigate to the login screen

