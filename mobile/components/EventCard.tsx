import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { Event } from '../models';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const formatEventType = (type: string): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getValenceColor = (valence?: string) => {
    switch (valence) {
      case 'positive':
        return '#4CAF50';
      case 'negative':
        return '#f44336';
      case 'neutral':
        return '#9E9E9E';
      default:
        return '#2196F3';
    }
  };

  const getValenceEmoji = (valence?: string) => {
    switch (valence) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😔';
      case 'neutral':
        return '😐';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="titleMedium" style={styles.eventType}>
                {formatEventType(event.eventType)}
              </Text>
              <Text variant="bodySmall" style={styles.timestamp}>
                {new Date(event.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {event.valence && (
              <View style={[styles.valenceBadge, { backgroundColor: getValenceColor(event.valence) }]}>
                <Text style={styles.valenceEmoji}>{getValenceEmoji(event.valence)}</Text>
              </View>
            )}
          </View>

          {event.notes && (
            <Text variant="bodyMedium" style={styles.notes} numberOfLines={2}>
              {event.notes}
            </Text>
          )}

          {event.severity && (
            <Chip
              mode="flat"
              style={[
                styles.severityChip,
                event.severity === 'high' && styles.severityHigh,
                event.severity === 'medium' && styles.severityMedium,
                event.severity === 'low' && styles.severityLow,
              ]}
              textStyle={styles.severityText}
              compact
            >
              {event.severity.toUpperCase()}
            </Chip>
          )}

          {event.tags && event.tags.length > 0 && (
            <View style={styles.tags}>
              {event.tags.slice(0, 3).map((tag, index) => (
                <Chip key={index} mode="outlined" style={styles.tag} compact>
                  {tag}
                </Chip>
              ))}
              {event.tags.length > 3 && (
                <Text variant="bodySmall" style={styles.moreTags}>
                  +{event.tags.length - 3} more
                </Text>
              )}
            </View>
          )}

          {event.persons && event.persons.length > 0 && (
            <Text variant="bodySmall" style={styles.persons}>
              👥 {event.persons.join(', ')}
            </Text>
          )}

          {event.source && (
            <Text variant="bodySmall" style={styles.source}>
              {event.source === 'quick-tap' && '⚡ Quick-tap'}
              {event.source === 'voice' && '🎤 Voice'}
              {event.source === 'manual' && '✏️ Manual'}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  eventType: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timestamp: {
    color: '#666',
  },
  valenceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valenceEmoji: {
    fontSize: 18,
  },
  notes: {
    marginBottom: 8,
    lineHeight: 20,
    color: '#333',
  },
  severityChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  severityHigh: {
    backgroundColor: '#ffebee',
  },
  severityMedium: {
    backgroundColor: '#fff3e0',
  },
  severityLow: {
    backgroundColor: '#e8f5e9',
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  tag: {
    height: 24,
  },
  moreTags: {
    color: '#666',
    marginLeft: 4,
  },
  persons: {
    color: '#666',
    marginBottom: 4,
  },
  source: {
    color: '#999',
    fontSize: 11,
  },
});
