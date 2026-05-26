import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { DiaryEntry } from '../models';

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onPress?: () => void;
}

export function DiaryEntryCard({ entry, onPress }: DiaryEntryCardProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.title}>
            📔 Diary Entry
          </Text>
          <Text variant="bodyMedium" style={styles.content} numberOfLines={3}>
            {entry.content}
          </Text>
          <Text variant="bodySmall" style={styles.date}>
            {new Date(entry.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: '#FFF9E6',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#795548',
  },
  content: {
    lineHeight: 22,
    color: '#333',
    marginBottom: 8,
  },
  date: {
    color: '#666',
    fontStyle: 'italic',
  },
});
