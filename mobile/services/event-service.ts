import { v4 as uuidv4 } from 'uuid';
import { Event, EventInput, EventType } from '../models';
import { databaseService } from './database';

export class EventService {
  /**
   * Create a new event
   */
  async createEvent(input: EventInput): Promise<Event> {
    const event: Event = {
      id: uuidv4(),
      childProfileId: input.childProfileId,
      eventType: input.eventType,
      timestamp: input.timestamp || new Date(),
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
