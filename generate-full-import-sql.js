/**
 * Generate COMPLETE SQL INSERT statements from backup JSON
 * Output can be pasted directly into Supabase SQL Editor
 */

import fs from 'fs';

const BACKUP_FILE = '/Users/robertpassberger/Desktop/attune-full-backup-2026-07-22.json';

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateSql() {
  console.log('-- Attune FULL Data Import SQL');
  console.log('-- Generated from full backup file');
  console.log('-- Run this in Supabase SQL Editor\n');

  const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));

  // Child Profiles
  if (backupData.childProfiles?.length > 0) {
    console.log(`-- Child Profiles (${backupData.childProfiles.length})`);
    for (const profile of backupData.childProfiles) {
      console.log(`INSERT INTO child_profiles (id, display_name, alias, age, diagnosis, intake_profile, created_at, updated_at) VALUES (${escapeSql(profile.id)}, ${escapeSql(profile.displayName)}, ${escapeSql(profile.alias)}, ${escapeSql(profile.age)}, ${escapeSql(profile.diagnosis)}, ${escapeSql(profile.intakeProfile)}, ${new Date(profile.createdAt).getTime()}, ${new Date(profile.updatedAt).getTime()}) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Events
  if (backupData.events?.length > 0) {
    console.log(`-- Events (${backupData.events.length})`);
    for (const event of backupData.events) {
      console.log(`INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (${escapeSql(event.id)}, ${escapeSql(event.childProfileId)}, ${escapeSql(event.eventType)}, ${new Date(event.timestamp).getTime()}, ${escapeSql(event.severity)}, ${escapeSql(event.tags || [])}, ${escapeSql(event.notes)}, ${escapeSql(event.persons || [])}, ${escapeSql(event.source)}, ${escapeSql(event.transcript)}, ${escapeSql(event.customLabel)}, ${escapeSql(event.customEmoji)}, ${escapeSql(event.valence)}, ${escapeSql(event.contextEntryRefs || [])}, ${escapeSql(event.sequenceOrder)}, ${new Date(event.createdAt).getTime()}, 0) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Diary Entries
  if (backupData.diaryEntries?.length > 0) {
    console.log(`-- Diary Entries (${backupData.diaryEntries.length})`);
    for (const entry of backupData.diaryEntries) {
      console.log(`INSERT INTO diary_entries (id, child_profile_id, date, content, timestamp, source, created_at, synced) VALUES (${escapeSql(entry.id)}, ${escapeSql(entry.childProfileId)}, ${new Date(entry.date).getTime()}, ${escapeSql(entry.content)}, ${new Date(entry.timestamp).getTime()}, ${escapeSql(entry.source)}, ${new Date(entry.createdAt).getTime()}, 0) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Behaviors
  if (backupData.behaviors?.length > 0) {
    console.log(`-- Behaviors (${backupData.behaviors.length})`);
    for (const behavior of backupData.behaviors) {
      console.log(`INSERT INTO behaviors (id, child_profile_id, title, emoji, point_value, category, time_window_start, time_window_end, limit_frequency, limit_max_count, exit_criteria, notes, archived, created_at, updated_at, synced) VALUES (${escapeSql(behavior.id)}, ${escapeSql(behavior.childProfileId)}, ${escapeSql(behavior.title)}, ${escapeSql(behavior.emoji)}, ${escapeSql(behavior.pointValue)}, ${escapeSql(behavior.category)}, ${escapeSql(behavior.timeWindow?.startTime)}, ${escapeSql(behavior.timeWindow?.endTime)}, ${escapeSql(behavior.limitRule?.frequency)}, ${escapeSql(behavior.limitRule?.maxCount)}, ${escapeSql(behavior.exitCriteria)}, ${escapeSql(behavior.notes)}, ${behavior.archived ? 1 : 0}, ${new Date(behavior.createdAt).getTime()}, ${new Date(behavior.updatedAt).getTime()}, 0) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Rewards
  if (backupData.rewards?.length > 0) {
    console.log(`-- Rewards (${backupData.rewards.length})`);
    for (const reward of backupData.rewards) {
      console.log(`INSERT INTO rewards (id, child_profile_id, title, emoji, point_cost, availability_type, availability_consecutive_days, parent_approval_required, archived, created_at, updated_at, synced) VALUES (${escapeSql(reward.id)}, ${escapeSql(reward.childProfileId)}, ${escapeSql(reward.title)}, ${escapeSql(reward.emoji)}, ${escapeSql(reward.pointCost)}, ${escapeSql(reward.availabilityRule?.type)}, ${escapeSql(reward.availabilityRule?.consecutiveDays)}, ${reward.parentApprovalRequired ? 1 : 0}, ${reward.archived ? 1 : 0}, ${new Date(reward.createdAt).getTime()}, ${new Date(reward.updatedAt).getTime()}, 0) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Point Events
  if (backupData.pointEvents?.length > 0) {
    console.log(`-- Point Events (${backupData.pointEvents.length})`);
    for (const pointEvent of backupData.pointEvents) {
      console.log(`INSERT INTO point_events (id, child_profile_id, type, behavior_id, reward_id, point_value, timestamp, parent_id, created_at, synced) VALUES (${escapeSql(pointEvent.id)}, ${escapeSql(pointEvent.childProfileId)}, ${escapeSql(pointEvent.type)}, ${escapeSql(pointEvent.behaviorId)}, ${escapeSql(pointEvent.rewardId)}, ${escapeSql(pointEvent.pointValue)}, ${new Date(pointEvent.timestamp).getTime()}, ${escapeSql(pointEvent.parentId)}, ${new Date(pointEvent.createdAt).getTime()}, 0) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Relationship Persons
  if (backupData.relationshipPersons?.length > 0) {
    console.log(`-- Relationship Persons (${backupData.relationshipPersons.length})`);
    for (const person of backupData.relationshipPersons) {
      console.log(`INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (${escapeSql(person.id)}, ${escapeSql(person.childProfileId)}, ${escapeSql(person.name)}, ${escapeSql(person.category)}, ${escapeSql(person.role)}, ${escapeSql(person.relationshipStrength)}, ${escapeSql(person.photoPath)}, ${escapeSql(person.notes)}, ${new Date(person.createdAt).getTime()}, 0) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Quick Tap Buttons
  if (backupData.quickTapButtons?.length > 0) {
    console.log(`-- Quick Tap Buttons (${backupData.quickTapButtons.length})`);
    for (const button of backupData.quickTapButtons) {
      console.log(`INSERT INTO quick_tap_buttons (id, child_profile_id, event_type, label, emoji, order_index, created_at, synced) VALUES (${escapeSql(button.id)}, ${escapeSql(button.childProfileId)}, ${escapeSql(button.eventType)}, ${escapeSql(button.label)}, ${escapeSql(button.emoji)}, ${escapeSql(button.orderIndex)}, ${new Date(button.createdAt).getTime()}, 0) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  // Conversation Sessions  
  if (backupData.conversationSessions?.length > 0) {
    console.log(`-- Conversation Sessions (${backupData.conversationSessions.length})`);
    for (const session of backupData.conversationSessions) {
      console.log(`INSERT INTO conversation_sessions (id, child_profile_id, turns, created_at, last_activity_at, archived, title) VALUES (${escapeSql(session.id)}, ${escapeSql(session.childProfileId)}, ${escapeSql(session.turns || [])}, ${new Date(session.createdAt).getTime()}, ${new Date(session.lastActivityAt).getTime()}, ${session.archived ? 1 : 0}, ${escapeSql(session.title)}) ON CONFLICT (id) DO NOTHING;`);
    }
    console.log('');
  }

  console.log('-- Import complete!');
  console.log(`-- Total records: ${
    (backupData.childProfiles?.length || 0) +
    (backupData.events?.length || 0) +
    (backupData.diaryEntries?.length || 0) +
    (backupData.behaviors?.length || 0) +
    (backupData.rewards?.length || 0) +
    (backupData.pointEvents?.length || 0) +
    (backupData.relationshipPersons?.length || 0) +
    (backupData.quickTapButtons?.length || 0) +
    (backupData.conversationSessions?.length || 0)
  }`);
}

generateSql();
