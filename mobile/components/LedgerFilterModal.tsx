import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import {
  Text,
  Button,
  Portal,
  Surface,
  IconButton,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';

/**
 * LedgerFilterModal Component
 * 
 * Filter modal for ledger view with:
 * - Activity type filter: "All Activity", "Points Earned", "Points Spent"
 * - Date range selection (future enhancement)
 * 
 * Requirements covered: 18.1, 18.2, 18.5
 * 
 * @param visible - Whether the modal is visible
 * @param currentFilter - Current filter type
 * @param onApply - Callback with selected filter
 * @param onCancel - Callback to close modal
 */

export type LedgerFilterType = 'all' | 'earned' | 'spent';

interface LedgerFilterModalProps {
  visible: boolean;
  currentFilter: LedgerFilterType;
  onApply: (filter: LedgerFilterType) => void;
  onCancel: () => void;
}

export function LedgerFilterModal({
  visible,
  currentFilter,
  onApply,
  onCancel,
}: LedgerFilterModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<LedgerFilterType>(currentFilter);

  // Update local state when currentFilter changes
  useEffect(() => {
    setSelectedFilter(currentFilter);
  }, [currentFilter]);

  // Handle apply
  const handleApply = () => {
    onApply(selectedFilter);
  };

  // Handle reset
  const handleReset = () => {
    setSelectedFilter('all');
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Filter Activity
            </Text>
            <IconButton icon="close" onPress={onCancel} />
          </View>

          <Divider />

          {/* Content */}
          <View style={styles.content}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Activity Type
            </Text>

            <SegmentedButtons
              value={selectedFilter}
              onValueChange={(value) => setSelectedFilter(value as LedgerFilterType)}
              buttons={[
                {
                  value: 'all',
                  label: 'All',
                  icon: '📊',
                },
                {
                  value: 'earned',
                  label: 'Earned',
                  icon: '⬆️',
                },
                {
                  value: 'spent',
                  label: 'Spent',
                  icon: '⬇️',
                },
              ]}
              style={styles.segmentedButtons}
            />

            {/* Filter descriptions */}
            <View style={styles.descriptionBox}>
              {selectedFilter === 'all' && (
                <Text variant="bodySmall" style={styles.description}>
                  📊 Show all point events (behaviors and redemptions)
                </Text>
              )}
              {selectedFilter === 'earned' && (
                <Text variant="bodySmall" style={styles.description}>
                  ⬆️ Show only points earned from behaviors
                </Text>
              )}
              {selectedFilter === 'spent' && (
                <Text variant="bodySmall" style={styles.description}>
                  ⬇️ Show only points spent on reward redemptions
                </Text>
              )}
            </View>

            {/* Future: Date Range Selection */}
            <View style={styles.futureSection}>
              <Text variant="bodySmall" style={styles.futureText}>
                Date range filtering coming soon
              </Text>
            </View>
          </View>

          <Divider />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              mode="text"
              onPress={handleReset}
              style={styles.resetButton}
            >
              Reset
            </Button>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={onCancel}
                style={styles.actionButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleApply}
                style={styles.actionButton}
              >
                Apply
              </Button>
            </View>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
  },
  surface: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#212121',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  descriptionBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  description: {
    color: '#757575',
  },
  futureSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  futureText: {
    color: '#FF9800',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  resetButton: {
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minWidth: 90,
  },
});
