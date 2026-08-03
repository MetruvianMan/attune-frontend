#!/usr/bin/env node

/**
 * Supabase Database Backup Script
 * 
 * Exports all tables from Supabase to JSON files with timestamps.
 * Run before testing to ensure you have a recovery point.
 * 
 * Usage:
 *   node scripts/backup-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://qkvcwngwatfkhmjhzwvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmN3bmd3YXRma2htamh6d3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjY5NTEsImV4cCI6MjEwMDM0Mjk1MX0.PkdkaX-lMkwlRLFLmb6dr5xhwAKkqGRkxS-KI98yPUs';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tables to backup (in order, respecting foreign key dependencies)
const TABLES = [
  'child_profiles',
  'relationship_persons',
  'events',
  'diary_entries',
  'photos',
  'documents',
  'conversation_sessions',
  'glossary_terms',
  'behaviors',
  'rewards',
  'point_events',
  'voice_log_corrections',
  'insights',
  'strategies',
];

// Create backup directory with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupDir = path.join(__dirname, '../backups', `supabase-backup-${timestamp}`);

async function createBackupDirectory() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${backupDir}`);
  }
}

async function backupTable(tableName) {
  try {
    console.log(`\n🔄 Backing up table: ${tableName}`);
    
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    if (error) {
      console.error(`   ❌ Error backing up ${tableName}:`, error.message);
      return { success: false, count: 0 };
    }

    const filename = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    
    console.log(`   ✅ Backed up ${data?.length || 0} rows to ${tableName}.json`);
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error(`   ❌ Exception backing up ${tableName}:`, error.message);
    return { success: false, count: 0 };
  }
}

async function createManifest(results) {
  const manifest = {
    backup_timestamp: new Date().toISOString(),
    backup_date_readable: new Date().toLocaleString(),
    supabase_url: SUPABASE_URL,
    tables: results,
    total_rows: results.reduce((sum, r) => sum + r.count, 0),
    successful_tables: results.filter(r => r.success).length,
    failed_tables: results.filter(r => !r.success).length,
  };

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Created manifest: manifest.json`);
  
  return manifest;
}

async function main() {
  console.log('🚀 Starting Supabase Backup');
  console.log('============================');
  console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📊 Tables to backup: ${TABLES.length}`);

  // Create backup directory
  await createBackupDirectory();

  // Backup each table
  const results = [];
  for (const tableName of TABLES) {
    const result = await backupTable(tableName);
    results.push({
      table: tableName,
      success: result.success,
      count: result.count,
    });
  }

  // Create manifest
  const manifest = await createManifest(results);

  // Summary
  console.log('\n============================');
  console.log('✅ Backup Complete!');
  console.log('============================');
  console.log(`📁 Location: ${backupDir}`);
  console.log(`📊 Total rows backed up: ${manifest.total_rows}`);
  console.log(`✅ Successful tables: ${manifest.successful_tables}/${TABLES.length}`);
  
  if (manifest.failed_tables > 0) {
    console.log(`❌ Failed tables: ${manifest.failed_tables}`);
    console.log('\n⚠️  Some tables failed to backup. Check errors above.');
  } else {
    console.log('\n🎉 All tables backed up successfully!');
  }

  console.log('\n💡 To restore from this backup:');
  console.log(`   1. Keep this folder safe: ${backupDir}`);
  console.log(`   2. Use Supabase dashboard to manually restore if needed`);
  console.log(`   3. Or use the restore script (if available)`);
}

// Run the backup
main().catch(error => {
  console.error('\n💥 Backup failed with error:', error);
  process.exit(1);
});
