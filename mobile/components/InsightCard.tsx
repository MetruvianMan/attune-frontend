import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { Insight } from '../models';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
}

export function InsightCard({ insight, onPress }: InsightCardProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return '🔄';
      case 'trigger':
        return '⚡';
      case 'trend':
        return '📈';
      case 'recommendation':
        return '💡';
      default:
        return '📊';
    }
  };

  const getConfidenceColor = (score: string) => {
    switch (score) {
      case 'high':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text style={styles.icon}>{getInsightIcon(insight.type)}</Text>
            <View style={styles.headerText}>
              <Text variant="titleMedium" style={styles.type}>
                {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
              </Text>
              <Chip
                mode="flat"
                style={[styles.confidenceChip, { backgroundColor: getConfidenceColor(insight.confidenceScore) }]}
                textStyle={styles.confidenceText}
                compact
              >
                {insight.confidenceScore} confidence
              </Chip>
            </View>
          </View>
          
          <Text variant="bodyMedium" style={styles.narrative} numberOfLines={3}>
            {insight.narrative}
          </Text>

          {insight.timeSpanStart && insight.timeSpanEnd && (
            <Text variant="bodySmall" style={styles.timeSpan}>
              {new Date(insight.timeSpanStart).toLocaleDateString()} - {new Date(insight.timeSpanEnd).toLocaleDateString()}
            </Text>
          )}

          {insight.strategyIds.length > 0 && (
            <Text variant="bodySmall" style={styles.strategies}>
              {insight.strategyIds.length} {insight.strategyIds.length === 1 ? 'strategy' : 'strategies'} suggested
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  type: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceChip: {
    alignSelf: 'flex-start',
  },
  confidenceText: {
    color: '#fff',
    fontSize: 11,
  },
  narrative: {
    lineHeight: 22,
    color: '#333',
  },
  timeSpan: {
    marginTop: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  strategies: {
    marginTop: 4,
    color: '#2196F3',
    fontWeight: '600',
  },
});
