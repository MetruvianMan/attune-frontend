import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Button,
  Portal,
  Surface,
  Modal,
  IconButton,
} from 'react-native-paper';
import { PaperText as Text, PaperDivider as Divider } from './PaperText';

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
        <Surface style={styles.surface}>
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

            {/* SegmentedButtons is a v5-only react-native-paper component -
                not exported at all by the v4.12.5 installed here (see
                package.json). Replaced with a row of plain v4 Buttons,
                switching mode between 'contained' (selected) and
                'outlined' (unselected) to convey the same segmented
                look/behavior. */}
            <View style={styles.segmentedButtons}>
              {(
                [
                  { value: 'all' as LedgerFilterType, label: 'All' },
                  { value: 'earned' as LedgerFilterType, label: 'Earned' },
                  { value: 'spent' as LedgerFilterType, label: 'Spent' },
                ]
              ).map((option) => (
                <Button
                  key={option.value}
                  mode={selectedFilter === option.value ? 'contained' : 'outlined'}
                  onPress={() => setSelectedFilter(option.value)}
                  style={styles.segmentButton}
                  compact
                >
                  {option.label}
                </Button>
              ))}
            </View>

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
    // Replicates elevation={4} (v5-only Surface prop) as an explicit
    // shadow - see RedemptionConfirmationDialog.tsx's surface style for
    // the fuller comment.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 6,
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
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
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
