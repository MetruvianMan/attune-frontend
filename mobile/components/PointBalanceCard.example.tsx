import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PointBalanceCard } from './PointBalanceCard';

/**
 * Example usage of PointBalanceCard component
 * 
 * Demonstrates the three color states:
 * - Positive balance (green)
 * - Zero balance (neutral gray)
 * - Negative balance (muted orange)
 */

export function PointBalanceCardExample() {
  return (
    <View style={styles.container}>
      {/* Positive balance - green/cheerful */}
      <PointBalanceCard balance={150} />
      
      {/* Zero balance - neutral */}
      <PointBalanceCard balance={0} />
      
      {/* Negative balance - muted orange */}
      <PointBalanceCard balance={-25} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
});
