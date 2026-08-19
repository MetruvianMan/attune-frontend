import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventInput, EventType } from '../models';
import { databaseService } from './database';
import { toLocalDateString } from '../utils/local-date';

export class EventService {
  /**
   * Create a new event
   */
  async createEvent(input: EventInput): Promise<Event> {
    const timestamp = input.timestamp || new Date();
    const event: Event = {
      id: uuidv4(),
      childProfileId: input.childProfileId,
      eventType: input.eventType,
      timestamp,
      severity: input.severity,
      tags: input.tags || [],
      notes: input.notes,
      persons: input.persons || [],
      source: input.source,
      transcript: input.transcript,
      customLabel: input.customLabel,
      customEmoji: input.customEmoji,
      valence: input.valence,
      contextEntryRefs: [],
      createdAt: new Date(),
      // Freeze the calendar day at creation time, using this device's
      // local timezone right now - see .kiro/specs/timezone-safe-dates/.
      localDate: toLocalDateString(timestamp),
    };

    await databaseService.createEvent(event);
    return event;
  }

  /**
   * Create a quick-tap event (one-tap logging)
   */
  async createQuickTapEvent(
    childProfileId: string,
    eventType: EventType,
    customLabel?: string,
    timestamp?: Date,
    customEmoji?: string
  ): Promise<Event> {
    return await this.createEvent({
      childProfileId,
      eventType,
      timestamp: timestamp || new Date(),
      source: 'quick-tap',
      customLabel,
      customEmoji,
    });
  }

  /**
   * Get events for a specific date
   */
  async getEventsForDate(childProfileId: string, date: Date): Promise<Event[]> {
    // dateRange still works here even though the underlying query filters
    // by local_date now (see database-supabase.ts/database.ts) - passing a
    // start/end of the SAME calendar day converts to the same local_date
    // string either way. Kept as a single-day range for backward
    // compatibility with the EventFilter shape other callers also use.
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await databaseService.getEvents({
      childProfileId,
      dateRange: { start: startOfDay, end: endOfDay },
    });
  }

  /**
   * Get today's events
   */
  async getTodaysEvents(childProfileId: string): Promise<Event[]> {
    return await this.getEventsForDate(childProfileId, new Date());
  }

  /**
   * Get event count by type for today
   */
  async getTodaysEventSummary(childProfileId: string): Promise<Record<string, number>> {
    const events = await this.getTodaysEvents(childProfileId);
    
    const summary: Record<string, number> = {};
    events.forEach(event => {
      const key = event.customLabel || event.eventType;
      summary[key] = (summary[key] || 0) + 1;
    });

    return summary;
  }

  /**
   * Update an event
   */
  async updateEvent(id: string, updates: Partial<Event>): Promise<void> {
    await databaseService.updateEvent(id, updates);
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    await databaseService.deleteEvent(id);
  }
}

// Singleton instance
export const eventService = new EventService();
