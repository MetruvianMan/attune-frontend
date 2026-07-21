// API Configuration
// Use environment variable for local development, fallback to production
const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://attune-backend-5hke.onrender.com';
export const API_BASE_URL = `${backendUrl}/api`;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REFRESH_TOKEN: '/auth/refresh',
  
  // Sync
  SYNC_EVENTS: '/sync/events',
  SYNC_DIARY_ENTRIES: '/sync/diary-entries',
  SYNC_PHOTOS: '/sync/photos',
  SYNC_DOCUMENTS: '/sync/documents',
  SYNC_DOWNLOAD: '/sync/download',
  SYNC_INITIAL: '/sync/initial',
  
  // Voice
  VOICE_TRANSCRIBE: '/voice/transcribe',
  VOICE_EXTRACT_EVENTS: '/voice/extract-events',
  
  // Conversation
  CONVERSATION_MESSAGE: '/conversation/message',
} as const;

export const TOKEN_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
