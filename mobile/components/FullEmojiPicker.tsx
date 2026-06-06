import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';

interface FullEmojiPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// Comprehensive emoji palette organized by category
const EMOJI_CATEGORIES = {
  'Emotions': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
    '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
    '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
    '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
  ],
  'Activities': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
    '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁',
    '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️',
    '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️',
    '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴',
    '🚵', '🤹', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
    '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳',
    '🎮', '🎰', '🧩',
  ],
  'School & Learning': [
    '🏫', '🎒', '📚', '📖', '📝', '✏️', '✒️', '🖊️', '🖋️', '🖍️',
    '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📃', '📄', '📰',
    '🗞️', '📑', '🔖', '🏷️', '💼', '📁', '📂', '🗂️', '📅', '📆',
    '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎',
    '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔐',
    '🚌', '🎓', '🧮', '🔬', '🔭', '🧪', '🧫', '🧬', '🔍', '🔎',
  ],
  'Food & Drink': [
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
    '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
    '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐',
    '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇',
    '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪',
    '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲',
    '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥',
    '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰',
    '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜',
    '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸',
    '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊',
  ],
  'Animals & Nature': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
    '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
    '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
    '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
    '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
    '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛',
    '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖',
    '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈',
    '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨',
    '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔',
    '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃',
    '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸',
    '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗',
    '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '💫',
    '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️',
    '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️',
    '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊',
  ],
  'Objects & Toys': [
    '🎁', '🎈', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️',
    '💌', '💝', '🎀', '🎗️', '🧸', '🪀', '🪁', '🎏', '🎐', '🧩',
    '🎲', '🪄', '🎭', '🖼️', '🎨', '🧵', '🪡', '🧶', '🪢', '👓',
    '🕶️', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', '🧤', '🧥',
    '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛',
    '👜', '👝', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰',
    '👢', '👑', '👒', '🎩', '🎓', '🧢', '⛑️', '💄', '💍', '💎',
  ],
  'Transportation': [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
    '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️',
    '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃',
    '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊',
    '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁',
    '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧',
  ],
  'Places': [
    '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤',
    '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌',
    '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅',
    '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉',
    '🌁', '🏟️',
  ],
  'Symbols & Icons': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
    '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
    '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
    '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
    '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
    '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️',
    '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓',
    '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️',
    '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠',
    '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥',
    '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '◼️', '◻️',
    '◾', '◽', '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻',
    '💠', '🔘', '🔲', '🔳', '⭐', '🌟', '✨', '💫', '⚡', '🔥',
    '💥', '💯', '✔️', '✖️', '➕', '➖', '➗', '🟰', '♾️', '‼️',
    '⁉️', '❓', '❔', '❕', '❗', '〰️', '🔅', '🔆', '©️', '®️',
    '™️', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣',
    '7️⃣', '8️⃣', '9️⃣', '🔟',
  ],
  'Hands & Gestures': [
    '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘',
    '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️',
    '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵',
    '🦿', '👄', '🦷', '👅', '👂', '🦻', '👃', '👣', '👀', '👁️',
    '🧠', '🦴', '👤', '👥',
  ],
};

export function FullEmojiPicker({ visible, onSelect, onClose }: FullEmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('Emotions');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryNames = Object.keys(EMOJI_CATEGORIES);

  // Filter emojis based on search (searches across all categories)
  const getFilteredEmojis = () => {
    if (!searchQuery.trim()) {
      return EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES] || [];
    }

    // When searching, show all matching emojis from all categories
    const allEmojis: string[] = [];
    Object.values(EMOJI_CATEGORIES).forEach(emojis => {
      allEmojis.push(...emojis);
    });
    return allEmojis;
  };

  const filteredEmojis = getFilteredEmojis();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose an Emoji</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Searchbar
          placeholder="Search emojis..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {/* Category Tabs */}
        {!searchQuery && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
          >
            {categoryNames.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.categoryTabActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category && styles.categoryTabTextActive
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Emoji Grid */}
        <ScrollView style={styles.scrollView}>
          <View style={styles.emojiGrid}>
            {filteredEmojis.map((emoji, index) => (
              <TouchableOpacity
                key={`${emoji}-${index}`}
                style={styles.emojiButton}
                onPress={() => {
                  onSelect(emoji);
                  onClose();
                }}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#F8F8F8',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#999',
    fontWeight: '300',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 0,
    backgroundColor: '#F5F5F5',
  },
  categoryContainer: {
    maxHeight: 36,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  categoryTabActive: {
    backgroundColor: '#4A90E2',
  },
  categoryTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    lineHeight: 16,
  },
  categoryTabTextActive: {
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: '12.5%', // 8 per row
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emojiText: {
    fontSize: 32,
  },
});
