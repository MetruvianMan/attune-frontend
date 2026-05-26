import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { GlossaryTermCard } from '../../components/GlossaryTermCard';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';

interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
}

export default function GlossaryScreen() {
  const router = useRouter();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<GlossaryTerm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    filterTerms();
  }, [searchQuery, terms]);

  const loadTerms = async () => {
    try {
      setIsLoading(true);
      const loadedTerms = await databaseService.getGlossaryTerms();
      setTerms(loadedTerms);
    } catch (error) {
      console.error('Failed to load glossary terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTerms = () => {
    if (!searchQuery.trim()) {
      setFilteredTerms(terms);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = terms.filter(term =>
      term.term.toLowerCase().includes(query) ||
      term.definition.toLowerCase().includes(query) ||
      term.category.toLowerCase().includes(query)
    );
    setFilteredTerms(filtered);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncService.sync();
      await loadTerms();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTermPress = (term: GlossaryTerm) => {
    router.push(`/glossary-term-detail?term=${encodeURIComponent(term.term)}`);
  };

  const renderTerm = ({ item }: { item: GlossaryTerm }) => (
    <GlossaryTermCard term={item} onPress={() => handleTermPress(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        {searchQuery ? 'No Terms Found' : 'No Glossary Terms'}
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        {searchQuery
          ? 'Try a different search term'
          : 'Glossary terms will appear here after syncing with the backend'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search terms..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <FlatList
        data={filteredTerms}
        renderItem={renderTerm}
        keyExtractor={(item) => item.term}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    elevation: 0,
  },
  listContent: {
    padding: 16,
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
});
