/**
 * Attune Data Import Script
 * Imports backup JSON data into Supabase PostgreSQL database
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.supabase' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.supabase');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Backup file path
const BACKUP_FILE = process.argv[2] || '/Users/robertpassberger/Desktop/Attune/Attune backups/attune-quick-backup-2026-06-25.json';

async function importData() {
  console.log('🚀 Starting Attune data import to Supabase...\n');

  // Read backup file
  console.log(`📂 Reading backup file: ${BACKUP_FILE}`);
  const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  
  console.log(`✅ Backup loaded:`);
  console.log(`   - Version: ${backupData.version}`);
  console.log(`   - Type: ${backupData.backupType}`);
  console.log(`   - Export Date: ${backupData.exportDate}\n`);

  let stats = {
    childProfiles: 0,
    events: 0,
    diaryEntries: 0,
    behaviors: 0,
    rewards: 0,
    pointEvents: 0,
    relationshipPersons: 0,
    contextEntries: 0,
    quickTapButtons: 0,
    insights: 0,
    strategies: 0,
    conversationSessions: 0,
    glossaryTerms: 0,
    voiceLogCorrections: 0,
  };

  // Import Child Profiles
  if (backupData.childProfiles?.length > 0) {
    console.log(`📝 Importing ${backupData.childProfiles.length} child profile(s)...`);
    for (const profile of backupData.childProfiles) {
      const { error } = await supabase.from('child_profiles').insert({
        id: profile.id,
        display_name: profile.displayName,
        alias: profile.alias,
        age: profile.age,
        diagnosis: profile.diagnosis,
        intake_profile: profile.intakeProfile,
        created_at: new Date(profile.createdAt).getTime(),
        updated_at: new Date(profile.updatedAt).getTime(),
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting profile ${profile.displayName}:`, error.message);
      } else {
        stats.childProfiles++;
      }
    }
    console.log(`   ✅ Imported ${stats.childProfiles} child profile(s)\n`);
  }

  // Import Events
  if (backupData.events?.length > 0) {
    console.log(`📝 Importing ${backupData.events.length} events...`);
    for (const event of backupData.events) {
      const { error } = await supabase.from('events').insert({
        id: event.id,
        child_profile_id: event.childProfileId,
        event_type: event.eventType,
        timestamp: new Date(event.timestamp).getTime(),
        severity: event.severity,
        tags: event.tags || [],
        notes: event.notes,
        persons: event.persons || [],
        source: event.source,
        transcript: event.transcript,
        custom_label: event.customLabel,
        custom_emoji: event.customEmoji,
        valence: event.valence,
        context_entry_refs: event.contextEntryRefs || [],
        sequence_order: event.sequenceOrder,
        created_at: new Date(event.createdAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting event ${event.id}:`, error.message);
      } else {
        stats.events++;
      }
    }
    console.log(`   ✅ Imported ${stats.events} events\n`);
  }

  // Import Diary Entries
  if (backupData.diaryEntries?.length > 0) {
    console.log(`📝 Importing ${backupData.diaryEntries.length} diary entries...`);
    for (const entry of backupData.diaryEntries) {
      const { error } = await supabase.from('diary_entries').insert({
        id: entry.id,
        child_profile_id: entry.childProfileId,
        date: new Date(entry.date).getTime(),
        content: entry.content,
        timestamp: new Date(entry.timestamp).getTime(),
        source: entry.source,
        created_at: new Date(entry.createdAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting diary entry ${entry.id}:`, error.message);
      } else {
        stats.diaryEntries++;
      }
    }
    console.log(`   ✅ Imported ${stats.diaryEntries} diary entries\n`);
  }

  // Import Behaviors
  if (backupData.behaviors?.length > 0) {
    console.log(`📝 Importing ${backupData.behaviors.length} behaviors...`);
    for (const behavior of backupData.behaviors) {
      const { error } = await supabase.from('behaviors').insert({
        id: behavior.id,
        child_profile_id: behavior.childProfileId,
        title: behavior.title,
        emoji: behavior.emoji,
        point_value: behavior.pointValue,
        category: behavior.category,
        time_window_start: behavior.timeWindow?.startTime || null,
        time_window_end: behavior.timeWindow?.endTime || null,
        limit_frequency: behavior.limitRule?.frequency || null,
        limit_max_count: behavior.limitRule?.maxCount || null,
        exit_criteria: behavior.exitCriteria || null,
        notes: behavior.notes || null,
        archived: behavior.archived ? 1 : 0,
        created_at: new Date(behavior.createdAt).getTime(),
        updated_at: new Date(behavior.updatedAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting behavior ${behavior.title}:`, error.message);
      } else {
        stats.behaviors++;
      }
    }
    console.log(`   ✅ Imported ${stats.behaviors} behaviors\n`);
  }

  // Import Rewards
  if (backupData.rewards?.length > 0) {
    console.log(`📝 Importing ${backupData.rewards.length} rewards...`);
    for (const reward of backupData.rewards) {
      const { error } = await supabase.from('rewards').insert({
        id: reward.id,
        child_profile_id: reward.childProfileId,
        title: reward.title,
        emoji: reward.emoji,
        point_cost: reward.pointCost,
        availability_type: reward.availabilityRule?.type || null,
        availability_consecutive_days: reward.availabilityRule?.consecutiveDays || null,
        parent_approval_required: reward.parentApprovalRequired ? 1 : 0,
        archived: reward.archived ? 1 : 0,
        created_at: new Date(reward.createdAt).getTime(),
        updated_at: new Date(reward.updatedAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting reward ${reward.title}:`, error.message);
      } else {
        stats.rewards++;
      }
    }
    console.log(`   ✅ Imported ${stats.rewards} rewards\n`);
  }

  // Import Point Events
  if (backupData.pointEvents?.length > 0) {
    console.log(`📝 Importing ${backupData.pointEvents.length} point events...`);
    for (const pointEvent of backupData.pointEvents) {
      const { error } = await supabase.from('point_events').insert({
        id: pointEvent.id,
        child_profile_id: pointEvent.childProfileId,
        type: pointEvent.type,
        behavior_id: pointEvent.behaviorId || null,
        reward_id: pointEvent.rewardId || null,
        point_value: pointEvent.pointValue,
        timestamp: new Date(pointEvent.timestamp).getTime(),
        parent_id: pointEvent.parentId || null,
        created_at: new Date(pointEvent.createdAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting point event ${pointEvent.id}:`, error.message);
      } else {
        stats.pointEvents++;
      }
    }
    console.log(`   ✅ Imported ${stats.pointEvents} point events\n`);
  }

  // Import Relationship Persons
  if (backupData.relationshipPersons?.length > 0) {
    console.log(`📝 Importing ${backupData.relationshipPersons.length} relationship persons...`);
    for (const person of backupData.relationshipPersons) {
      const { error } = await supabase.from('relationship_persons').insert({
        id: person.id,
        child_profile_id: person.childProfileId,
        name: person.name,
        category: person.category || null,
        role: person.role,
        relationship_strength: person.relationshipStrength || null,
        photo_path: person.photoPath || null,
        notes: person.notes || null,
        created_at: new Date(person.createdAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting person ${person.name}:`, error.message);
      } else {
        stats.relationshipPersons++;
      }
    }
    console.log(`   ✅ Imported ${stats.relationshipPersons} relationship persons\n`);
  }

  // Import Context Entries
  if (backupData.contextEntries?.length > 0) {
    console.log(`📝 Importing ${backupData.contextEntries.length} context entries...`);
    for (const entry of backupData.contextEntries) {
      const { error } = await supabase.from('context_entries').insert({
        id: entry.id,
        child_profile_id: entry.childProfileId,
        context_type: entry.contextType,
        sub_type: entry.subType,
        person_name: entry.personName || null,
        person_role: entry.personRole || null,
        start_time: new Date(entry.startTime).getTime(),
        end_time: entry.endTime ? new Date(entry.endTime).getTime() : null,
        notes: entry.notes || null,
        created_at: new Date(entry.createdAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting context entry ${entry.id}:`, error.message);
      } else {
        stats.contextEntries++;
      }
    }
    console.log(`   ✅ Imported ${stats.contextEntries} context entries\n`);
  }

  // Import Quick Tap Buttons
  if (backupData.quickTapButtons?.length > 0) {
    console.log(`📝 Importing ${backupData.quickTapButtons.length} quick tap buttons...`);
    for (const button of backupData.quickTapButtons) {
      const { error } = await supabase.from('quick_tap_buttons').insert({
        id: button.id,
        child_profile_id: button.childProfileId,
        event_type: button.eventType,
        label: button.label,
        emoji: button.emoji || null,
        order_index: button.orderIndex,
        created_at: new Date(button.createdAt).getTime(),
        synced: 0,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting quick tap button ${button.label}:`, error.message);
      } else {
        stats.quickTapButtons++;
      }
    }
    console.log(`   ✅ Imported ${stats.quickTapButtons} quick tap buttons\n`);
  }

  // Import Insights
  if (backupData.insights?.length > 0) {
    console.log(`📝 Importing ${backupData.insights.length} insights...`);
    for (const insight of backupData.insights) {
      const { error } = await supabase.from('insights').insert({
        id: insight.id,
        child_profile_id: insight.childProfileId,
        type: insight.type,
        narrative: insight.narrative,
        supporting_signals: insight.supportingSignals || [],
        confidence_score: insight.confidenceScore,
        explainability_statement: insight.explainabilityStatement,
        time_span_start: insight.timeSpanStart ? new Date(insight.timeSpanStart).getTime() : null,
        time_span_end: insight.timeSpanEnd ? new Date(insight.timeSpanEnd).getTime() : null,
        communication_scripts: insight.communicationScripts || null,
        strategy_ids: insight.strategyIds || [],
        created_at: new Date(insight.createdAt).getTime(),
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting insight ${insight.id}:`, error.message);
      } else {
        stats.insights++;
      }
    }
    console.log(`   ✅ Imported ${stats.insights} insights\n`);
  }

  // Import Strategies
  if (backupData.strategies?.length > 0) {
    console.log(`📝 Importing ${backupData.strategies.length} strategies...`);
    for (const strategy of backupData.strategies) {
      const { error } = await supabase.from('strategies').insert({
        id: strategy.id,
        child_profile_id: strategy.childProfileId,
        insight_id: strategy.insightId,
        description: strategy.description,
        source_document_ref: strategy.sourceDocumentRef || null,
        helped_count: strategy.helpedCount || 0,
        didnt_help_count: strategy.didntHelpCount || 0,
        created_at: new Date(strategy.createdAt).getTime(),
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting strategy ${strategy.id}:`, error.message);
      } else {
        stats.strategies++;
      }
    }
    console.log(`   ✅ Imported ${stats.strategies} strategies\n`);
  }

  // Import Conversation Sessions
  if (backupData.conversationSessions?.length > 0) {
    console.log(`📝 Importing ${backupData.conversationSessions.length} conversation sessions...`);
    for (const session of backupData.conversationSessions) {
      const { error } = await supabase.from('conversation_sessions').insert({
        id: session.id,
        child_profile_id: session.childProfileId,
        turns: session.turns || [],
        created_at: new Date(session.createdAt).getTime(),
        last_activity_at: new Date(session.lastActivityAt).getTime(),
        archived: session.archived ? 1 : 0,
        title: session.title || null,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting conversation session ${session.id}:`, error.message);
      } else {
        stats.conversationSessions++;
      }
    }
    console.log(`   ✅ Imported ${stats.conversationSessions} conversation sessions\n`);
  }

  // Import Glossary Terms
  if (backupData.glossaryTerms?.length > 0) {
    console.log(`📝 Importing ${backupData.glossaryTerms.length} glossary terms...`);
    for (const term of backupData.glossaryTerms) {
      const { error } = await supabase.from('glossary_terms').insert({
        term: term.term,
        definition: term.definition,
        category: term.category,
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting glossary term ${term.term}:`, error.message);
      } else {
        stats.glossaryTerms++;
      }
    }
    console.log(`   ✅ Imported ${stats.glossaryTerms} glossary terms\n`);
  }

  // Import Voice Log Corrections
  if (backupData.voiceLogCorrections?.length > 0) {
    console.log(`📝 Importing ${backupData.voiceLogCorrections.length} voice log corrections...`);
    for (const correction of backupData.voiceLogCorrections) {
      const { error } = await supabase.from('voice_log_corrections').insert({
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
        user_description: correction.userCorrected.description || null,
        correction_type: correction.correctionType,
        created_at: new Date(correction.createdAt).getTime(),
      });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting voice log correction ${correction.id}:`, error.message);
      } else {
        stats.voiceLogCorrections++;
      }
    }
    console.log(`   ✅ Imported ${stats.voiceLogCorrections} voice log corrections\n`);
  }

  // Print summary
  console.log('\n✨ Import Complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Child Profiles: ${stats.childProfiles}`);
  console.log(`   - Events: ${stats.events}`);
  console.log(`   - Diary Entries: ${stats.diaryEntries}`);
  console.log(`   - Behaviors: ${stats.behaviors}`);
  console.log(`   - Rewards: ${stats.rewards}`);
  console.log(`   - Point Events: ${stats.pointEvents}`);
  console.log(`   - Relationship Persons: ${stats.relationshipPersons}`);
  console.log(`   - Context Entries: ${stats.contextEntries}`);
  console.log(`   - Quick Tap Buttons: ${stats.quickTapButtons}`);
  console.log(`   - Insights: ${stats.insights}`);
  console.log(`   - Strategies: ${stats.strategies}`);
  console.log(`   - Conversation Sessions: ${stats.conversationSessions}`);
  console.log(`   - Glossary Terms: ${stats.glossaryTerms}`);
  console.log(`   - Voice Log Corrections: ${stats.voiceLogCorrections}`);
  console.log('\n🎉 Your Attune data is now in Supabase!\n');
}

importData().catch(error => {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
});
