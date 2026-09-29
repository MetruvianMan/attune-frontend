import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { DateNavigationProvider } from '../contexts/DateNavigationContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { databaseService } from '../services/database';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import {
  Chivo_300Light,
  Chivo_300Light_Italic,
  Chivo_400Regular,
  Chivo_400Regular_Italic,
  Chivo_700Bold,
  Chivo_700Bold_Italic,
  Chivo_900Black,
  Chivo_900Black_Italic,
} from '@expo-google-fonts/chivo';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito';

// Same file, same width, as the `expo-splash-screen` config plugin entry
// in app.config.js/app.json - this file has the "Attune" wordmark baked
// directly into the image (native splash is static-image-only, it can't
// render live Nunito text), and both phases of the splash (native, then
// this JS overlay) render this exact asset at this exact size so they
// can never visually mismatch the way the separate-native-image +
// separate-live-text setup did (reported as a visible big-logo-then-
// small-logo jump in the first production build).
const SPLASH_IMAGE = require('../assets/attune_splash_lockup.png');
const SPLASH_IMAGE_WIDTH = 220;
// Matches the source asset's aspect ratio (686x772) so the JS overlay's
// <Image> doesn't stretch/distort it.
const SPLASH_IMAGE_ASPECT = 772 / 686;

// Keep the native splash screen (white background + logo/wordmark lockup,
// see app.config.js's expo-splash-screen plugin config) visible until we
// explicitly hide it below, instead of letting it auto-hide the instant
// the first frame is ready to render. Without this, the splash could
// disappear almost immediately on a fast device/warm start, which isn't
// the deliberate "briefly show the logo" moment the app wants on open.
// Must be called at module scope, before the app registers - see
// https://docs.expo.dev/versions/latest/sdk/splash-screen/.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Only fails if called after the splash already auto-hid (e.g. Fast
  // Refresh during development) - safe to ignore.
});

// Minimum time the splash stays on screen, from app launch. Not "however
// long initialization happens to take" - initialization (fonts, DB) can
// finish well under a second on a warm start, which would otherwise make
// the splash flash by almost instantly. 1000ms matches a standard splash
// duration and the "about a full second" ask.
const MIN_SPLASH_DURATION_MS = 1000;

// Custom theme with teal primary color for react-native-paper v4
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4A90E2',
    accent: '#7FBF9F',
  },
};

// Polyfill for DOMRect (required by react-native-paper)
if (typeof global.DOMRect === 'undefined') {
  global.DOMRect = class DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;

    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.right = x + width;
      this.bottom = y + height;
      this.left = x;
    }

    toJSON() {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        top: this.top,
        right: this.right,
        bottom: this.bottom,
        left: this.left,
      };
    }
  };
}

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  // True until the custom splash overlay below has held for at least
  // MIN_SPLASH_DURATION_MS - separate from isLoading (fonts+DB+image
  // ready). isLoading gates when it's SAFE to render the real app;
  // showSplash gates how long the branded splash stays visible once
  // it's safe to hand off. Both the pre-handoff (isLoading) and
  // post-handoff (showSplash) states render the exact same baked
  // logo+wordmark image now, so there's no visible seam between "native
  // splash showing" and "JS overlay showing" - see SPLASH_IMAGE above.
  const [showSplash, setShowSplash] = useState(true);
  // True once the splash lockup PNG has been fully decoded and is
  // guaranteed ready to paint - see the preload effect below. Without
  // this, the JS overlay's own <Image> could still be decoding on its
  // first render, causing a flash of blank white before it pops in.
  const [splashImagePreloaded, setSplashImagePreloaded] = useState(false);

  // Load Chivo (body UI font, used throughout the rest of the app) +
  // Nunito (used by AttuneBrandMark, kept available for reuse elsewhere
  // e.g. an About/Profile screen - the splash itself no longer needs
  // live text, see SPLASH_IMAGE above).
  const [fontsLoaded] = useFonts({
    Chivo_300Light,
    Chivo_300Light_Italic,
    Chivo_400Regular,
    Chivo_400Regular_Italic,
    Chivo_700Bold,
    Chivo_700Bold_Italic,
    Chivo_900Black,
    Chivo_900Black_Italic,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    initializeApp();

    // Preload/decode the splash lockup image ahead of the JS overlay's
    // first render, so it's guaranteed ready to paint immediately
    // instead of popping in a moment later.
    Asset.fromModule(SPLASH_IMAGE)
      .downloadAsync()
      .then(() => setSplashImagePreloaded(true))
      .catch((error) => {
        console.error('Failed to preload splash image:', error);
        setSplashImagePreloaded(true); // Don't block the splash forever if this fails
      });
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await databaseService.initialize();
      
      // Initialize sync service (will start background sync)
      // syncService will be initialized when user logs in
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown error');
      setIsInitialized(true); // Allow app to load even if init fails
    }
  };

  const isLoading = !isInitialized || !fontsLoaded || !splashImagePreloaded;

  // The moment it's safe to render real content (fonts + DB + splash
  // image all ready), hand off from the native OS splash to this
  // component's own full-screen overlay below - rendering the identical
  // baked logo+wordmark image, so the handoff is visually seamless.
  // Then hold that overlay for a full MIN_SPLASH_DURATION_MS measured
  // from THIS moment (not app launch - see splashStartTimeRef above for
  // why), so the overlay's visible duration is a consistent ~1s no
  // matter how long initialization itself took.
  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync().catch(() => {});

    // This effect only fires once, exactly when isLoading first flips to
    // false, so a plain fixed-duration timer here already measures from
    // "the moment it's safe to render the overlay" - no need to track a
    // separate start timestamp. Network-dependent init (Supabase) taking
    // a while no longer eats into this budget, since the clock doesn't
    // start until init is actually done.
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, MIN_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    // Underneath the still-visible native splash (same
    // attune_splash_lockup.png, from the expo-splash-screen config
    // plugin) until the effect above fires. Rendering nothing here
    // (rather than an ActivityIndicator or any other placeholder) keeps
    // this frame visually identical to the native splash still showing
    // through/underneath it - any other content here would itself
    // create a brief mismatched flash before splashImagePreloaded even
    // has a chance to flip.
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  if (showSplash) {
    // Fonts + DB + the splash image are all ready here. Render the same
    // baked logo+wordmark lockup the native splash just showed, at the
    // same width, so the handoff from native splash to this JS overlay
    // is visually seamless - then hold for the remainder of the ~1s
    // MIN_SPLASH_DURATION_MS.
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Image
          source={SPLASH_IMAGE}
          style={{ width: SPLASH_IMAGE_WIDTH, height: SPLASH_IMAGE_WIDTH * SPLASH_IMAGE_ASPECT }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#C75C5C', marginBottom: 8 }}>
          Initialization Error
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          {initError}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <ProfileProvider>
              <DateNavigationProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </DateNavigationProvider>
            </ProfileProvider>
          </AuthProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
