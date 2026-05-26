# Attune Native iOS App

A React Native mobile application for tracking neurodivergent child development, built with Expo.

## 🎯 Project Status

**Current Progress**: 3/41 tasks complete (8.0%)

### ✅ Completed
- Task 1: Project Setup (Expo, dependencies, configuration)
- Task 2: Database Schema (SQLite with 12 tables, full CRUD operations)
- Task 3: Authentication Service (JWT, auto-refresh, secure storage)

### 🚧 In Progress
- Task 4: Photo Service (next)

## 🏗️ Architecture

### Technology Stack
- **Framework**: React Native with Expo (managed workflow)
- **Language**: TypeScript
- **Database**: Expo SQLite (offline-first)
- **Storage**: Expo FileSystem (photos/documents) + SecureStore (auth tokens)
- **Navigation**: React Navigation (tab-based)
- **UI**: React Native Paper (Material Design)
- **HTTP**: Axios with authenticated client
- **State**: React Context + Hooks

### Project Structure
```
mobile/
├── models/          # TypeScript data models
├── services/        # Business logic (database, auth, sync)
├── hooks/           # Custom React hooks
├── contexts/        # React context providers
├── constants/       # App constants (API URLs, keys)
├── utils/           # Utility functions (API client)
├── docs/            # Documentation
├── app/             # Screens (Expo Router)
├── components/      # Reusable UI components
└── theme/           # Design system
```

## 🔑 Key Features

### Database Layer
- 12 SQLite tables with proper indexes
- Offline-first architecture
- Sync tracking for all mutable data
- Type-safe operations
- No storage quotas (unlimited events/photos/documents)

### Authentication
- JWT token management
- Automatic token refresh (24h before expiry)
- Secure storage in iOS Keychain
- Automatic logout on expired tokens
- React hooks for easy integration

### API Client
- Authenticated requests with auto-refresh
- 401 handling and automatic logout
- File upload with progress tracking
- 30s timeout (regular), 2min (uploads)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Xcode) or physical iPhone

### Installation
```bash
cd mobile
npm install
```

### Running the App
```bash
# iOS Simulator
npm run ios

# Physical device (requires Expo Go app)
npm start
# Scan QR code with camera
```

### Environment
The app connects to the backend at:
```
https://attune-backend-5hke.onrender.com/api
```

## 📱 Features (Planned)

### Core Functionality
- [ ] Event logging (quick-tap, manual, voice)
- [ ] Voice logging with multi-event extraction
- [ ] Photo capture and attachment
- [ ] Document upload and management
- [ ] Diary entries
- [ ] Timeline view with filtering
- [ ] AI insights and strategies
- [ ] Support network (Circle)
- [ ] AI conversation
- [ ] Glossary

### Technical Features
- [x] Offline-first operation
- [x] Automatic background sync (15min)
- [x] Multi-device support
- [x] Last-write-wins conflict resolution
- [ ] Photo compression (80% JPEG)
- [ ] Unlimited storage (no browser quotas)

## 🔐 Security

- JWT tokens stored in Expo SecureStore (iOS Keychain)
- All API calls use HTTPS
- Automatic token refresh
- Automatic logout on authentication errors
- No sensitive data in plain text

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Setup instructions and dependencies
- [PROGRESS.md](./PROGRESS.md) - Detailed progress tracking
- [docs/TASK-3-AUTH-SERVICE.md](./docs/TASK-3-AUTH-SERVICE.md) - Auth service documentation

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 📦 Building for Production

### TestFlight Distribution
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios
```

## 🤝 Contributing

This is a private project for tracking neurodivergent child development.

## 📄 License

Private - All rights reserved

## 🔗 Related

- Backend API: `https://attune-backend-5hke.onrender.com`
- Web App: `src/` directory in parent folder

---

**Bundle ID**: `com.attune.app`  
**Version**: 1.0.0  
**Platform**: iOS 15+
