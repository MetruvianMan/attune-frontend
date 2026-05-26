import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStatus, SyncResult } from '../services/sync-service';

export interface UseSyncReturn {
  status: SyncStatus;
  isSync: boolean;
  sync: () => Promise<SyncResult>;
  lastSyncFormatted: string | null;
}

export function useSync(): UseSyncReturn {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = syncService.addListener((newStatus) => {
      setStatus(newStatus);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    return await syncService.manualSync();
  }, []);

  const lastSyncFormatted = status.lastSync
    ? formatLastSync(status.lastSync)
    : null;

  return {
    status,
    isSyncing: status.status === 'syncing',
    sync,
    lastSyncFormatted,
  };
}

function formatLastSync(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}
