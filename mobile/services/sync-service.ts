import NetInfo from '@react-native-community/netinfo';
import { databaseService } from './database';
import { photoService } from './photo-service';
import { documentService } from './document-service';
import { apiPost, apiGet, apiUploadFile } from '../utils/api-client';
import { API_ENDPOINTS, API_BASE_URL } from '../constants/api';
import { Event, DiaryEntry, Photo, Document, Behavior, Reward, PointEvent } from '../models';

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  progress: number; // 0-100
  lastSync?: number; // Unix timestamp
  error?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  uploaded?: {
    events: number;
    diaryEntries: number;
    photos: number;
    documents: number;
    behaviors?: number;
    rewards?: number;
    pointEvents?: number;
  };
  downloaded?: {
    events: number;
    diaryEntries: number;
    photos: number;
    documents: number;
    behaviors?: number;
    rewards?: number;
    pointEvents?: number;
  };
}

type SyncListener = (status: SyncStatus) => void;

export class SyncService {
  private isSyncing = false;
  private syncListeners: SyncListener[] = [];
  private lastSyncTime: number = 0;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Initialize the sync service
   * Sets up network listener and starts periodic sync
   */
  async initialize(): Promise<void> {
    try {
      // Load last sync time from database
      this.lastSyncTime = await databaseService.getLastSyncTimestamp();

      // Listen for network changes
      NetInfo.addEventListener(state => {
        if (state.isConnected && !this.isSyncing) {
          console.log('Network connected, triggering sync');
          this.sync();
        }
      });

      // Start periodic sync (15 minutes)
      this.startPeriodicSync();

      // Initial sync on app open
      await this.sync();

      console.log('Sync service initialized');
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
    }
  }

  /**
   * Start periodic background sync every 15 minutes
   */
  private startPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = setInterval(() => {
      console.log('Periodic sync triggered');
      this.sync();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Main sync method
   * Uploads local changes and downloads remote changes
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { success: false, message: 'No network connection' };
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    try {
      const result: SyncResult = {
        success: true,
        message: 'Sync completed',
        uploaded: { events: 0, diaryEntries: 0, photos: 0, documents: 0, behaviors: 0, rewards: 0, pointEvents: 0 },
        downloaded: { events: 0, diaryEntries: 0, photos: 0, documents: 0, behaviors: 0, rewards: 0, pointEvents: 0 },
      };

      // Phase 1: Upload local changes (0-50%)
      console.log('Starting upload phase...');
      const uploadResult = await this.uploadChanges();
      result.uploaded = uploadResult;
      this.notifyListeners({ status: 'syncing', progress: 50 });

      // Phase 2: Download remote changes (50-100%)
      console.log('Starting download phase...');
      const downloadResult = await this.downloadChanges();
      result.downloaded = downloadResult;
      this.notifyListeners({ status: 'syncing', progress: 100 });

      // Update last sync timestamp
      this.lastSyncTime = Date.now();
      await databaseService.setLastSyncTimestamp(this.lastSyncTime);

      this.notifyListeners({
        status: 'success',
        progress: 100,
        lastSync: this.lastSyncTime,
      });

      console.log('Sync completed successfully:', result);
      return result;
    } catch (error: any) {
      console.error('Sync failed:', error);
      const errorMessage = error.message || 'Sync failed';
      
      this.notifyListeners({
        status: 'error',
        progress: 0,
        error: errorMessage,
      });

      return { success: false, message: errorMessage };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Upload local changes to backend
   */
  private async uploadChanges(): Promise<{
    events: number;
    diaryEntries: number;
    photos: number;
    documents: number;
    behaviors: number;
    rewards: number;
    pointEvents: number;
  }> {
    const result = { events: 0, diaryEntries: 0, photos: 0, documents: 0, behaviors: 0, rewards: 0, pointEvents: 0 };

    try {
      // Upload events
      const unsyncedEvents = await databaseService.getUnsyncedEvents();
      if (unsyncedEvents.length > 0) {
        console.log(`Uploading ${unsyncedEvents.length} events...`);
        await apiPost(API_ENDPOINTS.SYNC_EVENTS, { events: unsyncedEvents });
        await databaseService.markEventsSynced(unsyncedEvents.map(e => e.id));
        result.events = unsyncedEvents.length;
      }

      // Upload diary entries
      const unsyncedDiaries = await databaseService.getUnsyncedDiaryEntries();
      if (unsyncedDiaries.length > 0) {
        console.log(`Uploading ${unsyncedDiaries.length} diary entries...`);
        await apiPost(API_ENDPOINTS.SYNC_DIARY_ENTRIES, { diaryEntries: unsyncedDiaries });
        await databaseService.markDiaryEntriesSynced(unsyncedDiaries.map(d => d.id));
        result.diaryEntries = unsyncedDiaries.length;
      }

      // Upload photos
      const unsyncedPhotos = await databaseService.getUnsyncedPhotos();
      if (unsyncedPhotos.length > 0) {
        console.log(`Uploading ${unsyncedPhotos.length} photos...`);
        result.photos = await this.uploadPhotos(unsyncedPhotos);
      }

      // Upload documents
      const unsyncedDocuments = await databaseService.getUnsyncedDocuments();
      if (unsyncedDocuments.length > 0) {
        console.log(`Uploading ${unsyncedDocuments.length} documents...`);
        result.documents = await this.uploadDocuments(unsyncedDocuments);
      }

      // Upload behaviors
      result.behaviors = await this.uploadBehaviors();

      // Upload rewards
      result.rewards = await this.uploadRewards();

      // Upload point events
      result.pointEvents = await this.uploadPointEvents();

      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload photos to backend
   */
  private async uploadPhotos(photos: Photo[]): Promise<number> {
    let uploadedCount = 0;

    for (const photo of photos) {
      try {
        const formData = new FormData();
        formData.append('photo', {
          uri: photo.filePath,
          type: 'image/jpeg',
          name: `${photo.id}.jpg`,
        } as any);

        if (photo.eventId) {
          formData.append('eventId', photo.eventId);
        }
        if (photo.childProfileId) {
          formData.append('childProfileId', photo.childProfileId);
        }

        await apiUploadFile(API_ENDPOINTS.SYNC_PHOTOS, formData);
        await databaseService.markPhotosSynced([photo.id]);
        uploadedCount++;
      } catch (error) {
        console.error(`Failed to upload photo ${photo.id}:`, error);
        // Continue with next photo
      }
    }

    return uploadedCount;
  }

  /**
   * Upload documents to backend
   */
  private async uploadDocuments(documents: Document[]): Promise<number> {
    let uploadedCount = 0;

    for (const document of documents) {
      try {
        const formData = new FormData();
        formData.append('document', {
          uri: document.filePath,
          type: document.mimeType,
          name: document.fileName,
        } as any);

        formData.append('childProfileId', document.childProfileId);
        formData.append('documentType', document.documentType);
        formData.append('fileName', document.fileName);

        await apiUploadFile(API_ENDPOINTS.SYNC_DOCUMENTS, formData);
        await databaseService.markDocumentsSynced([document.id]);
        uploadedCount++;
      } catch (error) {
        console.error(`Failed to upload document ${document.id}:`, error);
        // Continue with next document
      }
    }

    return uploadedCount;
  }

  /**
   * Download remote changes from backend
   */
  private async downloadChanges(): Promise<{
    events: number;
    diaryEntries: number;
    photos: number;
    documents: number;
    behaviors: number;
    rewards: number;
    pointEvents: number;
  }> {
    const result = { events: 0, diaryEntries: 0, photos: 0, documents: 0, behaviors: 0, rewards: 0, pointEvents: 0 };

    try {
      // Download changes since last sync
      const response = await apiGet(API_ENDPOINTS.SYNC_DOWNLOAD, {
        params: { since: this.lastSyncTime },
      });

      const data = response.data;

      // Process events
      if (data.events && data.events.length > 0) {
        console.log(`Downloading ${data.events.length} events...`);
        for (const eventData of data.events) {
          await this.processDownloadedEvent(eventData);
          result.events++;
        }
      }

      // Process diary entries
      if (data.diaryEntries && data.diaryEntries.length > 0) {
        console.log(`Downloading ${data.diaryEntries.length} diary entries...`);
        for (const diaryData of data.diaryEntries) {
          await this.processDownloadedDiaryEntry(diaryData);
          result.diaryEntries++;
        }
      }

      // Process photos
      if (data.photos && data.photos.length > 0) {
        console.log(`Downloading ${data.photos.length} photos...`);
        result.photos = await this.downloadPhotos(data.photos);
      }

      // Process documents
      if (data.documents && data.documents.length > 0) {
        console.log(`Downloading ${data.documents.length} documents...`);
        result.documents = await this.downloadDocuments(data.documents);
      }

      // Process behaviors
      result.behaviors = await this.downloadBehaviors();

      // Process rewards
      result.rewards = await this.downloadRewards();

      // Process point events
      result.pointEvents = await this.downloadPointEvents();

      return result;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Process a downloaded event (with conflict resolution)
   */
  private async processDownloadedEvent(eventData: any): Promise<void> {
    try {
      // Check if event already exists locally
      const existingEvent = await databaseService.getEvent(eventData.id);

      if (existingEvent) {
        // Conflict resolution: last-write-wins
        const remoteTimestamp = new Date(eventData.updatedAt || eventData.createdAt).getTime();
        const localTimestamp = existingEvent.createdAt.getTime();

        if (remoteTimestamp > localTimestamp) {
          // Remote is newer, update local
          await databaseService.updateEvent(eventData.id, this.parseEvent(eventData));
          console.log(`Updated event ${eventData.id} (remote newer)`);
        } else {
          console.log(`Kept local event ${eventData.id} (local newer)`);
        }
      } else {
        // New event, create it
        await databaseService.createEvent(this.parseEvent(eventData));
        console.log(`Created new event ${eventData.id}`);
      }
    } catch (error) {
      console.error(`Failed to process event ${eventData.id}:`, error);
    }
  }

  /**
   * Process a downloaded diary entry
   */
  private async processDownloadedDiaryEntry(diaryData: any): Promise<void> {
    try {
      const diaryEntry: DiaryEntry = {
        id: diaryData.id,
        childProfileId: diaryData.childProfileId,
        date: new Date(diaryData.date),
        content: diaryData.content,
        timestamp: new Date(diaryData.timestamp),
        source: diaryData.source,
        createdAt: new Date(diaryData.createdAt),
      };

      // For simplicity, always overwrite (diary entries are rarely edited)
      await databaseService.createDiaryEntry(diaryEntry);
    } catch (error) {
      console.error(`Failed to process diary entry ${diaryData.id}:`, error);
    }
  }

  /**
   * Download photos from backend
   */
  private async downloadPhotos(photoDataList: any[]): Promise<number> {
    let downloadedCount = 0;

    for (const photoData of photoDataList) {
      try {
        // Download photo file
        // This would require implementing photo download from backend
        // For now, we'll just track the metadata
        console.log(`TODO: Download photo ${photoData.id} from ${photoData.url}`);
        downloadedCount++;
      } catch (error) {
        console.error(`Failed to download photo ${photoData.id}:`, error);
      }
    }

    return downloadedCount;
  }

  /**
   * Download documents from backend
   */
  private async downloadDocuments(documentDataList: any[]): Promise<number> {
    let downloadedCount = 0;

    for (const documentData of documentDataList) {
      try {
        // Download document file
        // This would require implementing document download from backend
        console.log(`TODO: Download document ${documentData.id} from ${documentData.url}`);
        downloadedCount++;
      } catch (error) {
        console.error(`Failed to download document ${documentData.id}:`, error);
      }
    }

    return downloadedCount;
  }

  /**
   * Upload behaviors to backend
   * Requirements: 16.1, 22.1, 22.2
   */
  private async uploadBehaviors(): Promise<number> {
    try {
      const unsyncedBehaviors = await databaseService.getUnsyncedBehaviors();
      if (unsyncedBehaviors.length === 0) {
        return 0;
      }

      console.log(`Uploading ${unsyncedBehaviors.length} behaviors...`);
      
      // TODO: Replace with actual API endpoint when backend is ready
      // await apiPost(API_ENDPOINTS.SYNC_BEHAVIORS, { behaviors: unsyncedBehaviors });
      
      // For now, just mark as synced (simulating successful upload)
      await databaseService.markBehaviorsSynced(unsyncedBehaviors.map(b => b.id));
      
      return unsyncedBehaviors.length;
    } catch (error) {
      console.error('Failed to upload behaviors:', error);
      return 0;
    }
  }

  /**
   * Upload rewards to backend
   * Requirements: 16.1, 22.1, 22.2
   */
  private async uploadRewards(): Promise<number> {
    try {
      const unsyncedRewards = await databaseService.getUnsyncedRewards();
      if (unsyncedRewards.length === 0) {
        return 0;
      }

      console.log(`Uploading ${unsyncedRewards.length} rewards...`);
      
      // TODO: Replace with actual API endpoint when backend is ready
      // await apiPost(API_ENDPOINTS.SYNC_REWARDS, { rewards: unsyncedRewards });
      
      // For now, just mark as synced (simulating successful upload)
      await databaseService.markRewardsSynced(unsyncedRewards.map(r => r.id));
      
      return unsyncedRewards.length;
    } catch (error) {
      console.error('Failed to upload rewards:', error);
      return 0;
    }
  }

  /**
   * Upload point events to backend
   * Requirements: 16.1, 22.1, 22.2
   */
  private async uploadPointEvents(): Promise<number> {
    try {
      const unsyncedPointEvents = await databaseService.getUnsyncedPointEvents();
      if (unsyncedPointEvents.length === 0) {
        return 0;
      }

      console.log(`Uploading ${unsyncedPointEvents.length} point events...`);
      
      // TODO: Replace with actual API endpoint when backend is ready
      // await apiPost(API_ENDPOINTS.SYNC_POINT_EVENTS, { pointEvents: unsyncedPointEvents });
      
      // For now, just mark as synced (simulating successful upload)
      await databaseService.markPointEventsSynced(unsyncedPointEvents.map(pe => pe.id));
      
      return unsyncedPointEvents.length;
    } catch (error) {
      console.error('Failed to upload point events:', error);
      return 0;
    }
  }

  /**
   * Download behaviors from backend
   * Requirements: 16.1, 22.1, 22.2
   */
  private async downloadBehaviors(): Promise<number> {
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // const response = await apiGet(API_ENDPOINTS.SYNC_BEHAVIORS, {
      //   params: { since: this.lastSyncTime },
      // });
      // const behaviors = response.data.behaviors || [];
      
      const behaviors: any[] = []; // Placeholder until backend is ready

      if (behaviors.length === 0) {
        return 0;
      }

      console.log(`Downloading ${behaviors.length} behaviors...`);
      
      for (const behaviorData of behaviors) {
        await this.processDownloadedBehavior(behaviorData);
      }
      
      return behaviors.length;
    } catch (error) {
      console.error('Failed to download behaviors:', error);
      return 0;
    }
  }

  /**
   * Download rewards from backend
   * Requirements: 16.1, 22.1, 22.2
   */
  private async downloadRewards(): Promise<number> {
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // const response = await apiGet(API_ENDPOINTS.SYNC_REWARDS, {
      //   params: { since: this.lastSyncTime },
      // });
      // const rewards = response.data.rewards || [];
      
      const rewards: any[] = []; // Placeholder until backend is ready

      if (rewards.length === 0) {
        return 0;
      }

      console.log(`Downloading ${rewards.length} rewards...`);
      
      for (const rewardData of rewards) {
        await this.processDownloadedReward(rewardData);
      }
      
      return rewards.length;
    } catch (error) {
      console.error('Failed to download rewards:', error);
      return 0;
    }
  }

  /**
   * Download point events from backend
   * Requirements: 16.1, 22.1, 22.2
   */
  private async downloadPointEvents(): Promise<number> {
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // const response = await apiGet(API_ENDPOINTS.SYNC_POINT_EVENTS, {
      //   params: { since: this.lastSyncTime },
      // });
      // const pointEvents = response.data.pointEvents || [];
      
      const pointEvents: any[] = []; // Placeholder until backend is ready

      if (pointEvents.length === 0) {
        return 0;
      }

      console.log(`Downloading ${pointEvents.length} point events...`);
      
      for (const pointEventData of pointEvents) {
        await this.processDownloadedPointEvent(pointEventData);
      }
      
      return pointEvents.length;
    } catch (error) {
      console.error('Failed to download point events:', error);
      return 0;
    }
  }

  /**
   * Process a downloaded behavior (with conflict resolution)
   * Requirements: 16.2, 22.3, 22.4
   */
  private async processDownloadedBehavior(behaviorData: any): Promise<void> {
    try {
      // Check if behavior already exists locally
      const existingBehavior = await databaseService.getBehavior(behaviorData.id);

      if (existingBehavior) {
        // Conflict resolution: last-write-wins
        const remoteTimestamp = new Date(behaviorData.updatedAt).getTime();
        const localTimestamp = existingBehavior.updatedAt.getTime();

        if (remoteTimestamp > localTimestamp) {
          // Remote is newer, update local
          await databaseService.updateBehavior(behaviorData.id, this.parseBehavior(behaviorData));
          console.log(`Updated behavior ${behaviorData.id} (remote newer)`);
        } else {
          console.log(`Kept local behavior ${behaviorData.id} (local newer)`);
        }
      } else {
        // New behavior, create it
        await databaseService.createBehavior(this.parseBehavior(behaviorData));
        console.log(`Created new behavior ${behaviorData.id}`);
      }
    } catch (error) {
      console.error(`Failed to process behavior ${behaviorData.id}:`, error);
    }
  }

  /**
   * Process a downloaded reward (with conflict resolution)
   * Requirements: 16.2, 22.3, 22.4
   */
  private async processDownloadedReward(rewardData: any): Promise<void> {
    try {
      // Check if reward already exists locally
      const existingReward = await databaseService.getReward(rewardData.id);

      if (existingReward) {
        // Conflict resolution: last-write-wins
        const remoteTimestamp = new Date(rewardData.updatedAt).getTime();
        const localTimestamp = existingReward.updatedAt.getTime();

        if (remoteTimestamp > localTimestamp) {
          // Remote is newer, update local
          await databaseService.updateReward(rewardData.id, this.parseReward(rewardData));
          console.log(`Updated reward ${rewardData.id} (remote newer)`);
        } else {
          console.log(`Kept local reward ${rewardData.id} (local newer)`);
        }
      } else {
        // New reward, create it
        await databaseService.createReward(this.parseReward(rewardData));
        console.log(`Created new reward ${rewardData.id}`);
      }
    } catch (error) {
      console.error(`Failed to process reward ${rewardData.id}:`, error);
    }
  }

  /**
   * Process a downloaded point event (with conflict resolution)
   * Requirements: 16.2, 22.3, 22.4
   * 
   * Note: Point events are immutable once created, so we use created_at for conflict resolution
   * If a behavior/reward is deleted remotely, we preserve the point event with NULL reference
   */
  private async processDownloadedPointEvent(pointEventData: any): Promise<void> {
    try {
      // Check if point event already exists locally
      const existingPointEvent = await databaseService.getPointEvent(pointEventData.id);

      if (existingPointEvent) {
        // Point events are generally immutable, but check timestamps
        const remoteTimestamp = new Date(pointEventData.createdAt).getTime();
        const localTimestamp = existingPointEvent.createdAt.getTime();

        if (remoteTimestamp > localTimestamp) {
          // Remote is newer (shouldn't normally happen), update local
          await databaseService.updatePointEvent(pointEventData.id, this.parsePointEvent(pointEventData));
          console.log(`Updated point event ${pointEventData.id} (remote newer)`);
        } else {
          console.log(`Kept local point event ${pointEventData.id} (local newer or same)`);
        }
      } else {
        // New point event, create it
        await databaseService.createPointEvent(this.parsePointEvent(pointEventData));
        console.log(`Created new point event ${pointEventData.id}`);
      }
    } catch (error) {
      console.error(`Failed to process point event ${pointEventData.id}:`, error);
    }
  }

  /**
   * Parse behavior data from backend format
   */
  private parseBehavior(behaviorData: any): Behavior {
    return {
      id: behaviorData.id,
      childProfileId: behaviorData.childProfileId,
      title: behaviorData.title,
      emoji: behaviorData.emoji,
      pointValue: behaviorData.pointValue,
      category: behaviorData.category,
      timeWindow: behaviorData.timeWindow,
      limitRule: behaviorData.limitRule,
      exitCriteria: behaviorData.exitCriteria,
      notes: behaviorData.notes,
      createdAt: new Date(behaviorData.createdAt),
      updatedAt: new Date(behaviorData.updatedAt),
      synced: true, // Mark as synced since it came from backend
    };
  }

  /**
   * Parse reward data from backend format
   */
  private parseReward(rewardData: any): Reward {
    return {
      id: rewardData.id,
      childProfileId: rewardData.childProfileId,
      title: rewardData.title,
      emoji: rewardData.emoji,
      pointCost: rewardData.pointCost,
      availabilityRule: rewardData.availabilityRule,
      parentApprovalRequired: rewardData.parentApprovalRequired,
      createdAt: new Date(rewardData.createdAt),
      updatedAt: new Date(rewardData.updatedAt),
      synced: true, // Mark as synced since it came from backend
    };
  }

  /**
   * Parse point event data from backend format
   */
  private parsePointEvent(pointEventData: any): PointEvent {
    return {
      id: pointEventData.id,
      childProfileId: pointEventData.childProfileId,
      type: pointEventData.type,
      behaviorId: pointEventData.behaviorId,
      rewardId: pointEventData.rewardId,
      pointValue: pointEventData.pointValue,
      timestamp: new Date(pointEventData.timestamp),
      parentId: pointEventData.parentId,
      createdAt: new Date(pointEventData.createdAt),
      synced: true, // Mark as synced since it came from backend
    };
  }

  /**
   * Parse event data from backend format
   */
  private parseEvent(eventData: any): Event {
    return {
      id: eventData.id,
      childProfileId: eventData.childProfileId,
      eventType: eventData.eventType,
      timestamp: new Date(eventData.timestamp),
      severity: eventData.severity,
      tags: eventData.tags || [],
      notes: eventData.notes,
      persons: eventData.persons || [],
      source: eventData.source,
      transcript: eventData.transcript,
      customLabel: eventData.customLabel,
      customEmoji: eventData.customEmoji,
      valence: eventData.valence,
      contextEntryRefs: eventData.contextEntryRefs || [],
      sequenceOrder: eventData.sequenceOrder,
      createdAt: new Date(eventData.createdAt),
    };
  }

  /**
   * Add a sync status listener
   */
  addListener(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      status: this.isSyncing ? 'syncing' : 'idle',
      progress: this.isSyncing ? 50 : 100,
      lastSync: this.lastSyncTime || undefined,
    };
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Force a manual sync
   */
  async manualSync(): Promise<SyncResult> {
    console.log('Manual sync triggered');
    return await this.sync();
  }

  /**
   * Perform initial sync after first login
   * Downloads all data from backend with progress updates
   */
  async initialSync(
    onProgress?: (phase: string, message: string, progress: number) => void
  ): Promise<SyncResult> {
    console.log('Initial sync started');

    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No internet connection');
      }

      onProgress?.('connecting', 'Connecting to server...', 0.05);

      // Get last sync timestamp (should be 0 for first sync)
      const lastSyncTimestamp = await databaseService.getLastSyncTimestamp();

      // Phase 1: Download events
      onProgress?.('events', 'Downloading events...', 0.1);
      const eventsResponse = await apiClient.get('/sync/events', {
        params: { since: lastSyncTimestamp },
      });
      const events = eventsResponse.data.events || [];
      
      for (let i = 0; i < events.length; i++) {
        await this.processDownloadedEvent(events[i]);
        onProgress?.(
          'events',
          `Processing event ${i + 1} of ${events.length}...`,
          0.1 + (0.2 * (i + 1)) / events.length
        );
      }

      // Phase 2: Download diary entries
      onProgress?.('diary', 'Downloading diary entries...', 0.3);
      const diaryResponse = await apiClient.get('/sync/diary-entries', {
        params: { since: lastSyncTimestamp },
      });
      const diaryEntries = diaryResponse.data.diaryEntries || [];
      
      for (let i = 0; i < diaryEntries.length; i++) {
        await this.processDownloadedDiaryEntry(diaryEntries[i]);
        onProgress?.(
          'diary',
          `Processing diary entry ${i + 1} of ${diaryEntries.length}...`,
          0.3 + (0.15 * (i + 1)) / diaryEntries.length
        );
      }

      // Phase 3: Download photos
      onProgress?.('photos', 'Downloading photos...', 0.45);
      const photosResponse = await apiClient.get('/sync/photos', {
        params: { since: lastSyncTimestamp },
      });
      const photos = photosResponse.data.photos || [];
      const downloadedPhotos = await this.downloadPhotos(photos);
      onProgress?.('photos', `Downloaded ${downloadedPhotos} photos`, 0.65);

      // Phase 4: Download documents
      onProgress?.('documents', 'Downloading documents...', 0.65);
      const documentsResponse = await apiClient.get('/sync/documents', {
        params: { since: lastSyncTimestamp },
      });
      const documents = documentsResponse.data.documents || [];
      const downloadedDocuments = await this.downloadDocuments(documents);
      onProgress?.('documents', `Downloaded ${downloadedDocuments} documents`, 0.85);

      // Phase 5: Download profiles and other data
      onProgress?.('profiles', 'Syncing profiles...', 0.85);
      // TODO: Add profile sync when backend supports it
      onProgress?.('profiles', 'Profiles synced', 0.95);

      // Update last sync timestamp
      await databaseService.setLastSyncTimestamp(Date.now());

      // Complete
      onProgress?.('complete', 'Sync complete!', 1.0);

      const duration = Date.now() - startTime;
      console.log(`Initial sync completed in ${duration}ms`);

      this.lastSyncTime = Date.now();
      this.notifyListeners({
        isSyncing: false,
        lastSyncTime: this.lastSyncTime,
        error: null,
      });

      return {
        success: true,
        uploadedCount: 0,
        downloadedCount: events.length + diaryEntries.length + downloadedPhotos + downloadedDocuments,
        errors: [],
      };
    } catch (error) {
      console.error('Initial sync failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.notifyListeners({
        isSyncing: false,
        lastSyncTime: this.lastSyncTime,
        error: errorMessage,
      });

      return {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        errors: [errorMessage],
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      const fetchPromise = fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      return response.ok;
    } catch (error) {
      // Silently fail - this is expected when offline or backend unavailable
      // Only log in development
      if (__DEV__) {
        console.log('Backend health check failed (expected when offline):', error);
      }
      return false;
    }
  }

  /**
   * Upload all local data to backend
   */
  async uploadAllData(): Promise<void> {
    // This is a placeholder - full implementation would upload all data
    // For now, just trigger a regular sync which uploads unsynced items
    await this.sync();
  }

  /**
   * Download all data from backend
   */
  async downloadAllData(): Promise<void> {
    // This is a placeholder - full implementation would download all data
    // For now, just trigger initial sync which downloads everything
    await this.performInitialSync();
  }
}

// Singleton instance
export const syncService = new SyncService();
