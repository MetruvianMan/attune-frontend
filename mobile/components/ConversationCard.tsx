import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { ConversationSession } from '../models';

interface ConversationCardProps {
  session: ConversationSession;
  onPress?: () => void;
}

export function ConversationCard({ session, onPress }: ConversationCardProps) {
  const getPreview = (): string => {
    if (session.turns.length === 0) return 'No messages yet';
    
    const lastTurn = session.turns[session.turns.length - 1];
    return lastTurn.content.substring(0, 100) + (lastTurn.content.length > 100 ? '...' : '');
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              💬 Conversation
            </Text>
            <Text variant="bodySmall" style={styles.time}>
              {getTimeAgo(session.lastActivityAt)}
            </Text>
          </View>

          <Text variant="bodyMedium" style={styles.preview} numberOfLines={2}>
            {getPreview()}
          </Text>

          <Text variant="bodySmall" style={styles.messageCount}>
            {session.turns.length} {session.turns.length === 1 ? 'message' : 'messages'}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  time: {
    color: '#666',
  },
  preview: {
    marginBottom: 8,
    color: '#333',
    lineHeight: 20,
  },
  messageCount: {
    color: '#2196F3',
    fontWeight: '600',
  },
});
