import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';
import { PaperText as Text } from './PaperText';
import { DiaryEntry } from '../models';
import { getEntryColors, getVisibleHighlightedRanges, OBSERVATION_HIGHLIGHT_STYLE, CLASSIFICATION_LABEL_STYLE } from '../constants/entry-colors';
import { HighlightedText } from './HighlightedText';

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onPress?: () => void;
}

export function DiaryEntryCard({ entry, onPress }: DiaryEntryCardProps) {
  const colors = getEntryColors(entry);

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Card.Content>
          <Text variant="titleSmall" style={[styles.title, { color: colors.titleColor }]}>
            {colors.label}
          </Text>
          {/* Content lives in a faint tint of this entry's own color
              rather than directly on the (more saturated) card
              background. */}
          <View style={[styles.contentInner, { backgroundColor: colors.paleBackground }]}>
            <HighlightedText
              content={entry.content}
              ranges={getVisibleHighlightedRanges(entry)}
              style={styles.content}
              highlightStyle={OBSERVATION_HIGHLIGHT_STYLE}
              // numberOfLines isn't a HighlightedText-specific prop, but
              // Text supports it natively via ...rest passthrough.
              numberOfLines={3}
            />
          </View>
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
    borderWidth: 3,
  },
  title: {
    marginBottom: 8,
    ...CLASSIFICATION_LABEL_STYLE,
  },
  contentInner: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  content: {
    lineHeight: 22,
    color: '#333',
  },
  date: {
    color: '#666',
    fontStyle: 'italic',
  },
});
