import type { Event, EventInput, EventFilter } from '@src/models/index.js';
import type { DataStore } from '@src/data-store/data-store.js';

export interface EventCaptureSystem {
  createEvent(input: EventInput): Event;
  saveEvent(event: Event): void;
  getEvents(filter: EventFilter): Event[];
  deleteEvent(eventId: string): void;
  getSuggestedTags(childProfileId: string): string[];
}

export class EventCaptureSystemImpl implements EventCaptureSystem {
  constructor(private readonly dataStore: DataStore) {}

  createEvent(input: EventInput): Event {
    const now = new Date();

    // Gather active context entry IDs from the DataStore
    const activeContextEntries = this.dataStore.getContextEntries({
      childProfileId: input.childProfileId,
      activeOnly: true,
    });
    const contextEntryRefs = activeContextEntries.map((entry) => entry.id);

    const event: Event = {
      id: crypto.randomUUID(),
      childProfileId: input.childProfileId,
      eventType: input.eventType,
      timestamp: input.timestamp ?? now,
      severity: input.severity,
      tags: input.tags ?? [],
      notes: input.notes,
      persons: input.persons ?? [],
      source: input.source,
      transcript: input.transcript,
      customLabel: input.customLabel,
      contextEntryRefs,
      createdAt: now,
    };

    return event;
  }

  saveEvent(event: Event): void {
    this.dataStore.saveEvent(event);
  }

  getEvents(filter: EventFilter): Event[] {
    return this.dataStore.getEvents(filter);
  }

  deleteEvent(eventId: string): void {
    this.dataStore.deleteEvent(eventId);
  }

  getSuggestedTags(childProfileId: string): string[] {
    const events = this.dataStore.getEvents({ childProfileId });
    const tagSet = new Set<string>();
    for (const event of events) {
      for (const tag of event.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }
}
