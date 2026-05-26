import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { PersonCard } from '../../components/PersonCard';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { RelationshipPerson } from '../../models';

export default function CircleScreen() {
  const router = useRouter();
  const [persons, setPersons] = useState<RelationshipPerson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = async () => {
    try {
      setIsLoading(true);
      const loadedPersons = await databaseService.getRelationshipPersons(childProfileId);
      setPersons(loadedPersons);
    } catch (error) {
      console.error('Failed to load persons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncService.sync();
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

  const renderPerson = ({ item }: { item: RelationshipPerson }) => (
    <PersonCard person={item} onPress={() => handlePersonPress(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No People Yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        Add people in your child's support network
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={persons}
        renderItem={renderPerson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddPerson}
        label="Add Person"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyMessage: {
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
