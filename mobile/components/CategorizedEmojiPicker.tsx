import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Text } from 'react-native';
import { colors } from '../constants/theme';
import { EMOJI_CATEGORIES } from './CustomEventModal';

interface CategorizedEmojiPickerProps {
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
}

/**
 * CategorizedEmojiPicker
 *
 * Category-tabbed emoji grid with a "use any emoji from your keyboard"
 * fallback, extracted from CustomQuickLogModal.tsx so the same picker
 * experience can be reused anywhere an emoji needs picking (e.g.
 * behavior-form.tsx's Manage Behaviors screen), instead of duplicating a
 * flatter/plainer grid per screen.
 *
 * Self-contained: manages its own category-tab and
 * custom-emoji-input-mode state internally. The parent only needs to
 * track a single `emoji` string and pass it in/receive updates via
 * selectedEmoji/onSelectEmoji - same shape as a controlled TextInput.
 */
export function CategorizedEmojiPicker({ selectedEmoji, onSelectEmoji }: CategorizedEmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');

  if (!showCustomEmojiInput) {
    return (
      <View>
        {/* Category tabs - horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabsContainer}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {EMOJI_CATEGORIES.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryTab,
                selectedCategory === index && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(index)}
            >
              <Text style={styles.categoryTabIcon}>{category.icon}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Emoji grid - scrollable container */}
        <ScrollView
          style={styles.emojiGridContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.emojiGrid}>
            {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected,
                ]}
                onPress={() => onSelectEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Any emoji beyond this curated list is one tap away via the
            iOS/Android keyboard's own emoji key - cheaper and more
            complete than bundling the full Unicode emoji set. */}
        <TouchableOpacity
          style={styles.customEmojiToggle}
          onPress={() => setShowCustomEmojiInput(true)}
        >
          <Text style={styles.customEmojiToggleText}>⌨️ Use any emoji from your keyboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TextInput
        style={styles.customEmojiInput}
        value={customEmoji}
        onChangeText={(text) => {
          setCustomEmoji(text);
          if (text.trim()) {
            onSelectEmoji(text.trim());
          }
        }}
        placeholder="Tap here, then use your keyboard's emoji key"
        placeholderTextColor="#999"
      />
      <TouchableOpacity
        style={styles.customEmojiToggle}
        onPress={() => {
          setShowCustomEmojiInput(false);
          setCustomEmoji('');
        }}
      >
        <Text style={styles.customEmojiToggleText}>← Back to emoji picker</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryTabsContainer: {
    marginBottom: 6,
  },
  categoryTabsContent: {
    gap: 4,
    paddingBottom: 6,
  },
  categoryTab: {
    height: 28,
    minWidth: 32,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#4A90E2',
  },
  categoryTabIcon: {
    fontSize: 16,
  },
  emojiGridContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    maxHeight: 180,
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    padding: 6,
  },
  emojiButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.12)',
  },
  emojiText: {
    fontSize: 20,
  },
  customEmojiToggle: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
  },
  customEmojiToggleText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  customEmojiInput: {
    padding: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 13,
    color: colors.text,
    backgroundColor: 'white',
    marginBottom: 8,
  },
});
