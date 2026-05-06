import type { ContextEntry, ContextEntryInput, ContextFilter } from '@src/models/index.js';
import type { DataStore } from '@src/data-store/data-store.js';

export interface ContextEngine {
  createContextEntry(input: ContextEntryInput): ContextEntry;
  getActiveContextEntries(childProfileId: string): ContextEntry[];
  endContextEntry(entryId: string): void;
  getContextEntries(filter: ContextFilter): ContextEntry[];
}

export class ContextEngineImpl implements ContextEngine {
  constructor(private readonly dataStore: DataStore) {}

  createContextEntry(input: ContextEntryInput): ContextEntry {
    const now = new Date();

    const entry: ContextEntry = {
      id: crypto.randomUUID(),
      childProfileId: input.childProfileId,
      contextType: input.contextType,
      subType: input.subType,
      person: input.person,
      startTime: input.startTime ?? now,
      endTime: input.endTime,
      notes: input.notes,
      createdAt: now,
    };

    this.dataStore.saveContextEntry(entry);
    return entry;
  }

  getActiveContextEntries(childProfileId: string): ContextEntry[] {
    return this.dataStore.getContextEntries({
      childProfileId,
      activeOnly: true,
    });
  }

  endContextEntry(entryId: string): void {
    this.dataStore.endContextEntry(entryId, new Date());
  }

  getContextEntries(filter: ContextFilter): ContextEntry[] {
    return this.dataStore.getContextEntries(filter);
  }
}
