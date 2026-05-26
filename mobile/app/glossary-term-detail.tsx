import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { databaseService } from '../services/database';

interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
}

export default function GlossaryTermDetailScreen() {
  const params = useLocalSearchParams();
  const termName = decodeURIComponent(params.term as string);

  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [relatedTerms, setRelatedTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTerm();
  }, [termName]);

  const loadTerm = async () => {
    try {
      setIsLoading(true);
      const loadedTerm = await databaseService.getGlossaryTermByName(termName);
      
      if (loadedTerm) {
        setTerm(loadedTerm);
        
        // Load related terms (same category)
        const allTerms = await databaseService.getGlossaryTerms();
        const related = allTerms.filter(
          t => t.category === loadedTerm.category && t.term !== loadedTerm.term
        ).slice(0, 5);
        setRelatedTerms(related);
      }
    } catch (error) {
      console.error('Failed to load term:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text>Loading...</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (!term) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text>Term not found</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Term Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.term}>
              {term.term}
            </Text>
            <Chip mode="flat" style={styles.categoryChip} textStyle={styles.categoryText}>
              {term.category}
            </Chip>
          </Card.Content>
        </Card>

        {/* Definition Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Definition
            </Text>
            <Text variant="bodyMedium" style={styles.definition}>
              {term.definition}
            </Text>
          </Card.Content>
        </Card>

        {/* Related Terms */}
        {relatedTerms.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Related Terms
              </Text>
              <View style={styles.relatedTerms}>
                {relatedTerms.map((relatedTerm) => (
                  <Chip
                    key={relatedTerm.term}
                    mode="outlined"
                    style={styles.relatedTermChip}
                  >
                    {relatedTerm.term}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.info}>
              💡 This glossary helps you understand neurodiversity-related terms and concepts.
              Terms are synced from the backend and updated regularly.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  term: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
  },
  categoryText: {
    color: '#2196F3',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  definition: {
    lineHeight: 24,
    color: '#333',
  },
  relatedTerms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatedTermChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  info: {
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
