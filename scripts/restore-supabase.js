#!/usr/bin/env node

/**
 * Supabase Database Restore Script
 * 
 * Restores tables from a backup directory.
 * 
 * ⚠️  WARNING: This will DELETE existing data and replace it with backup data!
 * 
 * Usage:
 *   node scripts/restore-supabase.js <backup-directory>
 * 
 * Example:
 *   node scripts/restore-supabase.js backups/supabase-backup-2026-07-16T07-46-00
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://qkvcwngwatfkhmjhzwvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmN3bmd3YXRma2htamh6d3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjY5NTEsImV4cCI6MjEwMDM0Mjk1MX0.PkdkaX-lMkwlRLFLmb6dr5xhwAKkqGRkxS-KI98yPUs';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function restoreTable(tableName, backupDir) {
  try {
    console.log(`\n🔄 Restoring table: ${tableName}`);
    
    const filename = path.join(backupDir, `${tableName}.json`);
    
    if (!fs.existsSync(filename)) {
      console.log(`   ⚠️  Backup file not found: ${tableName}.json (skipping)`);
      return { success: false, count: 0 };
    }

    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    
    if (!data || data.length === 0) {
      console.log(`   ℹ️  Table ${tableName} was empty in backup (skipping)`);
      return { success: true, count: 0 };
    }

    console.log(`   🗑️  Deleting existing rows in ${tableName}...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error(`   ❌ Error deleting from ${tableName}:`, deleteError.message);
      return { success: false, count: 0 };
    }

    console.log(`   📥 Inserting ${data.length} rows into ${tableName}...`);
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(data);

    if (insertError) {
      console.error(`   ❌ Error inserting into ${tableName}:`, insertError.message);
      return { success: false, count: 0 };
    }

    console.log(`   ✅ Restored ${data.length} rows to ${tableName}`);
    return { success: true, count: data.length };
  } catch (error) {
    console.error(`   ❌ Exception restoring ${tableName}:`, error.message);
    return { success: false, count: 0 };
  }
}

async function main() {
  const backupDir = process.argv[2];

  if (!backupDir) {
    console.error('❌ Error: Please provide a backup directory path');
    console.log('\nUsage:');
    console.log('  node scripts/restore-supabase.js <backup-directory>');
    console.log('\nExample:');
    console.log('  node scripts/restore-supabase.js backups/supabase-backup-2026-07-16T07-46-00');
    process.exit(1);
  }

  const fullBackupPath = path.resolve(backupDir);

  if (!fs.existsSync(fullBackupPath)) {
    console.error(`❌ Error: Backup directory not found: ${fullBackupPath}`);
    process.exit(1);
  }

  // Read manifest
  const manifestPath = path.join(fullBackupPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Error: manifest.json not found in backup directory`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  console.log('⚠️  SUPABASE RESTORE WARNING ⚠️');
  console.log('===============================');
  console.log('This will DELETE all current data and replace it with backup data!');
  console.log('');
  console.log(`📁 Backup directory: ${fullBackupPath}`);
  console.log(`📅 Backup created: ${manifest.backup_date_readable}`);
  console.log(`📊 Tables to restore: ${manifest.tables.length}`);
  console.log(`📦 Total rows: ${manifest.total_rows}`);
  console.log('');

  const confirmed = await askConfirmation('Are you SURE you want to proceed? (type "yes" to confirm): ');

  if (!confirmed) {
    console.log('\n❌ Restore cancelled by user');
    process.exit(0);
  }

  console.log('\n🚀 Starting Supabase Restore');
  console.log('============================');

  const results = [];
  for (const tableInfo of manifest.tables) {
    const result = await restoreTable(tableInfo.table, fullBackupPath);
    results.push({
      table: tableInfo.table,
      success: result.success,
      count: result.count,
    });
  }

  // Summary
  console.log('\n============================');
  console.log('✅ Restore Complete!');
  console.log('============================');
  console.log(`✅ Successful tables: ${results.filter(r => r.success).length}/${results.length}`);
  console.log(`📊 Total rows restored: ${results.reduce((sum, r) => sum + r.count, 0)}`);
  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log(`\n❌ Failed tables: ${failed.length}`);
    failed.forEach(f => console.log(`   - ${f.table}`));
  }
}

// Run the restore
main().catch(error => {
  console.error('\n💥 Restore failed with error:', error);
  process.exit(1);
});
