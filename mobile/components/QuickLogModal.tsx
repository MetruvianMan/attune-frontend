import React, { useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import {
  Text,
  Portal,
  Surface,
  IconButton,
  Divider,
} from 'react-native-paper';
import { Behavior } from '../models';

/**
 * QuickLogModal Component
 * 
 * Fast behavior logging interface with:
 * - Behaviors grouped by category
 * - Single-tap buttons for each behavior
 * - Emoji and point value display
 * - Disabled state for behaviors that violate constraints
 * - Reason displayed for disabled behaviors
 * 
 * Designed for < 500ms logging performance.
 * 
 * Requirements covered: 10.1, 10.2, 7.2, 7.3, 8.2, 8.3
 * 
 * @param visible - Whether the modal is visible
 * @param behaviors - List of all behaviors
 * @param disabledBehaviors - Map of behavior IDs to disabled reasons
 * @param onLogBehavior - Callback when behavior is tapped
 * @param onClose - Callback to close modal
 */

interface QuickLogModalProps {
  visible: boolean;
  behaviors: Behavior[];
  disabledBehaviors?: Map<string, string>;
  onLogBehavior: (behaviorId: string) => Promise<void>;
  onClose: () => void;
}

export function QuickLogModal({
  visible,
  behaviors,
  disabledBehaviors = new Map(),
  onLogBehavior,
  onClose,
}: QuickLogModalProps) {
  // Group behaviors by category
  const categorySections = useMemo(() => {
    const grouped = behaviors.reduce((acc, behavior) => {
      const category = behavior.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(behavior);
      return acc;
    }, {} as Record<string, Behavior[]>);

    // Sort behaviors within each category by point value (highest first)
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => Math.abs(b.pointValue) - Math.abs(a.pointValue));
    });

    // Convert to array and sort categories
    const categoryOrder = [
      'Self-Care',
      'School',
      'Kindness',
      'Chores',
      'Social',
      'Health',
      'Creativity',
      'Needs Work',
      'Other',
    ];

    return Object.keys(grouped)
      .sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map((category) => ({
        category,
        behaviors: grouped[category],
      }));
  }, [behaviors]);

  // Handle behavior tap
  const handleBehaviorTap = async (behaviorId: string) => {
    if (disabledBehaviors.has(behaviorId)) {
      return; // Don't log if disabled
    }

    try {
      await onLogBehavior(behaviorId);
      // Don't close modal - allow multiple quick logs
    } catch (error) {
      console.error('Failed to log behavior:', error);
      alert('Failed to log behavior. Please try again.');
    }
  };

  // Format point value with sign
  const formatPoints = (points: number) => {
    if (points > 0) return `+${points}`;
    return `${points}`;
  };

  // Get button style based on point value and disabled state
  const getButtonStyle = (behavior: Behavior, disabled: boolean) => {
    if (disabled) {
      return [styles.behaviorButton, styles.behaviorButtonDisabled];
    }
    if (behavior.pointValue > 0) {
      return [styles.behaviorButton, styles.behaviorButtonPositive];
    }
    return [styles.behaviorButton, styles.behaviorButtonNegative];
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Log Points
            </Text>
            <IconButton icon="close" onPress={onClose} />
          </View>

          <Divider />

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              {categorySections.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>⭐</Text>
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    No behaviors available
                  </Text>
                  <Text variant="bodySmall" style={styles.emptySubtext}>
                    Add behaviors first to start logging
                  </Text>
                </View>
              ) : (
                categorySections.map((section) => (
                  <View key={section.category} style={styles.categorySection}>
                    {/* Category Header */}
                    <Text variant="titleMedium" style={styles.categoryTitle}>
                      {section.category}
                    </Text>

                    {/* Behavior Buttons */}
                    <View style={styles.behaviorGrid}>
                      {section.behaviors.map((behavior) => {
                        const isDisabled = disabledBehaviors.has(behavior.id);
                        const disabledReason = disabledBehaviors.get(behavior.id);

                        return (
                          <View key={behavior.id} style={styles.behaviorWrapper}>
                            <Pressable
                              style={({ pressed }) => [
                                ...getButtonStyle(behavior, isDisabled),
                                pressed && !isDisabled && styles.behaviorButtonPressed,
                              ]}
                              onPress={() => handleBehaviorTap(behavior.id)}
                              disabled={isDisabled}
                            >
                              <Text style={styles.behaviorEmoji}>
                                {behavior.emoji}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={[
                                  styles.behaviorTitle,
                                  isDisabled && styles.behaviorTitleDisabled,
                                ]}
                                numberOfLines={2}
                              >
                                {behavior.title}
                              </Text>
                              <Text
                                variant="titleSmall"
                                style={[
                                  styles.behaviorPoints,
                                  isDisabled && styles.behaviorPointsDisabled,
                                  behavior.pointValue > 0 && styles.behaviorPointsPositive,
                                  behavior.pointValue < 0 && styles.behaviorPointsNegative,
                                ]}
                              >
                                {formatPoints(behavior.pointValue)}
                              </Text>
                            </Pressable>
                            
                            {/* Disabled reason */}
                            {isDisabled && disabledReason && (
                              <Text
                                variant="bodySmall"
                                style={styles.disabledReason}
                                numberOfLines={2}
                              >
                                {disabledReason}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    maxHeight: '85%',
  },
  surface: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
  scrollView: {
    maxHeight: 500,
  },
  content: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#212121',
  },
  behaviorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  behaviorWrapper: {
    width: '30%',
    minWidth: 90,
  },
  behaviorButton: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    borderWidth: 2,
  },
  behaviorButtonPositive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
  },
  behaviorButtonNegative: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  behaviorButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.5,
  },
  behaviorButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  behaviorEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  behaviorTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#212121',
    marginBottom: 4,
    height: 32, // Fixed height for 2 lines
  },
  behaviorTitleDisabled: {
    color: '#BDBDBD',
  },
  behaviorPoints: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  behaviorPointsPositive: {
    color: '#4CAF50',
  },
  behaviorPointsNegative: {
    color: '#FF9800',
  },
  behaviorPointsDisabled: {
    color: '#BDBDBD',
  },
  disabledReason: {
    color: '#FF9800',
    marginTop: 4,
    fontSize: 10,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#757575',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#BDBDBD',
    textAlign: 'center',
  },
});
