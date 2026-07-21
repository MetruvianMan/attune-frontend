import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { DateNavigationProvider } from '../contexts/DateNavigationContext';
import { databaseService } from '../services/database';
import { useFonts } from 'expo-font';
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

  // Load Chivo font
  const [fontsLoaded] = useFonts({
    Chivo_300Light,
    Chivo_300Light_Italic,
    Chivo_400Regular,
    Chivo_400Regular_Italic,
    Chivo_700Bold,
    Chivo_700Bold_Italic,
    Chivo_900Black,
    Chivo_900Black_Italic,
  });

  useEffect(() => {
    initializeApp();
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

  if (!isInitialized || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Initializing Attune...
        </Text>
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
            <DateNavigationProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </DateNavigationProvider>
          </AuthProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
