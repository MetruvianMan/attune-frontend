import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSync } from '../hooks/useSync';

export interface SyncStatusIndicatorProps {
  showLastSync?: boolean;
  showSyncButton?: boolean;
  compact?: boolean;
}

export function SyncStatusIndicator({
  showLastSync = true,
  showSyncButton = true,
  compact = false,
}: SyncStatusIndicatorProps) {
  const { status, isSyncing, sync, lastSyncFormatted } = useSync();

  const handleSync = async () => {
    if (!isSyncing) {
      await sync();
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'syncing':
        return '#2196F3'; // Blue
      case 'success':
        return '#4CAF50'; // Green
      case 'error':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'syncing':
        return `Syncing... ${status.progress}%`;
      case 'success':
        return 'Synced';
      case 'error':
        return status.error || 'Sync failed';
      default:
        return 'Not synced';
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={getStatusColor()} />
        ) : (
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor() },
            ]}
          />
        )}
        {showSyncButton && !isSyncing && (
          <IconButton
            icon="sync"
            size={20}
            onPress={handleSync}
            style={styles.compactButton}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={getStatusColor()} />
        ) : (
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor() },
            ]}
          />
        )}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {showLastSync && lastSyncFormatted && !isSyncing && (
        <Text style={styles.lastSyncText}>
          Last synced {lastSyncFormatted}
        </Text>
      )}

      {showSyncButton && (
        <TouchableOpacity
          onPress={handleSync}
          disabled={isSyncing}
          style={styles.syncButton}
        >
          <IconButton
            icon="sync"
            size={24}
            disabled={isSyncing}
          />
          <Text style={styles.syncButtonText}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}

      {status.status === 'error' && status.error && (
        <Text style={styles.errorText}>{status.error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 18,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: -8,
  },
  compactButton: {
    margin: 0,
    padding: 0,
  },
  syncButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: -4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 8,
    marginLeft: 18,
  },
});
