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
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
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
    plugins: ['expo-router'],
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
