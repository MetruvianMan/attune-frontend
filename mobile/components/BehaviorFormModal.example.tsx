/**
 * Example Usage of BehaviorFormModal Component
 * 
 * This file demonstrates how to integrate BehaviorFormModal into your views.
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BehaviorFormModal } from './BehaviorFormModal';
import { useRewards } from '../contexts/RewardsContext';
import { Behavior, BehaviorInput } from '../models';

/**
 * Example: Using BehaviorFormModal in BehaviorsView
 */
export function BehaviorsViewExample() {
  const [showModal, setShowModal] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<Behavior | null>(null);
  const { selectedChildProfileId, behaviors } = useRewards();

  // Handle creating a new behavior
  const handleAddBehavior = () => {
    setEditingBehavior(null); // Clear editing behavior for create mode
    setShowModal(true);
  };

  // Handle editing an existing behavior
  const handleEditBehavior = (behavior: Behavior) => {
    setEditingBehavior(behavior);
    setShowModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBehavior(null);
  };

  return (
    <View style={styles.container}>
      {/* Add Behavior Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddBehavior}>
        <Text style={styles.addButtonText}>+ Add Behavior</Text>
      </TouchableOpacity>

      {/* Behavior List */}
      {behaviors.map((behavior) => (
        <TouchableOpacity
          key={behavior.id}
          style={styles.behaviorCard}
          onPress={() => handleEditBehavior(behavior)}
        >
          <Text style={styles.emoji}>{behavior.emoji}</Text>
          <Text style={styles.title}>{behavior.title}</Text>
          <Text style={styles.points}>
            {behavior.pointValue > 0 ? '+' : ''}{behavior.pointValue} pts
          </Text>
        </TouchableOpacity>
      ))}

      {/* BehaviorFormModal - only rendered once a profile is selected,
          since childProfileId is required (not nullable) on the real
          component's props. */}
      {selectedChildProfileId && (
        <BehaviorFormModal
          visible={showModal}
          onSave={(input: BehaviorInput) => {
            // In a real implementation, call rewardsService.createBehavior
            // (create mode) or updateBehavior (edit mode, using
            // editingBehavior.id) here, then close the modal.
            console.log('Save behavior:', input);
            handleCloseModal();
          }}
          onCancel={handleCloseModal}
          behavior={editingBehavior}
          childProfileId={selectedChildProfileId}
        />
      )}
    </View>
  );
}

/**
 * Example: Quick Access Button
 */
export function QuickAddBehaviorButton() {
  const [showModal, setShowModal] = useState(false);
  const { selectedChildProfileId } = useRewards();

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {selectedChildProfileId && (
        <BehaviorFormModal
          visible={showModal}
          onSave={(input: BehaviorInput) => {
            console.log('Save behavior:', input);
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
          behavior={null} // null for create mode
          childProfileId={selectedChildProfileId}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    padding: 16,
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  behaviorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  points: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  floatingButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
  },
});
