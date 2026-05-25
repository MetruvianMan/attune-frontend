/**
 * IndexedDB-based persistent storage
 * Replaces localStorage with a more robust solution for mobile apps
 */

const DB_NAME = 'attune-app-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-data';

export class IndexedDBStore {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          console.log('[IndexedDB] Object store created');
        }
      };
    });
  }

  async save(key: string, data: unknown): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, key);

      request.onsuccess = () => {
        console.log('[IndexedDB] Data saved successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to save data:', request.error);
        reject(request.error);
      };
    });
  }

  async load(key: string): Promise<unknown | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to load data:', request.error);
        reject(request.error);
      };
    });
  }

  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[IndexedDB] Data cleared successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to clear data:', request.error);
        reject(request.error);
      };
    });
  }
}
