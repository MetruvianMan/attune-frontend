import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Event } from '../models';

interface DraggableEventListProps {
  events: Event[];
  onReorder: (events: Event[]) => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  formatEventType: (eventType: string) => string;
  getEventEmoji: (eventType: string) => string;
}

export function DraggableEventList({
  events,
  onReorder,
  onEdit,
  onDelete,
  formatEventType,
  getEventEmoji,
}: DraggableEventListProps) {
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Event>) => {
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.eventRow,
            isActive && styles.eventRowActive,
          ]}
        >
          {/* Drag Handle */}
          <View
            style={styles.dragHandle}
            onTouchStart={drag}
            onLongPress={drag}
          >
            <Text style={styles.dragIcon}>⠿</Text>
          </View>

          {/* Event Info */}
          <View style={styles.eventInfo}>
            <Text variant="bodyLarge" style={styles.eventType}>
              {getEventEmoji(item.eventType)} {formatEventType(item.eventType)}
            </Text>
            <Text variant="bodySmall" style={styles.eventTime}>
              {new Date(item.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
              {item.severity && ` · ${item.severity}/5`}
            </Text>
            {item.notes && (
              <Text variant="bodySmall" style={styles.eventNotes} numberOfLines={2}>
                {item.notes}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.eventActions}>
            <IconButton
              icon="pencil"
              size={18}
              onPress={() => onEdit(item.id)}
              style={styles.actionButton}
            />
            <IconButton
              icon="delete"
              size={18}
              iconColor="#F44336"
              onPress={() => onDelete(item.id)}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <DraggableFlatList
      data={events}
      onDragEnd={({ data }) => onReorder(data)}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      containerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  eventRowActive: {
    backgroundColor: '#F5F5F5',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dragHandle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dragIcon: {
    fontSize: 20,
    color: '#999',
    opacity: 0.6,
  },
  eventInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventType: {
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTime: {
    color: '#999',
    marginBottom: 4,
  },
  eventNotes: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    margin: 0,
  },
});
