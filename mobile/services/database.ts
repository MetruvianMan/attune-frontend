import * as SQLite from 'expo-sqlite';
import { Event, EventFilter, ChildProfile, DiaryEntry, Photo, Document, Insight, Strategy, GlossaryTerm, PointEvent, PointEventFilter, DailySummary, Reward } from '../models';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('attune.db');
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      -- Child Profiles
      CREATE TABLE IF NOT EXISTS child_profiles (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        alias TEXT,
        age INTEGER NOT NULL,
        diagnosis TEXT,
        intake_profile TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Events
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        severity INTEGER,
        tags TEXT NOT NULL,
        notes TEXT,
        persons TEXT NOT NULL,
        source TEXT NOT NULL,
        transcript TEXT,
        custom_label TEXT,
        custom_emoji TEXT,
        valence TEXT,
        context_entry_refs TEXT NOT NULL,
        sequence_order INTEGER,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_events_child_profile ON events(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_events_synced ON events(synced);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

      -- Diary Entries
      CREATE TABLE IF NOT EXISTS diary_entries (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        date INTEGER NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_diary_entries_child_profile ON diary_entries(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date DESC);
      CREATE INDEX IF NOT EXISTS idx_diary_entries_synced ON diary_entries(synced);

      -- Photos
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        child_profile_id TEXT,
        file_path TEXT NOT NULL,
        remote_url TEXT,
        file_size INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id);
      CREATE INDEX IF NOT EXISTS idx_photos_child_profile ON photos(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_photos_synced ON photos(synced);

      -- Documents
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        source_provider TEXT,
        document_date INTEGER,
        file_path TEXT NOT NULL,
        remote_url TEXT,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        extracted_text TEXT,
        extraction_failed INTEGER NOT NULL DEFAULT 0,
        uploaded_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_documents_child_profile ON documents(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_documents_synced ON documents(synced);

      -- Relationship Persons
      CREATE TABLE IF NOT EXISTS relationship_persons (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        role TEXT NOT NULL,
        relationship_strength INTEGER,
        photo_path TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_relationship_persons_child_profile ON relationship_persons(child_profile_id);

      -- Context Entries
      CREATE TABLE IF NOT EXISTS context_entries (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        context_type TEXT NOT NULL,
        sub_type TEXT NOT NULL,
        person_name TEXT,
        person_role TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        notes TEXT,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_context_entries_child_profile ON context_entries(child_profile_id);

      -- Insights
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        type TEXT NOT NULL,
        narrative TEXT NOT NULL,
        supporting_signals TEXT NOT NULL,
        confidence_score TEXT NOT NULL,
        explainability_statement TEXT NOT NULL,
        time_span_start INTEGER,
        time_span_end INTEGER,
        communication_scripts TEXT,
        strategy_ids TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_insights_child_profile ON insights(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at DESC);

      -- Strategies
      CREATE TABLE IF NOT EXISTS strategies (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        insight_id TEXT NOT NULL,
        description TEXT NOT NULL,
        source_document_ref TEXT,
        helped_count INTEGER NOT NULL DEFAULT 0,
        didnt_help_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (insight_id) REFERENCES insights(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_strategies_child_profile ON strategies(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_strategies_insight ON strategies(insight_id);

      -- Conversation Sessions
      CREATE TABLE IF NOT EXISTS conversation_sessions (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        turns TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_activity_at INTEGER NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        title TEXT,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conversation_sessions_child_profile ON conversation_sessions(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity ON conversation_sessions(last_activity_at DESC);

      -- Glossary Terms
      CREATE TABLE IF NOT EXISTS glossary_terms (
        term TEXT PRIMARY KEY,
        definition TEXT NOT NULL,
        category TEXT NOT NULL
      );

      -- Quick Tap Buttons
      CREATE TABLE IF NOT EXISTS quick_tap_buttons (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        label TEXT NOT NULL,
        emoji TEXT,
        order_index INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_quick_tap_buttons_child_profile ON quick_tap_buttons(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_quick_tap_buttons_order ON quick_tap_buttons(order_index);

      -- Sync Metadata
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- Voice Log Corrections (for ML training data)
      CREATE TABLE IF NOT EXISTS voice_log_corrections (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        transcript_snippet TEXT NOT NULL,
        full_transcript TEXT NOT NULL,
        ai_event_type TEXT NOT NULL,
        ai_emoji TEXT NOT NULL,
        ai_valence TEXT NOT NULL,
        ai_description TEXT NOT NULL,
        user_event_type TEXT NOT NULL,
        user_emoji TEXT NOT NULL,
        user_valence TEXT NOT NULL,
        user_description TEXT,
        correction_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_voice_log_corrections_child_profile ON voice_log_corrections(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_voice_log_corrections_created_at ON voice_log_corrections(created_at DESC);

      -- Behaviors (Rewards System)
      CREATE TABLE IF NOT EXISTS behaviors (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        title TEXT NOT NULL,
        emoji TEXT NOT NULL,
        point_value INTEGER NOT NULL,
        category TEXT NOT NULL,
        time_window_start TEXT,
        time_window_end TEXT,
        limit_frequency TEXT,
        limit_max_count INTEGER,
        exit_criteria TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_behaviors_child_profile ON behaviors(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_behaviors_synced ON behaviors(synced);

      -- Rewards (Rewards System)
      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        title TEXT NOT NULL,
        emoji TEXT NOT NULL,
        point_cost INTEGER NOT NULL,
        availability_type TEXT,
        availability_consecutive_days INTEGER,
        parent_approval_required INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_rewards_child_profile ON rewards(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_rewards_synced ON rewards(synced);

      -- Point Events (Rewards System)
      CREATE TABLE IF NOT EXISTS point_events (
        id TEXT PRIMARY KEY,
        child_profile_id TEXT NOT NULL,
        type TEXT NOT NULL,
        behavior_id TEXT,
        reward_id TEXT,
        point_value INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        parent_id TEXT,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (behavior_id) REFERENCES behaviors(id) ON DELETE SET NULL,
        FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_point_events_child_profile ON point_events(child_profile_id);
      CREATE INDEX IF NOT EXISTS idx_point_events_timestamp ON point_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_point_events_type ON point_events(type);
      CREATE INDEX IF NOT EXISTS idx_point_events_synced ON point_events(synced);
    `);

    // Run migrations for existing databases
    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('[Database] Running migrations...');
    
    try {
      // Migration: Add category column to relationship_persons if it doesn't exist
      // SQLite doesn't have a clean way to check if a column exists, so we try to add it
      // and catch the error if it already exists
      try {
        await this.db.execAsync(`
          ALTER TABLE relationship_persons ADD COLUMN category TEXT;
        `);
        console.log('[Database] Migration: Added category column to relationship_persons');
      } catch (error: any) {
        // If the error is "duplicate column name", that's fine - column already exists
        if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
          console.log('[Database] Migration: category column already exists in relationship_persons');
        } else {
          // Log but don't throw - allow app to continue
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      // Migration: Add archived and title columns to conversation_sessions
      try {
        await this.db.execAsync(`
          ALTER TABLE conversation_sessions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('[Database] Migration: Added archived column to conversation_sessions');
      } catch (error: any) {
        if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
          console.log('[Database] Migration: archived column already exists in conversation_sessions');
        } else {
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      try {
        await this.db.execAsync(`
          ALTER TABLE conversation_sessions ADD COLUMN title TEXT;
        `);
        console.log('[Database] Migration: Added title column to conversation_sessions');
      } catch (error: any) {
        if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
          console.log('[Database] Migration: title column already exists in conversation_sessions');
        } else {
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      // Migration: Add rewards system tables if they don't exist
      try {
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS behaviors (
            id TEXT PRIMARY KEY,
            child_profile_id TEXT NOT NULL,
            title TEXT NOT NULL,
            emoji TEXT NOT NULL,
            point_value INTEGER NOT NULL,
            category TEXT NOT NULL,
            time_window_start TEXT,
            time_window_end TEXT,
            limit_frequency TEXT,
            limit_max_count INTEGER,
            exit_criteria TEXT,
            notes TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
          );
        `);
        console.log('[Database] Migration: Created behaviors table');
      } catch (error: any) {
        if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
          console.log('[Database] Migration: behaviors table already exists');
        } else {
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_behaviors_child_profile ON behaviors(child_profile_id);
        `);
        console.log('[Database] Migration: Created index idx_behaviors_child_profile');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_behaviors_synced ON behaviors(synced);
        `);
        console.log('[Database] Migration: Created index idx_behaviors_synced');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }

      try {
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS rewards (
            id TEXT PRIMARY KEY,
            child_profile_id TEXT NOT NULL,
            title TEXT NOT NULL,
            emoji TEXT NOT NULL,
            point_cost INTEGER NOT NULL,
            availability_type TEXT,
            availability_consecutive_days INTEGER,
            parent_approval_required INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE
          );
        `);
        console.log('[Database] Migration: Created rewards table');
      } catch (error: any) {
        if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
          console.log('[Database] Migration: rewards table already exists');
        } else {
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_rewards_child_profile ON rewards(child_profile_id);
        `);
        console.log('[Database] Migration: Created index idx_rewards_child_profile');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_rewards_synced ON rewards(synced);
        `);
        console.log('[Database] Migration: Created index idx_rewards_synced');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }

      // Migration: Add archived column to behaviors table
      try {
        await this.db.execAsync(`
          ALTER TABLE behaviors ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('[Database] Migration: Added archived column to behaviors table');
      } catch (error: any) {
        if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
          console.log('[Database] Migration: archived column already exists in behaviors');
        } else {
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      // Migration: Add archived column to rewards table
      try {
        await this.db.execAsync(`
          ALTER TABLE rewards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('[Database] Migration: Added archived column to rewards table');
      } catch (error: any) {
        if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
          console.log('[Database] Migration: archived column already exists in rewards');
        } else {
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      try {
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS point_events (
            id TEXT PRIMARY KEY,
            child_profile_id TEXT NOT NULL,
            type TEXT NOT NULL,
            behavior_id TEXT,
            reward_id TEXT,
            point_value INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            parent_id TEXT,
            created_at INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (child_profile_id) REFERENCES child_profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (behavior_id) REFERENCES behaviors(id) ON DELETE SET NULL,
            FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL
          );
        `);
        console.log('[Database] Migration: Created point_events table');
      } catch (error: any) {
        if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
          console.log('[Database] Migration: point_events table already exists');
        } else {
          console.error('[Database] Migration error (non-fatal):', error.message);
        }
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_point_events_child_profile ON point_events(child_profile_id);
        `);
        console.log('[Database] Migration: Created index idx_point_events_child_profile');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_point_events_timestamp ON point_events(timestamp DESC);
        `);
        console.log('[Database] Migration: Created index idx_point_events_timestamp');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_point_events_type ON point_events(type);
        `);
        console.log('[Database] Migration: Created index idx_point_events_type');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }

      try {
        await this.db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_point_events_synced ON point_events(synced);
        `);
        console.log('[Database] Migration: Created index idx_point_events_synced');
      } catch (error: any) {
        console.error('[Database] Migration error (non-fatal):', error.message);
      }
    } catch (error) {
      console.error('[Database] Migration failed:', error);
      // Don't throw - allow app to continue even if migration fails
    }
    
    console.log('[Database] Migrations complete');
  }

  // ==================== CHILD PROFILE OPERATIONS ====================

  async createChildProfile(profile: ChildProfile): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO child_profiles (id, display_name, alias, age, diagnosis, intake_profile, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.displayName,
        profile.alias ?? null,
        profile.age,
        profile.diagnosis ?? null,
        profile.intakeProfile ? JSON.stringify(profile.intakeProfile) : null,
        profile.createdAt.getTime(),
        profile.updatedAt.getTime(),
      ]
    );
  }

  async getChildProfile(id: string): Promise<ChildProfile | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM child_profiles WHERE id = ?',
      [id]
    );

    return row ? this.rowToChildProfile(row) : null;
  }

  async getAllChildProfiles(): Promise<ChildProfile[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>('SELECT * FROM child_profiles');
    return rows.map(this.rowToChildProfile);
  }

  async updateChildProfile(id: string, updates: Partial<ChildProfile>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.displayName);
    }
    if (updates.alias !== undefined) {
      fields.push('alias = ?');
      values.push(updates.alias);
    }
    if (updates.age !== undefined) {
      fields.push('age = ?');
      values.push(updates.age);
    }
    if (updates.birthdate !== undefined) {
      fields.push('birthdate = ?');
      values.push(updates.birthdate);
    }
    if (updates.diagnosis !== undefined) {
      fields.push('diagnosis = ?');
      values.push(updates.diagnosis);
    }
    if (updates.preferences !== undefined) {
      fields.push('preferences = ?');
      values.push(updates.preferences);
    }
    if (updates.profilePhotoUri !== undefined) {
      fields.push('profile_photo_uri = ?');
      values.push(updates.profilePhotoUri);
    }
    if (updates.intakeProfile !== undefined) {
      fields.push('intake_profile = ?');
      values.push(JSON.stringify(updates.intakeProfile));
    }
    if (updates.syncStatus !== undefined) {
      fields.push('sync_status = ?');
      values.push(updates.syncStatus);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await this.db.runAsync(
      `UPDATE child_profiles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteChildProfile(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // CASCADE DELETE will automatically remove all related data
    await this.db.runAsync('DELETE FROM child_profiles WHERE id = ?', [id]);
  }

  // ==================== EVENT OPERATIONS ====================

  async createEvent(event: Event): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        event.id,
        event.childProfileId,
        event.eventType,
        event.timestamp.getTime(),
        event.severity ?? null,
        JSON.stringify(event.tags),
        event.notes ?? null,
        JSON.stringify(event.persons),
        event.source,
        event.transcript ?? null,
        event.customLabel ?? null,
        event.customEmoji ?? null,
        event.valence ?? null,
        JSON.stringify(event.contextEntryRefs),
        event.sequenceOrder ?? null,
        event.createdAt.getTime(),
      ]
    );
  }

  async getEvent(id: string): Promise<Event | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    return row ? this.rowToEvent(row) : null;
  }

  async getEvents(filter: EventFilter): Promise<Event[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM events WHERE child_profile_id = ?';
    const params: any[] = [filter.childProfileId];

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      query += ` AND event_type IN (${filter.eventTypes.map(() => '?').join(',')})`;
      params.push(...filter.eventTypes);
    }

    if (filter.dateRange) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(filter.dateRange.start.getTime(), filter.dateRange.end.getTime());
    }

    if (filter.tags && filter.tags.length > 0) {
      // Simple tag filtering - check if any tag is in the JSON array
      const tagConditions = filter.tags.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      params.push(...filter.tags.map(tag => `%"${tag}"%`));
    }

    query += ' ORDER BY COALESCE(sequence_order, 999999), timestamp ASC, created_at ASC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
      if (filter.offset) {
        query += ' OFFSET ?';
        params.push(filter.offset);
      }
    }

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map(this.rowToEvent);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.eventType !== undefined) {
      fields.push('event_type = ?');
      values.push(updates.eventType);
    }
    if (updates.timestamp !== undefined) {
      fields.push('timestamp = ?');
      values.push(updates.timestamp.getTime());
    }
    if ('severity' in updates) {
      fields.push('severity = ?');
      values.push(updates.severity ?? null);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.persons !== undefined) {
      fields.push('persons = ?');
      values.push(JSON.stringify(updates.persons));
    }
    if ('valence' in updates) {
      fields.push('valence = ?');
      values.push(updates.valence ?? null);
    }
    if ('customEmoji' in updates) {
      fields.push('custom_emoji = ?');
      values.push(updates.customEmoji ?? null);
    }
    if ('customLabel' in updates) {
      fields.push('custom_label = ?');
      values.push(updates.customLabel ?? null);
    }
    if (updates.sequenceOrder !== undefined) {
      fields.push('sequence_order = ?');
      values.push(updates.sequenceOrder);
    }

    fields.push('synced = 0');
    values.push(id);

    await this.db.runAsync(
      `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM events WHERE id = ?', [id]);
  }

  // ==================== DIARY ENTRY OPERATIONS ====================

  async createDiaryEntry(entry: DiaryEntry): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO diary_entries (id, child_profile_id, date, content, timestamp, source, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        entry.id,
        entry.childProfileId,
        entry.date.getTime(),
        entry.content,
        entry.timestamp.getTime(),
        entry.source,
        entry.createdAt.getTime(),
      ]
    );
  }

  async getDiaryEntriesByDate(childProfileId: string, date: Date): Promise<DiaryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM diary_entries WHERE child_profile_id = ? AND date >= ? AND date <= ? ORDER BY timestamp DESC',
      [childProfileId, startOfDay.getTime(), endOfDay.getTime()]
    );

    return rows.map(this.rowToDiaryEntry);
  }

  async getDiaryEntries(childProfileId: string): Promise<DiaryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM diary_entries WHERE child_profile_id = ? ORDER BY date DESC',
      [childProfileId]
    );

    return rows.map(this.rowToDiaryEntry);
  }

  async updateDiaryEntry(id: string, content: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE diary_entries SET content = ?, synced = 0 WHERE id = ?',
      [content, id]
    );
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM diary_entries WHERE id = ?', [id]);
  }

  // ==================== PHOTO OPERATIONS ====================

  async createPhoto(photo: Photo): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO photos (id, event_id, child_profile_id, file_path, remote_url, file_size, width, height, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        photo.id,
        photo.eventId ?? null,
        photo.childProfileId ?? null,
        photo.filePath,
        photo.remoteUrl ?? null,
        photo.fileSize,
        photo.width,
        photo.height,
        photo.createdAt.getTime(),
      ]
    );
  }

  async getPhotosByEvent(eventId: string): Promise<Photo[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM photos WHERE event_id = ?',
      [eventId]
    );

    return rows.map(this.rowToPhoto);
  }

  async deletePhoto(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
  }

  async updatePhotoEventAssociation(photoId: string, eventId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE photos SET event_id = ?, synced = 0 WHERE id = ?',
      [eventId, photoId]
    );
  }

  async updatePhotoProfileAssociation(photoId: string, childProfileId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE photos SET child_profile_id = ?, synced = 0 WHERE id = ?',
      [childProfileId, photoId]
    );
  }

  async getPhotoById(id: string): Promise<Photo | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM photos WHERE id = ?',
      [id]
    );

    return row ? this.rowToPhoto(row) : null;
  }

  async getPhotosByProfileId(childProfileId: string): Promise<Photo[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM photos WHERE child_profile_id = ? ORDER BY created_at DESC',
      [childProfileId]
    );

    return rows.map(this.rowToPhoto);
  }

  async getAllPhotos(): Promise<Photo[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM photos ORDER BY created_at DESC'
    );

    return rows.map(this.rowToPhoto);
  }

  // ==================== DOCUMENT OPERATIONS ====================

  async createDocument(document: Document): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO documents (id, child_profile_id, document_type, source_provider, document_date, file_path, remote_url, file_name, file_size, mime_type, extracted_text, extraction_failed, uploaded_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        document.id,
        document.childProfileId,
        document.documentType,
        document.sourceProvider ?? null,
        document.documentDate ? document.documentDate.getTime() : null,
        document.filePath,
        document.remoteUrl ?? null,
        document.fileName,
        document.fileSize,
        document.mimeType,
        document.extractedText ?? null,
        document.extractionFailed ? 1 : 0,
        document.uploadedAt.getTime(),
      ]
    );
  }

  async getDocumentById(id: string): Promise<Document | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );

    return row ? this.rowToDocument(row) : null;
  }

  async getDocumentsByProfile(childProfileId: string): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM documents WHERE child_profile_id = ? ORDER BY uploaded_at DESC',
      [childProfileId]
    );

    return rows.map(this.rowToDocument);
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.fileName !== undefined) {
      fields.push('file_name = ?');
      values.push(updates.fileName);
    }
    if (updates.documentType !== undefined) {
      fields.push('document_type = ?');
      values.push(updates.documentType);
    }
    if (updates.sourceProvider !== undefined) {
      fields.push('source_provider = ?');
      values.push(updates.sourceProvider);
    }
    if (updates.documentDate !== undefined) {
      fields.push('document_date = ?');
      values.push(updates.documentDate ? updates.documentDate.getTime() : null);
    }
    if (updates.extractedText !== undefined) {
      fields.push('extracted_text = ?');
      values.push(updates.extractedText);
    }
    if (updates.extractionFailed !== undefined) {
      fields.push('extraction_failed = ?');
      values.push(updates.extractionFailed ? 1 : 0);
    }

    fields.push('synced = 0');
    values.push(id);

    await this.db.runAsync(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
  }

  async getUnsyncedDocuments(): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM documents WHERE synced = 0 ORDER BY uploaded_at ASC'
    );

    return rows.map(this.rowToDocument);
  }

  async markDocumentsSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    await this.db.runAsync(
      `UPDATE documents SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  // ==================== REWARD OPERATIONS ====================

  async createReward(reward: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO rewards (id, child_profile_id, title, emoji, point_cost, availability_type, availability_consecutive_days, parent_approval_required, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        reward.id,
        reward.childProfileId,
        reward.title,
        reward.emoji,
        reward.pointCost,
        reward.availabilityRule?.type ?? null,
        reward.availabilityRule?.consecutiveDays ?? null,
        reward.parentApprovalRequired ? 1 : 0,
        reward.createdAt.getTime(),
        reward.updatedAt.getTime(),
      ]
    );
  }

  async getReward(id: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM rewards WHERE id = ?',
      [id]
    );

    return row ? this.rowToReward(row) : null;
  }

  async getRewardsByProfile(childProfileId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM rewards WHERE child_profile_id = ? ORDER BY point_cost ASC',
      [childProfileId]
    );

    return rows.map(this.rowToReward);
  }

  async updateReward(id: string, updates: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.emoji !== undefined) {
      fields.push('emoji = ?');
      values.push(updates.emoji);
    }
    if (updates.pointCost !== undefined) {
      fields.push('point_cost = ?');
      values.push(updates.pointCost);
    }
    if (updates.availabilityRule !== undefined) {
      fields.push('availability_type = ?');
      values.push(updates.availabilityRule?.type ?? null);
      fields.push('availability_consecutive_days = ?');
      values.push(updates.availabilityRule?.consecutiveDays ?? null);
    }
    if (updates.parentApprovalRequired !== undefined) {
      fields.push('parent_approval_required = ?');
      values.push(updates.parentApprovalRequired ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(Date.now());
    fields.push('synced = 0');
    values.push(id);

    await this.db.runAsync(
      `UPDATE rewards SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteReward(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM rewards WHERE id = ?', [id]);
  }

  async archiveReward(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE rewards SET archived = 1, updated_at = ?, synced = 0 WHERE id = ?',
      [Date.now(), id]
    );
  }

  async unarchiveReward(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE rewards SET archived = 0, updated_at = ?, synced = 0 WHERE id = ?',
      [Date.now(), id]
    );
  }

  // ==================== REWARDS SYNC OPERATIONS ====================

  async getUnsyncedBehaviors(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM behaviors WHERE synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.rowToBehavior);
  }

  async getUnsyncedRewards(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM rewards WHERE synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.rowToReward);
  }

  async markBehaviorsSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    await this.db.runAsync(
      `UPDATE behaviors SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  async markRewardsSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    await this.db.runAsync(
      `UPDATE rewards SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  // ==================== VOICE LOG CORRECTION OPERATIONS ====================

  async createVoiceLogCorrection(correction: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO voice_log_corrections (
        id, child_profile_id, transcript_snippet, full_transcript,
        ai_event_type, ai_emoji, ai_valence, ai_description,
        user_event_type, user_emoji, user_valence, user_description,
        correction_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        correction.id,
        correction.childProfileId,
        correction.transcriptSnippet,
        correction.fullTranscript,
        correction.aiOriginal.eventType,
        correction.aiOriginal.emoji,
        correction.aiOriginal.valence,
        correction.aiOriginal.description,
        correction.userCorrected.eventType,
        correction.userCorrected.emoji,
        correction.userCorrected.valence,
        correction.userCorrected.description ?? null,
        correction.correctionType,
        correction.createdAt.getTime(),
      ]
    );
  }

  async getVoiceLogCorrections(childProfileId: string, limit?: number): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM voice_log_corrections WHERE child_profile_id = ? ORDER BY created_at DESC';
    const params: any[] = [childProfileId];

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map(row => ({
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

  async exportVoiceLogCorrections(childProfileId: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const corrections = await this.getVoiceLogCorrections(childProfileId);
    return JSON.stringify(corrections, null, 2);
  }

  // ==================== SYNC OPERATIONS ====================

  async getUnsyncedEvents(): Promise<Event[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM events WHERE synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.rowToEvent);
  }

  async getUnsyncedDiaryEntries(): Promise<DiaryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM diary_entries WHERE synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.rowToDiaryEntry);
  }

  async getUnsyncedPhotos(): Promise<Photo[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM photos WHERE synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.rowToPhoto);
  }

  async markEventsSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    await this.db.runAsync(
      `UPDATE events SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  async markDiaryEntriesSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    await this.db.runAsync(
      `UPDATE diary_entries SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  async markPhotosSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    await this.db.runAsync(
      `UPDATE photos SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  async getLastSyncTimestamp(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT value FROM sync_metadata WHERE key = ?',
      ['last_sync_timestamp']
    );

    return row ? parseInt(row.value) : 0;
  }

  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)',
      ['last_sync_timestamp', timestamp.toString()]
    );
  }

  // ==================== POINT EVENT OPERATIONS ====================

  async createPointEvent(pointEvent: PointEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO point_events (id, child_profile_id, type, behavior_id, reward_id, point_value, timestamp, parent_id, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        pointEvent.id,
        pointEvent.childProfileId,
        pointEvent.type,
        pointEvent.behaviorId ?? null,
        pointEvent.rewardId ?? null,
        pointEvent.pointValue,
        pointEvent.timestamp.getTime(),
        pointEvent.parentId ?? null,
        pointEvent.createdAt.getTime(),
      ]
    );
  }

  async getPointEvent(id: string): Promise<PointEvent | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM point_events WHERE id = ?',
      [id]
    );

    return row ? this.rowToPointEvent(row) : null;
  }

  async getPointEvents(filter: PointEventFilter): Promise<PointEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM point_events WHERE child_profile_id = ?';
    const params: any[] = [filter.childProfileId];

    if (filter.type) {
      query += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter.dateRange) {
      query += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(filter.dateRange.start.getTime(), filter.dateRange.end.getTime());
    }

    query += ' ORDER BY timestamp DESC, created_at DESC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
      if (filter.offset) {
        query += ' OFFSET ?';
        params.push(filter.offset);
      }
    }

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map(this.rowToPointEvent);
  }

  async updatePointEvent(id: string, updates: Partial<PointEvent>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.timestamp !== undefined) {
      fields.push('timestamp = ?');
      values.push(updates.timestamp.getTime());
    }

    if (fields.length === 0) return;

    fields.push('synced = 0');
    values.push(id);

    await this.db.runAsync(
      `UPDATE point_events SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deletePointEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM point_events WHERE id = ?', [id]);
  }

  async calculatePointBalance(childProfileId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT COALESCE(SUM(point_value), 0) as balance FROM point_events WHERE child_profile_id = ?',
      [childProfileId]
    );

    return row ? row.balance : 0;
  }

  async getDailyPointEvents(childProfileId: string, date: Date): Promise<PointEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM point_events WHERE child_profile_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
      [childProfileId, startOfDay.getTime(), endOfDay.getTime()]
    );

    return rows.map(this.rowToPointEvent);
  }

  async getUnsyncedPointEvents(): Promise<PointEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM point_events WHERE synced = 0 ORDER BY created_at ASC'
    );

    return rows.map(this.rowToPointEvent);
  }

  async markPointEventsSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    await this.db.runAsync(
      `UPDATE point_events SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  // ==================== HELPER METHODS ====================

  private rowToChildProfile(row: any): ChildProfile {
    return {
      id: row.id,
      displayName: row.display_name,
      alias: row.alias,
      age: row.age,
      diagnosis: row.diagnosis,
      intakeProfile: row.intake_profile ? JSON.parse(row.intake_profile) : undefined,
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
      tags: JSON.parse(row.tags),
      notes: row.notes,
      persons: JSON.parse(row.persons),
      source: row.source,
      transcript: row.transcript,
      customLabel: row.custom_label,
      customEmoji: row.custom_emoji,
      valence: row.valence,
      contextEntryRefs: JSON.parse(row.context_entry_refs),
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

  // ==================== BEHAVIOR OPERATIONS ====================

  async createBehavior(behavior: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timeWindowStart = behavior.timeWindow?.startTime ?? null;
    const timeWindowEnd = behavior.timeWindow?.endTime ?? null;
    const limitFrequency = behavior.limitRule?.frequency ?? null;
    const limitMaxCount = behavior.limitRule?.maxCount ?? null;

    await this.db.runAsync(
      `INSERT INTO behaviors (id, child_profile_id, title, emoji, point_value, category, time_window_start, time_window_end, limit_frequency, limit_max_count, exit_criteria, notes, archived, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)`,
      [
        behavior.id,
        behavior.childProfileId,
        behavior.title,
        behavior.emoji,
        behavior.pointValue,
        behavior.category,
        timeWindowStart,
        timeWindowEnd,
        limitFrequency,
        limitMaxCount,
        behavior.exitCriteria ?? null,
        behavior.notes ?? null,
        behavior.createdAt.getTime(),
        behavior.updatedAt.getTime(),
      ]
    );
  }

  async getBehavior(id: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM behaviors WHERE id = ?',
      [id]
    );

    return row ? this.rowToBehavior(row) : null;
  }

  async getBehaviorsByProfile(childProfileId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM behaviors WHERE child_profile_id = ? ORDER BY category, title',
      [childProfileId]
    );

    return rows.map(this.rowToBehavior);
  }

  async updateBehavior(id: string, updates: Partial<any>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.emoji !== undefined) {
      fields.push('emoji = ?');
      values.push(updates.emoji);
    }
    if (updates.pointValue !== undefined) {
      fields.push('point_value = ?');
      values.push(updates.pointValue);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if ('timeWindow' in updates) {
      fields.push('time_window_start = ?');
      fields.push('time_window_end = ?');
      values.push(updates.timeWindow?.startTime ?? null);
      values.push(updates.timeWindow?.endTime ?? null);
    }
    if ('limitRule' in updates) {
      fields.push('limit_frequency = ?');
      fields.push('limit_max_count = ?');
      values.push(updates.limitRule?.frequency ?? null);
      values.push(updates.limitRule?.maxCount ?? null);
    }
    if ('exitCriteria' in updates) {
      fields.push('exit_criteria = ?');
      values.push(updates.exitCriteria ?? null);
    }
    if ('notes' in updates) {
      fields.push('notes = ?');
      values.push(updates.notes ?? null);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    fields.push('synced = 0');
    values.push(Date.now());
    values.push(id);

    await this.db.runAsync(
      `UPDATE behaviors SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteBehavior(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM behaviors WHERE id = ?', [id]);
  }

  async archiveBehavior(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE behaviors SET archived = 1, updated_at = ?, synced = 0 WHERE id = ?',
      [Date.now(), id]
    );
  }

  async unarchiveBehavior(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE behaviors SET archived = 0, updated_at = ?, synced = 0 WHERE id = ?',
      [Date.now(), id]
    );
  }

  // ==================== INSIGHT OPERATIONS ====================

  async getRecentInsights(childProfileId: string, limit: number = 10): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      `SELECT * FROM insights 
       WHERE child_profile_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [childProfileId, limit]
    );

    return rows.map(row => this.rowToInsight(row));
  }

  async getInsightById(id: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync(
      'SELECT * FROM insights WHERE id = ?',
      [id]
    );

    return row ? this.rowToInsight(row) : null;
  }

  async getStrategiesByInsight(insightId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      'SELECT * FROM strategies WHERE insight_id = ?',
      [insightId]
    );

    return rows.map(row => this.rowToStrategy(row));
  }

  // ==================== RELATIONSHIP PERSON OPERATIONS ====================

  async getRelationshipPersons(childProfileId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      'SELECT * FROM relationship_persons WHERE child_profile_id = ? ORDER BY name',
      [childProfileId]
    );

    console.log('[Database] getRelationshipPersons - found', rows.length, 'persons');
    return rows.map(row => this.rowToRelationshipPerson(row));
  }

  async getRelationshipPersonById(id: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync(
      'SELECT * FROM relationship_persons WHERE id = ?',
      [id]
    );

    return row ? this.rowToRelationshipPerson(row) : null;
  }

  async createRelationshipPerson(person: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('[Database] Creating relationship person:', person.name, 'category:', person.category);
    
    try {
      await this.db.runAsync(
        `INSERT INTO relationship_persons 
         (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          person.id,
          person.childProfileId,
          person.name,
          person.category || null,
          person.role,
          person.relationshipStrength || null,
          person.photoPath || null,
          person.notes || null,
          person.createdAt.getTime(),
          person.synced ? 1 : 0,
        ]
      );
      console.log('[Database] Successfully created relationship person:', person.name);
    } catch (error: any) {
      console.error('[Database] Failed to create relationship person:', error.message);
      throw error;
    }
  }

  async updateRelationshipPerson(id: string, updates: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.relationshipStrength !== undefined) {
      fields.push('relationship_strength = ?');
      values.push(updates.relationshipStrength);
    }
    if (updates.photoPath !== undefined) {
      fields.push('photo_path = ?');
      values.push(updates.photoPath);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) return;

    fields.push('synced = ?');
    values.push(0);
    values.push(id);

    await this.db.runAsync(
      `UPDATE relationship_persons SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteRelationshipPerson(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'DELETE FROM relationship_persons WHERE id = ?',
      [id]
    );
  }

  // Debug helper: Get all relationship persons with raw data
  async getAllRelationshipPersonsRaw(childProfileId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      'SELECT * FROM relationship_persons WHERE child_profile_id = ?',
      [childProfileId]
    );

    console.log('[Database] Raw relationship persons:', JSON.stringify(rows, null, 2));
    return rows;
  }

  // Debug helper: Delete all relationship persons for a profile
  async deleteAllRelationshipPersons(childProfileId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'DELETE FROM relationship_persons WHERE child_profile_id = ?',
      [childProfileId]
    );
    
    console.log('[Database] Deleted all relationship persons for profile:', childProfileId);
  }

  // ==================== CONVERSATION OPERATIONS ====================

  async getConversationSessions(childProfileId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      'SELECT * FROM conversation_sessions WHERE child_profile_id = ? ORDER BY last_activity_at DESC',
      [childProfileId]
    );

    return rows.map(row => this.rowToConversationSession(row));
  }

  async getConversationSessionById(id: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync(
      'SELECT * FROM conversation_sessions WHERE id = ?',
      [id]
    );

    return row ? this.rowToConversationSession(row) : null;
  }

  async createConversationSession(session: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO conversation_sessions 
       (id, child_profile_id, turns, created_at, last_activity_at, archived, title)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.childProfileId,
        JSON.stringify(session.turns),
        session.createdAt.getTime(),
        session.lastActivityAt.getTime(),
        session.archived ? 1 : 0,
        session.title ?? null,
      ]
    );
  }

  async saveConversationSession(session: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Upsert: try to insert, if exists then update
    await this.db.runAsync(
      `INSERT INTO conversation_sessions 
       (id, child_profile_id, turns, created_at, last_activity_at, archived, title)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         turns = excluded.turns,
         last_activity_at = excluded.last_activity_at,
         archived = excluded.archived,
         title = excluded.title`,
      [
        session.id,
        session.childProfileId,
        JSON.stringify(session.turns),
        session.createdAt.getTime(),
        session.lastActivityAt.getTime(),
        session.archived ? 1 : 0,
        session.title ?? null,
      ]
    );
  }

  async updateConversationSession(id: string, turns: any[], lastActivityAt: Date): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE conversation_sessions SET turns = ?, last_activity_at = ? WHERE id = ?',
      [JSON.stringify(turns), lastActivityAt.getTime(), id]
    );
  }

  async deleteConversationSession(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'DELETE FROM conversation_sessions WHERE id = ?',
      [id]
    );
  }

  // ==================== GLOSSARY OPERATIONS ====================

  async getGlossaryTerms(): Promise<GlossaryTerm[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      'SELECT * FROM glossary_terms ORDER BY term'
    );

    return rows.map(row => this.rowToGlossaryTerm(row));
  }

  async getGlossaryTermByName(term: string): Promise<GlossaryTerm | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync(
      'SELECT * FROM glossary_terms WHERE term = ?',
      [term]
    );

    return row ? this.rowToGlossaryTerm(row) : null;
  }

  async searchGlossaryTerms(query: string): Promise<GlossaryTerm[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      'SELECT * FROM glossary_terms WHERE term LIKE ? OR definition LIKE ? ORDER BY term',
      [`%${query}%`, `%${query}%`]
    );

    return rows.map(row => this.rowToGlossaryTerm(row));
  }

  async createGlossaryTerm(term: { term: string; definition: string; category: string }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT OR REPLACE INTO glossary_terms (term, definition, category) VALUES (?, ?, ?)',
      [term.term, term.definition, term.category]
    );
  }

  private rowToConversationSession(row: any): any {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      turns: JSON.parse(row.turns),
      createdAt: new Date(row.created_at),
      lastActivityAt: new Date(row.last_activity_at),
      archived: row.archived === 1,
      title: row.title,
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
      synced: row.synced === 1,
    };
  }

  private rowToInsight(row: any): any {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      type: row.type,
      narrative: row.narrative,
      supportingSignals: JSON.parse(row.supporting_signals),
      confidenceScore: row.confidence_score,
      explainabilityStatement: row.explainability_statement,
      timeSpanStart: row.time_span_start ? new Date(row.time_span_start) : undefined,
      timeSpanEnd: row.time_span_end ? new Date(row.time_span_end) : undefined,
      communicationScripts: row.communication_scripts ? JSON.parse(row.communication_scripts) : undefined,
      strategyIds: JSON.parse(row.strategy_ids),
      createdAt: new Date(row.created_at),
    };
  }

  private rowToStrategy(row: any): any {
    return {
      id: row.id,
      childProfileId: row.child_profile_id,
      insightId: row.insight_id,
      description: row.description,
      sourceDocumentRef: row.source_document_ref,
      helpedCount: row.helped_count,
      didntHelpCount: row.didnt_help_count,
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
      archived: row.archived === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      synced: row.synced === 1,
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
      extractionFailed: row.extraction_failed === 1,
      uploadedAt: new Date(row.uploaded_at),
    };
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
      synced: row.synced === 1,
    };
  }

  private rowToReward(row: any): any {
    const reward: any = {
      id: row.id,
      childProfileId: row.child_profile_id,
      title: row.title,
      emoji: row.emoji,
      pointCost: row.point_cost,
      parentApprovalRequired: row.parent_approval_required === 1,
      archived: row.archived === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      synced: row.synced === 1,
    };

    // Handle AvailabilityRule JSON serialization
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
}

// Database factory: switch between SQLite and Supabase
// Import Constants to check environment variable
import Constants from 'expo-constants';

// Check environment variable to determine which database to use
const useSupabase = Constants.expoConfig?.extra?.USE_SUPABASE_DB === 'true' || 
                    process.env.EXPO_PUBLIC_USE_SUPABASE_DB === 'true';

console.log(`🗄️  Database mode: ${useSupabase ? 'Supabase (Cloud)' : 'SQLite (Local)'}`);

// Conditionally import and instantiate the appropriate database service
let databaseServiceInstance: DatabaseService;

if (useSupabase) {
  // Only import Supabase service if we're actually using it
  const { SupabaseDatabaseService } = require('./database-supabase');
  databaseServiceInstance = new SupabaseDatabaseService();
} else {
  databaseServiceInstance = new DatabaseService();
}

// Export the singleton instance
export const databaseService = databaseServiceInstance;
