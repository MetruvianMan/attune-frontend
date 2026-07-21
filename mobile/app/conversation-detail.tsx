import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, Card, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import * as NetInfo from '@react-native-community/netinfo';
import { databaseService } from '../services/database';
import { apiPost } from '../utils/api-client';
import { ConversationSession, ConversationTurn } from '../models';

export default function ConversationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string | undefined;
  const isNewSession = !sessionId;

  const flatListRef = useRef<FlatList>(null);
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ConversationTurn[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    if (!isNewSession) {
      loadSession();
    } else {
      // Create new session
      const newSession: ConversationSession = {
        id: uuidv4(),
        childProfileId,
        turns: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      setSession(newSession);
      setMessages([]);
    }

    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      const loadedSession = await databaseService.getConversationSessionById(sessionId);
      
      if (loadedSession) {
        setSession(loadedSession);
        setMessages(loadedSession.turns);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending || !isOnline || !session) return;

    const userMessage: ConversationTurn = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsSending(true);

    try {
      // Send to backend API
      const response = await apiPost<{ response: string }>('/conversation/message', {
        sessionId: session.id,
        childProfileId,
        message: inputText.trim(),
        conversationHistory: messages,
      });

      const assistantMessage: ConversationTurn = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save to database
      const updatedSession: ConversationSession = {
        ...session,
        turns: updatedMessages,
        lastActivityAt: new Date(),
      };

      if (isNewSession) {
        await databaseService.createConversationSession(updatedSession);
      } else {
        await databaseService.updateConversationSession(
          session.id,
          updatedMessages,
          new Date()
        );
      }

      setSession(updatedSession);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove user message on error
      setMessages(messages);
      setInputText(userMessage.content);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: ConversationTurn; index: number }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
        <Card style={[styles.messageCard, isUser ? styles.userMessageCard : styles.assistantMessageCard]}>
          <Card.Content style={styles.messageContent}>
            <Text variant="bodyMedium" style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
              {item.content}
            </Text>
            <Text variant="bodySmall" style={[styles.messageTime, isUser ? styles.userMessageTime : styles.assistantMessageTime]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        Start a Conversation
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        Ask questions, share concerns, or discuss strategies for supporting your child
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={styles.offlineContainer}>
        <Text variant="titleMedium" style={styles.offlineTitle}>
          Offline
        </Text>
        <Text variant="bodyMedium" style={styles.offlineMessage}>
          Conversations require an internet connection. Please connect to the internet to continue.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `${index}`}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
          maxLength={1000}
          style={styles.input}
          disabled={isSending}
        />
        <IconButton
          icon="send"
          mode="contained"
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          loading={isSending}
          style={styles.sendButton}
          iconColor="#fff"
          containerColor="#4A90E2"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  offlineTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  offlineMessage: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
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
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
  },
  userMessageCard: {
    backgroundColor: '#2196F3',
  },
  assistantMessageCard: {
    backgroundColor: '#fff',
  },
  messageContent: {
    padding: 8,
  },
  messageText: {
    marginBottom: 4,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginBottom: 4,
  },
});
