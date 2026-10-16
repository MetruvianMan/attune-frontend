import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { PaperText as Text } from './PaperText';
import { DiaryEntry } from '../models';
import { getEntryColors, getVisibleHighlightedRanges, OBSERVATION_HIGHLIGHT_STYLE } from '../constants/entry-colors';
import { HighlightedText } from './HighlightedText';

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onPress?: () => void;
}

export function DiaryEntryCard({ entry, onPress }: DiaryEntryCardProps) {
  const colors = getEntryColors(entry);

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={[styles.card, { backgroundColor: colors.background }]}>
        <Card.Content>
          <Text variant="titleSmall" style={[styles.title, { color: colors.titleColor }]}>
            {colors.label}
          </Text>
          <HighlightedText
            content={entry.content}
            ranges={getVisibleHighlightedRanges(entry)}
            style={styles.content}
            highlightStyle={OBSERVATION_HIGHLIGHT_STYLE}
            // numberOfLines isn't a HighlightedText-specific prop, but
            // Text supports it natively via ...rest passthrough.
            numberOfLines={3}
          />
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
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
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
