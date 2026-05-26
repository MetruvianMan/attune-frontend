import { Redirect, Stack } from 'expo-router';
import { useAuthContext } from '../../contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect to tabs if already authenticated
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
