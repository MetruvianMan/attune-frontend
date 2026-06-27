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

// Helper component to render AI responses - cards when appropriate, prose otherwise
interface ResponseSectionProps {
  content: string;
}

interface InsightCard {
  emoji: string;
  title: string;
  frequency: string;
  content: string;
}

interface ParsedResponse {
  type: 'cards' | 'prose';
  confidence?: string;
  leadIn?: string;
  cards?: InsightCard[];
  closing?: string;
  content?: string;
}

function AIResponse({ content }: ResponseSectionProps) {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  const toggleCard = (index: number) => {
    const newSet = new Set(expandedCards);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedCards(newSet);
  };
  
  // Parse AI response to detect structured format - memoized to prevent re-parsing on every render
  const parseResponse = React.useMemo(() => (text: string): ParsedResponse => {
    // Split but DON'T filter empty lines yet - we need them to separate paragraphs
    const allLines = text.split('\n').map(l => l.trim());
    const lines = allLines.filter(l => l.length > 0); // Non-empty lines for parsing structure
    
    // Look for confidence badge (first line pattern)
    let confidence: string | undefined;
    let startIdx = 0;
    
    if (lines[0]?.toLowerCase().includes('confidence') || lines[0]?.toLowerCase().includes('based on')) {
      confidence = lines[0];
      startIdx = 1;
    }
    
    // Try to find cards
    const cards: InsightCard[] = [];
    let leadIn: string | undefined;
    let closing: string | undefined;
    let i = startIdx;
    
    // Collect lead-in (text before first card)
    const leadInLines: string[] = [];
    while (i < lines.length) {
      const line = lines[i];
      const emojiMatch = line.match(/^([^\w\s]+)\s+(.+)/);
      if (emojiMatch && line.length > 3 && line.length < 100) {
        break;
      }
      leadInLines.push(line);
      i++;
    }
    
    if (leadInLines.length > 0) {
      leadIn = leadInLines.join(' ');
    }
    
    // Parse cards - track where last card ends
    let lastCardEndIndex = i;
    while (i < lines.length) {
      const line = lines[i];
      
      // Look for emoji + title pattern
      const emojiMatch = line.match(/^([^\w\s]+)\s+(.+)/);
      if (emojiMatch && line.length > 3 && line.length < 100) {
        const emoji = emojiMatch[1];
        const title = emojiMatch[2];
        i++;
        
        // Next line should be frequency
        let frequency = '';
        if (i < lines.length && !lines[i].match(/^([^\w\s]+)\s+(.+)/)) {
          const freqLine = lines[i];
          if (freqLine.match(/^(Very Common|Frequently Observed|Occasional|Strong Pattern|Worth Monitoring|Emerging Pattern)/i)) {
            frequency = freqLine;
            i++;
          }
        }
        
        // Collect content lines - but stop if we hit potential closing text
        const contentLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          
          // Check if this is the start of another card
          const nextEmojiMatch = nextLine.match(/^([^\w\s]+)\s+(.+)/);
          if (nextEmojiMatch && nextLine.length > 3 && nextLine.length < 100) {
            break;
          }
          
          // Stop if we've collected enough content AND the next line looks like a closing
          // Closings typically start with certain words and are not part of card content
          if (contentLines.length > 10) { // Check after we have some content
            const closingStarters = [
              /^Understanding/i,
              /^Each /i,
              /^With /i,
              /^These /i,
              /^By recognizing/i,
              /^Recognizing/i,
              /^This /i,
              /^Remember/i,
              /^Keep in mind/i,
            ];
            if (closingStarters.some(pattern => pattern.test(nextLine))) {
              // Stop card content - found closing
              break;
            }
          }
          
          contentLines.push(nextLine);
          i++;
        }
        
        // Join content as single paragraph (no sentence splitting to avoid weird indents)
        if (contentLines.length > 0) {
          const fullContent = contentLines.join(' ');
          
          // Check if the content contains a closing paragraph embedded at the end
          // Look for closing patterns in the full content
          const closingPatterns = [
            /Understanding these patterns/i,
            /These patterns offer/i,
            /By recognizing/i,
            /With (?:consistent|targeted|support)/i,
            /Each (?:pattern|identified|observation)/i,
          ];
          
          let cardContent = fullContent;
          let embeddedClosing: string | undefined;
          
          // Try to split on closing pattern
          for (const pattern of closingPatterns) {
            const match = fullContent.match(pattern);
            if (match && match.index !== undefined) {
              // Found a closing pattern - split here
              cardContent = fullContent.substring(0, match.index).trim();
              embeddedClosing = fullContent.substring(match.index).trim();
              break;
            }
          }
          
          cards.push({
            emoji,
            title,
            frequency,
            content: cardContent,
          });
          
          // If we found embedded closing, save it for later
          if (embeddedClosing && !closing) {
            closing = embeddedClosing;
          }
          
          lastCardEndIndex = i;
        } else if (frequency) {
          cards.push({
            emoji,
            title,
            frequency,
            content: '',
          });
          lastCardEndIndex = i;
        }
        
        continue;
      }
      
      i++;
    }
    
    // Collect closing text (everything after last card)
    if (cards.length >= 2 && lastCardEndIndex < lines.length) {
      const closingLines = lines.slice(lastCardEndIndex);
      
      // Filter out empty lines and join
      const nonEmptyClosing = closingLines.filter(l => l.trim().length > 0);
      if (nonEmptyClosing.length > 0) {
        closing = nonEmptyClosing.join(' ');
      }
    }
    
    // If we found 2+ cards, use card format
    if (cards.length >= 2) {
      return { 
        type: 'cards',
        confidence,
        leadIn,
        cards,
        closing,
      };
    }
    
    // Otherwise, render as prose
    return { type: 'prose', content: text };
  }, []);
  
  const parsed = React.useMemo(() => parseResponse(content), [content, parseResponse]);
  
  if (parsed.type === 'prose') {
    return (
      <View style={styles.proseContainer}>
        <Text style={styles.proseText}>{parsed.content}</Text>
      </View>
    );
  }
  
  // Helper to truncate content to exactly 5 lines based on visual wrapping
  const getTruncatedContent = (fullContent: string) => {
    // Use character count approximation for ~5 lines of text
    // At 15px font, ~40-45 chars per line, so 5 lines ≈ 225 chars
    const CHARS_PER_LINE = 45;
    const MAX_CHARS = CHARS_PER_LINE * 5;
    
    if (fullContent.length <= MAX_CHARS) return fullContent;
    
    // Truncate at word boundary near 5-line mark
    const truncated = fullContent.substring(0, MAX_CHARS);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  };
  
  const needsTruncation = (content: string) => {
    return content.length > 225; // ~5 lines worth of characters
  };
  
  return (
    <View style={styles.structuredResponse}>
      {/* Lead-in Summary - show first to get to insights faster */}
      {parsed.leadIn && (
        <Text style={styles.leadInText}>{parsed.leadIn}</Text>
      )}
      
      {/* Insight Cards - the hero of the response */}
      <View style={styles.cardsContainer}>
        {parsed.cards?.map((card, idx) => {
          const isExpanded = expandedCards.has(idx);
          const shouldTruncate = needsTruncation(card.content);
          const displayContent = isExpanded ? card.content : getTruncatedContent(card.content);
          
          return (
            <TouchableOpacity 
              key={idx} 
              style={styles.insightCard}
              onPress={() => shouldTruncate && toggleCard(idx)}
              activeOpacity={shouldTruncate ? 0.7 : 1}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.insightCardHeader}>
                  <Text style={styles.insightEmoji}>{card.emoji}</Text>
                  <Text style={styles.insightTitle}>{card.title}</Text>
                </View>
                {card.frequency && (
                  <View style={styles.frequencyBadge}>
                    <Text style={styles.frequencyText}>{card.frequency.toUpperCase()}</Text>
                  </View>
                )}
              </View>
              {card.content && (
                <>
                  <Text style={styles.insightContent}>{displayContent}</Text>
                  {shouldTruncate && (
                    <Text style={styles.expandHint}>
                      {isExpanded ? '↑ Tap to collapse' : '↓ Tap for details'}
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Closing Insight */}
      {parsed.closing && (
        <Text style={styles.closingText}>{parsed.closing}</Text>
      )}
      
      {/* Confidence Badge - blue banner at bottom as provenance */}
      {parsed.confidence && (
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{parsed.confidence}</Text>
        </View>
      )}
    </View>
  );
}

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

  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [pendingSession, setPendingSession] = useState<ConversationSession | null>(null);

  useEffect(() => {
    // When a pending session is set, update activeSession and close the archived view
    if (pendingSession) {
      console.log('[DEBUG] pendingSession useEffect triggered', {
        pendingSessionId: pendingSession.id,
        pendingSessionTurnCount: pendingSession.turns.length
      });
      
      setActiveSession(pendingSession);
      
      console.log('[DEBUG] activeSession updated, waiting 50ms before closing archived view');
      
      // Wait for state to settle before closing archived view
      setTimeout(() => {
        console.log('[DEBUG] Closing archived view and clearing loading state');
        setShowArchived(false);
        setIsLoadingSession(false);
        setPendingSession(null);
      }, 50);
    }
  }, [pendingSession]);

  useEffect(() => {
    initializeData();

    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

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
      
      // Show all documents in UI
      setDocuments(docs);
      
      // Select ALL docs by default (user preference)
      setSelectedDocIds(new Set(docs.map(d => d.id)));

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
        // Already archived, just creating new session
      } else {
        // Archive current session
        const title = activeSession.turns[0]?.content.slice(0, 50) || 'Untitled';
        const archivedSession: ConversationSession = {
          ...activeSession,
          archived: true,
          title,
        };
        await databaseService.saveConversationSession(archivedSession);
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

      const systemPrompt = `You are Attune, a developmental specialist who has been observing this child closely.

CRITICAL - YOU MUST FOLLOW THIS EXACT FORMAT:

**SECTION 1: CONFIDENCE STATEMENT**
High confidence based on [X] logged events and [Y] uploaded documents.

**SECTION 2: BLANK LINE**

**SECTION 3: LEAD-IN (1-2 sentences)**

**SECTION 4: BLANK LINE**

**SECTION 5: CARDS (2-4 cards, each with this structure):**
[EMOJI] [VERY SHORT TITLE - MAX 4 WORDS]
[FREQUENCY LABEL: VERY COMMON | FREQUENTLY OBSERVED | OCCASIONAL | STRONG PATTERN | WORTH MONITORING | EMERGING PATTERN]
[Full descriptive paragraph - make this substantial, 3-5 sentences of detailed observations]

[BLANK LINE between each card]

**SECTION 6: BLANK LINE**

**SECTION 7: CLOSING SUMMARY (MANDATORY - 2-3 SENTENCES)**
This MUST be present. It should offer perspective, support, or actionable guidance.
Start with words like "Understanding", "These patterns", "With support", "Each", "By recognizing"

EXAMPLE OUTPUT:

High confidence based on 42 logged events and 3 uploaded documents.

Several patterns emerge from Robbie's recent weeks.

😟 Emotional Dysregulation
VERY COMMON
Robbie displays emotional dysregulation, particularly when faced with situations that feel unfair or when he experiences disappointment. Instances of aggression or tantrums have been logged when he perceives a lack of control over the situation, such as during a recent playdate where he felt slighted. Teaching him coping strategies for managing his emotions and providing a safe space to express his feelings can be beneficial in reducing these episodes.

👥 Social Challenges
FREQUENTLY OBSERVED
Robbie often struggles with social interactions, particularly in unstructured settings like recess or during group activities. He has been noted to misinterpret social cues, leading to conflicts with peers. His difficulty in understanding others' perspectives can result in aggressive behaviors and withdrawal during social engagements.

📅 Routine Preference
OCCASIONAL
Robbie shows a preference for routine and predictability in his daily activities. Changes to his schedule or unexpected events can trigger anxiety or behavioral responses. Maintaining consistent routines and providing advance notice of any changes can help him feel more secure.

Understanding these patterns can help you anticipate challenging moments and provide the support Robbie needs. With consistent observation and targeted strategies, many of these responses can be managed more effectively.

CRITICAL REQUIREMENTS:
1. Confidence line with EXACT numbers first
2. Titles must be 2-4 words MAXIMUM
3. Each card has frequency label on separate line
4. BLANK LINES between all sections
5. CLOSING SUMMARY AT THE END - NOT OPTIONAL - MUST BE PRESENT AFTER ALL CARDS`;

      const userPrompt = `CHILD PROFILE:
Name: ${profile.displayName}

DATA AVAILABLE:
- ${allEvents.length} logged events
- ${selectedDocs.length} uploaded documents

RECENT LOGGED EVENTS:
${eventSummary || '(No events logged yet - respond that you need data to identify patterns)'}

UPLOADED DOCUMENT CONTENT:
${docSummary || '(No documents uploaded yet)'}

PARENT'S QUESTION: ${query}

REMINDER: Your response MUST include:
1. Confidence line: "High confidence based on ${allEvents.length} logged events and ${selectedDocs.length} uploaded documents."
2. Brief lead-in
3. 2-4 insight cards (emoji + SHORT title + frequency + paragraph)
4. CLOSING SUMMARY (2-3 sentences starting with "Understanding", "These patterns", "With support", etc.)

The closing summary is MANDATORY and must appear AFTER all cards.`;

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
          temperature: 0.7,
          max_tokens: 600,
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
    const newSet = new Set(selectedDocIds);
    if (newSet.has(docId)) {
      newSet.delete(docId);
    } else {
      newSet.add(docId);
    }
    setSelectedDocIds(newSet);
  };

  const handleLoadArchived = (session: ConversationSession) => {
    // Don't unarchive - just make it the active session for viewing
    // This allows users to browse multiple saved chats without deleting them
    setActiveSession(session);
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
          {isLoadingSession ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
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
              <View style={[
                styles.turnBubble,
                isUser ? styles.turnBubbleUser : styles.turnBubbleAssistant
              ]}>
                {isUser ? (
                  <Text style={[styles.turnContent, styles.turnContentUser]}>{turn.content}</Text>
                ) : (
                  <AIResponse content={turn.content} />
                )}
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
            <Text style={styles.suggestionsHeader}>Explore Attune</Text>
            
            {/* Quick prompts */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroller}>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What are his verbal strengths?')}>
                <Text style={styles.suggestionChipText}>Verbal strengths</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What sensory differences have I noticed?')}>
                <Text style={styles.suggestionChipText}>Sensory differences</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What school accommodations help?')}>
                <Text style={styles.suggestionChipText}>School supports</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('What are common sleep patterns?')}>
                <Text style={styles.suggestionChipText}>Sleep patterns</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionChip} onPress={() => setQueryInput('How does he regulate emotions?')}>
                <Text style={styles.suggestionChipText}>Emotional regulation</Text>
              </TouchableOpacity>
            </ScrollView>
            
            {/* Popular questions section */}
            <View style={styles.popularSection}>
              <Text style={styles.popularHeader}>Popular questions</Text>
              <TouchableOpacity style={styles.popularItem} onPress={() => setQueryInput('What are common triggers?')}>
                <Text style={[styles.popularText, { fontFamily: 'Avenir-Oblique' }]}>What are common triggers?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popularItem} onPress={() => setQueryInput('What activities help him focus?')}>
                <Text style={[styles.popularText, { fontFamily: 'Avenir-Oblique' }]}>What activities help him focus?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popularItem} onPress={() => setQueryInput('How does he respond to transitions?')}>
                <Text style={[styles.popularText, { fontFamily: 'Avenir-Oblique' }]}>How does he respond to transitions?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popularItem} onPress={() => setQueryInput('What social situations are challenging?')}>
                <Text style={[styles.popularText, { fontFamily: 'Avenir-Oblique' }]}>What social situations are challenging?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popularItem} onPress={() => setQueryInput('What are his areas of strength?')}>
                <Text style={[styles.popularText, { fontFamily: 'Avenir-Oblique' }]}>What are his areas of strength?</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom padding for keyboard */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Input Container - flows naturally from conversation */}
      <View style={styles.bottomSection}>
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

        {/* Context & Actions Bar - below composer */}
        <View style={[styles.contextBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.contextLeft}>
            <TouchableOpacity
              style={styles.contextButton}
              onPress={() => setShowArchived(true)}
            >
              <Text style={styles.contextButtonText}>📚 History</Text>
            </TouchableOpacity>
            {documents.length > 0 && (
              <View style={styles.contextInfo}>
                <Text style={styles.contextInfoText}>{documents.length} doc{documents.length > 1 ? 's' : ''} · Data connected</Text>
              </View>
            )}
          </View>

          <View style={styles.contextRight}>
            <TouchableOpacity
              style={[styles.contextButton, !canSaveConversation && styles.contextButtonDisabled]}
              onPress={handleSaveConversation}
              disabled={!canSaveConversation}
            >
              <Text style={[styles.contextButtonText, !canSaveConversation && styles.contextButtonTextDisabled]}>💾 Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contextButton}
              onPress={handleNewConversation}
            >
              <Text style={styles.contextButtonText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
        </>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
  },
  
  // Conversation bubbles - refined for premium AI product feel
  turnContainer: {
    marginBottom: 40, // More breathing room between turns
  },
  turnContainerUser: {
    alignItems: 'flex-end',
  },
  turnContainerAssistant: {
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  turnBubble: {
    maxWidth: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  turnBubbleUser: {
    backgroundColor: 'transparent',
    borderLeftWidth: 2,
    borderLeftColor: colors.sage,
    paddingLeft: 20,
    paddingVertical: 4,
    maxWidth: '92%',
  },
  turnBubbleAssistant: {
    backgroundColor: 'transparent',
    paddingLeft: 0,
    paddingVertical: 0,
  },
  turnContent: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  turnContentUser: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  turnContentAssistant: {
    color: colors.text,
  },
  turnTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    marginLeft: 0,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  // Prose fallback (for simple questions)
  proseContainer: {
    paddingVertical: 4,
  },
  proseText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  
  // Structured response container
  structuredResponse: {
    gap: 20,
  },
  
  // Lead-in summary text - first thing user sees
  leadInText: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  
  // Card format (for pattern/list questions) - the hero
  cardsContainer: {
    gap: 16,
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 12,
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  insightEmoji: {
    fontSize: 26,
    lineHeight: 26,
    marginTop: 2,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 24,
  },
  frequencyBadge: {
    backgroundColor: colors.sageLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  frequencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.sage,
    letterSpacing: 0.6,
  },
  insightContent: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textDim,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  expandHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.2,
  },
  
  // Closing insight text
  closingText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textDim,
    fontWeight: '400',
    marginTop: 4,
    fontStyle: 'italic',
    letterSpacing: -0.2,
  },
  
  // Confidence Badge - blue banner at bottom as supporting provenance
  confidenceBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    marginTop: 16,
  },
  confidenceText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  thinkingText: {
    fontSize: 16,
    color: colors.textDim,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Suggestions section - refined blank state
  suggestionsSection: {
    marginTop: 24,
    marginBottom: 40,
  },
  suggestionsHeader: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text,
    marginBottom: 16,
    marginLeft: 0,
  },
  suggestionScroller: {
    flexGrow: 0,
    marginBottom: 32,
  },
  suggestionChip: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.accentLight,
    borderWidth: 0,
    marginRight: 10,
  },
  suggestionChipText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  // Popular questions - helps users understand Attune's capabilities
  popularSection: {
    gap: 0,
  },
  popularHeader: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text,
    marginBottom: 12,
    marginLeft: 0,
  },
  popularItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  popularText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '400',
    fontStyle: 'italic',
    letterSpacing: -0.2,
    lineHeight: 22,
  },

  // Bottom section - composer flows naturally, controls below
  bottomSection: {
    backgroundColor: colors.bg,
    borderTopWidth: 0,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 26,
    borderWidth: 0,
    backgroundColor: colors.card,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.2,
    ...shadows.sm,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
  },
  
  // Context bar - subtle secondary metadata below composer
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contextRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  contextButtonDisabled: {
    opacity: 0.35,
  },
  contextButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: -0.1,
  },
  contextButtonTextDisabled: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  contextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextInfoText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});

// Archived/Saved Chats View Styles - cleaner, more spacious
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
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  backButtonText: {
    fontSize: 17,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  archivedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  archivedList: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
  },
  emptyArchived: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyArchivedIcon: {
    fontSize: 56,
    marginBottom: 18,
  },
  emptyArchivedText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyArchivedHint: {
    fontSize: 15,
    color: colors.textDim,
    lineHeight: 22,
  },
  archivedItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 0,
    overflow: 'hidden',
    ...shadows.card,
  },
  archivedItemMain: {
    flex: 1,
    padding: 18,
  },
  archivedItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  archivedItemDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  archivedItemPreview: {
    fontSize: 14,
    color: colors.textDim,
    lineHeight: 20,
  },
  deleteButton: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 20,
    color: colors.danger,
    opacity: 0.6,
  },
});

// Merge archived styles into main styles object
Object.assign(styles, archivedStyles);
