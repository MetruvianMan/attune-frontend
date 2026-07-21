/**
 * LedgerFilterModal Example Usage
 * 
 * This example demonstrates how to integrate the LedgerFilterModal
 * component with a parent component (like LedgerView).
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LedgerFilterModal, LedgerFilters } from './LedgerFilterModal';
import { colors, radius, shadows } from '../constants/theme';

export function LedgerFilterExample() {
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<LedgerFilters>({
    filterType: 'all',
    dateRange: { start: null, end: null },
  });

  const handleApplyFilters = (filters: LedgerFilters) => {
    console.log('Filters applied:', filters);
    setCurrentFilters(filters);
    
    // In a real implementation, you would:
    // 1. Store filters in state
    // 2. Pass filters to your data fetching function
    // 3. Update displayed point events based on filters
    
    // Example:
    // loadPointEvents(selectedChildProfileId, filters);
  };

  const getFilterDescription = (): string => {
    const parts: string[] = [];
    
    // Filter type
    if (currentFilters.filterType === 'earned') {
      parts.push('Points Earned');
    } else if (currentFilters.filterType === 'spent') {
      parts.push('Points Spent');
    } else {
      parts.push('All Activity');
    }
    
    // Date range
    if (currentFilters.dateRange?.start || currentFilters.dateRange?.end) {
      const start = currentFilters.dateRange.start
        ? currentFilters.dateRange.start.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : 'Start';
      const end = currentFilters.dateRange.end
        ? currentFilters.dateRange.end.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : 'End';
      parts.push(`${start} - ${end}`);
    }
    
    return parts.join(' • ');
  };

  const hasActiveFilters = (): boolean => {
    return (
      currentFilters.filterType !== 'all' ||
      currentFilters.dateRange?.start !== null ||
      currentFilters.dateRange?.end !== null
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Button */}
      <TouchableOpacity
        style={[
          styles.filterButton,
          hasActiveFilters() && styles.filterButtonActive,
        ]}
        onPress={() => setFilterModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.filterButtonEmoji}>⚙️</Text>
        <View style={styles.filterButtonContent}>
          <Text style={styles.filterButtonLabel}>Filter</Text>
          {hasActiveFilters() && (
            <Text style={styles.filterButtonDescription}>
              {getFilterDescription()}
            </Text>
          )}
        </View>
        {hasActiveFilters() && <View style={styles.filterActiveDot} />}
      </TouchableOpacity>

      {/* Filter Modal */}
      <LedgerFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={currentFilters}
      />

      {/* Display Current Filters (for demonstration) */}
      <View style={styles.currentFiltersCard}>
        <Text style={styles.currentFiltersTitle}>Current Filters:</Text>
        <Text style={styles.currentFiltersText}>
          Type: {currentFilters.filterType}
        </Text>
        <Text style={styles.currentFiltersText}>
          Start Date:{' '}
          {currentFilters.dateRange?.start
            ? currentFilters.dateRange.start.toLocaleDateString()
            : 'None'}
        </Text>
        <Text style={styles.currentFiltersText}>
          End Date:{' '}
          {currentFilters.dateRange?.end
            ? currentFilters.dateRange.end.toLocaleDateString()
            : 'None'}
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
 *    const [filters, setFilters] = useState<LedgerFilters>({
 *      filterType: 'all',
 *      dateRange: { start: null, end: null }
 *    });
 * 
 * 2. Add filter button in LedgerView header:
 *    <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
 *      <Text>Filter ⚙️</Text>
 *    </TouchableOpacity>
 * 
 * 3. Add modal component:
 *    <LedgerFilterModal
 *      visible={filterModalVisible}
 *      onClose={() => setFilterModalVisible(false)}
 *      onApply={setFilters}
 *      initialFilters={filters}
 *    />
 * 
 * 4. Update loadDayEvents function to use filters:
 *    const loadDayEvents = async (date: Date) => {
 *      const events = await rewardsService.getPointEvents(
 *        selectedChildProfileId,
 *        {
 *          childProfileId: selectedChildProfileId,
 *          dateRange: {
 *            start: filters.dateRange?.start || startOfDay,
 *            end: filters.dateRange?.end || endOfDay
 *          },
 *        }
 *      );
 *      
 *      // Filter by type
 *      let filteredEvents = events;
 *      if (filters.filterType === 'earned') {
 *        filteredEvents = events.filter(e => e.type === 'behavior');
 *      } else if (filters.filterType === 'spent') {
 *        filteredEvents = events.filter(e => e.type === 'redemption');
 *      }
 *      
 *      setDayEvents(filteredEvents);
 *    };
 */
