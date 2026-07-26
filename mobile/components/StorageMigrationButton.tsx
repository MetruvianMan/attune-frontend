import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, ProgressBar } from 'react-native-paper';
import { runCompleteMigration } from '../scripts/migrate-photos-to-storage';
import { colors } from '../constants/theme';

interface StorageMigrationButtonProps {
  childProfileId: string;
}

export function StorageMigrationButton({ childProfileId }: StorageMigrationButtonProps) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const handleMigration = async () => {
    Alert.alert(
      'Migrate Photos & Documents',
      'This will upload all photos and documents to cloud storage. This may take a few minutes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Migration',
          onPress: async () => {
            setMigrating(true);
            setProgress(0);
            setStatusMessage('Starting migration...');

            try {
              const result = await runCompleteMigration(
                childProfileId,
                (message) => {
                  setStatusMessage(message);
                  // Parse progress from message if possible
                  const match = message.match(/(\d+)\/(\d+)/);
                  if (match) {
                    const current = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    setProgress(current / total);
                  }
                }
              );

              setMigrating(false);
              setProgress(1);

              Alert.alert(
                'Migration Complete',
                `Photos: ${result.photosUploaded}/${result.photosProcessed} uploaded\n` +
                `Documents: ${result.documentsUploaded}/${result.documentsProcessed} uploaded\n` +
                (result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : '')
              );
            } catch (error) {
              setMigrating(false);
              Alert.alert('Migration Failed', `Error: ${error}`);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📤 Cloud Storage Migration</Text>
      <Text style={styles.description}>
        Upload photos and documents to cloud storage for multi-device access
      </Text>

      {migrating && (
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} color={colors.primary} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}

      <Button
        mode="contained"
        onPress={handleMigration}
        disabled={migrating}
        style={styles.button}
      >
        {migrating ? 'Migrating...' : 'Upload to Cloud Storage'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  button: {
    borderRadius: 8,
  },
});
