import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
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

// Approximate height per event row - adjusted to prevent clipping
const EVENT_ROW_HEIGHT = 58; // Increased from 53 to account for padding and borders

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
  
  // Calculate container height based on number of events
  const containerHeight = events.length * EVENT_ROW_HEIGHT;
  
  const handleDragBegin = () => {
    setIsDragging(true);
    onDragStateChange?.(true);
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
  
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Event>) => {
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.eventRow,
            isActive && styles.eventRowActive,
          ]}
        >
          {/* Drag Handle - Only area that triggers drag - MUST capture pointers */}
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={drag}
            delayLongPress={250}
            activeOpacity={0.7}
          >
            <Text style={styles.dragIcon}>⠿</Text>
          </TouchableOpacity>

          {/* Event Info - Completely non-interactive for gestures */}
          <View style={styles.eventInfo}>
            <View style={styles.eventHeader}>
              {/* Tappable emoji */}
              {onEmojiTap ? (
                <TouchableOpacity 
                  onPress={() => onEmojiTap(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eventType}>
                    {item.eventType === 'custom' && item.customEmoji 
                      ? item.customEmoji 
                      : getEventEmoji(item.eventType)}{' '}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.eventType}>
                  {item.eventType === 'custom' && item.customEmoji 
                    ? item.customEmoji 
                    : getEventEmoji(item.eventType)}{' '}
                </Text>
              )}
              <Text style={styles.eventType}>
                {item.eventType === 'custom' && item.customLabel 
                  ? item.customLabel 
                  : formatEventType(item.eventType)}
              </Text>
              <Text style={styles.eventTime}>
                {new Date(item.timestamp).toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </Text>
              {item.severity && (
                <Text style={styles.severity}>·{item.severity}/5</Text>
              )}
            </View>
            {item.notes && (
              <RNText style={styles.notes} numberOfLines={1}>
                {item.notes}
              </RNText>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Pencil - Quick notes - Larger touch target */}
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => onEdit(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.pencilIcon}>✏️</Text>
            </TouchableOpacity>

            {/* Dots - Full edit form - Larger touch target */}
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push(`/event-form?eventId=${item.id}`)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.dotsIcon}>⋯</Text>
            </TouchableOpacity>

            {/* Close - Delete */}
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => onDelete(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingVertical: 8, // Increased from 6 (10% taller)
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 49, // Increased from 44 (10% taller)
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
    marginBottom: 1, // Reduced from 2
  },
  eventType: {
    fontSize: 15, // Slightly reduced from 16
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20, // Reduced from 22
  },
  eventTime: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
    marginLeft: 6, // Reduced from 8
    opacity: 0.7, // De-emphasize
  },
  severity: {
    fontSize: 11, // Slightly larger
    color: colors.warm,
    marginLeft: 6,
    fontWeight: '500',
  },
  notes: {
    fontSize: typography.caption.fontSize,
    color: colors.textDim,
    marginTop: 2, // Reduced from 4
    fontStyle: 'italic',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Reduced from 6
    flexShrink: 0,
    marginLeft: 6, // Reduced from 8
  },
  iconButton: {
    padding: 4, // Reduced from 6
    minWidth: 28, // Reduced from 32
    minHeight: 28, // Reduced from 32
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
});
