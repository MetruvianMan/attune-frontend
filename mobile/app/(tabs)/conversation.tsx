import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import * as NetInfo from '@react-native-community/netinfo';
import { ProfileHeader } from '../../components/ProfileHeader';
import { databaseService } from '../../services/database';
import { ConversationSession, ConversationTurn, Document, Event, ChildProfile } from '../../models';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ConversationSession | null>(null);
  const [archivedSessions, setArchivedSessions] = useState<ConversationSession[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Get actual child profile ID from loaded profile
  const childProfileId = profile?.id || 'default-profile-id';

  useEffect(() => {
    initializeData();

    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Reload data when screen comes into focus (e.g., after uploading a document)
  // But DON'T reload when just toggling between Saved view and active chat
  const skipNextFocusReload = React.useRef(false);
  
  useFocusEffect(
    React.useCallback(() => {
      console.log('💬 Chat tab focused, reloading data...');
      
      // Skip reload if we just toggled the saved view
      if (skipNextFocusReload.current) {
        skipNextFocusReload.current = false;
        console.log('Skipping reload (just toggled view)');
        return;
      }
      
      if (profile) {
        initializeData();
      }
    }, [profile])
  );

  const initializeData = async () => {
    try {
      // Load profile
      const profiles = await databaseService.getAllChildProfiles();
      if (profiles.length > 0) {
        const loadedProfile = profiles[0];
        setProfile(loadedProfile);
        
        // Load profile photo
        const photos = await databaseService.getPhotosByProfileId(loadedProfile.id);
        if (photos.length > 0) {
          setProfilePhotoUri(photos[0].filePath);
        }

      // Load all sessions
      const sessions = await databaseService.getConversationSessions(loadedProfile.id);

      // Find or create active session (non-archived)
      let active = sessions.find(s => !s.archived);
      if (!active) {
        // Create new active session
        active = {
          id: `session-${Date.now()}`,
          childProfileId: loadedProfile.id,
          turns: [],
          createdAt: new Date(),
          lastActivityAt: new Date(),
          archived: false,
        };
        await databaseService.createConversationSession(active);
      }
      setActiveSession(active);

      // Load archived sessions
      const archived = sessions.filter(s => s.archived);
      setArchivedSessions(archived);

      // Load documents
      const docs = await databaseService.getDocumentsByProfile(loadedProfile.id);
      console.log('📄 Total documents loaded:', docs.length);
      
      // Show all documents in UI
      setDocuments(docs);
      
      // Select ALL docs by default (user preference)
      setSelectedDocIds(new Set(docs.map(d => d.id)));
      
      // Log which docs have text for debugging
      const docsWithText = docs.filter(d => d.extractedText && d.extractedText.length > 0);
      console.log('📄 Documents with extracted text:', docsWithText.length);
      
      if (docs.length > 0 && docsWithText.length === 0) {
        console.log('⚠️ Documents exist but none have extracted text yet');
      }

      // Load recent queries from all sessions
      const allQueries = sessions
        .flatMap(s => s.turns)
        .filter(t => t.role === 'user')
        .map(t => t.content)
        .slice(0, 3);
      setRecentQueries(allQueries);
      }
    } catch (error) {
      console.error('Failed to initialize data:', error);
    }
  };

  const handleSaveConversation = async () => {
    if (!activeSession || activeSession.turns.length === 0) return;

    try {
      // If session is already archived, don't save again - just create new session
      if (activeSession.archived) {
        console.log('⚠️ Active session is already archived, just creating new session');
      } else {
        // Archive current session
        const title = activeSession.turns[0]?.content.slice(0, 50) || 'Untitled';
        const archivedSession: ConversationSession = {
          ...activeSession,
          archived: true,
          title,
        };
        await databaseService.saveConversationSession(archivedSession);
        console.log('✅ Session archived');
      }

      // Create new active session
      const newSession: ConversationSession = {
        id: `session-${Date.now()}`,
        childProfileId,
        turns: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
        archived: false,
      };
      await databaseService.createConversationSession(newSession);
      setActiveSession(newSession);

      // Reload archived sessions to refresh the list
      await initializeData();
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };
  const handleNewConversation = async () => {
    if (!isOnline) return;

    try {
      // Create new active session (replaces current one)
      const newSession: ConversationSession = {
        id: `session-${Date.now()}`,
        childProfileId,
        turns: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
        archived: false,
      };
      await databaseService.createConversationSession(newSession);
      setActiveSession(newSession);
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleSubmitQuery = async () => {
    if (!queryInput.trim() || !isOnline || !activeSession) return;

    const query = queryInput.trim();
    setQueryInput('');
    setIsThinking(true);

    try {
      // Add user turn
      const userTurn: ConversationTurn = {
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      const updatedSession = {
        ...activeSession,
        turns: [...activeSession.turns, userTurn],
        lastActivityAt: new Date(),
      };
      setActiveSession(updatedSession);
      await databaseService.saveConversationSession(updatedSession);

      // Scroll to show user's question
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

      // Get real data for context
      const allEvents = await databaseService.getEvents({ childProfileId });
      const eventSummary = allEvents.slice(0, 50).map((e: Event) => {
        const date = e.timestamp.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const time = e.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `- ${date} ${time}: ${e.eventType}${e.notes ? ` — "${e.notes}"` : ''}${e.tags.length > 0 ? ` [tags: ${e.tags.join(', ')}]` : ''}`;
      }).join('\n');

      // Get selected documents
      const selectedDocs = documents.filter(d => selectedDocIds.has(d.id));
      const docSummary = selectedDocs
        .map(d => {
          const header = `--- ${d.documentType.toUpperCase()}${d.sourceProvider ? ` from ${d.sourceProvider}` : ''} (${d.fileName}) ---`;
          if (d.extractedText && d.extractedText.length > 0) {
            return `${header}\n${d.extractedText}`;
          } else {
            return `${header}\n[Text extraction pending - content not yet available]`;
          }
        })
        .join('\n\n');

      // Build conversation history
      const history = updatedSession.turns.slice(-6).map(t => `${t.role}: ${t.content}`).join('\n');

      const systemPrompt = `You are Attune, a compassionate caregiving assistant for parents of neurodivergent children. 
Answer questions based ONLY on the actual logged event data provided below. Be specific, reference actual dates and events.
Use warm, supportive, neuro-affirming language. Never use clinical or judgmental terms.
If the data doesn't contain enough information to answer, say so honestly and suggest what to log.`;

      const userPrompt = `LOGGED EVENTS (most recent first):
${eventSummary || '(No events logged yet)'}

UPLOADED DOCUMENTS:
${docSummary || '(No documents uploaded)'}

CONVERSATION HISTORY:
${history}

PARENT'S QUESTION: ${query}

Answer based on the actual data above. Be specific about dates, events, and document content when relevant.`;

      // Call OpenAI
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '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';
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content ?? 'I couldn\'t generate a response.';

      // Add assistant turn
      const assistantTurn: ConversationTurn = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      const finalSession = {
        ...updatedSession,
        turns: [...updatedSession.turns, assistantTurn],
        lastActivityAt: new Date(),
      };
      setActiveSession(finalSession);
      await databaseService.saveConversationSession(finalSession);

      // Don't scroll - let user naturally read from where their eyes are
      // (at the "Attune" label that just appeared)
    } catch (error) {
      console.error('Failed to submit query:', error);
      // Add error turn
      const errorTurn: ConversationTurn = {
        role: 'assistant',
        content: 'Sorry, I had trouble processing that question. Please try again.',
        timestamp: new Date(),
      };
      const errorSession = {
        ...activeSession!,
        turns: [...activeSession!.turns, errorTurn],
        lastActivityAt: new Date(),
      };
      setActiveSession(errorSession);
      await databaseService.saveConversationSession(errorSession);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleDocSelection = (docId: string) => {
    console.log('Toggling doc:', docId, 'Current selected:', Array.from(selectedDocIds));
    const newSet = new Set(selectedDocIds);
    if (newSet.has(docId)) {
      newSet.delete(docId);
      console.log('Removed doc from selection');
    } else {
      newSet.add(docId);
      console.log('Added doc to selection');
    }
    setSelectedDocIds(newSet);
    console.log('New selected:', Array.from(newSet));
  };

  const handleLoadArchived = async (session: ConversationSession) => {
    console.log('📚 Loading archived session:', session.id, session.title);
    
    // Don't unarchive - just make it the active session for viewing
    // This allows users to browse multiple saved chats without deleting them
    setActiveSession(session);
    console.log('✅ Active session updated (still archived)');
    
    // Skip the next focus reload since we already have current data
    skipNextFocusReload.current = true;
    
    // Close archived view
    console.log('🚪 Closing archived view...');
    setShowArchived(false);
  };

  const handleDeleteArchived = async (sessionId: string) => {
    try {
      await databaseService.deleteConversationSession(sessionId);
      await initializeData();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <ProfileHeader
          emoji="💬"
          title="Chat"
        />
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>👤</Text>
          <Text style={styles.placeholderTitle}>No profile selected</Text>
          <Text style={styles.placeholderText}>Create a child profile in the Profile tab to get started.</Text>
        </View>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={styles.container}>
        <ProfileHeader
          emoji="💬"
          title="Chat"
          profileName={profile.displayName}
          profilePhotoUri={profilePhotoUri}
        />
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📡</Text>
          <Text style={styles.placeholderTitle}>Offline</Text>
          <Text style={styles.placeholderText}>
            Conversations require an internet connection. Please connect to the internet to chat with the AI assistant.
          </Text>
        </View>
      </View>
    );
  }

  const hasActiveTurns = activeSession && activeSession.turns.length > 0;
  const isActiveSessionArchived = activeSession?.archived === true;
  const canSaveConversation = hasActiveTurns && !isActiveSessionArchived;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ProfileHeader
        emoji="💬"
        title="Chat"
        profileName={profile.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      {/* Saved Chats View */}
      {showArchived ? (
        <View style={styles.archivedView}>
          <View style={styles.archivedHeader}>
            <TouchableOpacity onPress={() => setShowArchived(false)} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.archivedTitle}>Saved Chats</Text>
            <View style={{ width: 60 }} />
          </View>
          
          <ScrollView style={styles.archivedList}>
            {archivedSessions.length === 0 ? (
              <View style={styles.emptyArchived}>
                <Text style={styles.emptyArchivedIcon}>💬</Text>
                <Text style={styles.emptyArchivedText}>No saved chats yet</Text>
                <Text style={styles.emptyArchivedHint}>Save a conversation to view it here</Text>
              </View>
            ) : (
              archivedSessions.map((session) => (
                <View key={session.id} style={styles.archivedItem}>
                  <TouchableOpacity 
                    style={styles.archivedItemMain}
                    onPress={() => handleLoadArchived(session)}
                  >
                    <Text style={styles.archivedItemTitle} numberOfLines={1}>
                      {session.title || 'Untitled Conversation'}
                    </Text>
                    <Text style={styles.archivedItemDate}>
                      {session.createdAt instanceof Date 
                        ? session.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text style={styles.archivedItemPreview} numberOfLines={2}>
                      {session.turns[0]?.content || 'Empty conversation'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteArchived(session.id)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        // Active Chat View
        <>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
        {/* Conversation Turns */}
        {activeSession?.turns.map((turn, idx) => {
          const isUser = turn.role === 'user';
          const timestamp = turn.timestamp instanceof Date ? turn.timestamp : new Date(turn.timestamp);
          return (
            <View
              key={idx}
              style={[
                styles.turnContainer,
                isUser ? styles.turnContainerUser : styles.turnContainerAssistant
              ]}
            >
              {!isUser && (
                <Text style={styles.assistantLabel}>Attune</Text>
              )}
              <View style={[
                styles.turnBubble,
                isUser ? styles.turnBubbleUser : styles.turnBubbleAssistant
              ]}>
                <Text style={[styles.turnContent, isUser ? styles.turnContentUser : styles.turnContentAssistant]}>{turn.content}</Text>
              </View>
              <Text style={styles.turnTime}>{timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
          );
        })}

        {/* Thinking Animation */}
        {isThinking && (
          <View style={[styles.turnContainer, styles.turnContainerAssistant]}>
            <Text style={styles.assistantLabel}>Attune</Text>
            <View style={[styles.turnBubble, styles.turnBubbleAssistant]}>
              <View style={styles.thinkingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.thinkingText}>Thinking...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Suggested Questions (only show when no conversation) */}
        {!hasActiveTurns && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsHeader}>Ask about...</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroller}>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What are his verbal strengths?')}>
                <Text style={styles.suggestionChipText}>Verbal strengths</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What sensory differences have I noticed?')}>
                <Text style={styles.suggestionChipText}>Sensory differences</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What school accommodations help?')}>
                <Text style={styles.suggestionChipText}>School accommodations</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What are common sleep patterns?')}>
                <Text style={styles.suggestionChipText}>Sleep patterns</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('How does he regulate emotions?')}>
                <Text style={styles.suggestionChipText}>Emotional regulation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What are common triggers?')}>
                <Text style={styles.suggestionChipText}>Common triggers</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Bottom padding for keyboard */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Context Awareness Bar + Input Container */}
      <View style={styles.bottomSection}>
        {/* Lightweight Context Summary */}
        <View style={styles.contextBar}>
          <TouchableOpacity
            style={styles.contextAction}
            onPress={handleNewConversation}
          >
            <Text style={styles.contextActionText}>+ New</Text>
          </TouchableOpacity>
          
          <View style={styles.contextSummary}>
            {documents.length > 0 && (
              <Text style={styles.contextText}>📄 {documents.length} doc{documents.length > 1 ? 's' : ''}</Text>
            )}
            <Text style={styles.contextDivider}>·</Text>
            <Text style={styles.contextText}>📊 Data connected</Text>
          </View>

          <TouchableOpacity
            style={styles.contextAction}
            onPress={() => setShowArchived(true)}
          >
            <Text style={styles.contextActionText}>📚 Saved</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contextAction, !canSaveConversation && styles.contextActionDisabled]}
            onPress={handleSaveConversation}
            disabled={!canSaveConversation}
          >
            <Text style={[styles.contextActionText, !canSaveConversation && styles.contextActionTextDisabled]}>💾 Save</Text>
          </TouchableOpacity>
        </View>

        {/* Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about patterns, strengths, supports, or behaviors..."
            placeholderTextColor={colors.textMuted}
            value={queryInput}
            onChangeText={setQueryInput}
            multiline
            maxLength={500}
            editable={!isThinking}
          />
          <TouchableOpacity
            style={[styles.sendButton, (isThinking || !queryInput.trim()) && styles.sendButtonDisabled]}
            onPress={handleSubmitQuery}
            disabled={isThinking || !queryInput.trim()}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding * 2,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: colors.text,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
  },
  
  // Conversation bubbles - calmer, less visual weight
  turnContainer: {
    marginBottom: 18,
  },
  turnContainerUser: {
    alignItems: 'flex-end',
  },
  turnContainerAssistant: {
    alignItems: 'flex-start',
  },
  assistantLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 4,
    marginLeft: 2,
  },
  turnBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  turnBubbleUser: {
    backgroundColor: 'rgba(127,191,159,0.12)',
  },
  turnBubbleAssistant: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.12)',
  },
  turnContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  turnContentUser: {
    color: colors.text,
  },
  turnContentAssistant: {
    color: colors.text,
  },
  turnTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 2,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    fontSize: 15,
    color: colors.textDim,
  },

  // Suggestions section
  suggestionsSection: {
    marginTop: 12,
    marginBottom: 24,
  },
  suggestionsHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDim,
    marginBottom: 10,
    marginLeft: 2,
  },
  suggestionScroller: {
    flexGrow: 0,
  },
  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.2)',
    marginRight: 8,
  },
  suggestionChipText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '500',
  },

  // Bottom section with context + input
  bottomSection: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  contextSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  contextDivider: {
    fontSize: 11,
    color: colors.textMuted,
  },
  contextAction: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  contextActionDisabled: {
    opacity: 0.3,
  },
  contextActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  contextActionTextDisabled: {
    color: colors.textMuted,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.card,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.2)',
    backgroundColor: '#fff',
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: '600',
  },
});

// Archived/Saved Chats View Styles (added after the main StyleSheet.create)
const archivedStyles = StyleSheet.create({
  archivedView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  archivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  archivedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  archivedList: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
  },
  emptyArchived: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyArchivedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyArchivedText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  emptyArchivedHint: {
    fontSize: 14,
    color: colors.textMuted,
  },
  archivedItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  archivedItemMain: {
    flex: 1,
    padding: 14,
  },
  archivedItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  archivedItemDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  archivedItemPreview: {
    fontSize: 13,
    color: colors.textDim,
    lineHeight: 18,
  },
  deleteButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235,87,87,0.08)',
  },
  deleteButtonText: {
    fontSize: 18,
    color: colors.danger,
  },
});

// Merge archived styles into main styles object
Object.assign(styles, archivedStyles);
