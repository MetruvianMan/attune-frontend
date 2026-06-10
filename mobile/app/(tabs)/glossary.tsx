import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { ProfileHeader } from '../../components/ProfileHeader';
import { databaseService } from '../../services/database';
import { ChildProfile, GlossaryTerm } from '../../models';
import { GLOSSARY_SEED_DATA } from '../../data/glossary-seed';
import { colors, shadows, radius, spacing } from '../../constants/theme';

type GlossaryCategory = 'general_concepts' | 'autism_related' | 'adhd_related' | 'school_and_services' | 'sensory';

const CATEGORIES: { key: GlossaryCategory; label: string; emoji: string }[] = [
  { key: 'general_concepts', label: 'General', emoji: '🌍' },
  { key: 'autism_related', label: 'Autism', emoji: '🧩' },
  { key: 'adhd_related', label: 'ADHD', emoji: '⚡' },
  { key: 'school_and_services', label: 'School & Services', emoji: '🏫' },
  { key: 'sensory', label: 'Sensory', emoji: '🎨' },
];

const ALL_CATEGORY = { key: null, label: 'All', emoji: '📚' };

export default function GlossaryScreen() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | null>(null);
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadActiveProfile();
      loadTerms();
    }, [])
  );

  const loadActiveProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      if (profiles.length > 0) {
        setActiveProfile(profiles[0]);
        
        // Load profile photo
        const photos = await databaseService.getPhotosByProfileId(profiles[0].id);
        if (photos.length > 0) {
          setProfilePhotoUri(photos[0].filePath);
        }
      }
    } catch (error) {
      console.error('Failed to load active profile:', error);
    }
  };

  const loadTerms = async () => {
    try {
      let loadedTerms = await databaseService.getGlossaryTerms();
      
      // If no terms exist, seed the database with default terms
      if (loadedTerms.length === 0) {
        console.log('No glossary terms found, seeding database...');
        for (const term of GLOSSARY_SEED_DATA) {
          await databaseService.createGlossaryTerm(term);
        }
        loadedTerms = await databaseService.getGlossaryTerms();
        console.log(`Seeded ${loadedTerms.length} glossary terms`);
      }
      
      setTerms(loadedTerms);
    } catch (error) {
      console.error('Failed to load glossary terms:', error);
    }
  };

  const getTermsByCategory = (category: GlossaryCategory): GlossaryTerm[] => {
    return terms.filter(t => t.category === category);
  };

  const categoriesToShow = activeCategory
    ? CATEGORIES.filter(c => c.key === activeCategory)
    : CATEGORIES;

  return (
    <View style={styles.container}>
      <ProfileHeader
        emoji="📖"
        title="Glossary"
        profileName={activeProfile?.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Horizontal scrolling category filter tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                activeCategory === null && styles.tabActive
              ]}
              onPress={() => setActiveCategory(null)}
            >
              <Text style={[
                styles.tabText,
                activeCategory === null && styles.tabTextActive
              ]}>
                {ALL_CATEGORY.emoji} {ALL_CATEGORY.label}
              </Text>
            </TouchableOpacity>

            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.tab,
                  activeCategory === cat.key && styles.tabActive
                ]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Text style={[
                  styles.tabText,
                  activeCategory === cat.key && styles.tabTextActive
                ]}>
                  {cat.emoji} {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Terms by category */}
          {categoriesToShow.map(cat => {
            const categoryTerms = getTermsByCategory(cat.key);
            if (categoryTerms.length === 0) return null;

            return (
              <View key={cat.key} style={styles.categorySection}>
                {/* Category header - visually distinct, not embedded in cards */}
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>
                    {cat.emoji} {cat.label}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {categoryTerms.length} {categoryTerms.length === 1 ? 'term' : 'terms'}
                  </Text>
                </View>

                {/* Terms as independent cards */}
                {categoryTerms.map((term) => (
                  <View key={`${cat.key}-${term.term}`} style={styles.termCard}>
                    <Text style={styles.termName}>{term.term}</Text>
                    <Text style={styles.termDefinition}>{term.definition}</Text>
                  </View>
                ))}
              </View>
            );
          })}

          {/* Empty state */}
          {terms.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyTitle}>No glossary terms</Text>
              <Text style={styles.emptyText}>
                Glossary terms will appear here once loaded.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  tabsScroll: {
    marginTop: 8,
    marginBottom: 24,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: colors.cardBg,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
    backgroundColor: colors.bg,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.4,
  },
  categoryCount: {
    fontSize: 13,
    color: colors.textDim,
    fontWeight: '500',
    marginTop: 4,
  },
  termCard: {
    backgroundColor: colors.cardBg,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    ...shadows.sm,
  },
  termName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  termDefinition: {
    fontSize: 15,
    color: colors.textDim,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 40,
    margin: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
});
