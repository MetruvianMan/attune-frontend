import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
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
import { AttuneBrandMark } from '../components/AttuneBrandMark';

// Keep the native splash screen (white background + Attune logo, see
// app.config.js's `splash` config and assets/splash.png) visible until we
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
  // MIN_SPLASH_DURATION_MS - separate from isLoading (fonts+DB ready).
  // Two different things intentionally: isLoading gates when it's SAFE
  // to render the real app (fonts loaded, DB initialized); showSplash
  // gates how long the branded splash (logo + "Attune" wordmark) stays
  // visible once it's safe to do so. The native OS splash (app.config.js
  // -> assets/splash.png, image-only, no wordmark - a static image can't
  // render live text in Nunito) covers the screen for whatever brief
  // moment isLoading is still true; this JS overlay takes over the
  // instant it's safe to and finishes out the rest of the ~1s hold with
  // the full logo+wordmark lockup, which requires Nunito to already be
  // loaded - guaranteed true here since this only renders once isLoading
  // is false.
  const [showSplash, setShowSplash] = useState(true);
  // True once the logo PNG has been fully decoded and is guaranteed
  // ready to paint - see the preload effect below. Without this, the
  // <Image> in AttuneBrandMark could still be decoding on its first
  // render (a real, sizeable PNG, not instant) while the "Attune" text
  // next to it paints immediately, producing exactly the "wordmark then
  // logo, one after another" sequencing that was reported - text draws
  // in the same frame it's asked to, image decode does not.
  const [logoPreloaded, setLogoPreloaded] = useState(false);

  // Load Chivo (body UI font) + Nunito (used for the "Attune" wordmark on
  // the splash screen and anywhere else AttuneBrandMark is used).
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

    // Preload/decode the splash logo image ahead of the first render of
    // AttuneBrandMark, so it's guaranteed ready to paint in the same
    // frame as the wordmark text rather than popping in a moment later.
    Asset.fromModule(require('../assets/attune_logo_transparent.png'))
      .downloadAsync()
      .then(() => setLogoPreloaded(true))
      .catch((error) => {
        console.error('Failed to preload splash logo:', error);
        setLogoPreloaded(true); // Don't block the splash forever if this fails
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

  const isLoading = !isInitialized || !fontsLoaded || !logoPreloaded;

  // The moment it's safe to render real content (fonts + DB + logo image
  // all ready), hand off from the native OS splash (image-only, can't
  // show live text) to this component's own full-screen overlay below -
  // which CAN render the "Attune" wordmark in Nunito, and is guaranteed
  // to paint the logo image in the same frame as the wordmark since it's
  // already decoded by this point. Then hold that overlay for a full
  // MIN_SPLASH_DURATION_MS measured from THIS moment (not app launch -
  // see splashStartTimeRef above for why), so the overlay's visible
  // duration is a consistent ~1s no matter how long initialization
  // itself took.
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
    // Underneath the still-visible native splash (image-only: logo on
    // white, from app.config.js/assets/splash.png) until the effect
    // above fires - this fallback's own background just needs to not
    // visibly clash during that brief overlap, so it also uses white
    // rather than the app's usual off-white bg. No wordmark here (fonts
    // aren't guaranteed loaded yet) - that's the whole reason this hands
    // off to the showSplash overlay below instead of trying to render
    // the full lockup in this branch.
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (showSplash) {
    // Fonts + DB are ready here, so the full logo + "Attune" wordmark
    // lockup (in real Nunito text, not baked into an image) can render
    // for the remainder of the ~1s hold.
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <AttuneBrandMark />
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
