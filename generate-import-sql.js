/**
 * Generate SQL INSERT statements from backup JSON
 * Output can be pasted directly into Supabase SQL Editor
 */

import fs from 'fs';

const BACKUP_FILE = process.argv[2] || '/Users/robertpassberger/Downloads/attune-full-backup-2026-06-25.json';

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateSql() {
  console.log('-- Attune Data Import SQL');
  console.log('-- Generated from backup file');
  console.log('-- Run this in Supabase SQL Editor\n');

  const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));

  // Child Profiles
  if (backupData.childProfiles?.length > 0) {
    console.log('-- Child Profiles');
    for (const profile of backupData.childProfiles) {
      console.log(`INSERT INTO child_profiles (id, display_name, alias, age, diagnosis, intake_profile, created_at, updated_at) VALUES (`);
      console.log(`  ${escapeSql(profile.id)},`);
      console.log(`  ${escapeSql(profile.displayName)},`);
      console.log(`  ${escapeSql(profile.alias)},`);
      console.log(`  ${escapeSql(profile.age)},`);
      console.log(`  ${escapeSql(profile.diagnosis)},`);
      console.log(`  ${escapeSql(profile.intakeProfile)},`);
      console.log(`  ${new Date(profile.createdAt).getTime()},`);
      console.log(`  ${new Date(profile.updatedAt).getTime()}`);
      console.log(`) ON CONFLICT (id) DO NOTHING;\n`);
    }
  }

  // Events (all of them)
  if (backupData.events?.length > 0) {
    console.log(`-- Events (${backupData.events.length} total)`);
    for (const event of backupData.events) {
      console.log(`INSERT INTO events (id, child_profile_id, event_type, timestamp, severity, tags, notes, persons, source, transcript, custom_label, custom_emoji, valence, context_entry_refs, sequence_order, created_at, synced) VALUES (`);
      console.log(`  ${escapeSql(event.id)},`);
      console.log(`  ${escapeSql(event.childProfileId)},`);
      console.log(`  ${escapeSql(event.eventType)},`);
      console.log(`  ${new Date(event.timestamp).getTime()},`);
      console.log(`  ${escapeSql(event.severity)},`);
      console.log(`  ${escapeSql(event.tags || [])},`);
      console.log(`  ${escapeSql(event.notes)},`);
      console.log(`  ${escapeSql(event.persons || [])},`);
      console.log(`  ${escapeSql(event.source)},`);
      console.log(`  ${escapeSql(event.transcript)},`);
      console.log(`  ${escapeSql(event.customLabel)},`);
      console.log(`  ${escapeSql(event.customEmoji)},`);
      console.log(`  ${escapeSql(event.valence)},`);
      console.log(`  ${escapeSql(event.contextEntryRefs || [])},`);
      console.log(`  ${escapeSql(event.sequenceOrder)},`);
      console.log(`  ${new Date(event.createdAt).getTime()},`);
      console.log(`  0`);
      console.log(`) ON CONFLICT (id) DO NOTHING;\n`);
    }
  }

  // Diary Entries
  if (backupData.relationshipPersons?.length > 0) {
    console.log('-- Relationship Persons');
    for (const person of backupData.relationshipPersons) {
      console.log(`INSERT INTO relationship_persons (id, child_profile_id, name, category, role, relationship_strength, photo_path, notes, created_at, synced) VALUES (`);
      console.log(`  ${escapeSql(person.id)},`);
      console.log(`  ${escapeSql(person.childProfileId)},`);
      console.log(`  ${escapeSql(person.name)},`);
      console.log(`  ${escapeSql(person.category)},`);
      console.log(`  ${escapeSql(person.role)},`);
      console.log(`  ${escapeSql(person.relationshipStrength)},`);
      console.log(`  ${escapeSql(person.photoPath)},`);
      console.log(`  ${escapeSql(person.notes)},`);
      console.log(`  ${new Date(person.createdAt).getTime()},`);
      console.log(`  0`);
      console.log(`) ON CONFLICT (id) DO NOTHING;\n`);
    }
  }

  console.log('-- Import complete!');
}

generateSql();
