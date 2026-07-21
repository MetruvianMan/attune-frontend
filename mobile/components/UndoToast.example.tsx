/**
 * UndoToast Component - Usage Examples
 * 
 * This file demonstrates different usage patterns for the UndoToast component.
 * Copy and adapt these examples for your implementation.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import { UndoToast } from './UndoToast';

/**
 * Example 1: Basic Positive Points Toast
 * Used after logging a positive behavior (earned points)
 */
export function Example1_PositivePoints() {
  const [visible, setVisible] = useState(false);

  const handleLogBehavior = () => {
    // Simulate logging behavior
    console.log('Behavior logged!');
    setVisible(true);
  };

  const handleUndo = () => {
    // Simulate undo
    console.log('Undo triggered!');
    setVisible(false);
  };

  const handleDismiss = () => {
    console.log('Toast dismissed');
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Log Behavior (+10 pts)" onPress={handleLogBehavior} />
      
      <UndoToast
        visible={visible}
        message="+10 points logged! 🎉"
        type="positive"
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

/**
 * Example 2: Demerit/Negative Points Toast
 * Used after logging a demerit behavior (lost points)
 */
export function Example2_NegativePoints() {
  const [visible, setVisible] = useState(false);

  const handleLogDemerit = () => {
    console.log('Demerit logged');
    setVisible(true);
  };

  const handleUndo = () => {
    console.log('Demerit undone');
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Log Demerit (-5 pts)" onPress={handleLogDemerit} />
      
      <UndoToast
        visible={visible}
        message="-5 points logged"
        type="negative"
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

/**
 * Example 3: Reward Redemption Toast
 * Used after redeeming a reward
 */
export function Example3_RewardRedemption() {
  const [visible, setVisible] = useState(false);

  const handleRedeemReward = () => {
    console.log('Reward redeemed');
    setVisible(true);
  };

  const handleUndo = () => {
    console.log('Redemption undone');
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Redeem Ice Cream (-20 pts)" onPress={handleRedeemReward} />
      
      <UndoToast
        visible={visible}
        message="🍦 Ice cream redeemed! -20 points"
        type="neutral"
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

/**
 * Example 4: Custom Duration Toast
 * Toast stays visible for 7 seconds instead of default 5
 */
export function Example4_CustomDuration() {
  const [visible, setVisible] = useState(false);

  const handleLogBehavior = () => {
    setVisible(true);
  };

  const handleUndo = () => {
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Log with 7s timeout" onPress={handleLogBehavior} />
      
      <UndoToast
        visible={visible}
        message="+15 points logged!"
        type="positive"
        onUndo={handleUndo}
        onDismiss={handleDismiss}
        duration={7000} // 7 seconds
      />
    </View>
  );
}

/**
 * Example 5: Integration with State Management
 * Realistic example showing how to integrate with point events
 */
export function Example5_WithStateManagement() {
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    message: string;
    type: 'positive' | 'negative' | 'neutral';
    pointEventId: string | null;
  }>({
    visible: false,
    message: '',
    type: 'positive',
    pointEventId: null,
  });

  // Simulate logging different types of point events
  const handleLogPositiveBehavior = () => {
    const mockPointEventId = `event-${Date.now()}`;
    setToastConfig({
      visible: true,
      message: '🧹 Cleaned room! +10 points',
      type: 'positive',
      pointEventId: mockPointEventId,
    });
  };

  const handleLogDemerit = () => {
    const mockPointEventId = `event-${Date.now()}`;
    setToastConfig({
      visible: true,
      message: '😤 Sibling conflict. -5 points',
      type: 'negative',
      pointEventId: mockPointEventId,
    });
  };

  const handleRedeemReward = () => {
    const mockPointEventId = `event-${Date.now()}`;
    setToastConfig({
      visible: true,
      message: '🎮 New game redeemed! -100 points',
      type: 'neutral',
      pointEventId: mockPointEventId,
    });
  };

  const handleUndo = async () => {
    if (toastConfig.pointEventId) {
      // Simulate async undo operation
      console.log('Undoing point event:', toastConfig.pointEventId);
      
      // In real implementation, call undoPointEvent from RewardsContext
      // await undoPointEvent(toastConfig.pointEventId);
      
      setToastConfig(prev => ({ ...prev, visible: false }));
    }
  };

  const handleDismiss = () => {
    setToastConfig(prev => ({ ...prev, visible: false }));
  };

  return (
    <View style={styles.container}>
      <Button title="Log Positive Behavior" onPress={handleLogPositiveBehavior} />
      <Button title="Log Demerit" onPress={handleLogDemerit} />
      <Button title="Redeem Reward" onPress={handleRedeemReward} />
      
      <UndoToast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

/**
 * Example 6: Multiple Sequential Toasts
 * Shows how to handle multiple toasts in sequence (new toast replaces old)
 */
export function Example6_SequentialToasts() {
  const [toastQueue, setToastQueue] = useState<{
    visible: boolean;
    message: string;
    type: 'positive' | 'negative' | 'neutral';
    id: string;
  }>({
    visible: false,
    message: '',
    type: 'positive',
    id: '',
  });

  const showToast = (message: string, type: 'positive' | 'negative' | 'neutral') => {
    const id = `toast-${Date.now()}`;
    setToastQueue({
      visible: true,
      message,
      type,
      id,
    });
  };

  const handleUndo = () => {
    console.log('Undo toast:', toastQueue.id);
    setToastQueue(prev => ({ ...prev, visible: false }));
  };

  const handleDismiss = () => {
    setToastQueue(prev => ({ ...prev, visible: false }));
  };

  return (
    <View style={styles.container}>
      <Button 
        title="Toast 1: +10 pts" 
        onPress={() => showToast('+10 points! 🎉', 'positive')} 
      />
      <Button 
        title="Toast 2: -5 pts" 
        onPress={() => showToast('-5 points', 'negative')} 
      />
      <Button 
        title="Toast 3: Reward" 
        onPress={() => showToast('🍦 Ice cream! -20 pts', 'neutral')} 
      />
      
      <UndoToast
        visible={toastQueue.visible}
        message={toastQueue.message}
        type={toastQueue.type}
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
});

/**
 * INTEGRATION NOTES:
 * 
 * 1. Import the component:
 *    import { UndoToast } from '../components/UndoToast';
 * 
 * 2. Add state for toast visibility and config:
 *    const [toastVisible, setToastVisible] = useState(false);
 *    const [toastMessage, setToastMessage] = useState('');
 *    const [toastType, setToastType] = useState<'positive' | 'negative' | 'neutral'>('positive');
 * 
 * 3. Show toast after point event:
 *    setToastMessage('+10 points logged!');
 *    setToastType('positive');
 *    setToastVisible(true);
 * 
 * 4. Handle undo:
 *    const handleUndo = async () => {
 *      await undoPointEvent(pointEventId);
 *      setToastVisible(false);
 *    };
 * 
 * 5. Handle dismiss:
 *    const handleDismiss = () => {
 *      setToastVisible(false);
 *    };
 * 
 * 6. Render toast at root level of your screen:
 *    <UndoToast
 *      visible={toastVisible}
 *      message={toastMessage}
 *      type={toastType}
 *      onUndo={handleUndo}
 *      onDismiss={handleDismiss}
 *    />
 */
