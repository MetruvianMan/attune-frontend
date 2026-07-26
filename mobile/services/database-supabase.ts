import { supabase } from './supabase';
import { Event, EventFilter, ChildProfile, DiaryEntry, Photo, Document, Insight, Strategy, GlossaryTerm, PointEvent, PointEventFilter, DailySummary, Reward } from '../models';

export class SupabaseDatabaseService {
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    console.log('🔄 Initializing Supabase database connection...');
    
    try {
      // Test connection with a simple query
      console.log('   Testing connection...');
      const { data, error } = await supabase.from('child_profiles').select('count').limit(1);
      
      if (error) {
        console.error('❌ Failed to connect to Supabase:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      console.log('✅ Supabase database initialized successfully');
      console.log('   Connection test passed');
    } catch (error: any) {
      console.error('❌ Failed to initialize Supabase database:', error);
      console.error('   Error type:', typeof error);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  // ==================== CHILD PROFILE OPERATIONS ====================

  async createChildProfile(profile: ChildProfile): Promise<void> {
    const { error } = await supabase
      .from('child_profiles')
      .insert({
        id: profile.id,
        display_name: profile.displayName,
        alias: profile.alias ?? null,
        age: profile.age,
        diagnosis: profile.diagnosis ?? null,
        intake_profile: profile.intakeProfile ? JSON.stringify(profile.intakeProfile) : null,
        created_at: profile.createdAt.getTime(),
        updated_at: profile.updatedAt.getTime(),
      });

    if (error) throw error;
  }

  async getChildProfile(id: string): Promise<ChildProfile | null> {
    const { data, error } = await supabase
      .from('child_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data ? this.rowToChildProfile(data) : null;
  }

  async getAllChildProfiles(): Promise<ChildProfile[]> {
    console.log('🔍 [SupabaseDB] getAllChildProfiles START');
    try {
      console.log('🔍 [SupabaseDB] About to query child_profiles table...');
      const { data, error } = await supabase
        .from('child_profiles')
        .select('*');

      console.log('📊 [SupabaseDB] Query completed');
      console.log('📊 [SupabaseDB] data:', data);
      console.log('📊 [SupabaseDB] data type:', typeof data);
      console.log('📊 [SupabaseDB] data is array?:', Array.isArray(data));
      console.log('📊 [SupabaseDB] data length:', data?.length || 0);
      console.log('📊 [SupabaseDB] error:', error);
      console.log('📊 [SupabaseDB] error type:', typeof error);
      
      if (error) {
        console.error('❌ [SupabaseDB] Query returned error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️  [SupabaseDB] No profiles found in database');
        return [];
      }
      
      console.log('📊 [SupabaseDB] First row keys:', Object.keys(data[0]));
      console.log('📊 [SupabaseDB] First row:', JSON.stringify(data[0], null, 2));
      
      console.log('🔍 [SupabaseDB] Mapping rows to ChildProfile objects...');
      const profiles = data.map(row => {
        console.log('   Mapping row ID:', row.id);
        return this.rowToChildProfile(row);
      });
      console.log('✅ [SupabaseDB] Mapped', profiles.length, 'profiles');
      console.log('✅ [SupabaseDB] First profile:', profiles[0]);
      return profiles;
    } catch (err) {
      console.error('❌ [SupabaseDB] Exception in getAllChildProfiles:', err);
      console.error('❌ [SupabaseDB] Exception type:', typeof err);
      console.error('❌ [SupabaseDB] Exception message:', err instanceof Error ? err.message : String(err));
      console.error('❌ [SupabaseDB] Exception stack:', err instanceof Error ? err.stack : 'no stack');
      throw err;
    }
  }

  async updateChildProfile(id: string, updates: Partial<ChildProfile>): Promise<void> {
    const updateData: any = {};

    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.alias !== undefined) updateData.alias = updates.alias;
    if (updates.age !== undefined) updateData.age = updates.age;
    if (updates.diagnosis !== undefined) updateData.diagnosis = updates.diagnosis;
    if (updates.intakeProfile !== undefined) {
      updateData.intake_profile = JSON.stringify(updates.intakeProfile);
    }

    updateData.updated_at = Date.now();

    const { error } = await supabase
      .from('child_profiles')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteChildProfile(id: string): Promise<void> {
    const { error } = await supabase
      .from('child_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== EVENT OPERATIONS ====================

  async createEvent(event: Event): Promise<void> {
    console.log('🟢 [SupabaseDB] createEvent called:', {
      id: event.id,
      childProfileId: event.childProfileId,
      eventType: event.eventType,
      timestamp: event.timestamp.toISOString(),
      source: event.source,
      customLabel: event.customLabel
    });

    try {
      // Prepare insert data, omitting undefined/null integer fields entirely
      const insertData: any = {
        id: event.id,
        child_profile_id: event.childProfileId,
        event_type: event.eventType,
        timestamp: event.timestamp.getTime(),
        tags: event.tags || [], // Supabase handles JSON automatically
        persons: event.persons || [], // Supabase handles JSON automatically
        source: event.source,
        context_entry_refs: event.contextEntryRefs || [], // Supabase handles JSON automatically
        created_at: event.createdAt.getTime(),
        synced: 0, // INTEGER column: 0 = not synced, 1 = synced
      };

      // Only include optional fields if they have values
      if (event.severity !== undefined && event.severity !== null) {
        insertData.severity = event.severity;
      }
      if (event.notes) {
        insertData.notes = event.notes;
      }
      if (event.transcript) {
        insertData.transcript = event.transcript;
      }
      if (event.customLabel) {
        insertData.custom_label = event.customLabel;
      }
      if (event.customEmoji) {
        insertData.custom_emoji = event.customEmoji;
      }
      if (event.valence) {
        insertData.valence = event.valence;
      }
      if (event.sequenceOrder !== undefined && event.sequenceOrder !== null) {
        insertData.sequence_order = event.sequenceOrder;
      }

      console.log('🟢 [SupabaseDB] Prepared insert data:', JSON.stringify(insertData, null, 2));
      console.log('🟢 [SupabaseDB] Inserting event to Supabase...');
      
      const { data, error } = await supabase
        .from('events')
        .insert(insertData)
        .select();

      if (error) {
        console.error('❌ [SupabaseDB] createEvent error:', error);
        console.error('❌ [SupabaseDB] Error code:', error.code);
        console.error('❌ [SupabaseDB] Error message:', error.message);
        console.error('❌ [SupabaseDB] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ [SupabaseDB] Event created successfully, returned data:', data);
    } catch (err) {
      console.error('❌ [SupabaseDB] createEvent exception:', err);
      console.error('❌ [SupabaseDB] Exception type:', typeof err);
      console.error('❌ [SupabaseDB] Exception details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      throw err;
    }
  }

  async getEvent(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToEvent(data) : null;
  }

  async getEvents(filter: EventFilter): Promise<Event[]> {
    console.log('🔍 [SupabaseDB] getEvents called with filter:', {
      childProfileId: filter.childProfileId,
      hasDateRange: !!filter.dateRange,
      dateRange: filter.dateRange ? {
        start: filter.dateRange.start.toISOString(),
        end: filter.dateRange.end.toISOString()
      } : null,
      eventTypes: filter.eventTypes,
      limit: filter.limit
    });

    let query = supabase
      .from('events')
      .select('*')
      .eq('child_profile_id', filter.childProfileId);

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      query = query.in('event_type', filter.eventTypes);
    }

    if (filter.dateRange) {
      query = query
        .gte('timestamp', filter.dateRange.start.getTime())
        .lte('timestamp', filter.dateRange.end.getTime());
    }

    if (filter.tags && filter.tags.length > 0) {
      // Note: This is simplified - tags are stored as JSON, so exact matching is complex in Supabase
      // For production, consider using PostgreSQL array column type or separate tags table
      for (const tag of filter.tags) {
        query = query.like('tags', `%"${tag}"%`);
      }
    }

    query = query.order('sequence_order', { ascending: true, nullsFirst: false })
                 .order('timestamp', { ascending: true })
                 .order('created_at', { ascending: true });

    if (filter.limit) {
      query = query.limit(filter.limit);
      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + filter.limit - 1);
      }
    }

    const { data, error } = await query;
    
    console.log('📊 [SupabaseDB] getEvents raw result:', {
      dataLength: data?.length || 0,
      hasError: !!error,
      error: error ? {
        code: error.code,
        message: error.message
      } : null,
      firstEventRaw: data && data.length > 0 ? data[0] : null
    });
    
    if (error) {
      console.error('❌ [SupabaseDB] getEvents error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  [SupabaseDB] No events found for query');
      return [];
    }
    
    try {
      console.log('🔄 [SupabaseDB] Mapping', data.length, 'rows to Event objects...');
      const events = data.map(row => this.rowToEvent(row));
      console.log('✅ [SupabaseDB] Successfully mapped', events.length, 'events');
      return events;
    } catch (mappingError) {
      console.error('❌ [SupabaseDB] Error mapping events:', mappingError);
      throw mappingError;
    }
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<void> {
    const updateData: any = { synced: 0 }; // INTEGER: 0 = not synced

    if (updates.eventType !== undefined) updateData.event_type = updates.eventType;
    if (updates.timestamp !== undefined) updateData.timestamp = updates.timestamp.getTime();
    if ('severity' in updates) updateData.severity = updates.severity ?? null;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.persons !== undefined) updateData.persons = JSON.stringify(updates.persons);
    if ('valence' in updates) updateData.valence = updates.valence ?? null;
    if ('customEmoji' in updates) updateData.custom_emoji = updates.customEmoji ?? null;
    if ('customLabel' in updates) updateData.custom_label = updates.customLabel ?? null;
    if (updates.sequenceOrder !== undefined) updateData.sequence_order = updates.sequenceOrder;

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== DIARY ENTRY OPERATIONS ====================

  async createDiaryEntry(entry: DiaryEntry): Promise<void> {
    const { error } = await supabase
      .from('diary_entries')
      .insert({
        id: entry.id,
        child_profile_id: entry.childProfileId,
        date: entry.date.getTime(),
        content: entry.content,
        timestamp: entry.timestamp.getTime(),
        source: entry.source,
        created_at: entry.createdAt.getTime(),
        synced: 0, // INTEGER: 0 = not synced
      });

    if (error) throw error;
  }

  async getDiaryEntriesByDate(childProfileId: string, date: Date): Promise<DiaryEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .gte('date', startOfDay.getTime())
      .lte('date', endOfDay.getTime())
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data.map(row => this.rowToDiaryEntry(row));
  }

  async getDiaryEntries(childProfileId: string): Promise<DiaryEntry[]> {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data.map(row => this.rowToDiaryEntry(row));
  }

  async updateDiaryEntry(id: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('diary_entries')
      .update({ content, synced: 0 }) // INTEGER: 0 = not synced
      .eq('id', id);

    if (error) throw error;
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== BEHAVIOR OPERATIONS ====================

  async createBehavior(behavior: any): Promise<void> {
    const { error } = await supabase
      .from('behaviors')
      .insert({
        id: behavior.id,
        child_profile_id: behavior.childProfileId,
        title: behavior.title,
        emoji: behavior.emoji,
        point_value: behavior.pointValue,
        category: behavior.category,
        time_window_start: behavior.timeWindow?.startTime ?? null,
        time_window_end: behavior.timeWindow?.endTime ?? null,
        limit_frequency: behavior.limitRule?.frequency ?? null,
        limit_max_count: behavior.limitRule?.maxCount ?? null,
        exit_criteria: behavior.exitCriteria ?? null,
        notes: behavior.notes ?? null,
        archived: false,
        created_at: behavior.createdAt.getTime(),
        updated_at: behavior.updatedAt.getTime(),
        synced: 0, // INTEGER: 0 = not synced
      });

    if (error) throw error;
  }

  async getBehavior(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('behaviors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToBehavior(data) : null;
  }

  async getBehaviorsByProfile(childProfileId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('behaviors')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('category')
      .order('title');

    if (error) throw error;
    return data.map(row => this.rowToBehavior(row));
  }

  async updateBehavior(id: string, updates: any): Promise<void> {
    const updateData: any = { updated_at: Date.now(), synced: 0 };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.emoji !== undefined) updateData.emoji = updates.emoji;
    if (updates.pointValue !== undefined) updateData.point_value = updates.pointValue;
    if (updates.category !== undefined) updateData.category = updates.category;
    if ('timeWindow' in updates) {
      updateData.time_window_start = updates.timeWindow?.startTime ?? null;
      updateData.time_window_end = updates.timeWindow?.endTime ?? null;
    }
    if ('limitRule' in updates) {
      updateData.limit_frequency = updates.limitRule?.frequency ?? null;
      updateData.limit_max_count = updates.limitRule?.maxCount ?? null;
    }
    if ('exitCriteria' in updates) updateData.exit_criteria = updates.exitCriteria ?? null;
    if ('notes' in updates) updateData.notes = updates.notes ?? null;

    const { error } = await supabase
      .from('behaviors')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteBehavior(id: string): Promise<void> {
    const { error } = await supabase
      .from('behaviors')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async archiveBehavior(id: string): Promise<void> {
    const { error } = await supabase
      .from('behaviors')
      .update({ archived: true, updated_at: Date.now(), synced: 0 })
      .eq('id', id);

    if (error) throw error;
  }

  async unarchiveBehavior(id: string): Promise<void> {
    const { error } = await supabase
      .from('behaviors')
      .update({ archived: false, updated_at: Date.now(), synced: 0 })
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== REWARD OPERATIONS ====================

  async createReward(reward: any): Promise<void> {
    const { error } = await supabase
      .from('rewards')
      .insert({
        id: reward.id,
        child_profile_id: reward.childProfileId,
        title: reward.title,
        emoji: reward.emoji,
        point_cost: reward.pointCost,
        availability_type: reward.availabilityRule?.type ?? null,
        availability_consecutive_days: reward.availabilityRule?.consecutiveDays ?? null,
        parent_approval_required: reward.parentApprovalRequired,
        archived: false,
        created_at: reward.createdAt.getTime(),
        updated_at: reward.updatedAt.getTime(),
        synced: 0,
      });

    if (error) throw error;
  }

  async getReward(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToReward(data) : null;
  }

  async getRewardsByProfile(childProfileId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('point_cost');

    if (error) throw error;
    return data.map(row => this.rowToReward(row));
  }

  async updateReward(id: string, updates: any): Promise<void> {
    const updateData: any = { updated_at: Date.now(), synced: 0 };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.emoji !== undefined) updateData.emoji = updates.emoji;
    if (updates.pointCost !== undefined) updateData.point_cost = updates.pointCost;
    if (updates.availabilityRule !== undefined) {
      updateData.availability_type = updates.availabilityRule?.type ?? null;
      updateData.availability_consecutive_days = updates.availabilityRule?.consecutiveDays ?? null;
    }
    if (updates.parentApprovalRequired !== undefined) {
      updateData.parent_approval_required = updates.parentApprovalRequired;
    }

    const { error } = await supabase
      .from('rewards')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteReward(id: string): Promise<void> {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async archiveReward(id: string): Promise<void> {
    const { error } = await supabase
      .from('rewards')
      .update({ archived: true, updated_at: Date.now(), synced: 0 })
      .eq('id', id);

    if (error) throw error;
  }

  async unarchiveReward(id: string): Promise<void> {
    const { error } = await supabase
      .from('rewards')
      .update({ archived: false, updated_at: Date.now(), synced: 0 })
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== POINT EVENT OPERATIONS ====================

  async createPointEvent(pointEvent: PointEvent): Promise<void> {
    const { error } = await supabase
      .from('point_events')
      .insert({
        id: pointEvent.id,
        child_profile_id: pointEvent.childProfileId,
        type: pointEvent.type,
        behavior_id: pointEvent.behaviorId ?? null,
        reward_id: pointEvent.rewardId ?? null,
        point_value: pointEvent.pointValue,
        timestamp: pointEvent.timestamp.getTime(),
        parent_id: pointEvent.parentId ?? null,
        created_at: pointEvent.createdAt.getTime(),
        synced: 0,
      });

    if (error) throw error;
  }

  async getPointEvent(id: string): Promise<PointEvent | null> {
    const { data, error } = await supabase
      .from('point_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToPointEvent(data) : null;
  }

  async getPointEvents(filter: PointEventFilter): Promise<PointEvent[]> {
    let query = supabase
      .from('point_events')
      .select('*')
      .eq('child_profile_id', filter.childProfileId);

    if (filter.type) {
      query = query.eq('type', filter.type);
    }

    if (filter.dateRange) {
      query = query
        .gte('timestamp', filter.dateRange.start.getTime())
        .lte('timestamp', filter.dateRange.end.getTime());
    }

    query = query.order('timestamp', { ascending: false })
                 .order('created_at', { ascending: false });

    if (filter.limit) {
      query = query.limit(filter.limit);
      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + filter.limit - 1);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.map(row => this.rowToPointEvent(row));
  }

  async updatePointEvent(id: string, updates: Partial<PointEvent>): Promise<void> {
    const updateData: any = { synced: 0 };

    if (updates.timestamp !== undefined) {
      updateData.timestamp = updates.timestamp.getTime();
    }

    const { error } = await supabase
      .from('point_events')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deletePointEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('point_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async calculatePointBalance(childProfileId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_point_balance', { profile_id: childProfileId });

    if (error) {
      // Fallback to manual calculation if RPC not available
      const { data: events, error: eventsError } = await supabase
        .from('point_events')
        .select('point_value')
        .eq('child_profile_id', childProfileId);

      if (eventsError) throw eventsError;
      return events.reduce((sum, event) => sum + event.point_value, 0);
    }

    return data ?? 0;
  }

  async getDailyPointEvents(childProfileId: string, date: Date): Promise<PointEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('point_events')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .gte('timestamp', startOfDay.getTime())
      .lte('timestamp', endOfDay.getTime())
      .order('timestamp');

    if (error) throw error;
    return data.map(row => this.rowToPointEvent(row));
  }

  // ==================== RELATIONSHIP PERSON OPERATIONS ====================

  async createRelationshipPerson(person: any): Promise<void> {
    const { error } = await supabase
      .from('relationship_persons')
      .insert({
        id: person.id,
        child_profile_id: person.childProfileId,
        name: person.name,
        category: person.category ?? null,
        role: person.role,
        relationship_strength: person.relationshipStrength ?? null,
        photo_path: person.photoPath ?? null,
        notes: person.notes ?? null,
        created_at: person.createdAt.getTime(),
        synced: person.synced ? 1 : 0,
      });

    if (error) throw error;
  }

  async getRelationshipPersonById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('relationship_persons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToRelationshipPerson(data) : null;
  }

  async getRelationshipPersons(childProfileId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('relationship_persons')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('name');

    if (error) throw error;
    return data.map(row => this.rowToRelationshipPerson(row));
  }

  async updateRelationshipPerson(id: string, updates: any): Promise<void> {
    const updateData: any = { synced: 0 };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.relationshipStrength !== undefined) {
      updateData.relationship_strength = updates.relationshipStrength;
    }
    if (updates.photoPath !== undefined) updateData.photo_path = updates.photoPath;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { error } = await supabase
      .from('relationship_persons')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteRelationshipPerson(id: string): Promise<void> {
    const { error } = await supabase
      .from('relationship_persons')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== CONVERSATION SESSION OPERATIONS ====================

  async createConversationSession(session: any): Promise<void> {
    const { error } = await supabase
      .from('conversation_sessions')
      .insert({
        id: session.id,
        child_profile_id: session.childProfileId,
        turns: JSON.stringify(session.turns),
        created_at: session.createdAt.getTime(),
        last_activity_at: session.lastActivityAt.getTime(),
        archived: session.archived ? 1 : 0,
        title: session.title ?? null,
      });

    if (error) throw error;
  }

  async getConversationSessionById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToConversationSession(data) : null;
  }

  async getConversationSessions(childProfileId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('last_activity_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.rowToConversationSession(row));
  }

  async saveConversationSession(session: any): Promise<void> {
    const { error } = await supabase
      .from('conversation_sessions')
      .upsert({
        id: session.id,
        child_profile_id: session.childProfileId,
        turns: JSON.stringify(session.turns),
        created_at: session.createdAt.getTime(),
        last_activity_at: session.lastActivityAt.getTime(),
        archived: session.archived ? 1 : 0,
        title: session.title ?? null,
      });

    if (error) throw error;
  }

  async updateConversationSession(id: string, turns: any[], lastActivityAt: Date): Promise<void> {
    const { error } = await supabase
      .from('conversation_sessions')
      .update({
        turns: JSON.stringify(turns),
        last_activity_at: lastActivityAt.getTime(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteConversationSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== PHOTO OPERATIONS ====================

  async createPhoto(photo: Photo): Promise<void> {
    const { error } = await supabase
      .from('photos')
      .insert({
        id: photo.id,
        event_id: photo.eventId ?? null,
        child_profile_id: photo.childProfileId ?? null,
        file_path: photo.filePath,
        remote_url: photo.remoteUrl ?? null,
        file_size: photo.fileSize,
        width: photo.width,
        height: photo.height,
        created_at: photo.createdAt.getTime(),
        synced: 0,
      });

    if (error) throw error;
  }

  async getPhotoById(id: string): Promise<Photo | null> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToPhoto(data) : null;
  }

  async getPhotosByEvent(eventId: string): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data.map(row => this.rowToPhoto(row));
  }

  async getPhotosByProfileId(childProfileId: string): Promise<Photo[]> {
    console.log('🔍 [SupabaseDB] getPhotosByProfileId called for:', childProfileId);
    
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('created_at', { ascending: false });

    console.log('📊 [SupabaseDB] getPhotosByProfileId result:', {
      dataLength: data?.length || 0,
      error: error
    });

    if (error) {
      console.error('❌ [SupabaseDB] getPhotosByProfileId error:', error);
      throw error;
    }
    
    return data.map(row => this.rowToPhoto(row));
  }

  async deletePhoto(id: string): Promise<void> {
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updatePhotoEventAssociation(photoId: string, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('photos')
      .update({ event_id: eventId, synced: 0 })
      .eq('id', photoId);

    if (error) throw error;
  }

  async updatePhotoProfileAssociation(photoId: string, childProfileId: string): Promise<void> {
    const { error } = await supabase
      .from('photos')
      .update({ child_profile_id: childProfileId, synced: 0 })
      .eq('id', photoId);

    if (error) throw error;
  }

  // ==================== DOCUMENT OPERATIONS ====================

  async createDocument(document: Document): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .insert({
        id: document.id,
        child_profile_id: document.childProfileId,
        document_type: document.documentType,
        source_provider: document.sourceProvider ?? null,
        document_date: document.documentDate ? document.documentDate.getTime() : null,
        file_path: document.filePath,
        remote_url: document.remoteUrl ?? null,
        file_name: document.fileName,
        file_size: document.fileSize,
        mime_type: document.mimeType,
        extracted_text: document.extractedText ?? null,
        extraction_failed: document.extractionFailed ? 1 : 0,
        uploaded_at: document.uploadedAt.getTime(),
        synced: 0,
      });

    if (error) throw error;
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToDocument(data) : null;
  }

  async getDocumentsByProfile(childProfileId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.rowToDocument(row));
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    const updateData: any = { synced: 0 };

    if (updates.fileName !== undefined) updateData.file_name = updates.fileName;
    if (updates.documentType !== undefined) updateData.document_type = updates.documentType;
    if (updates.sourceProvider !== undefined) updateData.source_provider = updates.sourceProvider;
    if (updates.documentDate !== undefined) {
      updateData.document_date = updates.documentDate ? updates.documentDate.getTime() : null;
    }
    if (updates.extractedText !== undefined) updateData.extracted_text = updates.extractedText;
    if (updates.extractionFailed !== undefined) {
      updateData.extraction_failed = updates.extractionFailed ? 1 : 0;
    }

    const { error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== GLOSSARY OPERATIONS ====================

  async createGlossaryTerm(term: { term: string; definition: string; category: string }): Promise<void> {
    const { error } = await supabase
      .from('glossary_terms')
      .upsert({
        term: term.term,
        definition: term.definition,
        category: term.category,
      });

    if (error) throw error;
  }

  async getGlossaryTermByName(term: string): Promise<GlossaryTerm | null> {
    const { data, error } = await supabase
      .from('glossary_terms')
      .select('*')
      .eq('term', term)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.rowToGlossaryTerm(data) : null;
  }

  async getGlossaryTerms(): Promise<GlossaryTerm[]> {
    const { data, error } = await supabase
      .from('glossary_terms')
      .select('*')
      .order('term');

    if (error) throw error;
    return data.map(row => this.rowToGlossaryTerm(row));
  }

  // ==================== VOICE LOG CORRECTION OPERATIONS ====================

  async createVoiceLogCorrection(correction: any): Promise<void> {
    const { error } = await supabase
      .from('voice_log_corrections')
      .insert({
        id: correction.id,
        child_profile_id: correction.childProfileId,
        transcript_snippet: correction.transcriptSnippet,
        full_transcript: correction.fullTranscript,
        ai_event_type: correction.aiOriginal.eventType,
        ai_emoji: correction.aiOriginal.emoji,
        ai_valence: correction.aiOriginal.valence,
        ai_description: correction.aiOriginal.description,
        user_event_type: correction.userCorrected.eventType,
        user_emoji: correction.userCorrected.emoji,
        user_valence: correction.userCorrected.valence,
        user_description: correction.userCorrected.description ?? null,
        correction_type: correction.correctionType,
        created_at: correction.createdAt.getTime(),
      });

    if (error) throw error;
  }

  async getVoiceLogCorrections(childProfileId: string, limit?: number): Promise<any[]> {
    let query = supabase
      .from('voice_log_corrections')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      childProfileId: row.child_profile_id,
      transcriptSnippet: row.transcript_snippet,
      fullTranscript: row.full_transcript,
      aiOriginal: {
        eventType: row.ai_event_type,
        emoji: row.ai_emoji,
        valence: row.ai_valence,
        description: row.ai_description,
      },
      userCorrected: {
        eventType: row.user_event_type,
        emoji: row.user_emoji,
        valence: row.user_valence,
        description: row.user_description,
      },
      correctionType: row.correction_type,
      createdAt: new Date(row.created_at),
    }));
  }

  // ==================== INSIGHT OPERATIONS ====================

  async getRecentInsights(childProfileId: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('child_profile_id', childProfileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(row => this.rowToInsight(row));
  }

  // ==================== SYNC OPERATIONS ====================

  async getUnsyncedEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('synced', false)
      .order('created_at');

    if (error) throw error;
    return data.map(row => this.rowToEvent(row));
  }

  async getUnsyncedDiaryEntries(): Promise<DiaryEntry[]> {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('synced', false)
      .order('created_at');

    if (error) throw error;
    return data.map(row => this.rowToDiaryEntry(row));
  }

  async getUnsyncedPhotos(): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('synced', false)
      .order('created_at');

    if (error) throw error;
    return data.map(row => this.rowToPhoto(row));
  }

  async getUnsyncedDocuments(): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('synced', false)
      .order('uploaded_at');

    if (error) throw error;
    return data.map(row => this.rowToDocument(row));
  }

  async getUnsyncedBehaviors(): Promise<any[]> {
    const { data, error } = await supabase
      .from('behaviors')
      .select('*')
      .eq('synced', false)
      .order('created_at');

    if (error) throw error;
    return data.map(row => this.rowToBehavior(row));
  }

  async getUnsyncedRewards(): Promise<any[]> {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('synced', false)
      .order('created_at');

    if (error) throw error;
    return data.map(row => this.rowToReward(row));
  }

  async getUnsyncedPointEvents(): Promise<PointEvent[]> {
    const { data, error } = await supabase
      .from('point_events')
      .select('*')
      .eq('synced', false)
      .order('created_at');

    if (error) throw error;
    return data.map(row => this.rowToPointEvent(row));
  }

  async markEventsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('events')
      .update({ synced: true })
      .in('id', ids);

    if (error) throw error;
  }

  async markDiaryEntriesSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('diary_entries')
      .update({ synced: true })
      .in('id', ids);

    if (error) throw error;
  }

  async markPhotosSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('photos')
      .update({ synced: true })
      .in('id', ids);

    if (error) throw error;
  }

  async markDocumentsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('documents')
      .update({ synced: true })
      .in('id', ids);

    if (error) throw error;
  }

  async markBehaviorsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('behaviors')
      .update({ synced: true })
      .in('id', ids);

    if (error) throw error;
  }

  async markRewardsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('rewards')
      .update({ synced: true })
      .in('id', ids);

    if (error) throw error;
  }

  async markPointEventsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('point_events')
      .update({ synced: true })
      .in('id', ids);

    if (error) throw error;
  }

  async getLastSyncTimestamp(): Promise<number> {
    const { data, error } = await supabase
      .from('sync_metadata')
      .select('value')
      .eq('key', 'last_sync_timestamp')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return 0;
      throw error;
    }

    return data ? parseInt(data.value) : 0;
  }

  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    const { error } = await supabase
      .from('sync_metadata')
      .upsert({
        key: 'last_sync_timestamp',
        value: timestamp.toString(),
      });

    if (error) throw error;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Safely parse a field that might be JSON string (SQLite) or already parsed (Supabase JSONB)
   */
  private safeJsonParse(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('❌ [SupabaseDB] JSON parse error:', error);
        return value;
      }
    }
    return value; // Already an object
  }

  private rowToChildProfile(row: any): ChildProfile {
    return {
      id: row.id,
      displayName: row.display_name,
      alias: row.alias,
      age: row.age,
      diagnosis: row.diagnosis,
      intakeProfile: this.safeJsonParse(row.intake_profile),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private rowToEvent(row: any): Event {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      eventType: row.event_type,
      timestamp: new Date(row.timestamp),
      severity: row.severity,
      tags: this.safeJsonParse(row.tags),
      notes: row.notes,
      persons: this.safeJsonParse(row.persons),
      source: row.source,
      transcript: row.transcript,
      customLabel: row.custom_label,
      customEmoji: row.custom_emoji,
      valence: row.valence,
      contextEntryRefs: this.safeJsonParse(row.context_entry_refs),
      sequenceOrder: row.sequence_order,
      createdAt: new Date(row.created_at),
    };
  }

  private rowToDiaryEntry(row: any): DiaryEntry {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      date: new Date(row.date),
      content: row.content,
      timestamp: new Date(row.timestamp),
      source: row.source,
      createdAt: new Date(row.created_at),
    };
  }

  private rowToBehavior(row: any): any {
    const timeWindow = row.time_window_start && row.time_window_end 
      ? {
          startTime: row.time_window_start,
          endTime: row.time_window_end,
        }
      : undefined;

    const limitRule = row.limit_frequency
      ? {
          frequency: row.limit_frequency,
          maxCount: row.limit_max_count,
        }
      : undefined;

    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      title: row.title,
      emoji: row.emoji,
      pointValue: row.point_value,
      category: row.category,
      timeWindow,
      limitRule,
      exitCriteria: row.exit_criteria,
      notes: row.notes,
      archived: row.archived === 1 || row.archived === true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      synced: row.synced === 1 || row.synced === true,
    };
  }

  private rowToReward(row: any): any {
    const reward: any = {
      id: row.id,
      childProfileId: row.child_profile_id,
      title: row.title,
      emoji: row.emoji,
      pointCost: row.point_cost,
      parentApprovalRequired: row.parent_approval_required === 1 || row.parent_approval_required === true,
      archived: row.archived === 1 || row.archived === true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      synced: row.synced === 1 || row.synced === true,
    };

    if (row.availability_type) {
      reward.availabilityRule = {
        type: row.availability_type,
      };
      if (row.availability_consecutive_days !== null) {
        reward.availabilityRule.consecutiveDays = row.availability_consecutive_days;
      }
    }

    return reward;
  }

  private rowToPointEvent(row: any): PointEvent {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      type: row.type,
      behaviorId: row.behavior_id,
      rewardId: row.reward_id,
      pointValue: row.point_value,
      timestamp: new Date(row.timestamp),
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      synced: row.synced === 1 || row.synced === true,
    };
  }

  private rowToPhoto(row: any): Photo {
    return {
      id: row.id,
      eventId: row.event_id,
      childProfileId: row.child_profile_id,
      filePath: row.file_path,
      remoteUrl: row.remote_url,
      fileSize: row.file_size,
      width: row.width,
      height: row.height,
      createdAt: new Date(row.created_at),
    };
  }

  private rowToDocument(row: any): Document {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      documentType: row.document_type,
      sourceProvider: row.source_provider,
      documentDate: row.document_date ? new Date(row.document_date) : undefined,
      filePath: row.file_path,
      remoteUrl: row.remote_url,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      extractedText: row.extracted_text,
      extractionFailed: row.extraction_failed === 1 || row.extraction_failed === true,
      uploadedAt: new Date(row.uploaded_at),
    };
  }

  private rowToGlossaryTerm(row: any): GlossaryTerm {
    return {
      term: row.term,
      definition: row.definition,
      category: row.category,
    };
  }

  private rowToRelationshipPerson(row: any): any {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      name: row.name,
      category: row.category,
      role: row.role,
      relationshipStrength: row.relationship_strength,
      photoPath: row.photo_path,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      synced: row.synced === 1 || row.synced === true,
    };
  }

  private rowToConversationSession(row: any): any {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      turns: this.safeJsonParse(row.turns),
      createdAt: new Date(row.created_at),
      lastActivityAt: new Date(row.last_activity_at),
      archived: row.archived === 1 || row.archived === true,
      title: row.title,
    };
  }

  private rowToInsight(row: any): any {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      type: row.type,
      narrative: row.narrative,
      supportingSignals: this.safeJsonParse(row.supporting_signals),
      confidenceScore: row.confidence_score,
      explainabilityStatement: row.explainability_statement,
      timeSpanStart: row.time_span_start ? new Date(row.time_span_start) : undefined,
      timeSpanEnd: row.time_span_end ? new Date(row.time_span_end) : undefined,
      communicationScripts: this.safeJsonParse(row.communication_scripts),
      strategyIds: this.safeJsonParse(row.strategy_ids),
      createdAt: new Date(row.created_at),
    };
  }
}
