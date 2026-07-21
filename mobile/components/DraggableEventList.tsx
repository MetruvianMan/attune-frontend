import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { Event } from '../models';
import { colors, typography } from '../constants/theme';

interface DraggableEventListProps {
  events: Event[];
  onReorder: (events: Event[]) => void;
  onEdit: (eventId: string) => void;
  onEditDetails: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  onEmojiTap?: (eventId: string) => void;
  formatEventType: (eventType: string) => string;
  getEventEmoji: (eventType: string) => string;
  onDragStateChange?: (isDragging: boolean) => void;
}

// Approximate height per event row - balanced for single and 2-line notes
const EVENT_ROW_HEIGHT = 63; // Slightly tighter while still allowing 2-line notes

export function DraggableEventList({
  events,
  onReorder,
  onEdit,
  onEditDetails,
  onDelete,
  onEmojiTap,
  formatEventType,
  getEventEmoji,
  onDragStateChange,
}: DraggableEventListProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = React.useState(false);
  const swipeableRefs = React.useRef<Map<string, Swipeable>>(new Map());
  
  // Calculate container height based on number of events
  const containerHeight = events.length * EVENT_ROW_HEIGHT;
  
  const handleDragBegin = () => {
    setIsDragging(true);
    onDragStateChange?.(true);
    // Close all open swipeables when dragging starts
    swipeableRefs.current.forEach((ref) => ref?.close());
  };
  
  const handleDragEnd = (data: Event[]) => {
    setIsDragging(false);
    onDragStateChange?.(false);
    onReorder(data);
  };
  
  const handleRelease = () => {
    setIsDragging(false);
    onDragStateChange?.(false);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: Event
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActionsContainer}>
        {/* Edit Event - full editor with all advanced controls */}
        <TouchableOpacity
          style={[styles.swipeActionButton, styles.swipeActionEdit]}
          onPress={() => {
            swipeableRefs.current.get(item.id)?.close();
            router.push(`/event-form?eventId=${item.id}`);
          }}
        >
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <Text style={styles.swipeActionIcon}>⚙️</Text>
            <Text style={styles.swipeActionLabel}>Edit Event</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          style={[styles.swipeActionButton, styles.swipeActionDelete]}
          onPress={() => {
            swipeableRefs.current.get(item.id)?.close();
            onDelete(item.id);
          }}
        >
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <Text style={styles.swipeActionIcon}>🗑️</Text>
            <Text style={styles.swipeActionLabel}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Event>) => {
    return (
      <ScaleDecorator>
        <Swipeable
          ref={(ref) => {
            if (ref) {
              swipeableRefs.current.set(item.id, ref);
            } else {
              swipeableRefs.current.delete(item.id);
            }
          }}
          renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
          overshootRight={false}
          friction={2}
          rightThreshold={40}
          enabled={!isDragging}
        >
          <View
            style={[
              styles.eventRow,
              isActive && styles.eventRowActive,
            ]}
          >
            {/* Drag Handle - Only area that triggers drag */}
            <TouchableOpacity
              style={styles.dragHandle}
              onLongPress={drag}
              delayLongPress={250}
              activeOpacity={0.7}
            >
              <Text style={styles.dragIcon}>⠿</Text>
            </TouchableOpacity>

            {/* Event Info - Main content area, tappable to open full editor */}
            <TouchableOpacity 
              style={styles.eventInfo}
              onPress={() => router.push(`/event-form?eventId=${item.id}`)}
              activeOpacity={0.6}
            >
              <View style={styles.eventHeader}>
                {/* Tappable emoji for custom emoji picker */}
                {onEmojiTap ? (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent parent tap from firing
                      onEmojiTap(item.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eventEmoji}>
                      {item.customEmoji 
                        ? item.customEmoji 
                        : getEventEmoji(item.eventType)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.eventEmoji}>
                    {item.customEmoji 
                      ? item.customEmoji 
                      : getEventEmoji(item.eventType)}
                  </Text>
                )}
                
                {/* Event label */}
                <Text style={styles.eventLabel}>
                  {item.eventType === 'custom' && item.customLabel 
                    ? item.customLabel 
                    : formatEventType(item.eventType)}
                </Text>
                
                {/* Time - inline, left-aligned like before */}
                <Text style={styles.eventTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </Text>
                
                {/* Severity indicator */}
                {item.severity && (
                  <Text style={styles.severity}>·{item.severity}/5</Text>
                )}
              </View>
              
              {/* Notes on second line if present */}
              {item.notes && (
                <RNText style={styles.notes} numberOfLines={1} ellipsizeMode="tail">
                  {item.notes}
                </RNText>
              )}
            </TouchableOpacity>

            {/* Subtle pencil icon - always visible, quick note editing */}
            <TouchableOpacity 
              style={styles.quickNoteButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent swipeable from interfering
                onEdit(item.id);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.quickNoteIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </Swipeable>
      </ScaleDecorator>
    );
  };

  return (
    <View style={{ height: containerHeight }}>
      <DraggableFlatList
        data={events}
        onDragBegin={handleDragBegin}
        onDragEnd={({ data }) => handleDragEnd(data)}
        onRelease={handleRelease}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        containerStyle={styles.container}
        nestedScrollEnabled={true}
        scrollEnabled={false}
        activationDistance={15}
        dragItemOverflow={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Slightly increased for breathing room
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 52, // Slightly taller for cleaner look
  },
  eventRowActive: {
    backgroundColor: '#F5F5F5',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
    borderRadius: 8,
  },
  dragHandle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    flexShrink: 0,
  },
  dragIcon: {
    fontSize: 20,
    color: colors.textMuted,
    opacity: 0.4,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  eventEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  eventLabel: {
    fontSize: 15,
    fontWeight: '700', // Bolder - changed from '600'
    color: colors.text,
    lineHeight: 20,
  },
  eventTime: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
  severity: {
    fontSize: 11,
    color: colors.warm,
    marginLeft: 6,
    fontWeight: '500',
  },
  notes: {
    fontSize: typography.caption.fontSize,
    color: colors.textDim,
    marginTop: 2,
    marginLeft: 0, // Align with emoji (no left margin)
    fontStyle: 'italic',
    lineHeight: 16,
  },
  // Quick note button - subtle but always visible
  quickNoteButton: {
    padding: 8,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickNoteIcon: {
    fontSize: 16,
    opacity: 0.25, // Very subtle
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    flexShrink: 0,
    marginLeft: 8,
  },
  // Single menu button - minimal, subtle
  menuButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 22,
    opacity: 0.3, // Very subtle when not pressed
    fontWeight: '700',
    color: colors.textMuted,
  },
  // Keep old button styles for potential future use
  iconButton: {
    padding: 4,
    minWidth: 28,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pencilIcon: {
    fontSize: 16, // Larger (was smaller)
    opacity: 0.5,
  },
  dotsIcon: {
    fontSize: 18, // Larger
    opacity: 0.5,
    fontWeight: '700',
  },
  deleteButton: {
    paddingVertical: 4, // Reduced from 6
    paddingHorizontal: 8, // Reduced from 10
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 6, // Reduced from 8
    backgroundColor: 'rgba(199,92,92,0.08)',
    minHeight: 28, // Reduced from 32
    minWidth: 28, // Reduced from 32
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '600',
  },
  // Swipe actions - iOS Mail style
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    height: '100%',
  },
  swipeActionButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  swipeActionEdit: {
    backgroundColor: '#6B7280', // Gray for advanced editing
  },
  swipeActionDelete: {
    backgroundColor: '#EB5757', // Red for delete
  },
  swipeActionIcon: {
    fontSize: 24,
    marginBottom: 4,
    textAlign: 'center',
  },
  swipeActionLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
