import 'dotenv/config';

// Determine app name and bundle ID based on build variant
const getAppName = () => {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT;
  
  if (variant === 'dev-sqlite') {
    return 'Attune';
  } else if (variant === 'dev-supabase') {
    return 'Attune SBDev';
  }
  
  // Default to production name
  return 'Attune Cloud';
};

const getBundleIdentifier = () => {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT;
  
  if (variant === 'dev-sqlite') {
    return 'com.violin125.attune.dev';
  } else if (variant === 'dev-supabase') {
    return 'com.violin125.attune.dev.supabase';
  }
  
  // Default to production bundle ID
  return 'com.violin125.attune.cloud';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'attune-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: getBundleIdentifier(),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.violin125.attune',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          // Used ONLY for one-time Location.geocodeAsync() lookups when a
          // Parent types a city/region into a Saved Place's optional
          // "region hint" field (see mobile/services/location-service.ts's
          // geocodeRegionHint) - converting that typed text into an
          // approximate lat/long for the Location Map's pin layout. This
          // app never calls getCurrentPositionAsync/watchPositionAsync or
          // any other live-location API, and never tracks the device's
          // real position - see Requirement 9.3 (Non-Goals) in
          // .kiro/specs/family-location-tracking/requirements.md.
          // locationWhenInUsePermission (not locationAlwaysAndWhenInUse)
          // is intentional - foreground-only matches this one-shot,
          // user-initiated lookup; there is no background use case here.
          locationWhenInUsePermission: 'Attune uses your device\'s location services only to look up the approximate coordinates of a place name you type in (e.g. "Aspen") when adding a Saved Place, so it can be shown on the Location Map. Attune never tracks or records your actual location.',
        },
      ],
      [
        'expo-splash-screen',
        {
          // attune_splash_lockup.png bakes the logo + "Attune" wordmark
          // into ONE image (native splash is static-image-only - it
          // can't render live text, so the wordmark can't show up
          // during this phase any other way). app/_layout.tsx's JS
          // overlay renders this exact same file at this exact same
          // SPLASH_IMAGE_WIDTH, so the two phases are pixel-for-pixel
          // identical and can't drift apart in size the way the old
          // separate-native-image + separate-live-text setup did
          // (reported as a visible big-logo-then-small-logo jump after
          // the first production build).
          image: './assets/attune_splash_lockup.png',
          backgroundColor: '#ffffff',
          resizeMode: 'contain',
          imageWidth: 220,
        },
      ],
    ],
    scheme: 'attune',
    extra: {
      eas: {
        projectId: '9b1899c4-b17b-48b3-8ad2-15d8ecec95e7',
      },
      USE_SUPABASE_DB: process.env.EXPO_PUBLIC_USE_SUPABASE_DB || 'true',
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      // Read OpenAI key from .env at build time (never committed to git)
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      // Backend URL for document text extraction
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
    },
    owner: 'violin125',
  },
};
