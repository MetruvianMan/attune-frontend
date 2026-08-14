import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Alert, TouchableOpacity } from 'react-native';
import { Text, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { CircleNetworkView } from '../../components/CircleNetworkView';
import { ProfileHeader } from '../../components/ProfileHeader';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { RelationshipPerson, ChildProfile, RelationshipCategory } from '../../models';

const CATEGORIES: RelationshipCategory[] = ['Family', 'Family (Extended)', 'Friends', 'Childcare', 'Professional'];

const CATEGORY_COLORS: Record<RelationshipCategory, string> = {
  Family: '#7FBF9F',
  'Family (Extended)': '#5DADE2',
  Friends: '#88A9C3',
  Childcare: '#E8B86D',
  Professional: '#A896B5',
  Other: '#95a5a6',
};

// Single accent color for UI controls
const UI_ACCENT = '#4A90E2';

export default function CircleScreen() {
  const router = useRouter();
  const [persons, setPersons] = useState<RelationshipPerson[]>([]);
  const [filteredPersons, setFilteredPersons] = useState<RelationshipPerson[]>([]);
  // Starts true (not false): on mount, loadActiveProfile() -> loadPersons()
  // is an async chain, so there's a window before either resolves where
  // persons is still []. Without this starting true, that window renders
  // the "Build your circle" empty state even when the profile already has
  // people in it.
  const [isLoading, setIsLoading] = useState(true);
  // True once avatar prefetching has settled (or timed out) for the current
  // `persons` list. Rendering CircleNetworkView before this is what causes
  // the "building out" effect: nodes mount with their final layout
  // immediately, but each SvgImage is still fetching its photo over the
  // network, so photos visibly pop in one at a time. Holding the reveal
  // until prefetch settles means the diagram appears once, fully formed.
  //
  // Only gates the *very first* reveal - once the diagram has been shown
  // successfully, later reloads (pull-to-refresh, refocusing the tab) don't
  // hide it again while re-prefetching, since by then avatars are usually
  // already in the native image cache from the first prefetch anyway.
  const [avatarsReady, setAvatarsReady] = useState(false);
  const hasRevealedNetworkView = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<RelationshipCategory | 'All'>('All');
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const childProfileId = activeProfile?.id || null;

  // Reload profile and persons when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[Circle] Screen focused - triggering reload');
      setReloadTrigger(prev => prev + 1);
    }, [])
  );

  useEffect(() => {
    loadActiveProfile();
  }, [reloadTrigger]);

  useEffect(() => {
    if (childProfileId) {
      loadPersons();
    }
  }, [childProfileId, reloadTrigger]);

  useEffect(() => {
    // Apply filter
    if (activeFilter === 'All') {
      setFilteredPersons(persons);
    } else {
      setFilteredPersons(persons.filter(p => p.category === activeFilter));
    }
  }, [persons, activeFilter]);

  const loadActiveProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      console.log('[Circle] Loaded profiles:', profiles.length);
      if (profiles.length > 0) {
        setActiveProfile(profiles[0]);
        console.log('[Circle] Active profile:', profiles[0].displayName, profiles[0].id);
        
        const photos = await databaseService.getPhotosByProfileId(profiles[0].id);
        console.log('[Circle] Photos for profile:', photos.length);
        if (photos.length > 0) {
          console.log('[Circle] First photo path:', photos[0].filePath);
          setProfilePhotoUri(photos[0].filePath);
        } else {
          console.log('[Circle] No photos found for profile');
          setProfilePhotoUri(null);
        }
      } else {
        console.log('[Circle] No profiles found');
        // No profile means loadPersons() (which normally clears isLoading
        // in its own finally block) never runs - clear it here instead, or
        // the loading spinner would be stuck on forever.
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to load active profile:', error);
      setIsLoading(false);
    }
  };

  const loadPersons = async () => {
    if (!childProfileId) return;

    // Only hide the diagram behind a spinner on the very first load - later
    // reloads (pull-to-refresh, tab refocus) shouldn't hide an
    // already-rendered diagram just to re-run the prefetch check.
    const isFirstReveal = !hasRevealedNetworkView.current;

    try {
      setIsLoading(true);
      if (isFirstReveal) {
        setAvatarsReady(false);
      }
      const loadedPersons = await databaseService.getRelationshipPersons(childProfileId);
      console.log('[Circle] Loaded persons:', loadedPersons.length, loadedPersons);
      setPersons(loadedPersons);

      if (isFirstReveal) {
        // Wait for avatars to prefetch (bounded by a timeout) before
        // revealing the diagram, so it appears fully formed instead of
        // building out photo-by-photo. isLoading itself is cleared right
        // away below - avatarsReady is what actually gates the reveal.
        await prefetchAvatars(loadedPersons);
        setAvatarsReady(true);
        hasRevealedNetworkView.current = true;
      } else {
        // Diagram already visible - keep prefetching in the background for
        // any newly-added people, but don't block/hide the render on it.
        prefetchAvatars(loadedPersons).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to load persons:', error);
      if (isFirstReveal) {
        setAvatarsReady(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Kick off downloads for every person's avatar as soon as the list loads,
  // in parallel, rather than letting each node in CircleNetworkView's SVG
  // graph request its image lazily as it renders. Image.prefetch() (from
  // 'react-native', not expo-image) uses the same native ImageLoader/cache
  // that react-native-svg's <SvgImage> reads from, so a successful prefetch
  // here means the graph's own image requests resolve from cache instantly.
  // Waits for all prefetches to settle (success or failure treated the
  // same - a failed prefetch just means that node falls back to its normal
  // lazy load), capped by a timeout so one slow/broken image can't hold up
  // the whole screen indefinitely.
  const prefetchAvatars = async (people: RelationshipPerson[]): Promise<void> => {
    const uris = people
      .map(p => p.photoThumbnailPath || p.photoPath)
      .filter((uri): uri is string => !!uri && uri.startsWith('http'));

    if (uris.length === 0) return;

    const AVATAR_PREFETCH_TIMEOUT_MS = 2500;
    const prefetchAll = Promise.all(
      uris.map(uri => Image.prefetch(uri).catch(() => {
        // Ignore - the SVG node will just load it lazily on render instead
      }))
    );
    const timeout = new Promise<void>(resolve => setTimeout(resolve, AVATAR_PREFETCH_TIMEOUT_MS));

    await Promise.race([prefetchAll, timeout]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncService.sync();
      await loadActiveProfile();
      await loadPersons();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePersonPress = (person: RelationshipPerson) => {
    router.push(`/relationship-detail?personId=${person.id}`);
  };

  const handleAddPerson = () => {
    router.push('/relationship-form');
  };

  const renderFilterChips = () => {
    const allFilters: Array<RelationshipCategory | 'All'> = ['All', ...CATEGORIES];
    
    return (
      <View style={styles.filterContainer}>
        {allFilters.map((filter) => {
          const isActive = activeFilter === filter;
          
          return (
            <Chip
              key={filter}
              selected={isActive}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? UI_ACCENT : 'rgba(0,0,0,0.04)',
                  borderWidth: 0,
                },
              ]}
              textStyle={[
                styles.filterChipText,
                { 
                  color: isActive ? 'white' : '#666',
                  fontFamily: 'Chivo_400Regular',
                },
              ]}
              selectedColor="white"
            >
              {filter}
            </Chip>
          );
        })}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {/* Show central profile photo even when empty */}
      <View style={styles.centralPhotoContainer}>
        <View style={styles.centralPhotoCircle}>
          {profilePhotoUri ? (
            <Image
              source={{ uri: profilePhotoUri }}
              style={styles.centralPhoto}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.centralPhotoPlaceholder}>👤</Text>
          )}
        </View>
        {activeProfile && (
          <Text style={styles.centralProfileName}>{activeProfile.displayName}</Text>
        )}
      </View>

      {/* Empty state message - far below */}
      <View style={styles.emptyMessageContainer}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={styles.emptyTitle}>
          Build {activeProfile?.displayName || 'your child'}'s circle
        </Text>
        <Text style={styles.emptyMessage}>
          Add the people who support and care for {activeProfile?.displayName || 'your child'}
        </Text>
        <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddPerson}>
          <Text style={styles.emptyAddButtonText}>+ Add First Person</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        emoji="🌳"
        title="Circle"
        profileName={activeProfile?.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Category Filter Chips - reduced prominence */}
        {persons.length > 0 && renderFilterChips()}

        {/* Network View or Empty State */}
        {(isLoading && persons.length === 0) || (persons.length > 0 && !avatarsReady) ? (
          // Either still fetching the person list for the first time (show
          // a spinner instead of the "Build your circle" empty state, which
          // would otherwise flash even when persons already exist), or the
          // list has loaded but avatars are still prefetching - in both
          // cases hold off on rendering CircleNetworkView so the diagram
          // never visibly "builds out" node-by-node/photo-by-photo.
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={UI_ACCENT} />
          </View>
        ) : persons.length === 0 ? (
          renderEmpty()
        ) : filteredPersons.length > 0 ? (
          <View style={filteredPersons.length > 6 ? styles.scrollableNetworkContainer : undefined}>
            <CircleNetworkView
              persons={filteredPersons}
              childName={activeProfile?.displayName || 'Child'}
              childPhotoUri={profilePhotoUri}
              onPersonPress={handlePersonPress}
            />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.noResultsMessage}>
              No people in this category
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Person Button - reduced prominence, integrated naturally */}
      {persons.length > 0 && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddPerson}>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Person</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollableNetworkContainer: {
    minWidth: '100%',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  filterChip: {
    marginHorizontal: 2,
    marginVertical: 2,
    height: 34,
    elevation: 0,
    shadowOpacity: 0,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    fontFamily: 'Chivo_400Regular',
  },
  centralPhotoContainer: {
    alignItems: 'center',
    marginTop: 140,
    marginBottom: 60,
  },
  centralPhotoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E3F2FD',
    borderWidth: 4,
    borderColor: UI_ACCENT,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: UI_ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  centralPhoto: {
    width: '100%',
    height: '100%',
  },
  centralPhotoPlaceholder: {
    fontSize: 72,
  },
  centralProfileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 140,
  },
  emptyMessageContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  emptyMessage: {
    fontSize: 15,
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    fontWeight: '400',
  },
  emptyAddButton: {
    backgroundColor: UI_ACCENT,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: UI_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  noResultsMessage: {
    fontSize: 15,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 60,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  addButtonIcon: {
    fontSize: 20,
    color: UI_ACCENT,
    fontWeight: '400',
    marginRight: 6,
  },
  addButtonText: {
    color: '#2d3436',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
