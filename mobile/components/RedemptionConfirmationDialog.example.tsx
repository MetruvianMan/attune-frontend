import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { RedemptionConfirmationDialog } from './RedemptionConfirmationDialog';
import { Reward } from '../models/reward';
import { colors, spacing, typography } from '../constants/theme';

/**
 * RedemptionConfirmationDialog Example
 * 
 * This example demonstrates all the different states and scenarios
 * for the RedemptionConfirmationDialog component.
 */

export function RedemptionConfirmationDialogExample() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  // Example rewards for different scenarios
  const exampleRewards: Reward[] = [
    {
      id: '1',
      childProfileId: 'child-1',
      title: 'Ice cream trip',
      emoji: '🍦',
      pointCost: 20,
      parentApprovalRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    },
    {
      id: '2',
      childProfileId: 'child-1',
      title: 'Extra screen time',
      emoji: '📱',
      pointCost: 30,
      parentApprovalRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    },
    {
      id: '3',
      childProfileId: 'child-1',
      title: 'New game',
      emoji: '🎮',
      pointCost: 100,
      parentApprovalRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    },
    {
      id: '4',
      childProfileId: 'child-1',
      title: 'Weekend trip',
      emoji: '🎪',
      pointCost: 150,
      availabilityRule: {
        type: 'weekends_only',
      },
      parentApprovalRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    },
    {
      id: '5',
      childProfileId: 'child-1',
      title: 'Party invitation',
      emoji: '🎉',
      pointCost: 200,
      availabilityRule: {
        type: 'after_consecutive_days',
        consecutiveDays: 7,
      },
      parentApprovalRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    },
    {
      id: '6',
      childProfileId: 'child-1',
      title: 'Very expensive reward',
      emoji: '💎',
      pointCost: 500,
      parentApprovalRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: true,
    },
  ];

  const openDialog = (reward: Reward) => {
    setSelectedReward(reward);
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    // Delay clearing reward to allow for close animation
    setTimeout(() => setSelectedReward(null), 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>RedemptionConfirmationDialog Examples</Text>
        <Text style={styles.subtitle}>
          Tap any scenario to see the dialog in action
        </Text>

        {/* Scenario 1: Simple redemption, no approval */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario 1: Simple Redemption</Text>
          <Text style={styles.scenarioDescription}>
            Low-cost reward, no parent approval required. Perfect for testing the basic
            confirm/cancel flow and success state with undo.
          </Text>
          <Button
            mode="contained"
            onPress={() => openDialog(exampleRewards[0])}
            style={styles.button}
          >
            Test: {exampleRewards[0].emoji} {exampleRewards[0].title} ({exampleRewards[0].pointCost} pts)
          </Button>
        </View>

        {/* Scenario 2: Parent approval required */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario 2: Parent Approval Required</Text>
          <Text style={styles.scenarioDescription}>
            Reward with parentApprovalRequired = true. Tests the approve/deny button flow
            and approval notice display.
          </Text>
          <Button
            mode="contained"
            onPress={() => openDialog(exampleRewards[1])}
            style={styles.button}
          >
            Test: {exampleRewards[1].emoji} {exampleRewards[1].title} ({exampleRewards[1].pointCost} pts) 🔒
          </Button>
        </View>

        {/* Scenario 3: High cost but affordable */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario 3: High Cost Reward</Text>
          <Text style={styles.scenarioDescription}>
            Higher point cost to test balance calculations. Verify that projected balance
            is calculated correctly.
          </Text>
          <Button
            mode="contained"
            onPress={() => openDialog(exampleRewards[2])}
            style={styles.button}
          >
            Test: {exampleRewards[2].emoji} {exampleRewards[2].title} ({exampleRewards[2].pointCost} pts)
          </Button>
        </View>

        {/* Scenario 4: Weekend-only with approval */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario 4: Weekend-Only Reward</Text>
          <Text style={styles.scenarioDescription}>
            Reward with weekends_only availability rule AND parent approval. Tests both
            availability checking and approval flow together.
          </Text>
          <Button
            mode="contained"
            onPress={() => openDialog(exampleRewards[3])}
            style={styles.button}
          >
            Test: {exampleRewards[3].emoji} {exampleRewards[3].title} ({exampleRewards[3].pointCost} pts) 📅🔒
          </Button>
        </View>

        {/* Scenario 5: Consecutive days requirement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario 5: Consecutive Days Required</Text>
          <Text style={styles.scenarioDescription}>
            Reward requiring 7 consecutive positive days. Tests complex availability
            rules and parent approval.
          </Text>
          <Button
            mode="contained"
            onPress={() => openDialog(exampleRewards[4])}
            style={styles.button}
          >
            Test: {exampleRewards[4].emoji} {exampleRewards[4].title} ({exampleRewards[4].pointCost} pts) ⏳🔒
          </Button>
        </View>

        {/* Scenario 6: Insufficient balance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario 6: Insufficient Balance</Text>
          <Text style={styles.scenarioDescription}>
            Very expensive reward to test insufficient balance error. Assumes user has
            less than 500 points. Tests error state and balance validation.
          </Text>
          <Button
            mode="contained"
            onPress={() => openDialog(exampleRewards[5])}
            style={styles.button}
            buttonColor={colors.warn}
          >
            Test: {exampleRewards[5].emoji} {exampleRewards[5].title} ({exampleRewards[5].pointCost} pts)
          </Button>
        </View>

        {/* Testing notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Testing Notes</Text>
          <Text style={styles.notesText}>
            • Current balance is pulled from RewardsContext
            {'\n'}• Success state shows 5-second countdown
            {'\n'}• Dialog auto-closes when countdown reaches 0
            {'\n'}• Undo button calls undoPointEvent()
            {'\n'}• Error state shows when balance insufficient
            {'\n'}• Approve/Deny shown when parentApprovalRequired = true
            {'\n'}• Confirm/Cancel shown otherwise
          </Text>
        </View>

        {/* Integration example */}
        <View style={styles.codeSection}>
          <Text style={styles.codeTitle}>Usage in CatalogView</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {`const [dialogVisible, setDialogVisible] = useState(false);
const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

const handleRewardPress = (reward: Reward) => {
  setSelectedReward(reward);
  setDialogVisible(true);
};

const handleCloseDialog = () => {
  setDialogVisible(false);
  setSelectedReward(null);
};

return (
  <>
    {/* Catalog content */}
    
    <RedemptionConfirmationDialog
      visible={dialogVisible}
      onClose={handleCloseDialog}
      reward={selectedReward}
    />
  </>
);`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* The Dialog */}
      <RedemptionConfirmationDialog
        visible={dialogVisible}
        onClose={closeDialog}
        reward={selectedReward}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  title: {
    ...typography.h1,
    fontSize: 24,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.textDim,
    marginBottom: 24,
  },

  // Section styles
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    textTransform: 'none',
  },
  scenarioDescription: {
    ...typography.bodySmall,
    color: colors.textDim,
    marginBottom: 12,
    lineHeight: 18,
  },
  button: {
    borderRadius: 12,
  },

  // Notes section
  notesSection: {
    backgroundColor: colors.accentLight,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  notesTitle: {
    ...typography.h2,
    fontSize: 14,
    color: colors.accent,
    marginBottom: 12,
    textTransform: 'none',
  },
  notesText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },

  // Code section
  codeSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  codeTitle: {
    ...typography.h2,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    textTransform: 'none',
  },
  codeBlock: {
    backgroundColor: '#2D3436',
    borderRadius: 8,
    padding: 12,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#00FF00',
    lineHeight: 16,
  },
});
