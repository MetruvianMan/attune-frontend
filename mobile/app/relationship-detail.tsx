import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { databaseService } from '../services/database';
import { RelationshipPerson, Event } from '../models';
import { EVENT_EMOJIS, getEventLabel } from '../constants/events';

// Relationship colors matching web Circle view
const RELATIONSHIP_COLORS: Record<string, string> = {
  Family: '#7FBF9F',
  'Family (Extended)': '#5DADE2',
  Friends: '#4A90E2',
  Childcare: '#F2C94C',
  Professional: '#9b8ec4',
};

const getRelationshipColor = (role: string): string => {
  // Map roles to categories
  const roleToCategory: Record<string, string> = {
    Parent: 'Family',
    Sibling: 'Family',
    Grandparent: 'Family (Extended)',
    'Extended Family': 'Family (Extended)',
    Friend: 'Friends',
    Caregiver: 'Childcare',
    Teacher: 'Professional',
    Therapist: 'Professional',
    Coach: 'Professional',
  };
  
  const category = roleToCategory[role] || 'Friends';
  return RELATIONSHIP_COLORS[category] || '#4A90E2';
};

export default function RelationshipDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const personId = params.personId as string;

  const [person, setPerson] = useState<RelationshipPerson | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [childProfileId, setChildProfileId] = useState<string | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    loadActiveProfile();
  }, []);

  useEffect(() => {
    if (childProfileId) {
      loadPerson();
    }
  }, [personId, childProfileId]);

  const loadActiveProfile = async () => {
    try {
      const profiles = await databaseService.getAllChildProfiles();
      if (profiles.length > 0) {
        setChildProfileId(profiles[0].id);
      }
    } catch (error) {
      console.error('Failed to load active profile:', error);
    }
  };

  const loadPerson = async () => {
    if (!childProfileId) return;

    try {
      setIsLoading(true);
      const loadedPerson = await databaseService.getRelationshipPersonById(personId);
      
      if (loadedPerson) {
        setPerson(loadedPerson);
        
        // Load events involving this person
        const allEvents = await databaseService.getEvents({ childProfileId });
        console.log(`[Person Detail] Total events for profile: ${allEvents.length}`);
        console.log(`[Person Detail] Looking for person name: "${loadedPerson.name}"`);
        
        const filtered = allEvents.filter(event => {
          const nameToSearch = loadedPerson.name.toLowerCase();
          
          // Check structured persons array (for future compatibility)
          if (event.persons && event.persons.length > 0) {
            const inPersonsArray = event.persons.some(p => 
              p.toLowerCase() === nameToSearch
            );
            if (inPersonsArray) return true;
          }
          
          // Fallback: Search ONLY in event notes (not transcript)
          // This ensures we only show events where the person is directly mentioned
          // for that specific event, not just mentioned in the day's diary
          const eventNotes = (event.notes || '').toLowerCase();
          
          // Look for the person's name in the event notes
          // Use word boundaries to avoid partial matches
          const wordBoundaryRegex = new RegExp(`\\b${nameToSearch}\\b`, 'i');
          const foundInNotes = wordBoundaryRegex.test(eventNotes);
          
          return foundInNotes;
        });
        
        setRelatedEvents(filtered);
        console.log(`[Person Detail] Loaded ${filtered.length} events mentioning ${loadedPerson.name} in event notes`);
        
        // Debug: Show a few matched events
        if (filtered.length > 0) {
          console.log(`[Person Detail] Sample matched events:`, 
            filtered.slice(0, 3).map(e => ({ 
              type: e.eventType,
              note: e.notes?.substring(0, 80)
            }))
          );
        }
      } else {
        Alert.alert('Error', 'Person not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load person:', error);
      Alert.alert('Error', 'Failed to load person');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/relationship-form?personId=${personId}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to remove ${person?.name} from the circle? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await databaseService.deleteRelationshipPerson(personId);
      Alert.alert('Success', 'Person removed from circle', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to delete person:', error);
      Alert.alert('Error', 'Failed to delete person');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEventPress = (event: Event) => {
    const emoji = event.customEmoji || EVENT_EMOJIS[event.eventType] || '📝';
    const eventLabel = event.customLabel || getEventLabel(event.eventType);
    
    const eventDate = new Date(event.timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const message = event.notes 
      ? `${eventDate}\n\n${event.notes}`
      : `${eventDate}\n\nNo additional notes for this event.`;
    
    Alert.alert(`${emoji} ${eventLabel}`, message, [{ text: 'OK' }]);
  };

  const renderStrengthIndicator = (strength?: number) => {
    if (!strength) return null;
    
    const hearts = '❤️'.repeat(strength) + '🤍'.repeat(5 - strength);
    return (
      <View style={styles.strengthRow}>
        <Text style={styles.strengthHearts}>{hearts}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Person not found</Text>
        </View>
      </View>
    );
  }

  const accentColor = getRelationshipColor(person.role);

  return (
    <View style={[styles.container, { backgroundColor: '#f9f9f9' }]}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section: Photo + Name + Role */}
        <View style={styles.heroSection}>
          <View style={[styles.avatarContainer, { borderColor: accentColor }]}>
            {person.photoPath ? (
              <Image
                source={{ uri: person.photoPath }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: accentColor }]}>
                <Text style={styles.avatarText}>
                  {person.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.personName}>{person.name}</Text>
          <Text style={[styles.personRole, { color: accentColor }]}>{person.role}</Text>

          {renderStrengthIndicator(person.relationshipStrength)}
        </View>

        {/* Notes Section */}
        {person.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.notesText}>{person.notes}</Text>
          </View>
        )}

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Activity</Text>
          {relatedEvents.length === 0 ? (
            <View style={styles.emptyActivityCard}>
              <Text style={styles.emptyActivityIcon}>📅</Text>
              <Text style={styles.emptyActivityText}>No logged activity yet</Text>
              <Text style={styles.emptyActivityHint}>
                Events involving {person.name} will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.activityCard}>
              <Text style={styles.activityCount}>
                {relatedEvents.length} {relatedEvents.length === 1 ? 'event' : 'events'}
              </Text>
              <View style={styles.activityList}>
                {(showAllEvents ? relatedEvents : relatedEvents.slice(0, 5)).map((event) => {
                  const emoji = event.customEmoji || EVENT_EMOJIS[event.eventType] || '📝';
                  const eventLabel = event.customLabel || getEventLabel(event.eventType);
                  
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.activityItem}
                      onPress={() => handleEventPress(event)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.activityDot, { backgroundColor: accentColor }]} />
                      <Text style={styles.activityEmoji}>{emoji}</Text>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityType}>{eventLabel}</Text>
                        <Text style={styles.activityDate}>
                          {new Date(event.timestamp).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {relatedEvents.length > 5 && !showAllEvents && (
                <TouchableOpacity
                  onPress={() => setShowAllEvents(true)}
                  style={styles.showMoreButton}
                >
                  <Text style={[styles.moreActivityText, { color: accentColor }]}>
                    +{relatedEvents.length - 5} more
                  </Text>
                </TouchableOpacity>
              )}
              {showAllEvents && relatedEvents.length > 5 && (
                <TouchableOpacity
                  onPress={() => setShowAllEvents(false)}
                  style={styles.showMoreButton}
                >
                  <Text style={[styles.moreActivityText, { color: accentColor }]}>
                    Show less
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.actionsCard}>
          <TouchableOpacity 
            style={styles.actionRow}
            onPress={handleEdit}
          >
            <View style={styles.actionRowLeft}>
              <Ionicons name="pencil-outline" size={20} color="#333" style={styles.actionIcon} />
              <Text style={styles.actionRowText}>Edit details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity 
            style={styles.actionRow}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <View style={styles.actionRowLeft}>
              <Ionicons name="person-remove-outline" size={20} color="#FF3B30" style={styles.actionIcon} />
              <Text style={[styles.actionRowText, styles.deleteText]}>
                {isDeleting ? 'Removing...' : 'Remove from Circle'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Metadata Footer (compact) */}
        <View style={styles.metadataFooter}>
          <Text style={styles.metadataText}>
            Added {new Date(person.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.metadataDot}> · </Text>
          <Text style={styles.metadataText}>
            {person.synced ? 'Synced' : 'Sync pending'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 4,
    color: '#333',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 110,
    paddingBottom: 40,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    marginBottom: 20,
    borderWidth: 4,
    borderRadius: 70,
    padding: 2,
  },
  avatarImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 52,
    fontWeight: '700',
    color: '#fff',
  },
  personName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  personRole: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  strengthRow: {
    marginTop: 8,
  },
  strengthHearts: {
    fontSize: 20,
    letterSpacing: 2,
  },
  
  // Sections
  section: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  
  // Activity Section
  emptyActivityCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyActivityIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.3,
  },
  emptyActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  emptyActivityHint: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  activityCard: {
    paddingTop: 4,
  },
  activityCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  activityList: {
    gap: 0,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 0,
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 13,
    color: '#999',
  },
  showMoreButton: {
    paddingVertical: 8,
  },
  moreActivityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Actions Card
  actionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    marginRight: 12,
  },
  actionRowText: {
    fontSize: 16,
    color: '#000',
  },
  deleteText: {
    color: '#FF3B30',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 48,
  },
  
  // Metadata Footer
  metadataFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
  },
  metadataDot: {
    fontSize: 12,
    color: '#999',
  },
});
