import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Chip, Menu, Portal, Modal, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EventType } from '../models';

export interface EventFilterOptions {
  eventTypes: EventType[];
  dateRange?: { start: Date; end: Date };
  tags: string[];
}

interface EventFiltersProps {
  filters: EventFilterOptions;
  onFiltersChange: (filters: EventFilterOptions) => void;
  availableTags: string[];
}

const EVENT_TYPES: EventType[] = [
  'meltdown',
  'shutdown',
  'conflict',
  'school_incident',
  'great_day',
  'good_sleep',
  'poor_sleep',
  'medication',
  'wet_bed',
  'didnt_eat_dinner',
  'playdate',
  'watched_tv',
  'sick',
  'family_adventure',
  'played_outside',
  'good_dinner',
  'drew_comics',
  'stayed_home',
  'aggression',
  'good_breakfast',
  'tired',
  'fast_food',
  'sports',
  'party',
  'bounceback',
  'sugar',
  'poor_transitions',
  'chores',
  'focus',
  'reading',
  'kindness',
  'overwhelm',
  'naughty',
  'refusal',
  'sibling_harmony',
  'bad_language',
  'injury',
  'sneaky',
  'messy',
  'helpful',
  'video_games',
  'toilet_issue',
  'dad_bonding',
  'mom_bonding',
  'travel',
];

export function EventFilters({ filters, onFiltersChange, availableTags }: EventFiltersProps) {
  const [eventTypeMenuVisible, setEventTypeMenuVisible] = useState(false);
  const [tagMenuVisible, setTagMenuVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(filters.dateRange?.start || new Date());
  const [tempEndDate, setTempEndDate] = useState(filters.dateRange?.end || new Date());

  const toggleEventType = (type: EventType) => {
    const newTypes = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter(t => t !== type)
      : [...filters.eventTypes, type];
    onFiltersChange({ ...filters, eventTypes: newTypes });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const applyDateRange = () => {
    onFiltersChange({
      ...filters,
      dateRange: { start: tempStartDate, end: tempEndDate },
    });
    setDateModalVisible(false);
  };

  const clearDateRange = () => {
    onFiltersChange({ ...filters, dateRange: undefined });
    setDateModalVisible(false);
  };

  const clearAllFilters = () => {
    onFiltersChange({ eventTypes: [], tags: [], dateRange: undefined });
  };

  const hasActiveFilters = 
    filters.eventTypes.length > 0 || 
    filters.tags.length > 0 || 
    filters.dateRange !== undefined;

  const formatEventType = (type: EventType): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {/* Event Type Filter */}
        <Menu
          visible={eventTypeMenuVisible}
          onDismiss={() => setEventTypeMenuVisible(false)}
          anchor={
            <Chip
              mode={filters.eventTypes.length > 0 ? 'flat' : 'outlined'}
              onPress={() => setEventTypeMenuVisible(true)}
              style={styles.filterChip}
            >
              Event Type {filters.eventTypes.length > 0 && `(${filters.eventTypes.length})`}
            </Chip>
          }
        >
          <ScrollView style={styles.menuScroll}>
            {EVENT_TYPES.map((type) => (
              <Menu.Item
                key={type}
                onPress={() => toggleEventType(type)}
                title={formatEventType(type)}
                leadingIcon={filters.eventTypes.includes(type) ? 'check' : undefined}
              />
            ))}
          </ScrollView>
        </Menu>

        {/* Date Range Filter */}
        <Chip
          mode={filters.dateRange ? 'flat' : 'outlined'}
          onPress={() => setDateModalVisible(true)}
          style={styles.filterChip}
        >
          Date Range
        </Chip>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <Menu
            visible={tagMenuVisible}
            onDismiss={() => setTagMenuVisible(false)}
            anchor={
              <Chip
                mode={filters.tags.length > 0 ? 'flat' : 'outlined'}
                onPress={() => setTagMenuVisible(true)}
                style={styles.filterChip}
              >
                Tags {filters.tags.length > 0 && `(${filters.tags.length})`}
              </Chip>
            }
          >
            <ScrollView style={styles.menuScroll}>
              {availableTags.map((tag) => (
                <Menu.Item
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  title={tag}
                  leadingIcon={filters.tags.includes(tag) ? 'check' : undefined}
                />
              ))}
            </ScrollView>
          </Menu>
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <Chip
            mode="outlined"
            onPress={clearAllFilters}
            style={styles.filterChip}
            icon="close"
          >
            Clear All
          </Chip>
        )}
      </ScrollView>

      {/* Date Range Modal */}
      <Portal>
        <Modal
          visible={dateModalVisible}
          onDismiss={() => setDateModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            Select Date Range
          </Text>

          <View style={styles.dateRow}>
            <Text variant="bodyMedium" style={styles.dateLabel}>Start:</Text>
            <Button mode="outlined" onPress={() => setShowStartDatePicker(true)}>
              {tempStartDate.toLocaleDateString()}
            </Button>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={tempStartDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowStartDatePicker(false);
                if (date) setTempStartDate(date);
              }}
            />
          )}

          <View style={styles.dateRow}>
            <Text variant="bodyMedium" style={styles.dateLabel}>End:</Text>
            <Button mode="outlined" onPress={() => setShowEndDatePicker(true)}>
              {tempEndDate.toLocaleDateString()}
            </Button>
          </View>

          {showEndDatePicker && (
            <DateTimePicker
              value={tempEndDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowEndDatePicker(false);
                if (date) setTempEndDate(date);
              }}
            />
          )}

          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={clearDateRange} style={styles.modalButton}>
              Clear
            </Button>
            <Button mode="contained" onPress={applyDateRange} style={styles.modalButton}>
              Apply
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
  },
  menuScroll: {
    maxHeight: 300,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateLabel: {
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    minWidth: 80,
  },
});
