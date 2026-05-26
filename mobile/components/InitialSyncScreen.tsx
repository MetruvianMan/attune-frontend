import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, Button, Card } from 'react-native-paper';

interface InitialSyncScreenProps {
  onComplete: () => void;
  onRetry?: () => void;
}

export interface SyncProgress {
  phase: 'connecting' | 'events' | 'diary' | 'photos' | 'documents' | 'profiles' | 'complete' | 'error';
  message: string;
  progress: number; // 0-1
  error?: string;
}

export function InitialSyncScreen({ onComplete, onRetry }: InitialSyncScreenProps) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    phase: 'connecting',
    message: 'Connecting to server...',
    progress: 0,
  });

  const getPhaseLabel = (phase: SyncProgress['phase']): string => {
    const labels: Record<SyncProgress['phase'], string> = {
      connecting: 'Connecting',
      events: 'Syncing Events',
      diary: 'Syncing Diary Entries',
      photos: 'Downloading Photos',
      documents: 'Downloading Documents',
      profiles: 'Syncing Profiles',
      complete: 'Complete',
      error: 'Error',
    };
    return labels[phase];
  };

  useEffect(() => {
    if (syncProgress.phase === 'complete') {
      // Small delay before calling onComplete for better UX
      const timer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [syncProgress.phase, onComplete]);

  // This component receives updates via setSyncProgress from parent
  // Export the setter so parent can update progress
  useEffect(() => {
    // Store the setter in a way the parent can access it
    if (typeof window !== 'undefined') {
      (window as any).__setSyncProgress = setSyncProgress;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__setSyncProgress;
      }
    };
  }, []);

  const isError = syncProgress.phase === 'error';
  const isComplete = syncProgress.phase === 'complete';

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            {isError ? '⚠️ Sync Failed' : isComplete ? '✅ Sync Complete' : '🔄 Initial Sync'}
          </Text>

          {!isError && !isComplete && (
            <>
              <Text variant="titleMedium" style={styles.phase}>
                {getPhaseLabel(syncProgress.phase)}
              </Text>

              <ProgressBar
                progress={syncProgress.progress}
                style={styles.progressBar}
                color="#6200ee"
              />

              <Text variant="bodyMedium" style={styles.message}>
                {syncProgress.message}
              </Text>

              <Text variant="bodySmall" style={styles.progressText}>
                {Math.round(syncProgress.progress * 100)}% complete
              </Text>
            </>
          )}

          {isError && (
            <>
              <Text variant="bodyLarge" style={styles.errorMessage}>
                {syncProgress.error || 'An error occurred during sync'}
              </Text>

              <Text variant="bodyMedium" style={styles.errorHelp}>
                Please check your internet connection and try again.
              </Text>

              <Button
                mode="contained"
                onPress={onRetry}
                style={styles.retryButton}
                icon="refresh"
              >
                Retry Sync
              </Button>
            </>
          )}

          {isComplete && (
            <Text variant="bodyLarge" style={styles.completeMessage}>
              Your data has been synced successfully!
            </Text>
          )}
        </Card.Content>
      </Card>

      {!isError && !isComplete && (
        <Text variant="bodySmall" style={styles.footer}>
          This may take a few moments...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  phase: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  message: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  progressText: {
    textAlign: 'center',
    color: '#999',
  },
  errorMessage: {
    textAlign: 'center',
    color: '#F44336',
    marginBottom: 16,
  },
  errorHelp: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 8,
  },
  completeMessage: {
    textAlign: 'center',
    color: '#4CAF50',
    marginTop: 16,
  },
  footer: {
    marginTop: 24,
    color: '#999',
    textAlign: 'center',
  },
});
