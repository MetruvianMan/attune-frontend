import type { DataStore } from './data-store.js';
import type { Event } from '@src/models/index.js';
import { IndexedDBStore } from './indexed-db-store.js';

/**
 * Export all events for a child profile as a CSV string and trigger download.
 */
export function exportEventsToCSV(dataStore: DataStore, childProfileId: string, childName: string): void {
  const events = dataStore.getEvents({ childProfileId });
  if (events.length === 0) {
    alert('No events to export.');
    return;
  }

  // CSV header
  const headers = ['Date', 'Time', 'Event Type', 'Severity', 'Notes', 'Tags', 'Source', 'Transcript'];
  const rows = events
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((e: Event) => [
      e.timestamp.toLocaleDateString(),
      e.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      e.eventType.replace(/_/g, ' '),
      e.severity?.toString() ?? '',
      csvEscape(e.notes ?? ''),
      e.tags.join('; '),
      e.source,
      csvEscape(e.transcript ?? ''),
    ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `attune-${slugify(childName)}-events-${dateStamp()}.csv`, 'text/csv');
}

/**
 * Export the entire data blob as JSON for full backup/restore.
 * Reads from IndexedDB (with fallback to localStorage for legacy data).
 */
export async function exportFullBackup(): Promise<void> {
  try {
    // Try IndexedDB first
    const indexedDB = new IndexedDBStore();
    await indexedDB.initialize();
    const raw = await indexedDB.load('attune-app-data') as string | null;
    
    if (raw) {
      downloadFile(raw, `attune-full-backup-${dateStamp()}.json`, 'application/json');
      return;
    }
    
    // Fallback to localStorage for legacy data
    const legacyRaw = localStorage.getItem('attune-app-data');
    if (legacyRaw) {
      downloadFile(legacyRaw, `attune-full-backup-${dateStamp()}.json`, 'application/json');
      return;
    }
    
    alert('No data to export.');
  } catch (error) {
    console.error('Failed to export backup:', error);
    alert('Failed to export backup. Please try again.');
  }
}

/**
 * Import a full JSON backup, replacing all current data.
 * Saves to IndexedDB (primary storage).
 * Returns true if successful.
 */
export async function importFullBackup(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        // Validate it's parseable JSON with expected structure
        const data = JSON.parse(text);
        if (!data.childProfiles || !data.events) {
          alert('Invalid backup file — missing expected data.');
          resolve(false);
          return;
        }
        
        // Save to IndexedDB (primary storage)
        const indexedDB = new IndexedDBStore();
        await indexedDB.initialize();
        await indexedDB.save('attune-app-data', text);
        
        resolve(true);
      } catch (error) {
        console.error('Failed to import backup:', error);
        alert('Failed to read backup file. Make sure it\'s a valid Attune backup JSON.');
        resolve(false);
      }
    };
    reader.onerror = () => {
      alert('Error reading file.');
      resolve(false);
    };
    reader.readAsText(file);
  });
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
