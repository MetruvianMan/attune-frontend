/**
 * LedgerFilterModal Example Usage
 * 
 * This example demonstrates how to integrate the LedgerFilterModal
 * component with a parent component (like LedgerView).
 *
 * Updated to match the component's current, simpler API - LedgerFilterModal
 * only filters by activity type (LedgerFilterType: 'all' | 'earned' |
 * 'spent') via currentFilter/onApply/onCancel props. An earlier version of
 * this example assumed a since-removed date-range filter shape
 * (LedgerFilters with a dateRange field), which no longer exists on the
 * real component.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LedgerFilterModal, LedgerFilterType } from './LedgerFilterModal';
import { colors, radius, shadows } from '../constants/theme';

export function LedgerFilterExample() {
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<LedgerFilterType>('all');

  const handleApplyFilter = (filter: LedgerFilterType) => {
    console.log('Filter applied:', filter);
    setCurrentFilter(filter);
    setFilterModalVisible(false);

    // In a real implementation, you would:
    // 1. Store the filter in state
    // 2. Pass it to your data fetching function
    // 3. Update displayed point events based on the filter
    
    // Example:
    // loadPointEvents(selectedChildProfileId, filter);
  };

  const getFilterDescription = (): string => {
    if (currentFilter === 'earned') return 'Points Earned';
    if (currentFilter === 'spent') return 'Points Spent';
    return 'All Activity';
  };

  const hasActiveFilter = (): boolean => currentFilter !== 'all';

  return (
    <View style={styles.container}>
      {/* Filter Button */}
      <TouchableOpacity
        style={[
          styles.filterButton,
          hasActiveFilter() && styles.filterButtonActive,
        ]}
        onPress={() => setFilterModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.filterButtonEmoji}>⚙️</Text>
        <View style={styles.filterButtonContent}>
          <Text style={styles.filterButtonLabel}>Filter</Text>
          {hasActiveFilter() && (
            <Text style={styles.filterButtonDescription}>
              {getFilterDescription()}
            </Text>
          )}
        </View>
        {hasActiveFilter() && <View style={styles.filterActiveDot} />}
      </TouchableOpacity>

      {/* Filter Modal */}
      <LedgerFilterModal
        visible={filterModalVisible}
        currentFilter={currentFilter}
        onApply={handleApplyFilter}
        onCancel={() => setFilterModalVisible(false)}
      />

      {/* Display Current Filter (for demonstration) */}
      <View style={styles.currentFiltersCard}>
        <Text style={styles.currentFiltersTitle}>Current Filter:</Text>
        <Text style={styles.currentFiltersText}>
          Type: {currentFilter}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.bg,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  filterButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  filterButtonEmoji: {
    fontSize: 20,
  },
  filterButtonContent: {
    flex: 1,
  },
  filterButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonDescription: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
  },
  filterActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  currentFiltersCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  currentFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  currentFiltersText: {
    fontSize: 13,
    color: colors.textDim,
    marginBottom: 4,
  },
});

/**
 * Integration with LedgerView
 * 
 * To integrate this modal with LedgerView, you would:
 * 
 * 1. Add filter state to LedgerView:
 *    const [filter, setFilter] = useState<LedgerFilterType>('all');
 * 
 * 2. Add filter button in LedgerView header:
 *    <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
 *      <Text>Filter ⚙️</Text>
 *    </TouchableOpacity>
 * 
 * 3. Add modal component:
 *    <LedgerFilterModal
 *      visible={filterModalVisible}
 *      currentFilter={filter}
 *      onApply={(f) => { setFilter(f); setFilterModalVisible(false); }}
 *      onCancel={() => setFilterModalVisible(false)}
 *    />
 * 
 * 4. Update loadDayEvents function to use the filter:
 *    const loadDayEvents = async (date: Date) => {
 *      const events = await rewardsService.getPointEvents(
 *        selectedChildProfileId,
 *        { childProfileId: selectedChildProfileId, dateRange: { start: startOfDay, end: endOfDay } }
 *      );
 *      
 *      // Filter by type
 *      let filteredEvents = events;
 *      if (filter === 'earned') {
 *        filteredEvents = events.filter(e => e.type === 'behavior');
 *      } else if (filter === 'spent') {
 *        filteredEvents = events.filter(e => e.type === 'redemption');
 *      }
 *      
 *      setDayEvents(filteredEvents);
 *    };
 */
