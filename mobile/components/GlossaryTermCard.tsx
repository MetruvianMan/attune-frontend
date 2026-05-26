import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';

interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
}

interface GlossaryTermCardProps {
  term: GlossaryTerm;
  onPress?: () => void;
}

export function GlossaryTermCard({ term: glossaryTerm, onPress }: GlossaryTermCardProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.term}>
            {glossaryTerm.term}
          </Text>
          <Text variant="bodySmall" style={styles.category}>
            {glossaryTerm.category}
          </Text>
          <Text variant="bodyMedium" style={styles.definition} numberOfLines={2}>
            {glossaryTerm.definition}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  term: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  category: {
    color: '#2196F3',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '600',
  },
  definition: {
    color: '#666',
    lineHeight: 20,
  },
});
