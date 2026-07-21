import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { Behavior, BehaviorInput } from '../models';
import { BehaviorCard } from './BehaviorCard';
import { BehaviorFormModal } from './BehaviorFormModal';

/**
 * BehaviorsView Component
 * 
 * Displays behaviors grouped by category with expandable sections.
 * Features:
 * - Behaviors grouped by category (Self-Care, School, Kindness, etc.)
 * - Expandable/collapsible sections
 * - "+ Add New" button in header/FAB
 * - Tap behavior to edit
 * - Long press to delete with confirmation
 * 
 * Requirements covered: 6.1, 6.5, 23.1, 23.2, 23.3
 * 
 * @param behaviors - List of all behaviors
 * @param childProfileId - Current child profile ID
 * @param onCreateBehavior - Callback to create new behavior
 * @param onUpdateBehavior - Callback to update existing behavior
 * @param onDeleteBehavior - Callback to delete behavior
 */

interface BehaviorsViewProps {
  behaviors: Behavior[];
  childProfileId: string;
  onCreateBehavior: (input: BehaviorInput) => Promise<void>;
  onUpdateBehavior: (id: string, input: BehaviorInput) => Promise<void>;
  onDeleteBehavior: (id: string) => Promise<void>;
}

interface CategorySection {
  category: string;
  behaviors: Behavior[];
  expanded: boolean;
}

export function BehaviorsView({
  behaviors,
  childProfileId,
  onCreateBehavior,
  onUpdateBehavior,
  onDeleteBehavior,
}: BehaviorsViewProps) {
  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<
    (Behavior & { id: string }) | null
  >(null);

  // Expandable sections state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Self-Care', 'School', 'Kindness', 'Chores'])
  );

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
        expanded: expandedCategories.has(category),
      }));
  }, [behaviors, expandedCategories]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle add new behavior
  const handleAddNew = () => {
    setEditingBehavior(null);
    setShowFormModal(true);
  };

  // Handle edit behavior
  const handleEdit = (behavior: Behavior) => {
    setEditingBehavior(behavior as Behavior & { id: string });
    setShowFormModal(true);
  };

  // Handle delete behavior with confirmation
  const handleDelete = async (behavior: Behavior) => {
    // Simple confirmation - in production, use a proper dialog component
    if (confirm(`Delete behavior "${behavior.title}"?`)) {
      try {
        await onDeleteBehavior(behavior.id);
      } catch (error) {
        console.error('Failed to delete behavior:', error);
        alert('Failed to delete behavior. Please try again.');
      }
    }
  };

  // Handle form save
  const handleFormSave = async (input: BehaviorInput) => {
    try {
      if (editingBehavior) {
        await onUpdateBehavior(editingBehavior.id, input);
      } else {
        await onCreateBehavior(input);
      }
      setShowFormModal(false);
      setEditingBehavior(null);
    } catch (error) {
      console.error('Failed to save behavior:', error);
      alert('Failed to save behavior. Please try again.');
    }
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowFormModal(false);
    setEditingBehavior(null);
  };

  // Empty state
  if (behaviors.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No Behaviors Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add your first behavior to start earning points!
          </Text>
        </View>

        <FAB
          icon="plus"
          label="Add Behavior"
          style={styles.fab}
          onPress={handleAddNew}
        />

        <BehaviorFormModal
          visible={showFormModal}
          behavior={editingBehavior}
          childProfileId={childProfileId}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Behaviors
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            {behaviors.length} behavior{behaviors.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {categorySections.map((section) => (
          <View key={section.category} style={styles.categorySection}>
            {/* Category Header */}
            <View
              style={styles.categoryHeader}
              onTouchEnd={() => toggleCategory(section.category)}
            >
              <Text variant="titleLarge" style={styles.categoryTitle}>
                {section.expanded ? '▼' : '▶'} {section.category}
              </Text>
              <View style={styles.categoryBadge}>
                <Text variant="bodySmall" style={styles.categoryBadgeText}>
                  {section.behaviors.length}
                </Text>
              </View>
            </View>

            {/* Category Behaviors */}
            {section.expanded && (
              <View style={styles.categoryBehaviors}>
                {section.behaviors.map((behavior) => (
                  <BehaviorCard
                    key={behavior.id}
                    behavior={behavior}
                    onPress={() => handleEdit(behavior)}
                    onLongPress={() => handleDelete(behavior)}
                  />
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        label="Add Behavior"
        style={styles.fab}
        onPress={handleAddNew}
      />

      {/* Form Modal */}
      <BehaviorFormModal
        visible={showFormModal}
        behavior={editingBehavior}
        childProfileId={childProfileId}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
  headerSubtitle: {
    color: '#757575',
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryTitle: {
    fontWeight: '600',
    color: '#212121',
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  categoryBadgeText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  categoryBehaviors: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212121',
  },
  emptyText: {
    color: '#757575',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 80, // Space for FAB
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#4CAF50',
  },
});
