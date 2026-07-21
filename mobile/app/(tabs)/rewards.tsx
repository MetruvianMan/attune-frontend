import React from 'react';
import { RewardsProvider } from '../../contexts/RewardsContext';
import { RewardsTabScreen } from '../../components/RewardsTabScreen';

/**
 * Rewards Tab Screen
 * 
 * This is the main entry point for the Rewards tab. It wraps the RewardsTabScreen
 * component with RewardsProvider to provide rewards context throughout the tab.
 * 
 * The RewardsTabScreen component displays:
 * - Child name header with point balance
 * - Today's summary (points earned, spent, net)
 * - Quick action buttons (Earn Points, Redeem Reward)
 * - Recent activity (last 5 point events)
 * - Link to full ledger
 * 
 * Requirements covered: 1.2, 1.3, 1.4, 2.1, 2.4, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 5.5
 */

export default function RewardsScreen() {
  return (
    <RewardsProvider>
      <RewardsTabScreen />
    </RewardsProvider>
  );
}
