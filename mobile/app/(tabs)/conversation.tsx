import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as NetInfo from '@react-native-community/netinfo';
import { ConversationCard } from '../../components/ConversationCard';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { ConversationSession } from '../../models';

export default function ConversationScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    loadSessions();
    
    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const loadedSessions = await databaseService.getConversationSessions(childProfileId);
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncService.sync();
      await loadSessions();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSessionPress = (session: ConversationSession) => {
    if (!isOnline) {
      return;
    }
    router.push(`/conversation-detail?sessionId=${session.id}`);
  };

  const handleNewConversation = () => {
    if (!isOnline) {
      return;
    }
    router.push('/conversation-detail');
  };

  const renderSession = ({ item }: { item: ConversationSession }) => (
    <ConversationCard session={item} onPress={() => handleSessionPress(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {!isOnline ? (
        <>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Offline
          </Text>
          <Text variant="bodyMedium" style={styles.emptyMessage}>
            Conversations require an internet connection. Please connect to the internet to chat with the AI assistant.
          </Text>
        </>
      ) : (
        <>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No Conversations Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyMessage}>
            Start a conversation with the AI assistant to get insights and support
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, !isOnline && styles.fabDisabled]}
        onPress={handleNewConversation}
        label="New Chat"
        disabled={!isOnline}
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
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyMessage: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
