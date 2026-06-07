import React, { useState, useRef } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Text, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { colors } from '../constants/theme';

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys & People',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
      '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳',
      '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
      '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
      '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺',
      '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁',
      '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'
    ],
  },
  {
    name: 'Food & Drink',
    icon: '🍎',
    emojis: [
      '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑',
      '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯',
      '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘',
      '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥',
      '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫',
      '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋',
      '🧃', '🧉', '🧊'
    ],
  },
  {
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊',
      '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌',
      '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒',
      '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓',
      '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'
    ],
  },
  {
    name: 'Nature & Weather',
    icon: '🍃',
    emojis: [
      // Plants & Flowers
      '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷',
      '🌹', '🥀', '🌺', '🌸', '🌼', '🌻',
      // Celestial & Sky
      '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐',
      '🌟', '✨', '⚡', '☄️', '💥', '🔥',
      // Weather
      '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦',
      '☔', '☂️', '🌊', '🌫️'
    ],
  },
  {
    name: 'Travel & Places',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵',
      '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇',
      '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽',
      '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋',
      '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪',
      '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️',
    ],
  },
  {
    name: 'Objects',
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️',
      '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌',
      '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧',
      '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬',
      '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫',
      '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️',
      '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉',
    ],
  },
  {
    name: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
      '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯',
      '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸',
      '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗',
      '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵',
      '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️',
      '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤',
    ],
  },
];

interface CustomEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    label: string;
    emoji: string;
    valence: 'positive' | 'neutral' | 'negative';
    notes: string;
    saveForQuickAccess: boolean;
  }) => void;
}

export function CustomEventModal({ visible, onClose, onSave }: CustomEventModalProps) {
  const [label, setLabel] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📝');
  const [valence, setValence] = useState<'positive' | 'neutral' | 'negative'>('positive');
  const [notes, setNotes] = useState('');
  const [saveForQuickAccess, setSaveForQuickAccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);

  const handleSave = () => {
    if (!label.trim()) {
      return;
    }
    onSave({
      label: label.trim(),
      emoji: selectedEmoji,
      valence,
      notes: notes.trim(),
      saveForQuickAccess,
    });
    // Reset form
    setLabel('');
    setSelectedEmoji('📝');
    setValence('positive');
    setNotes('');
    setSaveForQuickAccess(false);
    setSelectedCategory(0);
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setLabel('');
    setSelectedEmoji('📝');
    setValence('positive');
    setNotes('');
    setSaveForQuickAccess(false);
    setSelectedCategory(0);
  };

  const valenceOptions = [
    { value: 'positive' as const, label: 'Positive', emoji: '✅', color: '#4caf50' },
    { value: 'neutral' as const, label: 'Neutral', emoji: '➖', color: '#9e9e9e' },
    { value: 'negative' as const, label: 'Negative', emoji: '⚠️', color: '#f44336' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text style={styles.title}>📝 Add Custom Event</Text>

            {/* What happened input */}
            <Text style={styles.sectionLabel}>WHAT HAPPENED?</Text>
            <View style={styles.labelRow}>
              <Text style={styles.emojiPreview}>{selectedEmoji}</Text>
              <TextInput
                style={styles.labelInput}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Therapy session, Park visit..."
                placeholderTextColor="#999"
              />
            </View>

            {/* Emoji picker */}
            <Text style={styles.sectionLabel}>CHOOSE AN EMOJI</Text>
            
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
                    selectedCategory === index && styles.categoryTabActive
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
                      selectedEmoji === emoji && styles.emojiButtonSelected
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Valence selector */}
            <Text style={styles.sectionLabel}>IMPACT ON WELLBEING</Text>
            <View style={styles.valenceRow}>
              {valenceOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.valenceButton,
                    valence === option.value && {
                      borderColor: option.color,
                      backgroundColor: `${option.color}15`,
                    }
                  ]}
                  onPress={() => setValence(option.value)}
                >
                  <Text style={[
                    styles.valenceButtonText,
                    valence === option.value && styles.valenceButtonTextActive
                  ]}>
                    {option.emoji} {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save for quick access toggle */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSaveForQuickAccess(!saveForQuickAccess)}
            >
              <View style={[
                styles.checkbox,
                saveForQuickAccess && styles.checkboxChecked
              ]}>
                {saveForQuickAccess && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Save for quick access</Text>
            </TouchableOpacity>

            {/* Notes */}
            <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any details worth remembering..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={handleClose}
                style={styles.cancelButton}
                labelStyle={styles.cancelButtonText}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveButton}
                buttonColor="#4A90E2"
                labelStyle={styles.saveButtonText}
                disabled={!label.trim()}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    width: '100%',
    maxWidth: 380, // Expanded from 368 to accommodate larger fonts
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  scrollView: {
    padding: 16,
  },
  title: {
    fontSize: 15, // Increased from 13
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11, // Increased from 10
    fontWeight: '600',
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  emojiPreview: {
    fontSize: 19,
    flexShrink: 0,
  },
  labelInput: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 12,
    color: colors.text,
    backgroundColor: 'white',
  },
  categoryTabsContainer: {
    marginBottom: 6,
  },
  categoryTabsContent: {
    gap: 4,
    paddingBottom: 6,
  },
  categoryTab: {
    height: 28, // Increased from 24
    minWidth: 32, // Increased from 28
    paddingHorizontal: 6,
    borderRadius: 14, // Adjusted for new height
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#4A90E2',
  },
  categoryTabIcon: {
    fontSize: 16, // Increased from 13 for better hierarchy
  },
  emojiGridContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    maxHeight: 156, // 4 rows of emojis (34px + 3px gap) * 4 + padding
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    padding: 6,
  },
  emojiButton: {
    width: 34,
    height: 34,
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
    fontSize: 18,
  },
  valenceRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  valenceButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  valenceButtonText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  valenceButtonTextActive: {
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },
  checkmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 11,
    color: colors.text,
  },
  notesInput: {
    width: '100%',
    minHeight: 40,
    padding: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 11.5,
    color: colors.text,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    lineHeight: 17,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 11.5,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
