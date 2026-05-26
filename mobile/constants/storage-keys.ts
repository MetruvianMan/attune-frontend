// SecureStore keys for sensitive data
export const SECURE_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  TOKEN_EXPIRY: 'token_expiry',
  USER_EMAIL: 'user_email',
} as const;

// AsyncStorage keys for non-sensitive data
export const STORAGE_KEYS = {
  CHILD_PROFILE_ID: 'child_profile_id',
  LAST_SYNC_TIME: 'last_sync_time',
  APP_VERSION: 'app_version',
} as const;
